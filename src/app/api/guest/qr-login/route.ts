import { NextRequest, NextResponse } from "next/server";
import { getGuestByLoginToken } from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "token is required" },
        { status: 400 }
      );
    }

    const guest = await getGuestByLoginToken(token);

    if (!guest || !guest.loginEmail || !guest.loginPassword) {
      return NextResponse.json(
        { success: false, error: "Guest access credentials not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        loginId: guest.loginEmail,
        password: guest.loginPassword,
      },
      guest: {
        id: guest.id,
        name: guest.name,
        roomNumber: guest.roomNumber,
        idNumber: guest.idNumber,
        contact: guest.contact,
        address: guest.address,
        qrPayload: guest.qrPayload,
      },
    });
  } catch (error) {
    console.error("Error resolving QR login:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve QR login." },
      { status: 500 }
    );
  }
}
