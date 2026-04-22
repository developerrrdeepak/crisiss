import { NextResponse } from "next/server";
import {
  buildDashboardNotifications,
  mapGuestForAdmin,
  mapIncidentForAdmin,
  mapPendingGuest,
  mapRoomForAdmin,
  mapStaffForAdmin,
} from "@/lib/admin-data";
import {
  listGuests,
  listIncidents,
  listRooms,
  listStaff,
} from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [incidents, guests, staff, rooms] = await Promise.all([
      listIncidents(),
      listGuests(),
      listStaff(),
      listRooms(),
    ]);

    const mappedIncidents = incidents.map(mapIncidentForAdmin);
    const mappedGuests = guests.map(mapGuestForAdmin);
    const mappedStaff = staff.map(mapStaffForAdmin);
    const mappedRooms = rooms.map(mapRoomForAdmin);
    const pendingGuests = guests
      .filter((guest) => !guest.roomId && guest.status.toLowerCase() !== "checked out")
      .map(mapPendingGuest);
    const activeIncidentCount = incidents.filter(
      (incident) => incident.status.toLowerCase() !== "resolved"
    ).length;
    const vacantRoomCount = rooms.filter((room) => room.status === "vacant").length;
    const occupiedRoomCount = rooms.filter((room) => room.status === "occupied").length;

    return NextResponse.json({
      success: true,
      data: {
        incidents: mappedIncidents,
        guests: mappedGuests,
        pendingGuests,
        staff: mappedStaff,
        rooms: mappedRooms,
        summary: {
          totalGuests: guests.length,
          activeStaff: staff.filter(
            (member) => member.status.toLowerCase() !== "inactive"
          ).length,
          roomsAvailable: vacantRoomCount,
          systemAlerts: activeIncidentCount,
          totalRooms: rooms.length,
          occupiedRooms: occupiedRoomCount,
          occupancyRate:
            rooms.length > 0
              ? Math.round((occupiedRoomCount / rooms.length) * 100)
              : 0,
        },
        notifications: buildDashboardNotifications({
          incidents,
          guests,
          rooms,
          staff,
        }),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
