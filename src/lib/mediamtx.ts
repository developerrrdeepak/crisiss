export type MediaMtxClientTarget = {
  id: "primary" | "fallback" | "local";
  label: string;
  webrtcBaseUrl: string;
  hlsBaseUrl: string;
};

export type MediaMtxServerTarget = {
  id: "primary" | "fallback";
  label: string;
  apiBaseUrl: string;
};

type EnvMap = Record<string, string | undefined>;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeUrl(value: string | undefined) {
  return value?.trim() ? trimTrailingSlash(value.trim()) : "";
}

function buildLocalDevBaseUrl(port: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const hostname = window.location.hostname;
  if (!["localhost", "127.0.0.1"].includes(hostname)) {
    return "";
  }

  try {
    const url = new URL(window.location.origin);
    url.port = port;
    return trimTrailingSlash(url.origin);
  } catch {
    return "";
  }
}

export function getConfiguredClientMediaTargets(env: EnvMap = process.env): MediaMtxClientTarget[] {
  const targets: MediaMtxClientTarget[] = [];
  const seen = new Set<string>();

  const primaryWebrtc =
    normalizeUrl(env.NEXT_PUBLIC_MEDIAMTX_PRIMARY_WEBRTC_BASE_URL) ||
    normalizeUrl(env.NEXT_PUBLIC_MEDIAMTX_WEBRTC_BASE_URL);
  const primaryHls =
    normalizeUrl(env.NEXT_PUBLIC_MEDIAMTX_PRIMARY_HLS_BASE_URL) ||
    normalizeUrl(env.NEXT_PUBLIC_MEDIAMTX_HLS_BASE_URL);

  if (primaryWebrtc || primaryHls) {
    const key = `${primaryWebrtc}|${primaryHls}`;
    if (!seen.has(key)) {
      seen.add(key);
      targets.push({
        id: "primary",
        label: env.NEXT_PUBLIC_MEDIAMTX_PRIMARY_LABEL?.trim() || "Primary MediaMTX",
        webrtcBaseUrl: primaryWebrtc,
        hlsBaseUrl: primaryHls,
      });
    }
  }

  const fallbackWebrtc = normalizeUrl(env.NEXT_PUBLIC_MEDIAMTX_FALLBACK_WEBRTC_BASE_URL);
  const fallbackHls = normalizeUrl(env.NEXT_PUBLIC_MEDIAMTX_FALLBACK_HLS_BASE_URL);

  if (fallbackWebrtc || fallbackHls) {
    const key = `${fallbackWebrtc}|${fallbackHls}`;
    if (!seen.has(key)) {
      seen.add(key);
      targets.push({
        id: "fallback",
        label: env.NEXT_PUBLIC_MEDIAMTX_FALLBACK_LABEL?.trim() || "Fallback MediaMTX",
        webrtcBaseUrl: fallbackWebrtc,
        hlsBaseUrl: fallbackHls,
      });
    }
  }

  return targets;
}

export function getClientMediaTargets(): MediaMtxClientTarget[] {
  const targets = getConfiguredClientMediaTargets();

  const localWebrtc = buildLocalDevBaseUrl("8889");
  const localHls = buildLocalDevBaseUrl("8888");
  if ((localWebrtc || localHls) && targets.length === 0) {
    targets.push({
      id: "local",
      label: "Local MediaMTX",
      webrtcBaseUrl: localWebrtc,
      hlsBaseUrl: localHls,
    });
  }

  return targets;
}

export async function fetchRuntimeClientMediaTargets() {
  if (typeof window === "undefined") {
    return getConfiguredClientMediaTargets();
  }

  try {
    const response = await fetch("/api/media-targets", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { targets?: MediaMtxClientTarget[] };
      if (Array.isArray(payload.targets) && payload.targets.length > 0) {
        return payload.targets;
      }
    }
  } catch (error) {
    console.error("Failed to load runtime MediaMTX targets:", error);
  }

  return getClientMediaTargets();
}

export function getServerMediaMtxApiTargets(): MediaMtxServerTarget[] {
  const targets: MediaMtxServerTarget[] = [];
  const seen = new Set<string>();

  const primaryApi =
    normalizeUrl(process.env.MEDIAMTX_PRIMARY_API_URL) ||
    normalizeUrl(process.env.MEDIAMTX_API_URL);
  if (primaryApi && !seen.has(primaryApi)) {
    seen.add(primaryApi);
    targets.push({
      id: "primary",
      label: process.env.MEDIAMTX_PRIMARY_LABEL?.trim() || "Primary MediaMTX",
      apiBaseUrl: primaryApi,
    });
  }

  const fallbackApi = normalizeUrl(process.env.MEDIAMTX_FALLBACK_API_URL);
  if (fallbackApi && !seen.has(fallbackApi)) {
    seen.add(fallbackApi);
    targets.push({
      id: "fallback",
      label: process.env.MEDIAMTX_FALLBACK_LABEL?.trim() || "Fallback MediaMTX",
      apiBaseUrl: fallbackApi,
    });
  }

  return targets;
}

export function buildMediaMtxViewerUrl(baseUrl: string, streamPath: string) {
  const url = new URL(`${trimTrailingSlash(baseUrl)}/${streamPath}`);
  url.searchParams.set("controls", "true");
  url.searchParams.set("muted", "true");
  url.searchParams.set("autoplay", "true");
  url.searchParams.set("playsInline", "true");
  return url.toString();
}

export function trimMediaMtxSlash(value: string) {
  return trimTrailingSlash(value);
}
