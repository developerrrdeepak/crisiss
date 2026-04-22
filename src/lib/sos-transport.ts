import { getBeaconModeCopy } from "@/lib/beacon-mode";

export type SosTransport = "internet" | "ip" | "ble";

export interface TransportChannels {
  internet: string;
  ip: string;
  ble: string;
}

export interface TransportAssessment {
  transport: SosTransport;
  qualityLabel: string;
  summary: string;
}

export function buildTransportChannels(baseChannel: string): TransportChannels {
  return {
    internet: `${baseChannel}-internet`,
    ip: `${baseChannel}-ip`,
    ble: `${baseChannel}-ble`,
  };
}

export function getTransportLabel(transport: SosTransport) {
  const beaconCopy = getBeaconModeCopy();

  switch (transport) {
    case "internet":
      return "Internet";
    case "ip":
      return "IP Relay";
    case "ble":
      return beaconCopy.transportRelayLabel;
    default:
      return transport;
  }
}

export function assessTransport({
  online,
  effectiveType,
  downlink,
  rtt,
}: {
  online: boolean;
  effectiveType?: string | null;
  downlink?: number | null;
  rtt?: number | null;
}): TransportAssessment {
  const beaconCopy = getBeaconModeCopy();

  if (!online) {
    return {
      transport: "ble",
      qualityLabel: "Offline",
      summary: beaconCopy.transportOfflineSummary,
    };
  }

  const normalizedType = effectiveType?.toLowerCase() ?? "";
  const linkDown = typeof downlink === "number" ? downlink : null;
  const linkRtt = typeof rtt === "number" ? rtt : null;

  const internetVeryWeak =
    normalizedType === "slow-2g" ||
    normalizedType === "2g" ||
    (linkDown !== null && linkDown < 0.35) ||
    (linkRtt !== null && linkRtt > 2200);

  if (internetVeryWeak) {
    return {
      transport: "ble",
      qualityLabel: "Critical",
      summary: beaconCopy.transportCriticalSummary,
    };
  }

  const internetWeak =
    normalizedType === "3g" ||
    (linkDown !== null && linkDown < 1.2) ||
    (linkRtt !== null && linkRtt > 900);

  if (internetWeak) {
    return {
      transport: "ip",
      qualityLabel: "Weak",
      summary: "Internet is degraded. Call shifted to IP relay.",
    };
  }

  return {
    transport: "internet",
    qualityLabel: "Strong",
    summary: "Primary internet channel is stable.",
  };
}
