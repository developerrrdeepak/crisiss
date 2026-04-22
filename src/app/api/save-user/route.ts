export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import {
  createGuest,
  createStaff,
  findGuestByLookup,
  findStaffByLookup,
  getUserLoginByFirebaseUid,
  updateGuest,
  updateStaff,
  upsertUserLogin,
} from "@/lib/hospitality-data";

interface SaveUserRequest {
  uid: string;
  name: string;
  email: string;
  role?: "guest" | "staff" | "admin";
}

function generateFallbackName(email: string | null): string {
  if (!email) return "Guest";
  return email.split("@")[0].split(/[._-]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
}

function generateRoomNumber(): string {
  return `G${Math.floor(Math.random() * 900) + 100}`;
}

export async function POST(req: NextRequest) {
  try {
    const { uid, name, email, role = "guest" }: SaveUserRequest = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ success: false, error: "uid and email are required" }, { status: 400 });
    }

    const normalizedRole = role === "staff" || role === "admin" ? role : "guest";
    const finalName = name?.trim() || generateFallbackName(email);

    // 1. SAVE TO UserLogin TABLE (Centralized Login Tracking)
    await upsertUserLogin({
      firebaseUid: uid,
      email,
      displayName: finalName,
      role: normalizedRole,
      lastLogin: new Date(),
    });

    // 2. SAVE TO ROLE-SPECIFIC TABLES
    if (normalizedRole === "guest") {
      const existingGuest = await findGuestByLookup([{ firebaseUid: uid }, { email }]);

      if (existingGuest) {
        const updatedGuest = await updateGuest(existingGuest.id, {
          firebaseUid: uid,
          email,
          name: existingGuest.name || finalName,
        });
        return NextResponse.json({ success: true, user: { ...updatedGuest, role: "guest" } });
      }

      const newGuest = await createGuest({
        firebaseUid: uid,
        email,
        name: finalName,
        roomNumber: generateRoomNumber(),
        status: "active",
        checkOut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        loginToken: null,
        idNumber: null,
        contact: null,
        address: null,
        loginEmail: null,
        loginPassword: null,
        qrPayload: null,
        roomId: null,
      });
      return NextResponse.json({ success: true, user: { ...newGuest, role: "guest" } });
    }

    if (normalizedRole === "admin") {
      return NextResponse.json({
        success: true,
        user: {
          id: uid,
          firebaseUid: uid,
          email,
          name: finalName,
          displayName: finalName,
          role: "admin",
        },
      });
    }

    // Handle Staff
    if (normalizedRole === "staff") {
      const existingStaff = await findStaffByLookup([{ firebaseUid: uid }, { email }]);

      if (existingStaff) {
        const updatedStaff = await updateStaff(existingStaff.id, {
          firebaseUid: uid,
          email,
          name: existingStaff.name || finalName,
          role: existingStaff.role || normalizedRole,
        });
        return NextResponse.json({ success: true, user: { ...updatedStaff, role: normalizedRole } });
      }

      const newStaff = await createStaff({
        firebaseUid: uid,
        email,
        name: finalName,
        role: normalizedRole,
        status: "active",
        employeeId: null,
        loginPassword: null,
        department: null,
        phone: null,
        emergencyContact: null,
        bloodGroup: null,
        validTill: null,
        photoUrl: null,
      });
      return NextResponse.json({ success: true, user: { ...newStaff, role: normalizedRole } });
    }

    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  } catch (error) {
    console.error("Error saving user:", error);
    return NextResponse.json({ success: false, error: "Failed to save user data" }, { status: 500 });
  }
}

// NEW GET HANDLER TO FIX 405 ERROR
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get('uid');

    if (!firebaseUid) {
      return NextResponse.json({ success: false, error: 'uid query parameter is required' }, { status: 400 });
    }

    // Find the central user login record first
    const userLogin = await getUserLoginByFirebaseUid(firebaseUid);

    if (!userLogin) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let userProfile = null;
    if (userLogin.role === 'guest') {
      userProfile = await findGuestByLookup([{ firebaseUid }]);
    } else if (userLogin.role === 'staff') {
      userProfile = await findStaffByLookup([{ firebaseUid }]);
    }

    return NextResponse.json({ success: true, user: { ...userLogin, ...userProfile } });

  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch user data" }, { status: 500 });
  }
}
