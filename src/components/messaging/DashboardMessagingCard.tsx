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
    <div className="rounded-[1.7rem] border border-[var(--border-color)] bg-[var(--glass-bg)] p-6 shadow-[var(--shadow-md)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 max-w-xl text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-primary)]">
            {totalThreads} Channels
          </div>
          <div className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {activeThreads} Active
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {!error && loading && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="animate-pulse rounded-2xl border border-[var(--border-color)] bg-[var(--surface-muted)] p-5">
            <div className="h-3 w-28 rounded bg-[var(--border-color)]" />
            <div className="mt-4 h-7 w-3/4 rounded bg-[var(--border-color)]" />
            <div className="mt-4 h-4 w-full rounded bg-[var(--border-color)]" />
            <div className="mt-2 h-4 w-5/6 rounded bg-[var(--border-color)]" />
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-[var(--border-color)] bg-[var(--surface-muted)] p-4"
              >
                <div className="h-4 w-24 rounded bg-[var(--border-color)]" />
                <div className="mt-3 h-3 w-full rounded bg-[var(--border-color)]" />
                <div className="mt-2 h-3 w-2/3 rounded bg-[var(--border-color)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && !loading && recentThreads.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-color)] p-5 text-sm text-[var(--text-muted)]">
          {emptyLabel}
        </div>
      )}

      {!error && !loading && leadThread && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-muted)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Latest
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-[var(--text-muted)]">
                    {leadThread.icon || "chat"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-[var(--text-primary)]">
                      {leadThread.title}
                    </p>
                    <p className="truncate text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {leadThread.subtitle || leadThread.kind}
                    </p>
                  </div>
                </div>
              </div>

              <span className="shrink-0 rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] shadow-sm">
                {formatMessageDateTime(leadThread.lastMessageAt || leadThread.updatedAt)}
              </span>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              {leadThread.lastMessageText || "Open this thread to start the conversation."}
            </p>
          </div>

          <div className="space-y-3">
            {queuedThreads.length > 0 ? (
              queuedThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {thread.title}
                      </p>
                      <p className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {thread.subtitle || thread.kind}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)]">
                      {formatMessageDateTime(thread.lastMessageAt || thread.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-xs text-[var(--text-muted)]">
                    {thread.lastMessageText || "No messages yet."}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-4 text-sm text-[var(--text-muted)]">
                No other threads yet.
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
              className="inline-flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[color:var(--primary)]"
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
