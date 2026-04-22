import type { FloorId, RasterBlueprintLayout } from "@/lib/evacuation";

export interface BlueprintAutomationAsset {
  kind: "svg" | "vision";
  mimeType: string;
  fileName?: string;
  dataUrl: string;
  svgMarkup?: string;
}

export interface PreparedBlueprintUpload {
  asset: BlueprintAutomationAsset;
  previewImageUrl: string;
  statusMessage: string;
}

const MIME_TYPE_MAP: Record<string, string> = {
  pdf: "application/pdf",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * Safely decodes a Base64 string that contains UTF-8 characters.
 */
function decodeBase64Utf8(payload: string): string {
  try {
    const binary = window.atob(payload);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (error) {
    throw new Error("Failed to decode Base64 payload. The data may be malformed.");
  }
}

export function getDataUrlMimeType(source: string): string | null {
  // Matches "data:image/png;base64,..." and extracts "image/png"
  const match = source.match(/^data:([a-zA-Z0-9-+\/.]+)[;,]/);
  return match?.[1] ?? null;
}

function inferMimeType(file: File, dataUrl?: string): string {
  if (file.type) {
    return file.type;
  }

  const dataUrlMime = dataUrl ? getDataUrlMimeType(dataUrl) : null;
  if (dataUrlMime) {
    return dataUrlMime;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPE_MAP[extension] || "application/octet-stream";
}

export async function loadSvgBlueprintSource(source: string): Promise<string | null> {
  if (!source) {
    return null;
  }

  if (source.startsWith("data:image/svg+xml")) {
    const [, payload = ""] = source.split(",", 2);
    if (source.includes(";base64,")) {
      return decodeBase64Utf8(payload);
    }
    try {
      return decodeURIComponent(payload);
    } catch {
      throw new Error("Failed to decode URI-encoded SVG payload.");
    }
  }

  if (!source.endsWith(".svg")) {
    return null;
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to load SVG blueprint (${response.status} ${response.statusText})`);
  }
  return response.text();
}

export async function readFileAsDataUrl(file: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("File could not be read as a valid data URL."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read operation failed."));
    reader.readAsDataURL(file);
  });
}

export async function extractPdfBlueprintPreview(file: File): Promise<{ imageDataUrl: string; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
  } as Parameters<typeof pdfjs.getDocument>[0]);

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("PDF canvas context is not available in this environment.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;

  const imageDataUrl = canvas.toDataURL("image/png");

  // Free memory allocation for the canvas
  canvas.width = 0;
  canvas.height = 0;

  return {
    imageDataUrl,
    pageCount: pdf.numPages,
  };
}

export async function prepareBlueprintUpload(file: File): Promise<PreparedBlueprintUpload> {
  const lowerName = file.name.toLowerCase();

  // 1. PDF Handling
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    const [sourceDataUrl, preview] = await Promise.all([
      readFileAsDataUrl(file),
      extractPdfBlueprintPreview(file)
    ]);

    return {
      asset: {
        kind: "vision",
        mimeType: "application/pdf",
        fileName: file.name,
        dataUrl: sourceDataUrl,
      },
      previewImageUrl: preview.imageDataUrl,
      statusMessage: `PDF floor plan uploaded. Preview rendered from page 1 of ${preview.pageCount}; Vision AI will parse the original PDF during build.`,
    };
  }

  const dataUrl = await readFileAsDataUrl(file);

  // 2. SVG Handling
  if (file.type === "image/svg+xml" || lowerName.endsWith(".svg")) {
    const svgMarkup = await loadSvgBlueprintSource(dataUrl);
    if (!svgMarkup) {
      throw new Error("SVG blueprint markup could not be loaded or parsed.");
    }

    return {
      asset: {
        kind: "svg",
        mimeType: "image/svg+xml",
        fileName: file.name,
        dataUrl,
        svgMarkup,
      },
      previewImageUrl: dataUrl,
      statusMessage: "SVG floor plan uploaded. Vector corridor extraction is ready for live demo build.",
    };
  }

  // 3. Raster Image Handling (PNG, JPEG, etc.)
  return {
    asset: {
      kind: "vision",
      mimeType: inferMimeType(file, dataUrl),
      fileName: file.name,
      dataUrl,
    },
    previewImageUrl: dataUrl,
    statusMessage: "Raster floor plan uploaded. Vision AI will parse walkable corridors and anchors during build.",
  };
}

export async function requestBlueprintVisionAnalysis(input: {
  floorId: FloorId;
  floorLabel: string;
  asset: BlueprintAutomationAsset;
}): Promise<RasterBlueprintLayout> {
  if (input.asset.kind !== "vision") {
    throw new Error("Vision AI parsing requires a raster image or PDF asset.");
  }

  const response = await fetch("/api/admin/tactical-map/parse-blueprint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      floorId: input.floorId,
      floorLabel: input.floorLabel,
      fileName: input.asset.fileName,
      mimeType: input.asset.mimeType,
      dataUrl: input.asset.dataUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown network error");
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: RasterBlueprintLayout; error?: string }
    | null;

  if (!payload?.success || !payload.data) {
    throw new Error(payload?.error ?? "Vision AI blueprint parsing returned an invalid response.");
  }

  return payload.data;
}
