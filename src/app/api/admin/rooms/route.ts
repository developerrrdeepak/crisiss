import { NextRequest, NextResponse } from "next/server";
import { mapRoomForAdmin } from "@/lib/admin-data";
import { isDataConnectConfigured } from "@/lib/data-connect";
import {
  countGuestsByRoom,
  createRoom,
  deleteRoom as deletePersistentRoom,
  getGuestById,
  getRoomById,
  listRooms,
  updateGuest,
  updateRoom,
} from "@/lib/hospitality-data";

export const dynamic = "force-dynamic";

type RoomStatus = "vacant" | "occupied" | "cleaning" | "maintenance";

const ROOM_STATUSES = new Set<RoomStatus>([
  "vacant",
  "occupied",
  "cleaning",
  "maintenance",
]);

const DATA_CONNECT_UNAVAILABLE_MESSAGE = "Firebase Data Connect is not configured.";

function hasConfiguredDataConnect() {
  return isDataConnectConfigured();
}

function dataConnectUnavailableResponse() {
  return NextResponse.json(
    { success: false, error: DATA_CONNECT_UNAVAILABLE_MESSAGE },
    { status: 503 }
  );
}

function parseRoomNumber(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized.length > 0 ? normalized : null;
}

function parseRoomType(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function parseFloor(value: unknown) {
  const normalized = Number.parseInt(String(value), 10);
  return Number.isInteger(normalized) && normalized >= 0 ? normalized : null;
}

function parseRoomStatus(value: unknown): RoomStatus | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return ROOM_STATUSES.has(normalized as RoomStatus)
    ? (normalized as RoomStatus)
    : null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    const normalized = error.message.toLowerCase();

    if (
      normalized.includes("unique constraint") ||
      normalized.includes("duplicate") ||
      normalized.includes("unique") ||
      normalized.includes("already exists")
    ) {
      return "Room number already exists.";
    }

    return error.message;
  }

  return fallback;
}

export async function GET() {
  if (!hasConfiguredDataConnect()) {
    return dataConnectUnavailableResponse();
  }

  try {
    const rooms = await listRooms();

    return NextResponse.json({
      success: true,
      rooms: rooms.map(mapRoomForAdmin),
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch rooms from Data Connect." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!hasConfiguredDataConnect()) {
    return dataConnectUnavailableResponse();
  }

  try {
    const { number, floor, type, status } = await req.json();

    const roomNumber = parseRoomNumber(number);
    const roomFloor = parseFloor(floor);
    const roomType = parseRoomType(type);
    const roomStatus = status ? parseRoomStatus(status) : "vacant";

    if (!roomNumber || roomFloor === null || !roomType || !roomStatus) {
      return NextResponse.json(
        { success: false, error: "number, floor, type, and a valid status are required" },
        { status: 400 }
      );
    }

    const persistedRooms = await listRooms();
    if (persistedRooms.some((room) => room.number === roomNumber)) {
      return NextResponse.json(
        { success: false, error: "Room number already exists." },
        { status: 409 }
      );
    }

    const room = await createRoom({
      number: roomNumber,
      floor: roomFloor,
      type: roomType,
      status: roomStatus,
    });

    return NextResponse.json(
      {
        success: true,
        room: mapRoomForAdmin(room),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, "Failed to create room.") },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!hasConfiguredDataConnect()) {
    return dataConnectUnavailableResponse();
  }

  try {
    const { action, roomId, guestId, status, number, floor, type } = await req.json();

    if (!action || !roomId) {
      return NextResponse.json(
        { success: false, error: "action and roomId are required" },
        { status: 400 }
      );
    }

    if (action === "assignGuest") {
      if (!guestId) {
        return NextResponse.json(
          { success: false, error: "guestId is required for assignment" },
          { status: 400 }
        );
      }

      const room = await getRoomById(roomId);
      if (!room) {
        return NextResponse.json(
          { success: false, error: "Room not found" },
          { status: 404 }
        );
      }

      if (parseRoomStatus(room.status) !== "vacant") {
        return NextResponse.json(
          { success: false, error: "Only vacant rooms can receive a guest." },
          { status: 400 }
        );
      }

      const guest = await getGuestById(guestId);
      if (!guest) {
        return NextResponse.json(
          { success: false, error: "Guest not found" },
          { status: 404 }
        );
      }

      if (guest.status.toLowerCase() === "checked out") {
        return NextResponse.json(
          { success: false, error: "Checked-out guests cannot be assigned." },
          { status: 400 }
        );
      }

      if (guest.roomId && guest.roomId !== roomId) {
        const remainingAssignments = await countGuestsByRoom(guest.roomId, guest.id);

        if (remainingAssignments === 0) {
          await updateRoom(guest.roomId, { status: "vacant" });
        }
      }

      await updateGuest(guest.id, {
        roomId,
        roomNumber: room.number,
        status: "In Room",
        checkIn: new Date(),
      });
      await updateRoom(roomId, { status: "occupied" });

      const updatedRoom = await getRoomById(roomId);
      return NextResponse.json({
        success: true,
        room: updatedRoom ? mapRoomForAdmin(updatedRoom) : null,
      });
    }

    if (action === "updateStatus") {
      const nextStatus = parseRoomStatus(status);

      if (!nextStatus) {
        return NextResponse.json(
          { success: false, error: "A valid status is required for updateStatus" },
          { status: 400 }
        );
      }

      const room = await getRoomById(roomId);
      if (!room) {
        return NextResponse.json(
          { success: false, error: "Room not found" },
          { status: 404 }
        );
      }

      const currentGuest = room.guests?.[0];

      if (nextStatus === "occupied" && !currentGuest) {
        return NextResponse.json(
          { success: false, error: "Assign a guest before marking a room occupied." },
          { status: 400 }
        );
      }

      if (currentGuest && nextStatus !== "occupied") {
        await updateGuest(currentGuest.id, {
          roomId: null,
          roomNumber: room.number,
          status: "Checked Out",
          checkOut: new Date(),
        });
      }

      await updateRoom(roomId, { status: nextStatus });

      const updatedRoom = await getRoomById(roomId);
      return NextResponse.json({
        success: true,
        room: updatedRoom ? mapRoomForAdmin(updatedRoom) : null,
      });
    }

    if (action === "updateDetails") {
      const roomNumber = parseRoomNumber(number);
      const roomFloor = parseFloor(floor);
      const roomType = parseRoomType(type);

      if (!roomNumber || roomFloor === null || !roomType) {
        return NextResponse.json(
          { success: false, error: "number, floor, and type are required for updateDetails" },
          { status: 400 }
        );
      }

      const persistedRooms = await listRooms();
      const duplicatePersistentRoom = persistedRooms.find(
        (room) => room.id !== roomId && room.number === roomNumber
      );

      if (duplicatePersistentRoom) {
        return NextResponse.json(
          { success: false, error: "Room number already exists." },
          { status: 409 }
        );
      }

      const room = await getRoomById(roomId);
      if (!room) {
        return NextResponse.json(
          { success: false, error: "Room not found" },
          { status: 404 }
        );
      }

      const currentGuest = room.guests?.[0];

      await updateRoom(roomId, {
        number: roomNumber,
        floor: roomFloor,
        type: roomType,
      });

      if (currentGuest) {
        await updateGuest(currentGuest.id, { roomNumber });
      }

      const updatedRoom = await getRoomById(roomId);
      return NextResponse.json({
        success: true,
        room: updatedRoom ? mapRoomForAdmin(updatedRoom) : null,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, "Failed to update room state") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!hasConfiguredDataConnect()) {
    return dataConnectUnavailableResponse();
  }

  try {
    const roomId = req.nextUrl.searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "roomId query parameter is required" },
        { status: 400 }
      );
    }

    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 }
      );
    }

    if (room.guests?.[0] || parseRoomStatus(room.status) === "occupied") {
      return NextResponse.json(
        { success: false, error: "Remove the active guest assignment before deleting this room." },
        { status: 400 }
      );
    }

    await deletePersistentRoom(roomId);

    return NextResponse.json({
      success: true,
      roomId,
    });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, "Failed to delete room.") },
      { status: 500 }
    );
  }
}
