import {
  buildDashboardNotifications,
  formatRelativeTime,
  GuestLike,
  IncidentLike,
  RoomLike,
  StaffLike,
  toDisplayStatus,
} from "@/lib/admin-data";

export interface HeaderNotificationItem {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

type NotificationTone = "info" | "warning" | "success" | "alert";

function getNotificationAppearance(type: NotificationTone) {
  return {
    alert: {
      icon: "warning",
      iconBg: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
    },
    warning: {
      icon: "info",
      iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    },
    success: {
      icon: "check_circle",
      iconBg: "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400",
    },
    info: {
      icon: "notifications",
      iconBg: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    },
  }[type];
}

function buildNotification(
  id: string,
  type: NotificationTone,
  title: string,
  body: string,
  time: string
): HeaderNotificationItem {
  return {
    id,
    ...getNotificationAppearance(type),
    title,
    body,
    time,
    unread: true,
  };
}

function formatDateLabel(value: Date | string | null | undefined) {
  if (!value) return "Pending";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function buildAdminHeaderNotifications(params: {
  incidents: IncidentLike[];
  guests: GuestLike[];
  rooms: RoomLike[];
  staff: StaffLike[];
}) {
  return buildDashboardNotifications(params).map((notification) =>
    buildNotification(
      notification.id,
      notification.type,
      notification.title,
      notification.message,
      notification.time
    )
  );
}

export function buildGuestHeaderNotifications(params: {
  guest: Pick<GuestLike, "id" | "name" | "email" | "roomId" | "roomNumber" | "checkIn" | "checkOut" | "status" | "createdAt">;
  incidents: IncidentLike[];
}) {
  const notifications: HeaderNotificationItem[] = [];
  const normalizedRoom = params.guest.roomNumber?.toLowerCase() ?? null;
  const roomIncident = params.incidents.find((incident) => {
    if (incident.status.toLowerCase() === "resolved") return false;
    if (!incident.roomId) return false;

    return incident.roomId.toLowerCase() === normalizedRoom;
  });

  if (roomIncident) {
    notifications.push(
      buildNotification(
        `guest-incident-${roomIncident.id}`,
        "alert",
        roomIncident.title,
        roomIncident.description ??
          `An active incident is linked to room ${params.guest.roomNumber ?? "your stay"}.`,
        formatRelativeTime(roomIncident.timestamp)
      )
    );
  }

  if (params.guest.roomNumber) {
    notifications.push(
      buildNotification(
        `guest-room-${params.guest.id}`,
        "success",
        `Room ${params.guest.roomNumber} linked`,
        `${params.guest.name}'s portal access is synced with the current stay.`,
        formatRelativeTime(params.guest.createdAt)
      )
    );
  }

  if (params.guest.checkOut) {
    notifications.push(
      buildNotification(
        `guest-checkout-${params.guest.id}`,
        "info",
        "Checkout scheduled",
        `Current stay is active until ${formatDateLabel(params.guest.checkOut)}.`,
        "Stay"
      )
    );
  }

  notifications.push(
    buildNotification(
      `guest-status-${params.guest.id}`,
      params.guest.status.toLowerCase() === "active" ? "success" : "info",
      `Stay status: ${toDisplayStatus(params.guest.status)}`,
      params.guest.email
        ? `Notifications are synced to ${params.guest.email}.`
        : "Guest profile is active, but login email is still missing.",
      "Live"
    )
  );

  return notifications.slice(0, 3);
}

export function buildStaffHeaderNotifications(params: {
  staff: Pick<
    StaffLike,
    | "id"
    | "name"
    | "email"
    | "employeeId"
    | "role"
    | "department"
    | "phone"
    | "emergencyContact"
    | "validTill"
    | "status"
    | "createdAt"
  >;
  activeDepartmentCount: number;
  incidents: IncidentLike[];
}) {
  const notifications: HeaderNotificationItem[] = [];
  const openIncident = params.incidents.find(
    (incident) => incident.status.toLowerCase() !== "resolved"
  );

  const missingFields = [
    !params.staff.phone ? "phone number" : null,
    !params.staff.emergencyContact ? "emergency contact" : null,
    !params.staff.employeeId ? "employee ID" : null,
  ].filter(Boolean) as string[];

  if (missingFields.length > 0) {
    notifications.push(
      buildNotification(
        `staff-profile-${params.staff.id}`,
        "warning",
        "Profile update required",
        `Add ${missingFields.join(", ")} to complete the staff profile.`,
        "Action"
      )
    );
  } else {
    notifications.push(
      buildNotification(
        `staff-profile-${params.staff.id}`,
        "success",
        "Staff profile verified",
        `${params.staff.name} is fully mapped for ${params.staff.role}.`,
        formatRelativeTime(params.staff.createdAt)
      )
    );
  }

  if (params.staff.validTill) {
    const validTillDate = new Date(params.staff.validTill);
    const daysRemaining = Math.ceil(
      (validTillDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    const validityTone: NotificationTone =
      daysRemaining < 0 ? "alert" : daysRemaining <= 14 ? "warning" : "success";

    notifications.push(
      buildNotification(
        `staff-validity-${params.staff.id}`,
        validityTone,
        daysRemaining < 0 ? "Credential expired" : "Credential validity",
        daysRemaining < 0
          ? `Staff access expired on ${formatDateLabel(validTillDate)}.`
          : `Staff access is valid until ${formatDateLabel(validTillDate)}.`,
        "ID card"
      )
    );
  }

  if (openIncident) {
    notifications.push(
      buildNotification(
        `staff-incident-${openIncident.id}`,
        "alert",
        openIncident.title,
        openIncident.description ?? "A live property incident is waiting for staff response.",
        formatRelativeTime(openIncident.timestamp)
      )
    );
  } else {
    notifications.push(
      buildNotification(
        `staff-roster-${params.staff.id}`,
        "info",
        "Department roster online",
        `${params.activeDepartmentCount} active staff currently mapped in ${params.staff.department ?? "operations"}.`,
        "Live"
      )
    );
  }

  notifications.push(
    buildNotification(
      `staff-status-${params.staff.id}`,
      params.staff.status.toLowerCase() === "active" ? "success" : "info",
      `Duty status: ${toDisplayStatus(params.staff.status)}`,
      params.staff.email
        ? `Notifications are synced to ${params.staff.email}.`
        : "Login email is still missing from the staff profile.",
      "Shift"
    )
  );

  return notifications.slice(0, 3);
}

export function buildPendingProfileNotification(params: {
  id: string;
  role: "guest" | "staff";
  email: string | null;
  displayName: string | null;
  createdAt: Date;
}) {
  const label = params.role === "staff" ? "staff" : "guest";

  return [
    buildNotification(
      `${label}-pending-${params.id}`,
      "warning",
      "Profile sync pending",
      params.email
        ? `${params.displayName || params.email} is logged in, but the ${label} profile is not linked yet.`
        : `The ${label} profile is not linked yet.`,
      formatRelativeTime(params.createdAt)
    ),
  ];
}
