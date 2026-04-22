import "server-only";

import { GoogleGenAI, MediaResolution, ThinkingLevel, createPartFromBase64 } from "@google/genai";
import type { FloorId, RasterBlueprintAnchor, RasterBlueprintLayout, RasterBlueprintSegment } from "@/lib/evacuation";

// Allow configuring a fallback chain via a comma-separated env variable.
// Default to the strongest currently available Gemini 3.x vision-capable models first,
// while keeping Gemini 2.5 fallbacks for projects without Gemini 3.x access yet.
const DEFAULT_BLUEPRINT_MODELS = Array.from(
  new Set(
    (
      process.env.GEMINI_BLUEPRINT_MODELS ||
      process.env.GEMINI_BLUEPRINT_MODEL ||
      "gemini-3.1-pro-preview,gemini-3-flash-preview,gemini-2.5-pro,gemini-2.5-flash,gemini-2.5-flash-lite"
    )
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean)
  )
);

const LIMITS = {
  ROOM_ANCHORS: 96,
  STRUCTURAL_ANCHORS: 24,
  JUNCTION_ANCHORS: 48,
  SEGMENTS: 96,
  DIAGNOSTICS: 10,
} as const;

const TOLERANCES = {
  MIN_SEGMENT_LENGTH_PCT: 1.2,
  MIN_ANCHOR_SPACING_PCT: 1.6,
  DUPLICATE_SEGMENT_PCT: 0.8,
} as const;

const DEFAULT_AI_TEMPERATURE = 0.1;
const DEFAULT_FILENAME = "uploaded-blueprint";
const MODEL_RETRY_DELAYS_MS = [1200, 2500, 5000] as const;

const pointSchema = {
  type: "object",
  properties: {
    x: { type: "number", description: "Normalized horizontal coordinate from 0 to 100." },
    y: { type: "number", description: "Normalized vertical coordinate from 0 to 100." },
    label: { type: "string", description: "Optional human-readable label copied from the blueprint when visible." },
  },
} as const;

const segmentSchema = {
  type: "object",
  properties: {
    x1: { type: "number" },
    y1: { type: "number" },
    x2: { type: "number" },
    y2: { type: "number" },
  },
} as const;

const blueprintVisionSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    dimensionsMeters: {
      type: "object",
      properties: {
        widthMeters: { type: "number" },
        heightMeters: { type: "number" },
        sourceText: { type: "string" },
        confidence: { type: "number" },
      },
    },
    corridorSegments: {
      type: "array",
      items: segmentSchema,
    },
    junctionAnchors: {
      type: "array",
      items: pointSchema,
    },
    roomAnchors: {
      type: "array",
      items: pointSchema,
    },
    stairAnchors: {
      type: "array",
      items: pointSchema,
    },
    exitAnchors: {
      type: "array",
      items: pointSchema,
    },
    elevatorAnchors: {
      type: "array",
      items: pointSchema,
    },
    checkpointAnchors: {
      type: "array",
      items: pointSchema,
    },
    diagnostics: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "corridorSegments",
    "junctionAnchors",
    "roomAnchors",
    "stairAnchors",
    "exitAnchors",
    "elevatorAnchors",
    "checkpointAnchors",
    "diagnostics",
  ],
} as const;

function buildBlueprintVisionSystemInstruction() {
  return [
    "<role>",
    "You are a comprehensive architectural floor-plan parser for facility mapping and emergency routing systems. Your spatial reasoning abilities allow you to distinguish all structural walls, doors, rooms, and circulation paths.",
    "You extract every single piece of geometry, every room, every label, and every access point visible on the uploaded blueprint or map.",
    "</role>",
    "<instructions>",
    "1. Start by globally identifying all circulation paths (corridors, hallways, open spaces) and building entry/exit points.",
    "2. Reconstruct the walkable corridor centerline network exhaustively, including every minor branch and alcove.",
    "3. Identify every single room or distinct space shown on the map. Determine topological relationships (e.g. which room connects to which part of the corridor) and deduce coordinates from that topology.",
    "4. Extract comprehensively. Do not omit rooms or corridors even if details are slightly obscured; use logical architectural continuity to connect the graph.",
    "5. Return strict JSON that matches the provided schema.",
    "6. Use the 'diagnostics' array only for short factual extraction notes, not long reasoning.",
    "</instructions>",
    "<constraints>",
    "- Use the full uploaded page/image bounds for normalization.",
    "- Preserve ALL visible labels exactly when legible, including room numbers, room names, exit text, elevator names, and zones.",
    "</constraints>",
  ].join("\n");
}

function buildBlueprintVisionPrompt(input: { floorId: FloorId; floorLabel: string; fileName?: string; mimeType: string }) {
  return [
    "<context>",
    `Floor label: ${input.floorLabel}`,
    `Floor id: ${input.floorId}`,
    `File name: ${input.fileName ?? DEFAULT_FILENAME}`,
    `MIME type: ${input.mimeType}`,
    "This output will drive production evacuation routing, corridor-anchor placement, and live admin tracking.",
    "</context>",
    "<output_format>",
    "Return a compact JSON object only. No markdown. No prose outside JSON.",
    "</output_format>",
    "<coordinate_system>",
    "Normalize every coordinate to 0..100 across the entire uploaded page/image.",
    "Use (0,0) for the absolute top-left of the full page and (100,100) for the absolute bottom-right.",
    "Do not crop margins, legends, or title blocks before computing coordinates.",
    "</coordinate_system>",
    "<extraction_workflow>",
    "Follow this exhaustive step-by-step reasoning workflow for maximum architectural parsing:",
    "Step 1: Write short factual notes to 'diagnostics' describing the detected main hallways, minor branches, stairwells, rooms, and open areas.",
    "Step 2: Plot 'corridorSegments' to trace the complete walkable corridor centerline map. Include absolutely every branch, bend, dead end, lobby link, open plan walking path, and stair/lift approach.",
    "Step 3: Plot 'junctionAnchors', marking EVERY intersection, T-junction, cross-junction, bend apex, lobby merge, and corridor decision point.",
    "Step 4: Identify EVERY SINGLE ROOM. For each room, locate its door/opening. Plot 'roomAnchors', placing an anchor at the visible door/access point on the corridor side. Extract the room label explicitly.",
    "Step 5: Identify all vertical circulation and exits. Plot 'stairAnchors' and 'exitAnchors' at every entry door/opening used for access, and 'elevatorAnchors' for every elevator bank.",
    "Step 6: Identify EVERY 'checkpointAnchor' (e.g., reception, security desk, nurse station, main lobby, waiting areas, lounge areas).",
    "</extraction_workflow>",
    "<extraction_rules>",
    "1. Extract everything that represents a walkable space, standard room, or point of interest.",
    "2. If an area looks like an accessible utility room, restroom, or closet, extract it using 'roomAnchors' and label it.",
    "3. Maximize the coverage: ensure that the graph is connected and reaches every corner of the mapped floor.",
    "</extraction_rules>",
    "<dimensions>",
    "Extract overall width/height in meters if explicit measurement text or dimension lines are visible.",
    "Copy the exact visible measurement text into sourceText.",
    "</dimensions>",
    "<validation>",
    "Before returning JSON, ensure that every room/stair/exit/elevator/checkpoint anchor is physically near the corridor network. If not, add intermediate corridor segments to connect them.",
    "Ensure comprehensive coverage of the map.",
    "</validation>",
    "<task>",
    "Analyze the attached blueprint or uploaded map and perform the extraction workflow. Output strictly the requested JSON.",
    "</task>"
  ].join("\n");
}

function parseJsonResponse(rawText: string) {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse((fenced?.[1] ?? trimmed).trim()) as Record<string, unknown>;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function clampPercent(value: unknown) {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) {
    return null;
  }
  return Number(Math.min(100, Math.max(0, numericValue)).toFixed(2));
}

function sanitizeLabel(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

function sanitizeAnchorArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [] as RasterBlueprintAnchor[];
  }

  const anchors = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const x = clampPercent((entry as Record<string, unknown>).x);
      const y = clampPercent((entry as Record<string, unknown>).y);
      if (x === null || y === null) {
        return null;
      }
      const label = sanitizeLabel((entry as Record<string, unknown>).label);
      const anchor: RasterBlueprintAnchor = label ? { x, y, label } : { x, y };
      return anchor;
    })
    .filter((entry): entry is RasterBlueprintAnchor => entry !== null)
    .slice(0, limit);

  return anchors.filter((anchor, index, all) => {
    return !all.some((candidate, candidateIndex) => {
      if (candidateIndex >= index) {
        return false;
      }
      const sameLabel =
        !candidate.label ||
        !anchor.label ||
        candidate.label.trim().toLowerCase() === anchor.label.trim().toLowerCase();
      return sameLabel && Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y) < TOLERANCES.MIN_ANCHOR_SPACING_PCT;
    });
  });
}

function sanitizeSegmentArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as RasterBlueprintSegment[];
  }

  const segments = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const source = entry as Record<string, unknown>;
      const x1 = clampPercent(source.x1);
      const y1 = clampPercent(source.y1);
      const x2 = clampPercent(source.x2);
      const y2 = clampPercent(source.y2);
      if (x1 === null || y1 === null || x2 === null || y2 === null) {
        return null;
      }
      if (Math.hypot(x2 - x1, y2 - y1) < TOLERANCES.MIN_SEGMENT_LENGTH_PCT) {
        return null;
      }
      return { x1, y1, x2, y2 } satisfies RasterBlueprintSegment;
    })
    .filter((entry): entry is RasterBlueprintSegment => Boolean(entry))
    .slice(0, LIMITS.SEGMENTS);

  return segments.filter((segment, index, all) => {
    const normalizedSegment =
      segment.x1 < segment.x2 || (segment.x1 === segment.x2 && segment.y1 <= segment.y2)
        ? segment
        : { x1: segment.x2, y1: segment.y2, x2: segment.x1, y2: segment.y1 };
    return !all.some((candidate, candidateIndex) => {
      if (candidateIndex >= index) {
        return false;
      }
      const normalizedCandidate =
        candidate.x1 < candidate.x2 || (candidate.x1 === candidate.x2 && candidate.y1 <= candidate.y2)
          ? candidate
          : { x1: candidate.x2, y1: candidate.y2, x2: candidate.x1, y2: candidate.y1 };
      return (
        Math.abs(normalizedCandidate.x1 - normalizedSegment.x1) < TOLERANCES.DUPLICATE_SEGMENT_PCT &&
        Math.abs(normalizedCandidate.y1 - normalizedSegment.y1) < TOLERANCES.DUPLICATE_SEGMENT_PCT &&
        Math.abs(normalizedCandidate.x2 - normalizedSegment.x2) < TOLERANCES.DUPLICATE_SEGMENT_PCT &&
        Math.abs(normalizedCandidate.y2 - normalizedSegment.y2) < TOLERANCES.DUPLICATE_SEGMENT_PCT
      );
    });
  });
}

function sanitizeDiagnostics(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, LIMITS.DIAGNOSTICS);
}

function sanitizeDimensions(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const widthMeters = toFiniteNumber(source.widthMeters);
  const heightMeters = toFiniteNumber(source.heightMeters);
  const confidence = toFiniteNumber(source.confidence);
  const sourceText = sanitizeLabel(source.sourceText);

  if (widthMeters === null && heightMeters === null && confidence === null && !sourceText) {
    return undefined;
  }

  return {
    widthMeters: widthMeters !== null && widthMeters > 0 ? Number(widthMeters.toFixed(2)) : null,
    heightMeters: heightMeters !== null && heightMeters > 0 ? Number(heightMeters.toFixed(2)) : null,
    sourceText: sourceText ?? null,
    confidence: confidence !== null ? Number(Math.min(1, Math.max(0, confidence)).toFixed(2)) : null,
  };
}

function sanitizeBlueprintLayout(payload: Record<string, unknown>): RasterBlueprintLayout {
  const diagnostics = sanitizeDiagnostics(payload.diagnostics);
  const sanitized = {
    corridorSegments: sanitizeSegmentArray(payload.corridorSegments),
    junctionAnchors: sanitizeAnchorArray(payload.junctionAnchors, LIMITS.JUNCTION_ANCHORS),
    roomAnchors: sanitizeAnchorArray(payload.roomAnchors, LIMITS.ROOM_ANCHORS),
    stairAnchors: sanitizeAnchorArray(payload.stairAnchors, LIMITS.STRUCTURAL_ANCHORS),
    exitAnchors: sanitizeAnchorArray(payload.exitAnchors, LIMITS.STRUCTURAL_ANCHORS),
    elevatorAnchors: sanitizeAnchorArray(payload.elevatorAnchors, LIMITS.STRUCTURAL_ANCHORS),
    checkpointAnchors: sanitizeAnchorArray(payload.checkpointAnchors, LIMITS.STRUCTURAL_ANCHORS),
    dimensionsMeters: sanitizeDimensions(payload.dimensionsMeters),
    diagnostics:
      diagnostics.length > 0
        ? diagnostics
        : ["Gemini vision parsed the blueprint, but did not provide extra diagnostics."],
  } satisfies RasterBlueprintLayout;

  if (sanitized.corridorSegments.length === 0) {
    sanitized.diagnostics.unshift("Gemini did not return confident walkable corridor centerlines.");
  }

  return sanitized;
}

function shouldRetryWithoutSchema(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("too many states") ||
    message.includes("schema produces a constraint") ||
    message.includes("invalid_argument")
  );
}

function shouldRetryWithFallbackModel(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("unsupported") ||
    message.includes("quota") ||
    message.includes("resource_exhausted") ||
    message.includes("unavailable") ||
    message.includes("deadline") ||
    message.includes("internal")
  );
}

function shouldRetryRequest(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("resource_exhausted") ||
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("deadline") ||
    message.includes("timeout")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestBlueprintLayout(
  ai: GoogleGenAI,
  input: {
    floorId: FloorId;
    floorLabel: string;
    mimeType: string;
    base64Data: string;
    fileName?: string;
  },
  model: string,
  useSchema: boolean
) {
  const normalizedModel = model.trim().toLowerCase();
  const thinkingConfig = normalizedModel.startsWith("gemini-3")
    ? {
        includeThoughts: false,
        thinkingLevel: ThinkingLevel.HIGH,
      }
    : {
        includeThoughts: false,
        thinkingBudget: -1,
      };

  return await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          createPartFromBase64(input.base64Data, input.mimeType),
          { text: buildBlueprintVisionPrompt(input) },
        ],
      },
    ],
    config: {
      systemInstruction: buildBlueprintVisionSystemInstruction(),
      temperature: DEFAULT_AI_TEMPERATURE,
      responseMimeType: "application/json",
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
      thinkingConfig,
      ...(useSchema ? { responseJsonSchema: blueprintVisionSchema } : {}),
    },
  });
}

export async function extractBlueprintLayoutWithGemini(input: {
  floorId: FloorId;
  floorLabel: string;
  mimeType: string;
  base64Data: string;
  fileName?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY or GOOGLE_API_KEY to enable Gemini blueprint parsing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown = null;

  for (const model of DEFAULT_BLUEPRINT_MODELS) {
    for (let attempt = 0; attempt <= MODEL_RETRY_DELAYS_MS.length; attempt += 1) {
      let response;
      try {
        response = await requestBlueprintLayout(ai, input, model, true);
      } catch (error) {
        if (shouldRetryWithoutSchema(error)) {
          response = await requestBlueprintLayout(ai, input, model, false);
        } else if (shouldRetryRequest(error) && attempt < MODEL_RETRY_DELAYS_MS.length) {
          await sleep(MODEL_RETRY_DELAYS_MS[attempt]);
          continue;
        } else if (shouldRetryWithFallbackModel(error) || shouldRetryRequest(error)) {
          lastError = error;
          break;
        } else {
          throw error;
        }
      }

      const responseText = response.text?.trim();
      if (!responseText) {
        lastError = new Error(`Gemini blueprint parser returned an empty response for model ${model}.`);
        if (attempt < MODEL_RETRY_DELAYS_MS.length) {
          await sleep(MODEL_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        break;
      }

      const parsedPayload = parseJsonResponse(responseText);
      const layout = sanitizeBlueprintLayout(parsedPayload);

      if (
        (layout.corridorSegments?.length ?? 0) > 0 ||
        (layout.roomAnchors?.length ?? 0) > 0 ||
        (layout.exitAnchors?.length ?? 0) > 0
      ) {
        return layout;
      }

      lastError = new Error(`Model ${model} did not extract enough routing anchors from the blueprint.`);
      if (attempt < MODEL_RETRY_DELAYS_MS.length) {
        await sleep(MODEL_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini blueprint parsing failed for all configured models.");
}
