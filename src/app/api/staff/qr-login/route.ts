import { NextRequest, NextResponse } from "next/server";
import { getStaffByEmployeeId } from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId")?.trim();

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "employeeId is required" },
        { status: 400 }
      );
    }

    const staff = await getStaffByEmployeeId(employeeId);

    if (!staff || !staff.email || !staff.loginPassword) {
      return NextResponse.json(
        { success: false, error: "Staff QR access credentials not found" },
        { status: 404 }
      );
    }

    if ((staff.status || "").toLowerCase() === "inactive") {
      return NextResponse.json(
        { success: false, error: "This staff account is inactive." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        loginId: staff.email,
        password: staff.loginPassword,
      },
      staff: {
        id: staff.id,
        name: staff.name,
        employeeId: staff.employeeId,
        role: staff.role,
        department: staff.department,
      },
    });
  } catch (error) {
    console.error("Error resolving staff QR login:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve staff QR login." },
      { status: 500 }
    );
  }
}
