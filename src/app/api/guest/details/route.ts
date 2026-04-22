import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getGuestById, getRoomById, updateGuest } from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const guest = await getGuestById(id);

    if (!guest) {
      return NextResponse.json({
        success: false,
        error: "Guest not found",
      }, { status: 404 });
    }

    const loginToken =
      guest.loginToken ??
      randomBytes(32).toString("hex");

    if (!guest.loginToken) {
      await updateGuest(guest.id, { loginToken });
    }

    const roomStatus = guest.roomId
      ? (await getRoomById(guest.roomId))?.status ?? null
      : null;

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        name: guest.name,
        room: guest.roomNumber ?? "",
        email: guest.email ?? guest.loginEmail ?? "",
        loginToken,
        loginEmail: guest.loginEmail ?? guest.email ?? "",
        loginPassword: guest.loginPassword ?? "",
        idNumber: guest.idNumber ?? null,
        contact: guest.contact ?? null,
        address: guest.address ?? null,
        qrPayload: guest.qrPayload ?? "",
        roomStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching guest details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guest details" },
      { status: 500 }
    );
  }
}
