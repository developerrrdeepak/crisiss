"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export type MessagingRole = "admin" | "staff" | "guest" | "system";
export type MessageThreadKind = "direct" | "broadcast" | "department";
export type MessageAudience =
  | "all-guests"
  | "all-staff"
  | "department"
  | "direct-guest"
  | "direct-staff";
export type MessageEventKind = "text" | "system" | "voice-request" | "meeting";

export interface MessagingViewer {
  role: Exclude<MessagingRole, "system">;
  userId: string;
  name: string;
  aliasIds?: string[];
  roomNumber?: string | null;
  department?: string | null;
}

export interface MessageThreadRecord {
  id: string;
  title: string;
  subtitle?: string | null;
  kind: MessageThreadKind;
  audience: MessageAudience;
  guestId?: string | null;
  staffId?: string | null;
  department?: string | null;
  roomNumber?: string | null;
  icon?: string | null;
  createdByRole: Exclude<MessagingRole, "system">;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  lastSenderName?: string | null;
  canAdminReply: boolean;
  canStaffReply: boolean;
  canGuestReply: boolean;
}

export interface MessageEventRecord {
  id: string;
  threadId: string;
  kind: MessageEventKind;
  text: string;
  senderRole: MessagingRole;
  senderName: string;
  senderId: string;
  createdAt: string;
  publishAt: string;
  scheduled: boolean;
  meetingAt?: string | null;
  meetingLink?: string | null;
}

export interface SendMessageInput {
  thread: MessageThreadRecord;
  sender: MessagingViewer;
  text: string;
  kind?: MessageEventKind;
  publishAt?: string | null;
  meetingAt?: string | null;
  meetingLink?: string | null;
}

const ALL_GUESTS_THREAD_ID = "broadcast-all-guests";
const ALL_STAFF_THREAD_ID = "broadcast-all-staff";

const nowIso = () => new Date().toISOString();

const toMillis = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeDepartment = (value?: string | null) =>
  value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ?? "";

export const buildAllGuestsThreadId = () => ALL_GUESTS_THREAD_ID;
export const buildAllStaffThreadId = () => ALL_STAFF_THREAD_ID;
export const buildGuestDirectThreadId = (guestId: string) => `direct-guest-${guestId}`;
export const buildStaffDirectThreadId = (staffId: string) => `direct-staff-${staffId}`;
export const buildDepartmentThreadId = (department: string) =>
  `department-${normalizeDepartment(department) || "operations"}`;

function getViewerIdentitySet(viewer: MessagingViewer) {
  return new Set(
    [viewer.userId, ...(viewer.aliasIds ?? [])]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
  );
}

export const formatMessageTime = (value?: string | null) => {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const formatMessageDateTime = (value?: string | null) => {
  if (!value) return "Schedule pending";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export function buildVoiceRoomLink(seed: string) {
  const safeSeed = seed.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return `https://meet.jit.si/aegis-${safeSeed}`;
}

export function buildAllGuestsThread(viewer: MessagingViewer): MessageThreadRecord {
  const createdAt = nowIso();

  return {
    id: buildAllGuestsThreadId(),
    title: "Guest Announcements",
    subtitle: "Admin updates for all checked-in guests",
    kind: "broadcast",
    audience: "all-guests",
    icon: "campaign",
    createdByRole: viewer.role,
    createdById: viewer.userId,
    createdAt,
    updatedAt: createdAt,
    canAdminReply: true,
    canStaffReply: false,
    canGuestReply: false,
  };
}

export function buildAllStaffThread(viewer: MessagingViewer): MessageThreadRecord {
  const createdAt = nowIso();

  return {
    id: buildAllStaffThreadId(),
    title: "Staff Broadcast",
    subtitle: "Operational notices for the full staff roster",
    kind: "broadcast",
    audience: "all-staff",
    icon: "groups",
    createdByRole: viewer.role,
    createdById: viewer.userId,
    createdAt,
    updatedAt: createdAt,
    canAdminReply: true,
    canStaffReply: false,
    canGuestReply: false,
  };
}

export function buildDepartmentThread(
  viewer: MessagingViewer,
  department: string
): MessageThreadRecord {
  const createdAt = nowIso();

  return {
    id: buildDepartmentThreadId(department),
    title: `${department} Department`,
    subtitle: "Department group",
    kind: "department",
    audience: "department",
    department,
    icon: "domain",
    createdByRole: viewer.role,
    createdById: viewer.userId,
    createdAt,
    updatedAt: createdAt,
    canAdminReply: true,
    canStaffReply: true,
    canGuestReply: false,
  };
}

export function buildGuestDirectThread(
  viewer: MessagingViewer,
  guest: { id: string; name: string; roomNumber?: string | null }
): MessageThreadRecord {
  const createdAt = nowIso();

  return {
    id: buildGuestDirectThreadId(guest.id),
    title: guest.name || "Guest Direct Line",
    subtitle: guest.roomNumber ? `Room ${guest.roomNumber}` : "Guest channel",
    kind: "direct",
    audience: "direct-guest",
    guestId: guest.id,
    roomNumber: guest.roomNumber ?? null,
    icon: "hotel",
    createdByRole: viewer.role,
    createdById: viewer.userId,
    createdAt,
    updatedAt: createdAt,
    canAdminReply: true,
    canStaffReply: false,
    canGuestReply: true,
  };
}

export function buildStaffDirectThread(
  viewer: MessagingViewer,
  staff: { id: string; name: string; department?: string | null }
): MessageThreadRecord {
  const createdAt = nowIso();

  return {
    id: buildStaffDirectThreadId(staff.id),
    title: staff.name || "Staff Direct Line",
    subtitle: staff.department || "Staff channel",
    kind: "direct",
    audience: "direct-staff",
    staffId: staff.id,
    department: staff.department ?? null,
    icon: "support_agent",
    createdByRole: viewer.role,
    createdById: viewer.userId,
    createdAt,
    updatedAt: createdAt,
    canAdminReply: true,
    canStaffReply: true,
    canGuestReply: false,
  };
}

export function threadVisibleToViewer(thread: MessageThreadRecord, viewer: MessagingViewer) {
  const identitySet = getViewerIdentitySet(viewer);

  if (viewer.role === "admin") return true;
  if (viewer.role === "guest") {
    return thread.audience === "all-guests" || (thread.guestId ? identitySet.has(thread.guestId) : false);
  }

  return (
    thread.audience === "all-staff" ||
    (thread.staffId ? identitySet.has(thread.staffId) : false) ||
    (thread.audience === "department" &&
      normalizeDepartment(thread.department) === normalizeDepartment(viewer.department))
  );
}

export function canViewerReply(thread: MessageThreadRecord, viewer: MessagingViewer) {
  if (viewer.role === "admin") return thread.canAdminReply;
  if (viewer.role === "guest") return thread.canGuestReply;
  return thread.canStaffReply;
}

function mapThreadDoc(id: string, data: Record<string, unknown>): MessageThreadRecord {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled thread",
    subtitle: typeof data.subtitle === "string" ? data.subtitle : null,
    kind: (typeof data.kind === "string" ? data.kind : "direct") as MessageThreadKind,
    audience: (typeof data.audience === "string"
      ? data.audience
      : "direct-guest") as MessageAudience,
    guestId: typeof data.guestId === "string" ? data.guestId : null,
    staffId: typeof data.staffId === "string" ? data.staffId : null,
    department: typeof data.department === "string" ? data.department : null,
    roomNumber: typeof data.roomNumber === "string" ? data.roomNumber : null,
    icon: typeof data.icon === "string" ? data.icon : null,
    createdByRole: (typeof data.createdByRole === "string"
      ? data.createdByRole
      : "admin") as Exclude<MessagingRole, "system">,
    createdById: typeof data.createdById === "string" ? data.createdById : "system",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : nowIso(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : nowIso(),
    lastMessageText: typeof data.lastMessageText === "string" ? data.lastMessageText : null,
    lastMessageAt: typeof data.lastMessageAt === "string" ? data.lastMessageAt : null,
    lastSenderName: typeof data.lastSenderName === "string" ? data.lastSenderName : null,
    canAdminReply: data.canAdminReply !== false,
    canStaffReply: Boolean(data.canStaffReply),
    canGuestReply: Boolean(data.canGuestReply),
  };
}

function mapEventDoc(
  threadId: string,
  id: string,
  data: Record<string, unknown>
): MessageEventRecord {
  return {
    id,
    threadId,
    kind: (typeof data.kind === "string" ? data.kind : "text") as MessageEventKind,
    text: typeof data.text === "string" ? data.text : "",
    senderRole: (typeof data.senderRole === "string"
      ? data.senderRole
      : "system") as MessagingRole,
    senderName: typeof data.senderName === "string" ? data.senderName : "System",
    senderId: typeof data.senderId === "string" ? data.senderId : "system",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : nowIso(),
    publishAt: typeof data.publishAt === "string" ? data.publishAt : nowIso(),
    scheduled: Boolean(data.scheduled),
    meetingAt: typeof data.meetingAt === "string" ? data.meetingAt : null,
    meetingLink: typeof data.meetingLink === "string" ? data.meetingLink : null,
  };
}

export async function ensureThread(thread: MessageThreadRecord) {
  const db = getDb();
  const ref = doc(db, "message_threads", thread.id);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const current = mapThreadDoc(existing.id, existing.data());
    await setDoc(
      ref,
      {
        ...thread,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt || thread.updatedAt,
        lastMessageText: current.lastMessageText ?? thread.lastMessageText ?? null,
        lastMessageAt: current.lastMessageAt ?? thread.lastMessageAt ?? null,
        lastSenderName: current.lastSenderName ?? thread.lastSenderName ?? null,
      },
      { merge: true }
    );

    return { ...current, ...thread, createdAt: current.createdAt };
  }

  await setDoc(ref, thread);
  return thread;
}

export async function ensureThreads(threads: MessageThreadRecord[]) {
  return Promise.all(threads.map((thread) => ensureThread(thread)));
}

export function subscribeAllThreads(
  onData: (threads: MessageThreadRecord[]) => void,
  onError?: (error: Error) => void
) {
  const db = getDb();

  return onSnapshot(
    collection(db, "message_threads"),
    (snapshot) => {
      const threads = snapshot.docs
        .map((entry) => mapThreadDoc(entry.id, entry.data()))
        .sort((left, right) => toMillis(right.updatedAt) - toMillis(left.updatedAt));

      onData(threads);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeThreadMessages(
  threadId: string,
  options: {
    includeScheduled?: boolean;
    onData: (messages: MessageEventRecord[]) => void;
    onError?: (error: Error) => void;
  }
) {
  const db = getDb();

  return onSnapshot(
    collection(db, "message_threads", threadId, "events"),
    (snapshot) => {
      const currentTime = Date.now();
      const messages = snapshot.docs
        .map((entry) => mapEventDoc(threadId, entry.id, entry.data()))
        .filter((message) => {
          if (options.includeScheduled) return true;
          return toMillis(message.publishAt) <= currentTime;
        })
        .sort((left, right) => toMillis(left.publishAt) - toMillis(right.publishAt));

      options.onData(messages);
    },
    (error) => {
      options.onError?.(error);
    }
  );
}

export async function sendThreadMessage(input: SendMessageInput) {
  const db = getDb();
  const createdAt = nowIso();
  const publishAt = input.publishAt || createdAt;
  const trimmedText = input.text.trim();

  if (!trimmedText) {
    throw new Error("Message text is required.");
  }

  const ref = doc(db, "message_threads", input.thread.id);
  const eventPayload = {
    threadId: input.thread.id,
    kind: input.kind ?? "text",
    text: trimmedText,
    senderRole: input.sender.role,
    senderName: input.sender.name,
    senderId: input.sender.userId,
    createdAt,
    publishAt,
    scheduled: toMillis(publishAt) > toMillis(createdAt),
    meetingAt: input.meetingAt ?? null,
    meetingLink: input.meetingLink ?? null,
  };

  await addDoc(collection(db, "message_threads", input.thread.id, "events"), eventPayload);
  await setDoc(
    ref,
    {
      ...input.thread,
      updatedAt: publishAt,
      lastMessageText: trimmedText,
      lastMessageAt: publishAt,
      lastSenderName: input.sender.name,
    },
    { merge: true }
  );

  return eventPayload;
}
