import { NextRequest, NextResponse } from "next/server";
import { mapIncidentForAdmin } from "@/lib/admin-data";
import { createIncident, listIncidents, updateIncident } from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const incidents = await listIncidents();

    return NextResponse.json({
      success: true,
      incidents: incidents.map(mapIncidentForAdmin),
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, title, description, severity, roomId, status } = await req.json();

    if (!title || !severity) {
      return NextResponse.json(
        { success: false, error: "title and severity are required" },
        { status: 400 }
      );
    }

    const incident = await createIncident({
      id: typeof id === "string" && id.trim() ? id.trim() : undefined,
      title,
      description: description ?? null,
      severity,
      roomId: roomId ?? null,
      status: status ?? "Active",
    });

    return NextResponse.json({
      success: true,
      incident: mapIncidentForAdmin(incident),
    });
  } catch (error) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create incident" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "id and status are required" },
        { status: 400 }
      );
    }

    const incident = await updateIncident(id, { status });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      incident: mapIncidentForAdmin(incident),
    });
  } catch (error) {
    console.error("Error updating incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update incident" },
      { status: 500 }
    );
  }
}
