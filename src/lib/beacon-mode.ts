const beaconModeEnv = process.env.NEXT_PUBLIC_BEACON_MODE?.trim().toLowerCase();
const physicalBeaconToggleEnv = process.env.NEXT_PUBLIC_ENABLE_PHYSICAL_BEACONS?.trim().toLowerCase();

export type BeaconMode = "virtual" | "hardware";

export interface AnchorNodeLike {
  id: string;
  floorId: string;
  label: string;
  type: string;
  bleAddress?: string | null;
  beaconIndex?: number | null;
}

const TRACKABLE_ANCHOR_TYPES = new Set([
  "beacon",
  "junction",
  "checkpoint",
  "stair",
  "elevator",
  "exit"
]);

const ANCHOR_TYPE_TOKENS: Record<string, string> = {
  beacon: "COR",
  junction: "JCT",
  checkpoint: "CHK",
  stair: "STR",
  elevator: "LFT",
  exit: "EXT",
};

// Hashing constants for generating stable pseudo-random hardware indices
const HASH_PRIME = 31;
const HASH_MODULUS = 900;
const HASH_OFFSET = 100;

function getFloorToken(floorId: string): string {
  const digits = floorId.replace(/[^0-9]/g, "");
  return digits || floorId.toUpperCase();
}

function getAnchorTypeToken(type: string): string {
  return ANCHOR_TYPE_TOKENS[type] || "ANC";
}

function getStableAnchorIndex(node: AnchorNodeLike): number {
  if (typeof node.beaconIndex === "number" && node.beaconIndex > 0) {
    return node.beaconIndex;
  }

  const seed = `${node.floorId}:${node.id}:${node.label}:${node.type}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * HASH_PRIME + seed.charCodeAt(index)) % HASH_MODULUS;
  }

  return hash + HASH_OFFSET;
}

export function getBeaconMode(): BeaconMode {
  return beaconModeEnv === "hardware" || physicalBeaconToggleEnv === "true"
    ? "hardware"
    : "virtual";
}

export function isVirtualBeaconMode(): boolean {
  return getBeaconMode() === "virtual";
}

export function isTrackableAnchorNode(type: string): boolean {
  return TRACKABLE_ANCHOR_TYPES.has(type);
}

export function buildAnchorAddress(node: AnchorNodeLike): string {
  const virtualMode = isVirtualBeaconMode();

  if (!virtualMode && node.bleAddress) {
    return node.bleAddress;
  }

  const prefix = virtualMode ? "VRT" : "BLE";
  const floorToken = getFloorToken(node.floorId);
  const typeToken = getAnchorTypeToken(node.type);
  const indexToken = String(getStableAnchorIndex(node)).padStart(3, "0");

  return `AEG-${floorToken}-${prefix}-${typeToken}-${indexToken}`;
}

export function getBeaconModeCopy() {
  const virtualMode = isVirtualBeaconMode();

  return {
    mode: getBeaconMode(),
    transportRelayLabel: virtualMode ? "Virtual Relay" : "BLE Beacon",
    routeLocksLabel: virtualMode ? "Route Anchors" : "BLE Route Locks",
    routeListLabel: virtualMode ? "Route Anchors" : "BLE Path",
    routeCountLabel: virtualMode ? "Route anchors" : "BLE anchors",
    liveLockLabel: virtualMode ? "Anchor lock" : "Beacon lock",
    pendingLockLabel: virtualMode ? "Awaiting virtual corridor anchor" : "Awaiting secure BLE lock",

    routeSequencePending: virtualMode
      ? "Virtual anchors will appear after the floor graph is generated."
      : "BLE anchors will appear after the floor graph is generated.",

    routeLocksPending: virtualMode
      ? "Route anchor sequence will appear when the active floor graph is ready."
      : "BLE lock sequence will appear when the active floor graph is ready.",

    mapMotionSummary: virtualMode
      ? "The live marker follows corridor-anchor handoffs every 1.2 seconds across the building."
      : "The live marker follows beacon-to-beacon movement every 1.2 seconds across the building.",

    trackingStackSummary: virtualMode
      ? "System reads virtual corridor anchors, stair landing checkpoints, and floor-change inference in simulation."
      : "System reads corridor beacons, stair landing anchors, and barometer-style floor changes in simulation.",

    transportOfflineSummary: virtualMode
      ? "Internet unavailable. Virtual corridor relay engaged."
      : "Internet unavailable. BLE beacon fallback engaged.",

    transportCriticalSummary: virtualMode
      ? "Internet and IP relay are unstable. Virtual corridor relay selected."
      : "Internet and IP relay are unstable. BLE beacon selected.",

    transportHeadline: virtualMode ? "Internet to IP to Virtual Relay" : "Internet to IP to BLE",

    simulationActiveSummary: virtualMode
      ? "Simulation active: guests execute routines, staff patrol designated checkpoints, virtual anchor locks emit automatically, and reroutes update on dynamic blockages."
      : "Simulation active: guests execute routines, staff patrol designated checkpoints, BLE locks emit automatically, and reroutes update on dynamic blockages.",

    simulationIdleSummary: virtualMode
      ? "Start Simulation to enable movement algorithms, virtual-anchor tracking events, and automatic hazard propagation."
      : "Start Simulation to enable movement algorithms, BLE tracking events, and automatic hazard propagation.",

    simulatorPanelLabel: virtualMode ? "Anchor Simulator" : "BLE Simulator",
    simulatorSpacingLabel: virtualMode ? "Anchor spacing" : "BLE spacing",
    liveTestLabel: virtualMode ? "Live Anchor Test" : "Live BLE Test",
    injectActionLabel: virtualMode ? "Inject Anchor Lock" : "Inject BLE Scan",

    injectActionSummary: virtualMode
      ? "This field test bridge artificially moves the selected person to the chosen virtual anchor and recalculates the evacuation route live."
      : "This field test bridge artificially moves the selected person to the chosen BLE address and recalculates the evacuation route live.",
  };
}