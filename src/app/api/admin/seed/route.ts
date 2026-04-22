import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Mock seeding is disabled. Create real Firebase Data Connect records instead.",
    },
    { status: 410 }
  );
}
