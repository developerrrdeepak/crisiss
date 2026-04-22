"use client";

import { useEffect, useState } from "react";
import { MessageEventRecord, MessagingViewer, formatMessageDateTime, formatMessageTime } from "@/lib/messaging";

interface MessageTimelineProps {
  viewer: MessagingViewer;
  messages: MessageEventRecord[];
  emptyLabel: string;
  includeScheduled?: boolean;
}

export function MessageTimeline({
  viewer,
  messages,
  emptyLabel,
  includeScheduled = false,
}: MessageTimelineProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const viewerIdentityIds = new Set(
    [viewer.userId, ...(viewer.aliasIds ?? [])]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const visibleMessages = includeScheduled
    ? messages
    : messages.filter((message) => new Date(message.publishAt).getTime() <= currentTime);

  if (visibleMessages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-[#71717a] dark:text-[#a1a1aa]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      {visibleMessages.map((message) => {
        const isOwnMessage =
          message.senderRole !== "system" && viewerIdentityIds.has(message.senderId);
        const isMeeting = message.kind === "meeting";
        const isVoiceRequest = message.kind === "voice-request";
        const isFuture = new Date(message.publishAt).getTime() > currentTime;

        return (
          <div
            key={message.id}
            className={`flex items-start gap-4 ${isOwnMessage ? "justify-end" : ""}`}
          >
            {!isOwnMessage && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[10px] font-bold uppercase text-[#09090b] dark:bg-[#1a1a1a] dark:text-white">
                {message.senderRole === "system" ? "SYS" : message.senderName.slice(0, 2)}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                isOwnMessage
                  ? "rounded-tr-sm bg-black text-white dark:bg-white dark:text-black"
                  : "rounded-tl-sm bg-[#f4f4f5] text-[#09090b] dark:bg-[#1a1a1a] dark:text-white"
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                <span>{message.senderName}</span>
                <span>{formatMessageTime(message.publishAt)}</span>
                {isVoiceRequest && <span>Voice Request</span>}
                {isMeeting && <span>Meeting</span>}
                {isFuture && <span>Scheduled</span>}
              </div>

              <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>

              {isMeeting && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/10 p-3 text-xs dark:border-black/10 dark:bg-black/10">
                  <p className="font-semibold">
                    {message.meetingAt
                      ? `Meeting time: ${formatMessageDateTime(message.meetingAt)}`
                      : "Meeting link ready"}
                  </p>
                  {message.meetingLink && (
                    <a
                      href={message.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-current px-3 py-1 font-bold uppercase tracking-[0.16em]"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      Join Voice Room
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
