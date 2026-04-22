import { NextResponse } from "next/server";
import { extractBlueprintLayoutWithGemini } from "@/lib/blueprint-vision";
import type { FloorId } from "@/lib/evacuation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParseBlueprintRequest {
  floorId?: FloorId;
  floorLabel?: string;
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
}

function parseBase64DataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1] ?? "application/octet-stream",
    base64Data: match[2] ?? "",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParseBlueprintRequest;
    if (!body.floorId || !body.dataUrl) {
      return NextResponse.json(
        { success: false, error: "floorId and dataUrl are required." },
        { status: 400 }
      );
    }

    const parsedAsset = parseBase64DataUrl(body.dataUrl);
    if (!parsedAsset?.base64Data) {
      return NextResponse.json(
        { success: false, error: "Blueprint upload must be a base64 data URL." },
        { status: 400 }
      );
    }

    const layout = await extractBlueprintLayoutWithGemini({
      floorId: body.floorId,
      floorLabel: body.floorLabel ?? body.floorId,
      fileName: body.fileName,
      mimeType: body.mimeType ?? parsedAsset.mimeType,
      base64Data: parsedAsset.base64Data,
    });

    return NextResponse.json({
      success: true,
      data: layout,
    });
  } catch (error) {
    console.error("Blueprint vision parsing failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Blueprint vision parsing failed.",
      },
      { status: 500 }
    );
  }
}
