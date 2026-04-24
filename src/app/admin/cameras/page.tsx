"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { EvacuationMap } from "@/components/evacuation/EvacuationMap";
import { CAMERAS, EDGES, FLOORS, NODES, createGraphSnapshot, resolveCameraImpact, type FloorId } from "@/lib/evacuation";
import {
  buildMediaMtxViewerUrl,
  fetchRuntimeClientMediaTargets,
  trimMediaMtxSlash,
  type MediaMtxClientTarget,
} from "@/lib/mediamtx";
import { useEvacuationSimulation } from "@/hooks/useEvacuationSimulation";

type CameraSource = {
  id: string;
  label: string;
  path: string;
  type: "phone" | "rtsp";
};

type PhoneSourceConfig = {
  label: string;
  path: string;
};

const PHONE_SOURCE_STORAGE_KEY = "admin-phone-camera-source";
const RTSP_SOURCES_STORAGE_KEY = "admin-rtsp-camera-sources";
const DEFAULT_PHONE_PATH = "phone-cctv";
const DEFAULT_PHONE_LABEL = "Phone CCTV";

function sanitizePathName(value: string, fallback: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return normalized || fallback;
}

function buildRtspPreviewUrl(host: string, port: string, username: string, password: string, streamPath: string) {
  const trimmedHost = host.trim();
  if (!trimmedHost) {
    return "";
  }

  const auth =
    username.trim() || password.trim()
      ? `${encodeURIComponent(username.trim())}:${encodeURIComponent(password)}@`
      : "";
  const cleanedPath = streamPath.trim().replace(/^\/+/, "") || "stream1";
  return `rtsp://${auth}${trimmedHost}:${port.trim() || "554"}/${cleanedPath}`;
}

function buildTacticalMapHref(cameraId: string, floorId: FloorId, nodeId?: string, streamPath?: string) {
  const params = new URLSearchParams({
    camera: cameraId,
    floor: floorId,
    source: "camera-console",
  });

  if (nodeId) {
    params.set("node", nodeId);
  }

  if (streamPath) {
    params.set("stream", streamPath);
  }

  return `/admin/tactical-map?${params.toString()}`;
}

export default function AdminCameras() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [phoneSource, setPhoneSource] = useState<PhoneSourceConfig>({
    label: DEFAULT_PHONE_LABEL,
    path: DEFAULT_PHONE_PATH,
  });
  const [savedRtspSources, setSavedRtspSources] = useState<CameraSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("phone-source");
  const [previewProtocol, setPreviewProtocol] = useState<"webrtc" | "hls">("hls");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [mediaTargets, setMediaTargets] = useState<MediaMtxClientTarget[]>([]);
  const [activeMediaTargetId, setActiveMediaTargetId] = useState<MediaMtxClientTarget["id"]>("primary");
  const [phonePublishQr, setPhonePublishQr] = useState("");
  const [rtspLabel, setRtspLabel] = useState("Lobby CCTV");
  const [rtspPathName, setRtspPathName] = useState("lobby-cctv");
  const [rtspHost, setRtspHost] = useState("");
  const [rtspPort, setRtspPort] = useState("554");
  const [rtspUser, setRtspUser] = useState("admin");
  const [rtspPassword, setRtspPassword] = useState("");
  const [rtspPath, setRtspPath] = useState("stream1");
  const [rtspTransport, setRtspTransport] = useState<"automatic" | "tcp" | "udp">("tcp");
  const [rtspStatus, setRtspStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [rtspStatusMessage, setRtspStatusMessage] = useState("");
  const [hazardType, setHazardType] = useState<"smoke" | "fire" | "obstruction">("smoke");
  const [detectionConfidence, setDetectionConfidence] = useState(0.92);
  const [detectionFrames, setDetectionFrames] = useState(3);
  const [focusedCameraId, setFocusedCameraId] = useState(CAMERAS[0]?.id ?? "");
  const { triggerCameraDetection, state } = useEvacuationSimulation();

  useEffect(() => {
    let cancelled = false;

    void fetchRuntimeClientMediaTargets().then((targets) => {
      if (cancelled) {
        return;
      }

      setMediaTargets(targets);
      if (targets[0]) {
        setActiveMediaTargetId(targets[0].id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mediaTargets.some((target) => target.id === activeMediaTargetId) && mediaTargets[0]) {
      setActiveMediaTargetId(mediaTargets[0].id);
    }
  }, [activeMediaTargetId, mediaTargets]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedPhone = window.localStorage.getItem(PHONE_SOURCE_STORAGE_KEY);
      if (storedPhone) {
        const parsed = JSON.parse(storedPhone) as Partial<PhoneSourceConfig>;
        setPhoneSource({
          label: parsed.label?.trim() || DEFAULT_PHONE_LABEL,
          path: sanitizePathName(parsed.path || DEFAULT_PHONE_PATH, DEFAULT_PHONE_PATH),
        });
      }
    } catch (error) {
      console.error("Failed to read saved phone source:", error);
    }

    try {
      const storedRtsp = window.localStorage.getItem(RTSP_SOURCES_STORAGE_KEY);
      if (storedRtsp) {
        const parsed = JSON.parse(storedRtsp) as CameraSource[];
        setSavedRtspSources(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error("Failed to read saved RTSP sources:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PHONE_SOURCE_STORAGE_KEY, JSON.stringify(phoneSource));
  }, [phoneSource]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(RTSP_SOURCES_STORAGE_KEY, JSON.stringify(savedRtspSources));
  }, [savedRtspSources]);

  const normalizedPhonePath = useMemo(
    () => sanitizePathName(phoneSource.path, DEFAULT_PHONE_PATH),
    [phoneSource.path],
  );

  const sources = useMemo<CameraSource[]>(
    () => [
      {
        id: "phone-source",
        label: phoneSource.label.trim() || DEFAULT_PHONE_LABEL,
        path: normalizedPhonePath,
        type: "phone",
      },
      ...savedRtspSources,
    ],
    [normalizedPhonePath, phoneSource.label, savedRtspSources],
  );

  const activeMediaTarget = mediaTargets.find((target) => target.id === activeMediaTargetId) ?? mediaTargets[0] ?? null;
  const webrtcBaseUrl = activeMediaTarget?.webrtcBaseUrl ?? "";
  const hlsBaseUrl = activeMediaTarget?.hlsBaseUrl ?? "";
  const selectedSource = sources.find((source) => source.id === selectedSourceId) || sources[0] || null;
  const phonePublishUrl = webrtcBaseUrl ? `${trimMediaMtxSlash(webrtcBaseUrl)}/${normalizedPhonePath}/publish` : "";

  useEffect(() => {
    if (!phonePublishUrl) {
      setPhonePublishQr("");
      return;
    }

    void QRCode.toDataURL(phonePublishUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#081d2c", light: "#f8fafc" },
    }).then(setPhonePublishQr).catch(() => setPhonePublishQr(""));
  }, [phonePublishUrl]);

  const previewUrl = useMemo(() => {
    if (!selectedSource) {
      return "";
    }

    if (previewProtocol === "webrtc" && webrtcBaseUrl) {
      const url = new URL(buildMediaMtxViewerUrl(webrtcBaseUrl, selectedSource.path));
      url.searchParams.set("v", String(previewRefreshKey));
      return url.toString();
    }

    if (previewProtocol === "hls" && hlsBaseUrl) {
      const url = new URL(buildMediaMtxViewerUrl(hlsBaseUrl, selectedSource.path));
      url.searchParams.set("v", String(previewRefreshKey));
      return url.toString();
    }

    return "";
  }, [hlsBaseUrl, previewProtocol, previewRefreshKey, selectedSource, webrtcBaseUrl]);

  const rtspPreview = useMemo(
    () => buildRtspPreviewUrl(rtspHost, rtspPort, rtspUser, rtspPassword, rtspPath),
    [rtspHost, rtspPassword, rtspPath, rtspPort, rtspUser],
  );
  const tacticalGraphNodes = state.graphNodes.length > 0 ? state.graphNodes : NODES;
  const tacticalGraphEdges = state.graphEdges.length > 0 ? state.graphEdges : EDGES;
  const tacticalGraph = useMemo(
    () => createGraphSnapshot(tacticalGraphNodes, tacticalGraphEdges),
    [tacticalGraphEdges, tacticalGraphNodes],
  );
  const tacticalNodeIdByCameraId = useMemo(
    () =>
      Object.fromEntries(
        tacticalGraphNodes
          .filter((node) => node.cameraId)
          .map((node) => [node.cameraId as string, node.id]),
      ) as Record<string, string>,
    [tacticalGraphNodes],
  );
  const focusedCamera = useMemo(
    () => CAMERAS.find((camera) => camera.id === focusedCameraId) ?? CAMERAS[0] ?? null,
    [focusedCameraId],
  );
  const focusedCameraNode = useMemo(
    () => (focusedCamera ? tacticalGraph.nodes.find((node) => node.cameraId === focusedCamera.id) ?? null : null),
    [focusedCamera, tacticalGraph.nodes],
  );
  const focusedFloorId = (focusedCameraNode?.floorId ?? focusedCamera?.floorId ?? "floor_1") as FloorId;
  const focusedFloorDimensions = state.floorDimensions[focusedFloorId];
  const focusedFloorMeta = FLOORS.find((floor) => floor.id === focusedFloorId) ?? null;
  const focusedImpact = useMemo(
    () =>
      focusedCamera
        ? resolveCameraImpact(
            focusedCamera.id,
            { confidence: detectionConfidence, frameCount: detectionFrames, hazardType },
            tacticalGraph,
          )
        : null,
    [detectionConfidence, detectionFrames, focusedCamera, hazardType, tacticalGraph],
  );
  const focusedCoverageMarkers = useMemo(() => {
    if (!focusedCamera) {
      return [];
    }

    const markers: Array<{ id: string; label: string; nodeId: string; tone: "camera"; detail: string }> = [];
    const cameraNodeId = tacticalNodeIdByCameraId[focusedCamera.id];
    if (cameraNodeId) {
      markers.push({
        id: `${focusedCamera.id}-camera`,
        label: "CAM",
        nodeId: cameraNodeId,
        tone: "camera",
        detail: `${focusedCamera.label} | ${focusedFloorMeta?.label ?? focusedFloorId}`,
      });
    }

    focusedCamera.coverageNodeIds.forEach((nodeId, index) => {
      if (tacticalGraph.nodesById[nodeId]) {
        markers.push({
          id: `${focusedCamera.id}-coverage-${nodeId}`,
          label: `C${index + 1}`,
          nodeId,
          tone: "camera",
          detail: `Coverage node ${index + 1} for ${focusedCamera.label}`,
        });
      }
    });

    return markers;
  }, [focusedCamera, focusedFloorId, focusedFloorMeta?.label, tacticalGraph.nodesById, tacticalNodeIdByCameraId]);
  const focusedMapHref = focusedCamera
    ? buildTacticalMapHref(focusedCamera.id, focusedFloorId, focusedCameraNode?.id, selectedSource?.path)
    : "/admin/tactical-map";

  useEffect(() => {
    if (!focusedCameraId && CAMERAS[0]) {
      setFocusedCameraId(CAMERAS[0].id);
    }
  }, [focusedCameraId]);

  useEffect(() => {
    if (!selectedSource) {
      return;
    }

    // HLS is the more stable default inside an embedded browser preview.
    setPreviewProtocol("hls");
    setPreviewRefreshKey((current) => current + 1);
  }, [selectedSource?.id]);

  const connectRtspCamera = async () => {
    const pathName = sanitizePathName(rtspPathName, "rtsp-cctv");
    if (!rtspHost.trim()) {
      setRtspStatus("error");
      setRtspStatusMessage("Camera IP or hostname is required.");
      return;
    }

    setRtspStatus("loading");
    setRtspStatusMessage("");

    try {
      const response = await fetch("/api/admin/camera-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathName,
          host: rtspHost.trim(),
          port: rtspPort.trim() || "554",
          username: rtspUser.trim(),
          password: rtspPassword,
          streamPath: rtspPath.trim() || "stream1",
          transport: rtspTransport,
        }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string; message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to connect RTSP CCTV.");
      }

      const source: CameraSource = {
        id: `rtsp-${pathName}`,
        label: rtspLabel.trim() || pathName,
        path: pathName,
        type: "rtsp",
      };

      setSavedRtspSources((current) => [source, ...current.filter((item) => item.id !== source.id)]);
      setSelectedSourceId(source.id);
      setPreviewProtocol("hls");
      setPreviewRefreshKey((current) => current + 1);
      setRtspStatus("success");
      setRtspStatusMessage(data.message || "RTSP CCTV connected. Preview should be live now.");
    } catch (error) {
      setRtspStatus("error");
      setRtspStatusMessage(error instanceof Error ? error.message : "Failed to connect RTSP CCTV.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 font-['Sora']">
      <DashboardHeader
        title="Security Cameras"
        userName="Administrator"
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />
      <div className="flex flex-1 overflow-hidden pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-zinc-800/80 dark:bg-[#050505]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-zinc-800/80">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#175ead]">Live Preview</p>
                  <h2 className="mt-2 text-2xl font-black">{selectedSource?.label || "No source selected"}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                    {selectedSource ? `${selectedSource.type === "phone" ? "Phone" : "RTSP"} path: ${selectedSource.path}` : "Configure a phone or RTSP source first."}
                  </p>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#175ead] dark:text-[#9cc8ff]">
                    Backend: {activeMediaTarget?.label ?? "Not configured"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {mediaTargets.map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setActiveMediaTargetId(target.id)}
                      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                        activeMediaTarget?.id === target.id
                          ? "bg-emerald-500 text-black"
                          : "border border-slate-200 dark:border-zinc-800/80"
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                      <button type="button" onClick={() => { setPreviewProtocol("webrtc"); setPreviewRefreshKey((current) => current + 1); }} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${previewProtocol === "webrtc" ? "bg-[#175ead] text-white" : "border border-slate-200 dark:border-zinc-800/80"}`}>WebRTC</button>
                      <button type="button" onClick={() => { setPreviewProtocol("hls"); setPreviewRefreshKey((current) => current + 1); }} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${previewProtocol === "hls" ? "bg-[#09090b] text-white dark:bg-white dark:text-black" : "border border-slate-200 dark:border-zinc-800/80"}`}>HLS</button>
                  <button type="button" onClick={() => setPreviewRefreshKey((current) => current + 1)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] dark:border-zinc-800/80">Refresh</button>
                </div>
              </div>
              <div className="p-6">
                <div className="min-h-[420px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-black dark:border-zinc-800/80">
                  {previewUrl ? (
                    <iframe
                      key={`${selectedSource?.path || "none"}-${previewProtocol}-${previewRefreshKey}`}
                      src={previewUrl}
                      title={selectedSource ? `${selectedSource.label} preview` : "Camera preview"}
                      allow="autoplay; fullscreen"
                      className="h-[420px] w-full border-0"
                    />
                  ) : (
                    <div className="flex h-[420px] items-center justify-center px-6 text-center text-white/70">
                      Configure MediaMTX primary or fallback public URLs for WebRTC and HLS.
                    </div>
                  )}
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {sources.map((source) => (
                      <button key={source.id} type="button" onClick={() => { setSelectedSourceId(source.id); setPreviewRefreshKey((current) => current + 1); }} className={`rounded-[1.25rem] border px-4 py-4 text-left ${selectedSource?.id === source.id ? "border-[#175ead] bg-[#175ead]/5" : "border-slate-200 dark:border-zinc-800/80"}`}>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">{source.type === "phone" ? "Phone source" : "RTSP source"}</p>
                      <p className="mt-2 text-sm font-bold">{source.label}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{source.path}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-[#050505]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#175ead]">Phone CCTV</p>
                <h3 className="mt-2 text-xl font-black">Publish from a phone</h3>
                <div className="mt-5 space-y-3">
                  <input value={phoneSource.label} onChange={(event) => setPhoneSource((current) => ({ ...current, label: event.target.value }))} placeholder="Phone camera label" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <input value={phoneSource.path} onChange={(event) => setPhoneSource((current) => ({ ...current, path: event.target.value }))} placeholder="phone-cctv" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                </div>
                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-5 dark:border-zinc-800/80 dark:bg-[#0f1720]">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-[#94a3b8]">Publish URL</p>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#175ead] dark:text-[#9cc8ff]">{activeMediaTarget?.label ?? "No backend active"}</p>
                  <p className="mt-2 break-all text-xs text-slate-500 dark:text-zinc-400">{phonePublishUrl || "Set NEXT_PUBLIC_MEDIAMTX_PRIMARY_WEBRTC_BASE_URL or NEXT_PUBLIC_MEDIAMTX_FALLBACK_WEBRTC_BASE_URL first."}</p>
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    {phonePublishQr ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={phonePublishQr} alt="Phone publish QR" className="h-40 w-40 rounded-2xl" />
                    ) : (
                      <div className="h-40 w-40 rounded-2xl bg-[#e4e4e7] dark:bg-[#111827]" />
                    )}
                    <div className="space-y-3">
                      <a href={phonePublishUrl || "#"} target="_blank" rel="noreferrer" className={`inline-flex rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] ${phonePublishUrl ? "bg-[#175ead] text-white" : "pointer-events-none bg-[#d4d4d8] text-slate-500"}`}>Open Publish Page</a>
                      <button type="button" onClick={() => { setSelectedSourceId("phone-source"); setPreviewProtocol("webrtc"); }} className="block rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] dark:border-zinc-800/80">Watch Phone Feed</button>
                    </div>
                  </div>
                </div>
                {mediaTargets.length > 1 ? (
                  <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">
                    Oracle-first mode is supported. When primary URLs are configured later, this page will prefer them and keep the current GCP MediaMTX as fallback.
                  </p>
                ) : null}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-[#050505]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bc000a] dark:text-[#ffb4aa]">RTSP CCTV</p>
                <h3 className="mt-2 text-xl font-black">Connect a real CCTV camera</h3>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <input value={rtspLabel} onChange={(event) => setRtspLabel(event.target.value)} placeholder="Lobby CCTV" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <input value={rtspPathName} onChange={(event) => setRtspPathName(event.target.value)} placeholder="lobby-cctv" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <input value={rtspHost} onChange={(event) => setRtspHost(event.target.value)} placeholder="Camera IP or hostname" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <input value={rtspPort} onChange={(event) => setRtspPort(event.target.value)} placeholder="554" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <input value={rtspUser} onChange={(event) => setRtspUser(event.target.value)} placeholder="Username" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <input type="password" value={rtspPassword} onChange={(event) => setRtspPassword(event.target.value)} placeholder="Password" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <input value={rtspPath} onChange={(event) => setRtspPath(event.target.value)} placeholder="stream1" className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]" />
                  <select value={rtspTransport} onChange={(event) => setRtspTransport(event.target.value as "automatic" | "tcp" | "udp")} className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]">
                    <option value="tcp">TCP</option>
                    <option value="automatic">Automatic</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-[#bc000a]/30 bg-[#bc000a]/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bc000a] dark:text-[#ffb4aa]">Generated RTSP URL</p>
                  <p className="mt-2 break-all font-mono text-xs text-[#5f2120] dark:text-[#ffd8d1]">{rtspPreview || "rtsp://username:password@camera-ip:554/stream1"}</p>
                </div>
                {rtspStatusMessage && <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${rtspStatus === "error" ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>{rtspStatusMessage}</p>}
                <button type="button" onClick={() => void connectRtspCamera()} disabled={rtspStatus === "loading"} className="mt-5 w-full rounded-2xl bg-[#09090b] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white disabled:opacity-60 dark:bg-white dark:text-black">{rtspStatus === "loading" ? "Connecting CCTV..." : "Connect RTSP CCTV"}</button>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-[#050505]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5 dark:border-zinc-800/80">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#175ead]">Tactical Map Sync</p>
                <h3 className="mt-2 text-xl font-black">
                  {focusedCamera?.label ?? "Camera map context"}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                  Camera coverage, likely blocked nodes, and reroute pressure are projected onto the same tactical graph used by the operations map.
                </p>
              </div>
              <Link
                href={focusedMapHref}
                className="rounded-2xl bg-[#175ead] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white"
              >
                Open Full Tactical Map
              </Link>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.8fr]">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-zinc-800/80">
                <EvacuationMap
                  floorId={focusedFloorId}
                  floorPlanImageUrl={state.floorPlanImages[focusedFloorId] ?? null}
                  dimensionsLabel={
                    focusedFloorDimensions
                      ? `${focusedFloorDimensions.widthMeters}m x ${focusedFloorDimensions.heightMeters}m`
                      : undefined
                  }
                  activeHazardNodeIds={focusedImpact?.blockedNodeIds ?? []}
                  avoidNodeIds={focusedImpact?.avoidNodeIds ?? []}
                  selectedNodeId={focusedCameraNode?.id ?? null}
                  markers={focusedCoverageMarkers}
                  graphNodes={tacticalGraphNodes}
                  graphEdges={tacticalGraphEdges}
                />
              </div>
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-5 dark:border-zinc-800/80 dark:bg-[#0f1720]">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-[#94a3b8]">Focused Floor</p>
                  <p className="mt-2 text-lg font-black">{focusedFloorMeta?.label ?? focusedFloorId.replace("_", " ")}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                    {focusedImpact
                      ? `${focusedImpact.label}. Block ${focusedImpact.blockedNodeIds.length} nodes, avoid ${focusedImpact.avoidNodeIds.length}, close ${focusedImpact.blockedEdgeIds.length} edges.`
                      : "No mapped impact available for this camera on the current graph."}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 p-5 dark:border-zinc-800/80">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-[#94a3b8]">Coverage Nodes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {focusedCamera?.coverageNodeIds.map((nodeId) => (
                      <span key={nodeId} className="rounded-full bg-[#175ead]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#175ead] dark:bg-[#175ead]/20 dark:text-[#9cc8ff]">
                        {tacticalGraph.nodesById[nodeId]?.label ?? nodeId}
                      </span>
                    )) ?? (
                      <span className="text-xs text-slate-500 dark:text-zinc-400">No mapped coverage nodes.</span>
                    )}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 p-5 dark:border-zinc-800/80">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-[#94a3b8]">Quick Focus</p>
                  <div className="mt-3 space-y-2">
                    {CAMERAS.map((camera) => (
                      <button
                        key={camera.id}
                        type="button"
                        onClick={() => setFocusedCameraId(camera.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left ${
                          focusedCamera?.id === camera.id
                            ? "border-[#175ead] bg-[#175ead]/5"
                            : "border-slate-200 dark:border-zinc-800/80"
                        }`}
                      >
                        <p className="text-sm font-bold">{camera.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                          {camera.floorId.replace("_", " ")} | {camera.zoneId}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-[#050505]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bc000a] dark:text-[#ffb4aa]">Incident Trigger</p>
            <h3 className="mt-2 text-xl font-black">Auto-block mapped beacons from camera alerts</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <label className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800/80"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">Hazard Type</span><select value={hazardType} onChange={(event) => setHazardType(event.target.value as "smoke" | "fire" | "obstruction")} className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-zinc-800/80 dark:bg-[#111827]"><option value="smoke">Smoke</option><option value="fire">Fire</option><option value="obstruction">Obstruction</option></select></label>
              <label className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800/80"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">Confidence</span><input type="range" min="0.5" max="0.99" step="0.01" value={detectionConfidence} onChange={(event) => setDetectionConfidence(Number(event.target.value))} className="mt-4 w-full accent-[#bc000a]" /><p className="mt-2 text-sm font-bold">{Math.round(detectionConfidence * 100)}%</p></label>
              <label className="rounded-2xl border border-slate-200 p-4 dark:border-zinc-800/80"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-400">Repeated Frames</span><input type="range" min="1" max="5" step="1" value={detectionFrames} onChange={(event) => setDetectionFrames(Number(event.target.value))} className="mt-4 w-full accent-[#175ead]" /><p className="mt-2 text-sm font-bold">{detectionFrames} consecutive hits</p></label>
            </div>
            <div className="mt-5 space-y-3">
              {CAMERAS.map((camera) => {
                const latestDetection = state.cameraDetections.find((entry) => entry.cameraId === camera.id);
                const impact = resolveCameraImpact(camera.id, { confidence: detectionConfidence, frameCount: detectionFrames, hazardType });
                return (
                  <div key={camera.id} className="rounded-[1.5rem] border border-slate-200 p-4 dark:border-zinc-800/80">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold">{camera.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{camera.floorId.replace("_", " ")} | covers {camera.coverageNodeIds.length} nodes</p>
                        {impact && <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Zone {impact.zoneId} | {impact.status.toUpperCase()} | block {impact.blockedNodeIds.length} nodes | avoid {impact.avoidNodeIds.length} nodes | close {impact.blockedEdgeIds.length} edges</p>}
                        {latestDetection && <p className="mt-2 text-xs text-[#bc000a] dark:text-[#ffb4aa]">Latest detection: {latestDetection.label}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setFocusedCameraId(camera.id)}
                          className={`rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] ${
                            focusedCameraId === camera.id
                              ? "border-[#175ead] bg-[#175ead]/10 text-[#175ead] dark:text-[#9cc8ff]"
                              : "border-slate-200 text-slate-900 dark:border-zinc-800/80 dark:text-white"
                          }`}
                        >
                          Focus Map
                        </button>
                        <Link
                          href={buildTacticalMapHref(camera.id, camera.floorId, tacticalNodeIdByCameraId[camera.id])}
                          className="rounded-2xl border border-[#175ead] px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#175ead] dark:text-[#9cc8ff]"
                        >
                          Open Tactical Map
                        </Link>
                        <button type="button" onClick={() => triggerCameraDetection(camera.id, { confidence: detectionConfidence, frameCount: detectionFrames, hazardType })} className="rounded-2xl bg-[#bc000a] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white">Run Auto Block</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
