"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureFirebaseConfigured } from "@/lib/firebase";
import {
  ensureThreads,
  MessageThreadRecord,
  MessagingViewer,
  subscribeAllThreads,
  threadVisibleToViewer,
} from "@/lib/messaging";

interface UseMessagingOverviewOptions {
  viewer: MessagingViewer | null;
  baseThreads: MessageThreadRecord[];
}

interface UseMessagingOverviewResult {
  threads: MessageThreadRecord[];
  recentThreads: MessageThreadRecord[];
  latestThread: MessageThreadRecord | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
  totalThreads: number;
  activeThreads: number;
}

const toMillis = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getThreadActivityTime = (thread: MessageThreadRecord) =>
  toMillis(thread.lastMessageAt || thread.updatedAt || thread.createdAt);

function mergeThreads(
  baseThreads: MessageThreadRecord[],
  liveThreads: MessageThreadRecord[]
) {
  const liveThreadsById = new Map(liveThreads.map((thread) => [thread.id, thread]));
  const baseThreadIds = new Set(baseThreads.map((thread) => thread.id));

  const seededThreads = baseThreads.map((thread) => liveThreadsById.get(thread.id) ?? thread);
  const extraThreads = liveThreads
    .filter((thread) => !baseThreadIds.has(thread.id))
    .sort((left, right) => getThreadActivityTime(right) - getThreadActivityTime(left));

  return [...seededThreads, ...extraThreads];
}

export function useMessagingOverview({
  viewer,
  baseThreads,
}: UseMessagingOverviewOptions): UseMessagingOverviewResult {
  const [threads, setThreads] = useState<MessageThreadRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!viewer) {
      setThreads([]);
      setReady(false);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    void (async () => {
      try {
        const configured = await ensureFirebaseConfigured();

        if (!active) return;

        setReady(configured);
        setLoading(false);
        setError(
          configured ? null : "Firebase messaging is not configured in this environment."
        );
      } catch (firebaseError) {
        console.error("Failed to initialize dashboard messaging:", firebaseError);

        if (!active) return;

        setReady(false);
        setLoading(false);
        setError("Messaging is unavailable right now.");
      }
    })();

    return () => {
      active = false;
    };
  }, [viewer]);

  useEffect(() => {
    if (!viewer || !ready) return;

    let cancelled = false;

    setThreads((current) => mergeThreads(baseThreads, current));

    void (async () => {
      try {
        await ensureThreads(baseThreads);
      } catch (threadError) {
        console.error("Failed to initialize dashboard message threads:", threadError);
        if (!cancelled) {
          setError("Messaging is unavailable right now.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseThreads, ready, viewer]);

  useEffect(() => {
    if (!viewer || !ready) return;

    setLoading(true);

    return subscribeAllThreads(
      (nextThreads) => {
        const visibleThreads = nextThreads.filter((thread) =>
          threadVisibleToViewer(thread, viewer)
        );

        setThreads(mergeThreads(baseThreads, visibleThreads));
        setLoading(false);
        setError(null);
      },
      (subscriptionError) => {
        console.error("Failed to subscribe to dashboard message threads:", subscriptionError);
        setLoading(false);
        setError("Messaging is unavailable right now.");
      }
    );
  }, [baseThreads, ready, viewer]);

  const recentThreads = useMemo(
    () =>
      [...threads]
        .sort((left, right) => getThreadActivityTime(right) - getThreadActivityTime(left))
        .slice(0, 4),
    [threads]
  );

  return {
    threads,
    recentThreads,
    latestThread: recentThreads[0] ?? null,
    ready,
    loading,
    error,
    totalThreads: threads.length,
    activeThreads: threads.filter((thread) => Boolean(thread.lastMessageAt)).length,
  };
}
