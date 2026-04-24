"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MessageTimeline } from "@/components/messaging/MessageTimeline";
import { ThreadList } from "@/components/messaging/ThreadList";
import { StaffSidebar } from "@/components/StaffSidebar";
import { ensureFirebaseConfigured } from "@/lib/firebase";
import {
  MessageEventRecord,
  MessageThreadRecord,
  MessagingViewer,
  buildAllStaffThread,
  buildDepartmentThread,
  buildStaffDirectThread,
  canViewerReply,
  ensureThreads,
  sendThreadMessage,
  subscribeAllThreads,
  subscribeThreadMessages,
  threadVisibleToViewer,
} from "@/lib/messaging";
import { useAuthSync } from "@/hooks/useAuthSync";

export default function StaffMessages() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [threads, setThreads] = useState<MessageThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageEventRecord[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseUnavailable, setFirebaseUnavailable] = useState(false);
  const [requestedThreadId, setRequestedThreadId] = useState<string | null>(null);
  const { dbUser, loading } = useAuthSync("staff");

  const viewer = useMemo<MessagingViewer | null>(() => {
    if (!dbUser?.id) return null;

    const profileId = dbUser.profileId || dbUser.id;

    return {
      role: "staff",
      userId: profileId,
      aliasIds: [dbUser.id, dbUser.loginId ?? null, dbUser.firebaseUid, dbUser.employeeId ?? null].filter(
        (value): value is string => Boolean(value)
      ),
      name: dbUser.name || "Staff",
      department: dbUser.department || "Operations",
    };
  }, [dbUser]);

  const baseThreads = useMemo(() => {
    if (!viewer) return [];

    return [
      buildStaffDirectThread(viewer, {
        id: viewer.userId,
        name: viewer.name,
        department: viewer.department,
      }),
      buildAllStaffThread(viewer),
      buildDepartmentThread(viewer, viewer.department || "Operations"),
    ];
  }, [viewer]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const configured = await ensureFirebaseConfigured();
        if (!active) return;

        setFirebaseReady(configured);
        setFirebaseUnavailable(!configured);
      } catch (firebaseError) {
        console.error("Failed to initialize staff messaging Firebase:", firebaseError);
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
    if (!viewer || !firebaseReady) return;

    let cancelled = false;

    void (async () => {
      try {
        await ensureThreads(baseThreads);
        if (!cancelled) {
          setActiveThreadId((current) => current ?? baseThreads[0]?.id ?? null);
        }
      } catch (threadError) {
        console.error("Failed to initialize staff messaging:", threadError);
        if (!cancelled) {
          setError("Messaging is unavailable right now.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseThreads, firebaseReady, viewer]);

  useEffect(() => {
    if (!viewer || !firebaseReady) return;

    return subscribeAllThreads(
      (nextThreads) => {
        const visibleThreads = nextThreads.filter((thread) => threadVisibleToViewer(thread, viewer));
        const orderedBaseThreads = baseThreads
          .map((thread) => visibleThreads.find((candidate) => candidate.id === thread.id) ?? thread)
          .filter(Boolean);
        const knownThreadIds = new Set(orderedBaseThreads.map((thread) => thread.id));
        const extraThreads = visibleThreads.filter((thread) => !knownThreadIds.has(thread.id));
        const orderedThreads = [...orderedBaseThreads, ...extraThreads];

        setThreads(orderedThreads);
        setActiveThreadId((current) => {
          if (requestedThreadId && orderedThreads.some((thread) => thread.id === requestedThreadId)) {
            return requestedThreadId;
          }

          if (current && orderedThreads.some((thread) => thread.id === current)) {
            return current;
          }

          return orderedThreads[0]?.id ?? null;
        });
      },
      (subscriptionError) => {
        console.error("Failed to subscribe to staff threads:", subscriptionError);
        setError("Messaging is unavailable right now.");
      }
    );
  }, [baseThreads, firebaseReady, requestedThreadId, viewer]);

  useEffect(() => {
    if (!requestedThreadId) return;
    if (!threads.some((thread) => thread.id === requestedThreadId)) return;

    setActiveThreadId(requestedThreadId);
  }, [requestedThreadId, threads]);

  useEffect(() => {
    if (!activeThreadId || !firebaseReady) {
      setMessages([]);
      return;
    }

    return subscribeThreadMessages(activeThreadId, {
      onData: setMessages,
      onError: (subscriptionError) => {
        console.error("Failed to subscribe to staff messages:", subscriptionError);
        setError("Messages could not be loaded.");
      },
    });
  }, [activeThreadId, firebaseReady]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;
  const canReply = activeThread && viewer ? canViewerReply(activeThread, viewer) : false;
  const directThread = threads.find((thread) => thread.staffId === viewer?.userId) ?? null;

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!viewer || !activeThread || !canReply || !draftMessage.trim()) return;

    try {
      setSending(true);
      setError(null);
      await sendThreadMessage({
        thread: activeThread,
        sender: viewer,
        text: draftMessage.trim(),
      });
      setDraftMessage("");
    } catch (sendError) {
      console.error("Failed to send staff message:", sendError);
      setError("Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const handleRequestVoiceCall = async () => {
    if (!viewer || !directThread) return;

    try {
      setError(null);
      await sendThreadMessage({
        thread: directThread,
        sender: viewer,
        kind: "voice-request",
        text: `${viewer.name} requested a voice call from ${viewer.department || "Operations"}.`,
      });
      setActiveThreadId(directThread.id);
    } catch (sendError) {
      console.error("Failed to request staff voice call:", sendError);
      setError("Voice call request could not be sent.");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 font-['Sora'] text-slate-900 dark:bg-[#09090b] dark:text-[#fafafa]">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.1) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <DashboardHeader
        title="Staff Messages"
        userName={dbUser?.name || "Staff"}
        role={dbUser?.staffRole || "Operations"}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden pt-16">
        <StaffSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="mx-auto flex w-full max-w-[1500px] flex-1 overflow-hidden p-6">
          <div className="flex h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
            <aside className="flex w-full max-w-[340px] flex-col border-r border-slate-200 bg-slate-50/70 dark:border-white/5 dark:bg-zinc-950">
              <div className="border-b border-slate-200 p-4 dark:border-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
                  Staff Channels
                </p>
              </div>
              <ThreadList
                threads={threads}
                activeThreadId={activeThreadId}
                onSelect={(thread) => setActiveThreadId(thread.id)}
              />
            </aside>

            <section className="flex flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-white/5">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                    {activeThread?.title || "Select a channel"}
                  </h2>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">
                    {activeThread?.subtitle || "Staff communication center"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRequestVoiceCall()}
                  disabled={!directThread}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-900 transition-colors hover:border-black dark:border-white/10 dark:text-white dark:hover:border-white disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  Voice Call Admin
                </button>
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
                  viewer={
                    viewer || {
                      role: "staff",
                      userId: "staff-fallback",
                      name: "Staff",
                    }
                  }
                  messages={messages}
                  emptyLabel={
                    loading ? "Loading your channels..." : "No messages yet in this channel."
                  }
                />
              </div>

              <form onSubmit={handleSend} className="border-t border-slate-200 p-4 dark:border-white/5">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    disabled={!canReply || sending || !activeThread}
                    placeholder={
                      canReply ? "Send update..." : "This channel is read-only for staff"
                    }
                    className="w-full rounded-full border border-slate-200 bg-[#f4f4f5] px-5 py-3 pr-16 text-sm outline-none transition-colors focus:border-black dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:border-white disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!canReply || sending || !draftMessage.trim()}
                    className="absolute right-2 rounded-full bg-black p-2 text-white transition-transform hover:scale-105 disabled:opacity-50 dark:bg-white dark:text-black"
                    aria-label="Send message"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
