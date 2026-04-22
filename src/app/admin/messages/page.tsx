"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MessageTimeline } from "@/components/messaging/MessageTimeline";
import { ThreadList } from "@/components/messaging/ThreadList";
import { ensureFirebaseConfigured } from "@/lib/firebase";
import {
  MessageEventRecord,
  MessageThreadRecord,
  MessagingViewer,
  buildAllGuestsThread,
  buildAllStaffThread,
  buildDepartmentThread,
  buildGuestDirectThread,
  buildStaffDirectThread,
  buildVoiceRoomLink,
  canViewerReply,
  ensureThread,
  ensureThreads,
  formatMessageDateTime,
  sendThreadMessage,
  subscribeAllThreads,
  subscribeThreadMessages,
} from "@/lib/messaging";
import { useAuthSync } from "@/hooks/useAuthSync";

interface GuestContact {
  id: string;
  name: string;
  email: string;
  room: string;
}

interface StaffContact {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

const toIsoFromLocal = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export default function AdminMessages() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [guests, setGuests] = useState<GuestContact[]>([]);
  const [staff, setStaff] = useState<StaffContact[]>([]);
  const [storedThreads, setStoredThreads] = useState<MessageThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageEventRecord[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [meetingEnabled, setMeetingEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseUnavailable, setFirebaseUnavailable] = useState(false);
  const [requestedThreadId, setRequestedThreadId] = useState<string | null>(null);
  const { dbUser } = useAuthSync("admin");

  const viewer = useMemo<MessagingViewer>(() => {
    const userId = dbUser?.profileId || dbUser?.id || dbUser?.firebaseUid || "admin-console";

    return {
      role: "admin",
      userId,
      aliasIds: [dbUser?.id, dbUser?.loginId ?? null, dbUser?.firebaseUid, dbUser?.employeeId ?? null].filter(
        (value): value is string => Boolean(value)
      ),
      name: dbUser?.name || dbUser?.displayName || "Administrator",
      department: dbUser?.department || "Command Center",
    };
  }, [dbUser]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [guestRes, staffRes] = await Promise.all([
          fetch("/api/admin/guests", { cache: "no-store" }),
          fetch("/api/admin/staff", { cache: "no-store" }),
        ]);
        const [guestData, staffData] = await Promise.all([guestRes.json(), staffRes.json()]);

        if (!active) return;

        setGuests(Array.isArray(guestData.guests) ? guestData.guests : []);
        setStaff(Array.isArray(staffData.staff) ? staffData.staff : []);
      } catch (fetchError) {
        console.error("Failed to load admin message contacts:", fetchError);
        if (active) {
          setError("Contacts could not be loaded.");
        }
      } finally {
        if (active) {
          setLoadingContacts(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const departmentNames = useMemo(
    () =>
      Array.from(
        new Set(
          staff
            .map((member) => member.department)
            .filter((department): department is string => Boolean(department))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [staff]
  );

  const baseChannels = useMemo(
    () => [
      buildAllStaffThread(viewer),
      buildAllGuestsThread(viewer),
      ...departmentNames.map((department) => buildDepartmentThread(viewer, department)),
    ],
    [departmentNames, viewer]
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const configured = await ensureFirebaseConfigured();
        if (!active) return;

        setFirebaseReady(configured);
        setFirebaseUnavailable(!configured);
      } catch (firebaseError) {
        console.error("Failed to initialize admin messaging Firebase:", firebaseError);
        if (!active) return;

        setFirebaseReady(false);
        setFirebaseUnavailable(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setRequestedThreadId(new URLSearchParams(window.location.search).get("thread"));
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;

    void ensureThreads(baseChannels).catch((threadError) => {
      console.error("Failed to initialize admin channels:", threadError);
      setError("Messaging is unavailable right now.");
    });
  }, [baseChannels, firebaseReady]);

  useEffect(() => {
    if (!firebaseReady) return;

    return subscribeAllThreads(
      setStoredThreads,
      (subscriptionError) => {
        console.error("Failed to subscribe to admin threads:", subscriptionError);
        setError("Messaging is unavailable right now.");
      }
    );
  }, [firebaseReady]);

  const threadLookup = useMemo(
    () => new Map(storedThreads.map((thread) => [thread.id, thread])),
    [storedThreads]
  );

  const allThreads = useMemo(() => {
    const guestThreads = guests.map((guest) =>
      threadLookup.get(buildGuestDirectThread(viewer, {
        id: guest.id,
        name: guest.name,
        roomNumber: guest.room,
      }).id) ||
      buildGuestDirectThread(viewer, {
        id: guest.id,
        name: guest.name,
        roomNumber: guest.room,
      })
    );

    const staffThreads = staff.map((member) =>
      threadLookup.get(buildStaffDirectThread(viewer, {
        id: member.id,
        name: member.name,
        department: member.department,
      }).id) ||
      buildStaffDirectThread(viewer, {
        id: member.id,
        name: member.name,
        department: member.department,
      })
    );

    const channels = baseChannels.map((channel) => threadLookup.get(channel.id) || channel);

    return [...channels, ...staffThreads, ...guestThreads];
  }, [baseChannels, guests, staff, threadLookup, viewer]);

  const filteredThreads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return allThreads;

    return allThreads.filter((thread) => {
      const values = [
        thread.title,
        thread.subtitle,
        thread.department,
        thread.roomNumber,
        thread.lastMessageText,
      ];

      return values.some((value) => value?.toLowerCase().includes(query));
    });
  }, [allThreads, searchTerm]);

  useEffect(() => {
    setActiveThreadId((current) => {
      if (requestedThreadId && filteredThreads.some((thread) => thread.id === requestedThreadId)) {
        return requestedThreadId;
      }

      if (current && filteredThreads.some((thread) => thread.id === current)) {
        return current;
      }

      return filteredThreads[0]?.id ?? null;
    });
  }, [filteredThreads, requestedThreadId]);

  useEffect(() => {
    if (!requestedThreadId) return;
    if (!allThreads.some((thread) => thread.id === requestedThreadId)) return;

    setActiveThreadId(requestedThreadId);
  }, [allThreads, requestedThreadId]);

  useEffect(() => {
    if (!activeThreadId || !firebaseReady) {
      setMessages([]);
      return;
    }

    return subscribeThreadMessages(activeThreadId, {
      includeScheduled: true,
      onData: setMessages,
      onError: (subscriptionError) => {
        console.error("Failed to subscribe to admin messages:", subscriptionError);
        setError("Messages could not be loaded.");
      },
    });
  }, [activeThreadId, firebaseReady]);

  const activeThread = allThreads.find((thread) => thread.id === activeThreadId) ?? null;
  const canReply = activeThread ? canViewerReply(activeThread, viewer) : false;
  const scheduledIso = scheduleEnabled ? toIsoFromLocal(scheduledFor) : null;

  const handleSelectThread = async (thread: MessageThreadRecord) => {
    setActiveThreadId(thread.id);

    if (!firebaseReady) return;

    try {
      await ensureThread(thread);
    } catch (threadError) {
      console.error("Failed to ensure admin thread:", threadError);
      setError("Selected thread could not be opened.");
    }
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeThread || !canReply) return;

    const publishAt = scheduledIso;
    const meetingLink = meetingEnabled
      ? buildVoiceRoomLink(`${activeThread.id}-${publishAt || Date.now()}`)
      : null;
    const nextText =
      draftMessage.trim() ||
      (meetingEnabled
        ? `Voice meeting for ${activeThread.title}${publishAt ? ` scheduled at ${formatMessageDateTime(publishAt)}` : " is live now"}.`
        : "");

    if (!nextText) return;

    try {
      setSending(true);
      setError(null);
      await ensureThread(activeThread);
      await sendThreadMessage({
        thread: activeThread,
        sender: viewer,
        text: nextText,
        kind: meetingEnabled ? "meeting" : "text",
        publishAt,
        meetingAt: meetingEnabled ? publishAt || new Date().toISOString() : null,
        meetingLink,
      });
      setDraftMessage("");
      setScheduleEnabled(false);
      setScheduledFor("");
      setMeetingEnabled(false);
    } catch (sendError) {
      console.error("Failed to send admin message:", sendError);
      setError("Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const handleOpenVoiceRoom = async () => {
    if (!activeThread) return;

    try {
      setError(null);
      await ensureThread(activeThread);
      await sendThreadMessage({
        thread: activeThread,
        sender: viewer,
        text: `Voice room opened for ${activeThread.title}. Join the live bridge below.`,
        kind: "meeting",
        meetingAt: new Date().toISOString(),
        meetingLink: buildVoiceRoomLink(`${activeThread.id}-${Date.now()}`),
      });
    } catch (sendError) {
      console.error("Failed to open admin voice room:", sendError);
      setError("Voice room could not be created.");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#fafafa] font-['Sora'] text-[#09090b] dark:bg-[#0a0a0a] dark:text-[#e5e2e1]">
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.1) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <DashboardHeader
        title="Messages"
        userName={viewer.name}
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
          messageCount={storedThreads.filter((thread) => Boolean(thread.lastMessageAt)).length}
        />

        <main className="mx-auto flex w-full max-w-[1680px] flex-1 overflow-hidden p-6">
          <div className="flex h-full w-full overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white shadow-sm dark:border-white/5 dark:bg-[#0f0f0f]">
            <aside className="flex w-full max-w-[360px] flex-col border-r border-[#e4e4e7] bg-[#fafafa]/70 dark:border-white/5 dark:bg-[#0a0a0a]">
              <div className="border-b border-[#e4e4e7] p-4 dark:border-white/5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#a1a1aa] text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search guests, staff, departments..."
                    className="w-full rounded-lg bg-[#f4f4f5] py-2 pl-9 pr-4 text-xs text-[#09090b] outline-none focus:ring-1 focus:ring-black dark:bg-[#1a1a1a]/50 dark:text-white dark:focus:ring-white"
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(buildAllStaffThread(viewer).id)}
                    className="rounded-xl border border-[#e4e4e7] px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.16em] text-[#09090b] transition-colors hover:border-black dark:border-white/10 dark:text-white dark:hover:border-white"
                  >
                    All Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(buildAllGuestsThread(viewer).id)}
                    className="rounded-xl border border-[#e4e4e7] px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.16em] text-[#09090b] transition-colors hover:border-black dark:border-white/10 dark:text-white dark:hover:border-white"
                  >
                    All Guests
                  </button>
                </div>
              </div>

              <ThreadList
                threads={filteredThreads}
                activeThreadId={activeThreadId}
                onSelect={(thread) => void handleSelectThread(thread)}
              />

              <div className="border-t border-[#e4e4e7] p-4 text-xs text-[#71717a] dark:border-white/5 dark:text-[#a1a1aa]">
                {loadingContacts
                  ? "Loading roster and guest contacts..."
                  : `${staff.length} staff, ${guests.length} guests, ${departmentNames.length} department groups`}
              </div>
            </aside>

            <section className="flex flex-1 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e4e7] px-6 py-5 dark:border-white/5">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#09090b] dark:text-white">
                    {activeThread?.title || "Select a thread"}
                  </h2>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#71717a] dark:text-[#a1a1aa]">
                    {activeThread?.subtitle || "Operational messaging hub"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleOpenVoiceRoom()}
                    disabled={!activeThread}
                    className="inline-flex items-center gap-2 rounded-full border border-[#e4e4e7] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#09090b] transition-colors hover:border-black dark:border-white/10 dark:text-white dark:hover:border-white disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    Start Voice Room
                  </button>
                  <div className="rounded-full bg-[#f4f4f5] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#71717a] dark:bg-[#1a1a1a] dark:text-[#a1a1aa]">
                    {activeThread?.audience || "none selected"}
                  </div>
                </div>
              </div>

              {firebaseUnavailable && (
                <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  Firebase messaging is not configured in this environment.
                </div>
              )}

              {error && (
                <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                <MessageTimeline
                  viewer={viewer}
                  messages={messages}
                  emptyLabel="No messages in this thread yet."
                  includeScheduled={true}
                />
              </div>

              <form onSubmit={handleSend} className="border-t border-[#e4e4e7] p-5 dark:border-white/5">
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <label className="flex items-center gap-2 rounded-xl border border-[#e4e4e7] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#09090b] dark:border-white/10 dark:text-white">
                    <input
                      type="checkbox"
                      checked={meetingEnabled}
                      onChange={(event) => setMeetingEnabled(event.target.checked)}
                    />
                    Meeting Invite
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[#e4e4e7] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#09090b] dark:border-white/10 dark:text-white">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(event) => setScheduleEnabled(event.target.checked)}
                    />
                    Schedule Send
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(event) => setScheduledFor(event.target.value)}
                    disabled={!scheduleEnabled}
                    className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-black dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-white disabled:opacity-50"
                  />
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    disabled={!canReply || sending || !activeThread}
                    placeholder={
                      meetingEnabled
                        ? "Add meeting notes or leave blank for an automatic invite"
                        : "Type a message..."
                    }
                    className="w-full rounded-full border border-[#e4e4e7] bg-[#f4f4f5] px-5 py-3 pr-16 text-sm outline-none transition-colors focus:border-black dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-white disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!activeThread || sending || (!draftMessage.trim() && !meetingEnabled)}
                    className="absolute right-2 rounded-full bg-black p-2 text-white transition-transform hover:scale-105 disabled:opacity-50 dark:bg-white dark:text-black"
                    aria-label="Send message"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </div>

                {scheduleEnabled && scheduledIso && (
                  <p className="mt-3 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                    Scheduled for {formatMessageDateTime(scheduledIso)}
                  </p>
                )}
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
