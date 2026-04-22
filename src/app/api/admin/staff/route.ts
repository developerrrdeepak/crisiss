import { NextResponse } from "next/server";
import { mapStaffForAdmin } from "@/lib/admin-data";
import { createFirebaseEmailPasswordUser } from "@/lib/firebase-auth-rest";
import {
  createStaff,
  findStaffByLookup,
  getStaffById,
  listStaff,
  updateStaff,
  upsertUserLogin,
} from "@/lib/hospitality-data";
import { generateStaffEmployeeId, generateStaffPassword } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await listStaff();

    return NextResponse.json({
      success: true,
      staff: staff.map(mapStaffForAdmin),
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch staff roster" },
      { status: 500 }
    );
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStaffPayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const role = typeof payload.role === "string" ? payload.role.trim() : "";
  const department = typeof payload.department === "string" ? payload.department.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const emergencyContact =
    typeof payload.emergencyContact === "string" ? payload.emergencyContact.trim() : "";
  const bloodGroup =
    typeof payload.bloodGroup === "string" ? payload.bloodGroup.trim().toUpperCase() : "";
  const photoUrl = typeof payload.photoUrl === "string" ? payload.photoUrl.trim() : "";
  const status = typeof payload.status === "string" ? payload.status.trim() : "Active";
  const parsedJoiningDate = parseDate(payload.joiningDate);
  const parsedValidTill = parseDate(payload.validTill);

  return {
    name,
    email,
    role,
    department,
    phone,
    emergencyContact,
    bloodGroup,
    photoUrl,
    status,
    parsedJoiningDate,
    parsedValidTill,
  };
}

async function createUniqueEmployeeId() {
  const existingIds = new Set(
    (await listStaff())
      .map((staff) => staff.employeeId)
      .filter((employeeId): employeeId is string => Boolean(employeeId))
  );

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const employeeId = generateStaffEmployeeId();
    if (!existingIds.has(employeeId)) {
      return employeeId;
    }
  }

  throw new Error("Unable to generate a unique employee ID.");
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const {
      name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
      department: normalizedDepartment,
      phone: normalizedPhone,
      emergencyContact: normalizedEmergencyContact,
      bloodGroup: normalizedBloodGroup,
      photoUrl: normalizedPhotoUrl,
      parsedJoiningDate,
      parsedValidTill,
    } = normalizeStaffPayload(payload);

    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedRole ||
      !normalizedDepartment ||
      !normalizedPhone ||
      !normalizedEmergencyContact ||
      !normalizedBloodGroup ||
      !parsedJoiningDate ||
      !parsedValidTill
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required staff registration fields." },
        { status: 400 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid staff email." },
        { status: 400 }
      );
    }

    if (parsedValidTill.getTime() < parsedJoiningDate.getTime()) {
      return NextResponse.json(
        { success: false, error: "Valid till date must be after joining date." },
        { status: 400 }
      );
    }

    if (normalizedPhotoUrl.length > 4_500_000) {
      return NextResponse.json(
        { success: false, error: "Uploaded photo is too large. Please use a smaller image." },
        { status: 400 }
      );
    }

    const existingStaff = await findStaffByLookup([{ email: normalizedEmail }]);
    if (existingStaff) {
      return NextResponse.json(
        { success: false, error: "A staff account with this email already exists." },
        { status: 400 }
      );
    }

    const employeeId = await createUniqueEmployeeId();
    const password = generateStaffPassword();

    let firebaseUser;
    try {
      firebaseUser = await createFirebaseEmailPasswordUser({
        email: normalizedEmail,
        password,
        displayName: normalizedName,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("EMAIL_EXISTS")) {
        return NextResponse.json(
          { success: false, error: "This staff email already exists in Firebase." },
          { status: 400 }
        );
      }

      throw error;
    }

    const createdStaff = await createStaff({
      employeeId,
      name: normalizedName,
      email: normalizedEmail,
      loginPassword: password,
      firebaseUid: firebaseUser.uid,
      role: normalizedRole,
      department: normalizedDepartment,
      phone: normalizedPhone,
      emergencyContact: normalizedEmergencyContact,
      bloodGroup: normalizedBloodGroup,
      joiningDate: parsedJoiningDate,
      validTill: parsedValidTill,
      photoUrl: normalizedPhotoUrl || null,
      status: "Active",
    });

    await upsertUserLogin({
      firebaseUid: firebaseUser.uid,
      email: normalizedEmail,
      displayName: normalizedName,
      role: "staff",
      lastLogin: new Date(),
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: createdStaff.id,
        employeeId: createdStaff.employeeId,
        name: createdStaff.name,
        email: createdStaff.email,
        role: createdStaff.role,
        department: createdStaff.department,
        phone: createdStaff.phone,
        emergencyContact: createdStaff.emergencyContact,
        bloodGroup: createdStaff.bloodGroup,
        joiningDate: createdStaff.joiningDate?.toISOString() ?? null,
        validTill: createdStaff.validTill?.toISOString() ?? null,
        photoUrl: createdStaff.photoUrl ?? "",
        status: createdStaff.status,
        loginId: normalizedEmail,
        password,
      },
    });
  } catch (error) {
    console.error("Error creating staff profile:", error);
    const message = error instanceof Error ? error.message : "Failed to create staff profile.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    const {
      name,
      role,
      department,
      phone,
      emergencyContact,
      bloodGroup,
      photoUrl,
      status,
      parsedJoiningDate,
      parsedValidTill,
    } = normalizeStaffPayload(payload);

    if (
      !id ||
      !name ||
      !role ||
      !department ||
      !phone ||
      !emergencyContact ||
      !bloodGroup ||
      !parsedJoiningDate ||
      !parsedValidTill
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required staff update fields." },
        { status: 400 }
      );
    }

    if (parsedValidTill.getTime() < parsedJoiningDate.getTime()) {
      return NextResponse.json(
        { success: false, error: "Valid till date must be after joining date." },
        { status: 400 }
      );
    }

    if (photoUrl.length > 4_500_000) {
      return NextResponse.json(
        { success: false, error: "Uploaded photo is too large. Please use a smaller image." },
        { status: 400 }
      );
    }

    const existingStaff = await getStaffById(id);
    if (!existingStaff) {
      return NextResponse.json(
        { success: false, error: "Staff member not found." },
        { status: 404 }
      );
    }

    const updatedStaff = await updateStaff(id, {
      name,
      role,
      department,
      phone,
      emergencyContact,
      bloodGroup,
      joiningDate: parsedJoiningDate,
      validTill: parsedValidTill,
      photoUrl: photoUrl || null,
      status: status || "Active",
    });

    return NextResponse.json({
      success: true,
      staff: updatedStaff ? mapStaffForAdmin(updatedStaff) : null,
    });
  } catch (error) {
    console.error("Error updating staff profile:", error);
    const message = error instanceof Error ? error.message : "Failed to update staff profile.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
