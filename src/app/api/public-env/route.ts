import { NextResponse } from "next/server";
import { getPublicRuntimeEnv } from "@/lib/public-env";

export async function GET() {
  return NextResponse.json(
    { config: getPublicRuntimeEnv() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
