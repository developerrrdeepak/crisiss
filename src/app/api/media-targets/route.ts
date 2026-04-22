import { NextResponse } from "next/server";
import { getConfiguredClientMediaTargets } from "@/lib/mediamtx";

export async function GET() {
  return NextResponse.json(
    { targets: getConfiguredClientMediaTargets() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
