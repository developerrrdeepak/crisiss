export interface GuestLike {
  id: string;
  name: string;
  email: string | null;
  roomId: string | null;
  roomNumber: string | null;
  checkIn: Date;
  checkOut: Date | null;
  status: string;
  loginToken: string | null;
  createdAt: Date;
}

export interface StaffLike {
  id: string;
  name: string;
  email: string | null;
  employeeId?: string | null;
  role: string;
  department: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  bloodGroup?: string | null;
  joiningDate?: Date | null;
  validTill?: Date | null;
  photoUrl?: string | null;
  status: string;
  createdAt: Date;
}

export interface IncidentLike {
  id: string;
  title: string;
  severity: string;
  status: string;
  timestamp: Date;
  roomId: string | null;
  description: string | null;
}

export interface RoomGuestLike {
  id: string;
  name: string;
  status: string;
  checkIn: Date;
  checkOut: Date | null;
  createdAt: Date;
}

export interface RoomLike {
  id: string;
  number: string;
  floor: number;
  type: string;
  status: string;
  guests?: RoomGuestLike[];
}

export interface AdminNotification {
  id: string;
  type: "info" | "warning" | "success" | "alert";
  title: string;
  message: string;
  time: string;
}

export interface AdminGuestView {
  id: string;
  name: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
  loginToken: string;
}

export interface AdminStaffView {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  department: string;
  phone: string;
  emergencyContact: string;
  bloodGroup: string;
  joiningDate: string;
  validTill: string;
  photoUrl: string;
  sector: string;
  shift: string;
  st: string;
}

export interface AdminIncidentView {
  id: string;
  title: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  timestamp: string;
  guestId: string;
  roomId: string | null;
  timeAgo: string;
}

export interface AdminRoomView {
  id: string;
  num: string;
  state: "vacant" | "occupied" | "cleaning" | "maintenance";
  floor: number;
  type: string;
  guestName?: string;
  guestId?: string;
  guestStatus?: string;
}

export interface PendingGuestView {
  id: string;
  name: string;
  type: string;
  nights: number;
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export function toDisplayStatus(value?: string | null): string {
  if (!value) return "Unknown";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(" ");
}

export function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return "Just now";

  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getGuestStatus(guest: GuestLike): string {
  if (guest.roomId) return "In Room";
  if (guest.checkOut && guest.checkOut.getTime() < Date.now()) return "Checked Out";

  const normalizedStatus = guest.status?.toLowerCase();
  if (normalizedStatus === "active") return "In Room";
  if (normalizedStatus === "booked") return "Booked";

  return toDisplayStatus(guest.status);
}

function getGuestType(guest: GuestLike): string {
  if (guest.roomNumber?.toUpperCase().startsWith("PH")) return "VIP";

  const nights = getGuestNights(guest);
  if (nights >= 5) return "Corporate";

  return "Standard";
}

function getGuestNights(guest: Pick<GuestLike, "checkIn" | "checkOut">): number {
  if (!guest.checkOut) return 1;

  const diff = guest.checkOut.getTime() - guest.checkIn.getTime();
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function mapGuestForAdmin(guest: GuestLike): AdminGuestView {
  return {
    id: guest.id,
    name: guest.name,
    email: guest.email ?? "",
    room: guest.roomNumber ?? "",
    checkIn: guest.checkIn.toISOString(),
    checkOut: guest.checkOut?.toISOString() ?? "",
    status: getGuestStatus(guest),
    loginToken: guest.loginToken ?? "",
  };
}

export function mapPendingGuest(guest: GuestLike): PendingGuestView {
  return {
    id: guest.id,
    name: guest.name,
    type: getGuestType(guest),
    nights: getGuestNights(guest),
  };
}

export function deriveStaffSector(staff: Pick<StaffLike, "department" | "role">): string {
  if (staff.department) return staff.department;

  const role = staff.role.toLowerCase();
  if (role.includes("concierge")) return "Lobby";
  if (role.includes("maintenance")) return "Engineering";
  if (role.includes("housekeeping")) return "Guest Floors";
  if (role.includes("security")) return "Security Grid";
  if (role.includes("admin")) return "Command Center";

  return "General Operations";
}

export function deriveStaffShift(staff: Pick<StaffLike, "role">): string {
  const role = staff.role.toLowerCase();
  if (role.includes("concierge")) return "06:00 - 14:00";
  if (role.includes("maintenance")) return "12:00 - 20:00";
  if (role.includes("housekeeping")) return "08:00 - 16:00";
  if (role.includes("security")) return "18:00 - 06:00";
  if (role.includes("admin")) return "24/7";

  return "09:00 - 17:00";
}

export function mapStaffForAdmin(staff: StaffLike): AdminStaffView {
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email ?? "",
    employeeId: staff.employeeId ?? "",
    role: staff.role,
    department: staff.department ?? "",
    phone: staff.phone ?? "",
    emergencyContact: staff.emergencyContact ?? "",
    bloodGroup: staff.bloodGroup ?? "",
    joiningDate:
      staff.joiningDate instanceof Date ? staff.joiningDate.toISOString() : "",
    validTill:
      staff.validTill instanceof Date ? staff.validTill.toISOString() : "",
    photoUrl: staff.photoUrl ?? "",
    sector: deriveStaffSector(staff),
    shift: deriveStaffShift(staff),
    st: toDisplayStatus(staff.status),
  };
}

export function mapIncidentForAdmin(incident: IncidentLike): AdminIncidentView {
  return {
    id: incident.id,
    title: incident.title,
    type: incident.severity,
    description: incident.description ?? incident.title,
    severity: incident.severity,
    status: incident.status,
    timestamp: incident.timestamp.toISOString(),
    guestId: incident.roomId ?? "",
    roomId: incident.roomId ?? null,
    timeAgo: formatRelativeTime(incident.timestamp),
  };
}

export function mapRoomForAdmin(room: RoomLike): AdminRoomView {
  const currentGuest = room.guests?.[0];
  const allowedStates = new Set(["vacant", "occupied", "cleaning", "maintenance"]);
  const state = allowedStates.has(room.status) ? room.status : "vacant";

  return {
    id: room.id,
    num: room.number,
    state: state as AdminRoomView["state"],
    floor: room.floor,
    type: room.type,
    guestName: currentGuest?.name,
    guestId: currentGuest?.id,
    guestStatus: currentGuest?.status,
  };
}

export function buildDashboardNotifications(params: {
  incidents: IncidentLike[];
  guests: GuestLike[];
  rooms: RoomLike[];
  staff: StaffLike[];
}): AdminNotification[] {
  const notifications: AdminNotification[] = [];
  const activeIncident = params.incidents.find(
    (incident) => incident.status.toLowerCase() !== "resolved"
  );

  if (activeIncident) {
    notifications.push({
      id: `incident-${activeIncident.id}`,
      type: "alert",
      title: activeIncident.title,
      message: activeIncident.description ?? "Active incident requires review.",
      time: formatRelativeTime(activeIncident.timestamp),
    });
  }

  const nextCheckout = [...params.guests]
    .filter((guest) => guest.checkOut && guest.checkOut.getTime() > Date.now())
    .sort((left, right) => {
      const leftTime = left.checkOut?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = right.checkOut?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })[0];

  if (nextCheckout) {
    notifications.push({
      id: `guest-${nextCheckout.id}`,
      type: "info",
      title: "Upcoming Check-Out",
      message: `${nextCheckout.name} is scheduled to check out from room ${
        nextCheckout.roomNumber || "unassigned"
      }.`,
      time: formatRelativeTime(nextCheckout.createdAt),
    });
  }

  const vacantRooms = params.rooms.filter((room) => room.status === "vacant").length;
  const occupiedRooms = params.rooms.filter((room) => room.status === "occupied").length;
  const activeStaff = params.staff.filter(
    (staff) => staff.status.toLowerCase() !== "inactive"
  ).length;

  notifications.push({
    id: "system-status",
    type: vacantRooms === 0 ? "warning" : "success",
    title: "System Status",
    message: `${activeStaff} staff active, ${occupiedRooms} rooms occupied, ${vacantRooms} rooms available.`,
    time: "Live",
  });

  return notifications.slice(0, 3);
}

export function formatFloorLabel(floor: number): string {
  const remainder = floor % 10;
  const suffix =
    floor % 100 >= 11 && floor % 100 <= 13
      ? "th"
      : remainder === 1
        ? "st"
        : remainder === 2
          ? "nd"
          : remainder === 3
            ? "rd"
            : "th";

  return `${floor}${suffix} Floor`;
}

