"use client";

import { MessageThreadRecord, formatMessageTime } from "@/lib/messaging";

interface ThreadListProps {
  threads: MessageThreadRecord[];
  activeThreadId: string | null;
  onSelect: (thread: MessageThreadRecord) => void;
}

export function ThreadList({ threads, activeThreadId, onSelect }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-500 dark:text-zinc-400">
        No channels available yet.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelect(thread)}
          className={`w-full border-b border-slate-200 px-4 py-4 text-left transition-colors dark:border-white/5 ${
            activeThreadId === thread.id
              ? "bg-white dark:bg-[#18181b]"
              : "hover:bg-white dark:hover:bg-zinc-900"
          }`}
        >
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-zinc-400">
                {thread.icon || "chat"}
              </span>
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {thread.title}
              </span>
            </div>
            <span className="shrink-0 text-[10px] text-zinc-400">
              {formatMessageTime(thread.lastMessageAt || thread.updatedAt)}
            </span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            {thread.subtitle || thread.kind}
          </p>
          <p className="mt-2 truncate text-xs text-slate-500 dark:text-zinc-400">
            {thread.lastMessageText || "No messages yet."}
          </p>
        </button>
      ))}
    </div>
  );
}
