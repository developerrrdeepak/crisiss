import { NextRequest, NextResponse } from "next/server";
import { IncidentLike } from "@/lib/admin-data";
import {
  buildAdminHeaderNotifications,
  buildGuestHeaderNotifications,
  buildPendingProfileNotification,
  buildStaffHeaderNotifications,
} from "@/lib/header-notifications";
import {
  countActiveStaffByDepartment,
  findGuestByLookup,
  findStaffByLookup,
  getUserLoginByFirebaseUid,
  listGuests,
  listIncidents,
  listRooms,
  listStaff,
} from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportedRole = "admin" | "staff" | "guest";

function normalizeRole(value: string | null): SupportedRole {
  if (value === "admin" || value === "staff") return value;
  return "guest";
}

function buildLookupConditions(firebaseUid: string, email?: string | null) {
  const conditions: Array<{ firebaseUid?: string; email?: string }> = [];

  if (firebaseUid) {
    conditions.push({ firebaseUid });
  }

  if (email) {
    conditions.push({ email });
  }

  return conditions;
}

async function getLinkedProfiles(firebaseUid: string) {
  const userLogin = await getUserLoginByFirebaseUid(firebaseUid);

  if (!userLogin) {
    return { userLogin: null, guest: null, staff: null };
  }

  const lookupConditions = buildLookupConditions(firebaseUid, userLogin.email);

  const [guest, staff] = await Promise.all([
    findGuestByLookup(lookupConditions),
    findStaffByLookup(lookupConditions),
  ]);

  return {
    userLogin,
    guest,
    staff,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = normalizeRole(searchParams.get("role"));
    const uid = searchParams.get("uid");

    if (role === "admin") {
      const [rawIncidents, rawGuests, rawStaff, rawRooms] = await Promise.all([
        listIncidents(),
        listGuests(),
        listStaff(),
        listRooms(),
      ]);

      return NextResponse.json({
        success: true,
        notifications: buildAdminHeaderNotifications({
          incidents: rawIncidents as IncidentLike[],
          guests: rawGuests,
          staff: rawStaff,
          rooms: rawRooms,
        }),
      });
    }

    if (!uid) {
      return NextResponse.json(
        { success: false, error: "uid is required for guest and staff notifications" },
        { status: 400 }
      );
    }

    const { userLogin, guest, staff } = await getLinkedProfiles(uid);

    if (!userLogin) {
      return NextResponse.json(
        { success: false, error: "User login not found" },
        { status: 404 }
      );
    }

    const incidents = (await listIncidents()) as IncidentLike[];

    if (role === "staff") {
      if (!staff) {
        return NextResponse.json({
          success: true,
          notifications: buildPendingProfileNotification({
            id: userLogin.id,
            role: "staff",
            email: userLogin.email,
            displayName: userLogin.displayName,
            createdAt: userLogin.createdAt,
          }),
        });
      }

      const activeDepartmentCount = staff.department
        ? await countActiveStaffByDepartment(staff.department)
        : 0;

      return NextResponse.json({
        success: true,
        notifications: buildStaffHeaderNotifications({
          staff,
          activeDepartmentCount,
          incidents,
        }),
      });
    }

    if (!guest) {
      return NextResponse.json({
        success: true,
        notifications: buildPendingProfileNotification({
          id: userLogin.id,
          role: "guest",
          email: userLogin.email,
          displayName: userLogin.displayName,
          createdAt: userLogin.createdAt,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      notifications: buildGuestHeaderNotifications({
        guest,
        incidents,
      }),
    });
  } catch (error) {
    console.error("Failed to load header notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
