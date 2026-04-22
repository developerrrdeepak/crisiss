import { NextRequest, NextResponse } from "next/server";
import { getServerMediaMtxApiTargets } from "@/lib/mediamtx";

type CameraControlPayload = {
  pathName?: string;
  host?: string;
  ip?: string;
  port?: string | number;
  username?: string;
  user?: string;
  password?: string;
  pass?: string;
  streamPath?: string;
  rtspPath?: string;
  rtspUrl?: string;
  transport?: string;
};

type MediaMtxPathStatus = {
  ready?: boolean;
  tracks?: unknown[];
  bytesReceived?: number;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function sanitizePathName(value: string | undefined, fallback: string) {
  const normalized = (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return normalized || fallback;
}

function buildRtspUrl(payload: CameraControlPayload) {
  if (payload.rtspUrl?.trim()) {
    return payload.rtspUrl.trim();
  }

  const host = payload.host?.trim() || payload.ip?.trim() || "";
  if (!host) {
    throw new Error("Missing camera IP or host.");
  }

  const username = payload.username?.trim() || payload.user?.trim() || "";
  const password = payload.password ?? payload.pass ?? "";
  const auth =
    username || password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
      : "";
  const port = `${payload.port ?? "554"}`.trim() || "554";
  const streamPath = (payload.streamPath || payload.rtspPath || "stream1").trim().replace(/^\/+/, "");

  return `rtsp://${auth}${host}:${port}/${streamPath || "stream1"}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPrivateIpv4(host: string) {
  const parts = host.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
    return false;
  }

  const [a, b] = parts.map((part) => Number(part));
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isLocalOrPrivateHost(hostname: string) {
  if (!hostname) {
    return false;
  }

  return hostname === "localhost" || hostname === "127.0.0.1" || isPrivateIpv4(hostname);
}

async function getMediaMtxPathStatus(apiBaseUrl: string, pathName: string) {
  const response = await fetch(`${trimTrailingSlash(apiBaseUrl)}/v3/paths/get/${pathName}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Path status check failed -> ${response.status} ${responseText}`);
  }

  return (await response.json()) as MediaMtxPathStatus;
}

async function waitForPathReady(apiBaseUrl: string, pathName: string, timeoutMs = 12000) {
  const startedAt = Date.now();
  let lastStatus: MediaMtxPathStatus | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastStatus = await getMediaMtxPathStatus(apiBaseUrl, pathName);
    const hasTracks = Array.isArray(lastStatus.tracks) && lastStatus.tracks.length > 0;
    if (lastStatus.ready && (hasTracks || (lastStatus.bytesReceived ?? 0) > 0)) {
      return lastStatus;
    }

    await sleep(1000);
  }

  return lastStatus;
}

async function updateMediaMtxPath(
  apiBaseUrl: string,
  pathName: string,
  body: Record<string, unknown>,
) {
  const attempts = [
    { method: "PATCH", endpoint: `/v3/config/paths/patch/${pathName}` },
    { method: "POST", endpoint: `/v3/config/paths/add/${pathName}` },
    { method: "PATCH", endpoint: `/v3/paths/config/patch/${pathName}` },
    { method: "POST", endpoint: `/v3/paths/config/add/${pathName}` },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    const response = await fetch(`${trimTrailingSlash(apiBaseUrl)}${attempt.endpoint}`, {
      method: attempt.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return;
    }

    const responseText = await response.text();
    errors.push(`${attempt.method} ${attempt.endpoint} -> ${response.status} ${responseText}`);
  }

  throw new Error(`MediaMTX path update failed. ${errors.join(" | ")}`);
}

export async function POST(req: NextRequest) {
  const mediaTargets = getServerMediaMtxApiTargets();
  if (mediaTargets.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "No MediaMTX API target is configured. Set MEDIAMTX_PRIMARY_API_URL or MEDIAMTX_FALLBACK_API_URL.",
      },
      { status: 500 },
    );
  }

  try {
    const payload = (await req.json()) as CameraControlPayload;
    const pathName = sanitizePathName(payload.pathName, "tactical-feed");
    const rtspUrl = buildRtspUrl(payload);
    const transport = (payload.transport || "automatic").trim().toLowerCase();

    const pathConfig: Record<string, unknown> = {
      source: rtspUrl,
      sourceOnDemand: false,
    };

    if (transport === "tcp" || transport === "udp" || transport === "multicast") {
      pathConfig.rtspTransport = transport;
    }

    const backendErrors: string[] = [];
    let backendUsed: string | null = null;
    let backendApiBaseUrl: string | null = null;

    for (const mediaTarget of mediaTargets) {
      try {
        await updateMediaMtxPath(mediaTarget.apiBaseUrl, pathName, pathConfig);
        backendUsed = mediaTarget.label;
        backendApiBaseUrl = mediaTarget.apiBaseUrl;
        break;
      } catch (error) {
        backendErrors.push(
          `${mediaTarget.label}: ${error instanceof Error ? error.message : "Unknown MediaMTX API failure."}`,
        );
      }
    }

    if (!backendUsed) {
      throw new Error(backendErrors.join(" | "));
    }

    const pathStatus = await waitForPathReady(backendApiBaseUrl!, pathName);
    const hasTracks = Array.isArray(pathStatus?.tracks) && pathStatus.tracks.length > 0;
    const hasTraffic = (pathStatus?.bytesReceived ?? 0) > 0;

    if (!pathStatus?.ready || (!hasTracks && !hasTraffic)) {
      const host = payload.host?.trim() || payload.ip?.trim() || "";
      let hint =
        "MediaMTX saved the RTSP details, but it is not receiving any video tracks. Check the camera IP, port, username, password, and stream path.";

      if (host && isPrivateIpv4(host)) {
        const apiHostname = new URL(backendApiBaseUrl!).hostname;
        if (!isLocalOrPrivateHost(apiHostname)) {
          hint += ` The camera host ${host} is a private LAN IP, but the active MediaMTX backend is remote (${backendUsed}), so it cannot reach that device directly.`;
        }
      }

      return NextResponse.json(
        {
          success: false,
          pathName,
          rtspUrl,
          backend: backendUsed,
          error: hint,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      pathName,
      rtspUrl,
      backend: backendUsed,
      message: `${backendUsed} is receiving a live RTSP feed for "${pathName}".`,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown camera control error occurred.";
    console.error("Camera Control API Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
