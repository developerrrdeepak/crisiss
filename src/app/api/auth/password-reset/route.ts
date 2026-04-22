import { NextRequest, NextResponse } from "next/server";
import {
  findGuestByLookup,
  findStaffByLookup,
  getUserLoginByFirebaseUid,
  updateGuestsByLookup,
  updateStaffByLookup,
} from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

type SupportedRole = "guest" | "staff";

async function findUserWithProfile(firebaseUid: string) {
  const userLogin = await getUserLoginByFirebaseUid(firebaseUid);

  if (!userLogin) {
    return { userLogin: null, guest: null, staff: null };
  }

  const lookup: Array<{ firebaseUid?: string; email?: string }> = [{ firebaseUid }];
  if (userLogin.email) {
    lookup.push({ email: userLogin.email });
  }

  const [guest, staff] = await Promise.all([
    findGuestByLookup(lookup),
    findStaffByLookup(lookup),
  ]);

  return { userLogin, guest, staff };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get("uid");

    if (!firebaseUid) {
      return NextResponse.json(
        { success: false, error: "uid is required" },
        { status: 400 }
      );
    }

    const { userLogin, guest, staff } = await findUserWithProfile(firebaseUid);

    if (!userLogin) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const role =
      userLogin.role === "staff"
        ? "staff"
        : userLogin.role === "guest"
          ? "guest"
          : null;
    const profile = role === "staff" ? staff : role === "guest" ? guest : null;

    return NextResponse.json({
      success: true,
      role,
      requiresPasswordReset: Boolean(profile?.loginPassword),
    });
  } catch (error) {
    console.error("Error checking password reset status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check password reset status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = (await req.json()) as {
      uid?: string;
      role?: SupportedRole;
    };

    if (!uid || (role !== "guest" && role !== "staff")) {
      return NextResponse.json(
        { success: false, error: "uid and valid role are required" },
        { status: 400 }
      );
    }

    const { userLogin } = await findUserWithProfile(uid);
    if (!userLogin) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const lookup: Array<{ firebaseUid?: string; email?: string }> = [{ firebaseUid: uid }];
    if (userLogin.email) {
      lookup.push({ email: userLogin.email });
    }

    if (role === "guest") {
      await updateGuestsByLookup(lookup, { loginPassword: null });
    }

    if (role === "staff") {
      await updateStaffByLookup(lookup, { loginPassword: null });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing password reset:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete password reset" },
      { status: 500 }
    );
  }
}
