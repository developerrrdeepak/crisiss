"use client";

import Link from "next/link";
import { MessageThreadRecord, formatMessageDateTime } from "@/lib/messaging";

interface DashboardMessagingAction {
  href: string;
  label: string;
  icon: string;
}

interface DashboardMessagingCardProps {
  eyebrow: string;
  title: string;
  description: string;
  recentThreads: MessageThreadRecord[];
  totalThreads: number;
  activeThreads: number;
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  actions: DashboardMessagingAction[];
}

export function DashboardMessagingCard({
  eyebrow,
  title,
  description,
  recentThreads,
  totalThreads,
  activeThreads,
  loading,
  error,
  emptyLabel,
  actions,
}: DashboardMessagingCardProps) {
  const leadThread = recentThreads[0] ?? null;
  const queuedThreads = recentThreads.slice(1, 4);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-[#09090b]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-light tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-zinc-400">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-[#f4f4f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-900 dark:bg-[#18181b] dark:text-white">
            {totalThreads} Channels
          </div>
          <div className="rounded-full bg-[#f4f4f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:bg-[#18181b] dark:text-zinc-400">
            {activeThreads} Active
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {!error && loading && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800/80 dark:bg-[#111114]">
            <div className="h-3 w-28 rounded bg-[#e4e4e7] dark:bg-[#27272a]" />
            <div className="mt-4 h-7 w-3/4 rounded bg-[#e4e4e7] dark:bg-[#27272a]" />
            <div className="mt-4 h-4 w-full rounded bg-[#e4e4e7] dark:bg-[#27272a]" />
            <div className="mt-2 h-4 w-5/6 rounded bg-[#e4e4e7] dark:bg-[#27272a]" />
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800/80 dark:bg-[#111114]"
              >
                <div className="h-4 w-24 rounded bg-[#e4e4e7] dark:bg-[#27272a]" />
                <div className="mt-3 h-3 w-full rounded bg-[#e4e4e7] dark:bg-[#27272a]" />
                <div className="mt-2 h-3 w-2/3 rounded bg-[#e4e4e7] dark:bg-[#27272a]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && !loading && recentThreads.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-[#d4d4d8] p-5 text-sm text-slate-500 dark:border-zinc-800/80 dark:text-zinc-400">
          {emptyLabel}
        </div>
      )}

      {!error && !loading && leadThread && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800/80 dark:bg-[#111114]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">
                  Latest Thread
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-slate-500 dark:text-zinc-400">
                    {leadThread.icon || "chat"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                      {leadThread.title}
                    </p>
                    <p className="truncate text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">
                      {leadThread.subtitle || leadThread.kind}
                    </p>
                  </div>
                </div>
              </div>

              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 shadow-sm dark:bg-[#09090b] dark:text-zinc-400">
                {formatMessageDateTime(leadThread.lastMessageAt || leadThread.updatedAt)}
              </span>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-zinc-500 dark:text-[#d4d4d8]">
              {leadThread.lastMessageText || "Open this thread to start the conversation."}
            </p>
          </div>

          <div className="space-y-3">
            {queuedThreads.length > 0 ? (
              queuedThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800/80 dark:bg-[#111114]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {thread.title}
                      </p>
                      <p className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-400">
                        {thread.subtitle || thread.kind}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-zinc-400">
                      {formatMessageDateTime(thread.lastMessageAt || thread.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-xs text-slate-500 dark:text-zinc-400">
                    {thread.lastMessageText || "No messages yet."}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d4d4d8] p-4 text-sm text-slate-500 dark:border-zinc-800/80 dark:text-zinc-400">
                No other live threads yet.
              </div>
            )}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className="inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-[#09090b] dark:border-zinc-800/80 dark:bg-[#111114] dark:text-white dark:hover:border-white"
            >
              <span>{action.label}</span>
              <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
