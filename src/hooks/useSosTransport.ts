"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assessTransport,
  getTransportLabel,
  type SosTransport,
} from "@/lib/sos-transport";

type ConnectionLike = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (event: string, listener: () => void) => void;
  removeEventListener?: (event: string, listener: () => void) => void;
};

interface UseSosTransportOptions {
  mode?: "auto" | "manual";
  initialTransport?: SosTransport;
}

export function useSosTransport({
  mode = "auto",
  initialTransport = "internet",
}: UseSosTransportOptions = {}) {
  const [isOnline, setIsOnline] = useState(true);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  const [manualTransport, setManualTransport] =
    useState<SosTransport>(initialTransport);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const connection = (
      navigator as Navigator & {
        connection?: ConnectionLike;
        mozConnection?: ConnectionLike;
        webkitConnection?: ConnectionLike;
      }
    ).connection;

    const syncNetworkState = () => {
      setIsOnline(navigator.onLine);
      setEffectiveType(connection?.effectiveType ?? null);
      setDownlink(typeof connection?.downlink === "number" ? connection.downlink : null);
      setRtt(typeof connection?.rtt === "number" ? connection.rtt : null);
    };

    syncNetworkState();
    window.addEventListener("online", syncNetworkState);
    window.addEventListener("offline", syncNetworkState);
    connection?.addEventListener?.("change", syncNetworkState);

    return () => {
      window.removeEventListener("online", syncNetworkState);
      window.removeEventListener("offline", syncNetworkState);
      connection?.removeEventListener?.("change", syncNetworkState);
    };
  }, []);

  const assessment = useMemo(
    () =>
      assessTransport({
        online: isOnline,
        effectiveType,
        downlink,
        rtt,
      }),
    [downlink, effectiveType, isOnline, rtt]
  );

  const activeTransport = mode === "manual" ? manualTransport : assessment.transport;
  const activeLabel = getTransportLabel(activeTransport);
  const recommendedLabel = getTransportLabel(assessment.transport);

  return {
    activeTransport,
    assessment,
    isOnline,
    effectiveType,
    downlink,
    rtt,
    manualTransport,
    setManualTransport,
    activeLabel,
    recommendedLabel,
  };
}
