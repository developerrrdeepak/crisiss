const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
  "NEXT_PUBLIC_SOCKET_URL",
  "NEXT_PUBLIC_BEACON_MODE",
  "NEXT_PUBLIC_ENABLE_PHYSICAL_BEACONS",
  "NEXT_PUBLIC_MEDIAMTX_LABEL",
  "NEXT_PUBLIC_MEDIAMTX_WEBRTC_BASE_URL",
  "NEXT_PUBLIC_MEDIAMTX_HLS_BASE_URL",
  "NEXT_PUBLIC_MEDIAMTX_PRIMARY_LABEL",
  "NEXT_PUBLIC_MEDIAMTX_PRIMARY_WEBRTC_BASE_URL",
  "NEXT_PUBLIC_MEDIAMTX_PRIMARY_HLS_BASE_URL",
  "NEXT_PUBLIC_MEDIAMTX_FALLBACK_LABEL",
  "NEXT_PUBLIC_MEDIAMTX_FALLBACK_WEBRTC_BASE_URL",
  "NEXT_PUBLIC_MEDIAMTX_FALLBACK_HLS_BASE_URL",
] as const;

export type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
export type PublicEnvMap = Partial<Record<PublicEnvKey, string | undefined>>;

const PUBLIC_ENV_ALIASES: Partial<Record<PublicEnvKey, string>> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "FIREBASE_PUBLIC_API_KEY",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "FIREBASE_PUBLIC_AUTH_DOMAIN",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "FIREBASE_PUBLIC_PROJECT_ID",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "FIREBASE_PUBLIC_STORAGE_BUCKET",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "FIREBASE_PUBLIC_MESSAGING_SENDER_ID",
  NEXT_PUBLIC_FIREBASE_APP_ID: "FIREBASE_PUBLIC_APP_ID",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "FIREBASE_PUBLIC_MEASUREMENT_ID",
};

declare global {
  interface Window {
    __AEGIS_PUBLIC_ENV__?: PublicEnvMap;
  }
}

function normalizePublicValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getServerPublicEnvValue(key: PublicEnvKey) {
  const alias = PUBLIC_ENV_ALIASES[key];
  return normalizePublicValue((alias ? process.env[alias] : undefined) ?? process.env[key]);
}

export function getPublicRuntimeEnv(): PublicEnvMap {
  const config: PublicEnvMap = {};

  for (const key of PUBLIC_ENV_KEYS) {
    config[key] = getServerPublicEnvValue(key);
  }

  return config;
}

export function getPublicEnv(key: PublicEnvKey): string | undefined {
  if (typeof window !== "undefined") {
    return normalizePublicValue(window.__AEGIS_PUBLIC_ENV__?.[key]);
  }

  return getServerPublicEnvValue(key);
}

export function getClientPublicEnv(): PublicEnvMap {
  if (typeof window !== "undefined") {
    return window.__AEGIS_PUBLIC_ENV__ ?? {};
  }

  return getPublicRuntimeEnv();
}

export function getPublicRuntimeConfigScript() {
  return `window.__AEGIS_PUBLIC_ENV__ = ${JSON.stringify(getPublicRuntimeEnv()).replace(/</g, "\\u003c")};`;
}
