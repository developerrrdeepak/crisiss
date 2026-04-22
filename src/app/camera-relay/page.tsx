"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  buildMediaMtxViewerUrl,
  fetchRuntimeClientMediaTargets,
  trimMediaMtxSlash,
  type MediaMtxClientTarget,
} from "@/lib/mediamtx";

function sanitizeStreamPath(value: string | null, fallback: string) {
  const normalized = (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return normalized || fallback;
}

function CameraRelayContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "viewer";
  const protocol = searchParams.get("protocol") || "webrtc";
  const streamPath = sanitizeStreamPath(searchParams.get("path"), "phone-cctv");
  const [mediaTargets, setMediaTargets] = useState<MediaMtxClientTarget[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<MediaMtxClientTarget["id"]>("primary");

  useEffect(() => {
    let cancelled = false;

    void fetchRuntimeClientMediaTargets().then((targets) => {
      if (cancelled) {
        return;
      }

      setMediaTargets(targets);
      if (targets[0]) {
        setActiveTargetId(targets[0].id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mediaTargets.some((target) => target.id === activeTargetId) && mediaTargets[0]) {
      setActiveTargetId(mediaTargets[0].id);
    }
  }, [activeTargetId, mediaTargets]);

  const activeTarget = mediaTargets.find((target) => target.id === activeTargetId) ?? mediaTargets[0] ?? null;
  const webrtcBaseUrl = activeTarget?.webrtcBaseUrl ?? "";
  const hlsBaseUrl = activeTarget?.hlsBaseUrl ?? "";

  const publishUrl = useMemo(() => {
    if (!webrtcBaseUrl) {
      return "";
    }

    return `${trimMediaMtxSlash(webrtcBaseUrl)}/${streamPath}/publish`;
  }, [streamPath, webrtcBaseUrl]);

  const viewerUrl = useMemo(() => {
    if (protocol === "hls") {
      return hlsBaseUrl ? buildMediaMtxViewerUrl(hlsBaseUrl, streamPath) : "";
    }

    return webrtcBaseUrl ? buildMediaMtxViewerUrl(webrtcBaseUrl, streamPath) : "";
  }, [hlsBaseUrl, protocol, streamPath, webrtcBaseUrl]);

  useEffect(() => {
    if (mode !== "broadcaster" || !publishUrl) {
      return;
    }

    window.location.assign(publishUrl);
  }, [mode, publishUrl]);

  const missingConfigMessage =
    mode === "broadcaster"
      ? "Set NEXT_PUBLIC_MEDIAMTX_PRIMARY_WEBRTC_BASE_URL or NEXT_PUBLIC_MEDIAMTX_FALLBACK_WEBRTC_BASE_URL."
      : protocol === "hls"
        ? "Set NEXT_PUBLIC_MEDIAMTX_PRIMARY_HLS_BASE_URL or NEXT_PUBLIC_MEDIAMTX_FALLBACK_HLS_BASE_URL."
        : "Set NEXT_PUBLIC_MEDIAMTX_PRIMARY_WEBRTC_BASE_URL or NEXT_PUBLIC_MEDIAMTX_FALLBACK_WEBRTC_BASE_URL.";

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
              MediaMTX Relay
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {mode === "broadcaster" ? "Phone Camera Publisher" : "Camera Viewer"}
            </h1>
            <p className="mt-2 text-sm text-white/70">Path: {streamPath}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
              Backend: {activeTarget?.label ?? "Not configured"}
            </p>
          </div>
          <Link
            href="/admin/cameras"
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            Back To Admin
          </Link>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#0f1720] p-6 shadow-2xl">
          {mediaTargets.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {mediaTargets.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setActiveTargetId(target.id)}
                  className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] ${
                    activeTarget?.id === target.id
                      ? "bg-emerald-500 text-black"
                      : "border border-white/15 text-white/75"
                  }`}
                >
                  {target.label}
                </button>
              ))}
            </div>
          ) : null}
          {mode === "broadcaster" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-lg font-bold">Redirecting to the MediaMTX publish page...</p>
                <p className="mt-2 text-sm text-white/70">
                  Open this page on the phone that should act as a CCTV camera. Camera permission is
                  most reliable on the direct MediaMTX publish URL.
                </p>
              </div>

              {publishUrl ? (
                <a
                  href={publishUrl}
                  className="inline-flex rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-black"
                >
                  Open Publish Page
                </a>
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {missingConfigMessage}
                </div>
              )}
            </div>
          ) : viewerUrl ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
              <iframe
                src={viewerUrl}
                title={`Camera viewer for ${streamPath}`}
                allow="autoplay; fullscreen"
                className="h-[70vh] w-full border-0"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              {missingConfigMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CameraRelayFallback() {
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/10 bg-[#0f1720] p-8 shadow-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
            MediaMTX Relay
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Loading camera session</h1>
          <p className="mt-4 text-sm text-white/70">
            Preparing the MediaMTX publish or viewer page.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CameraRelayPage() {
  return (
    <Suspense fallback={<CameraRelayFallback />}>
      <CameraRelayContent />
    </Suspense>
  );
}
