import { NextResponse } from "next/server";
import { mapGuestForAdmin } from "@/lib/admin-data";
import { listGuests } from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guests = await listGuests();

    return NextResponse.json({
      success: true,
      guests: guests.map((g) => ({
        ...mapGuestForAdmin(g),
        idNumber: (g as { idNumber?: string | null }).idNumber ?? null,
        contact: (g as { contact?: string | null }).contact ?? null,
        address: (g as { address?: string | null }).address ?? null,
        loginEmail: (g as { loginEmail?: string | null }).loginEmail ?? null,
        loginPassword: (g as { loginPassword?: string | null }).loginPassword ?? null,
        roomId: (g as { roomId?: string | null }).roomId ?? null,
      })),
    });
  } catch (error) {
    console.error("Error fetching guests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guests" },
      { status: 500 }
    );
  }
}
