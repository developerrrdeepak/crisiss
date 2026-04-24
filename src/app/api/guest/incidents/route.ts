import { NextRequest, NextResponse } from "next/server";
import { formatRelativeTime } from "@/lib/admin-data";
import {
  createIncident,
  listGuests,
  listIncidents,
  updateIncident,
} from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

type IncidentRecord = {
  id: string;
  title: string;
  severity: string;
  status: string;
  timestamp: Date;
  roomId: string | null;
  description: string | null;
};

const normalizeRoom = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const isRoomMatch = (incidentRoom: string | null, requestedRoom?: string | null) => {
  if (!requestedRoom) return true;
  return normalizeRoom(incidentRoom) === normalizeRoom(requestedRoom);
};

const buildGuestNameLookup = (entries: Array<{ roomNumber: string | null; name: string }>) => {
  const lookup = new Map<string, string>();

  for (const entry of entries) {
    const roomKey = normalizeRoom(entry.roomNumber);
    if (!roomKey) continue;
    lookup.set(roomKey, entry.name);
  }

  return lookup;
};

const mapIncident = (incident: IncidentRecord, guestNameLookup: Map<string, string>) => ({
  id: incident.id,
  title: incident.title,
  description: incident.description ?? incident.title,
  severity: incident.severity,
  status: incident.status,
  timestamp: incident.timestamp.toISOString(),
  roomId: incident.roomId ?? null,
  guestName: guestNameLookup.get(normalizeRoom(incident.roomId)) ?? null,
  timeAgo: formatRelativeTime(incident.timestamp),
});

async function resolveGuestNameLookup() {
  const guests = await listGuests();

  return buildGuestNameLookup(guests);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");

  try {
    const [incidents, guestNameLookup] = await Promise.all([
      listIncidents(),
      resolveGuestNameLookup(),
    ]);

    return NextResponse.json({
      success: true,
      incidents: incidents
        .filter((incident) => isRoomMatch(incident.roomId, room))
        .map((incident) => mapIncident(incident, guestNameLookup)),
    });
  } catch (error) {
    console.error("Error fetching guest incidents:", error);

    return NextResponse.json({
      success: false,
      error: "Failed to fetch guest incidents",
    }, { status: 500 });
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
    const guestNameLookup = await resolveGuestNameLookup();

    return NextResponse.json({
      success: true,
      incident: mapIncident(incident, guestNameLookup),
    });
  } catch (error) {
    console.error("Error creating guest incident:", error);
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
    const guestNameLookup = await resolveGuestNameLookup();

    return NextResponse.json({
      success: true,
      incident: mapIncident(incident, guestNameLookup),
    });
  } catch (error) {
    console.error("Error updating guest incident:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update incident" },
      { status: 500 }
    );
  }
}
