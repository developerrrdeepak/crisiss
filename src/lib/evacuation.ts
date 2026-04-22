"use client";

import { buildAnchorAddress, isTrackableAnchorNode, isVirtualBeaconMode } from "@/lib/beacon-mode";

export type FloorId =
  | "floor_1"
  | "floor_2"
  | "floor_3"
  | "floor_4"
  | "floor_5"
  | "floor_6";

export type EvacNodeType =
  | "room"
  | "junction"
  | "stair"
  | "elevator"
  | "exit"
  | "camera"
  | "checkpoint"
  | "beacon";

export interface FloorDefinition {
  id: FloorId;
  label: string;
  level: number;
  accent: string;
}

export interface FloorDimensions {
  widthMeters: number;
  heightMeters: number;
  source: "default" | "manual" | "walk" | "vision";
  calibrationNote?: string;
}

export interface EvacNode {
  id: string;
  label: string;
  floorId: FloorId;
  x: number;
  y: number;
  mountX?: number;
  mountY?: number;
  type: EvacNodeType;
  zoneId: string;
  checkpoint?: boolean;
  isExit?: boolean;
  isRefuge?: boolean;
  cameraId?: string;
  beaconIndex?: number;
  bleAddress?: string;
  beaconMajor?: number;
  coverageNodeIds?: string[];
}

export interface EvacEdge {
  id: string;
  from: string;
  to: string;
  kind: "corridor" | "stairs" | "elevator";
  bidirectional?: boolean;
}

export interface SimOccupant {
  id: string;
  name: string;
  role: "guest" | "staff" | "admin";
  startNodeId: string;
  currentNodeId: string;
  targetNodeId?: string;
  routineNodeIds?: string[];
  routineCursor?: number;
  assignment?: string;
  lastRouteSignature?: string;
  holdTicksRemaining?: number;
  simulationMode?: "idle" | "guest_wander" | "guest_evacuating" | "staff_patrol" | "staff_response";
  assignedCameraId?: string;
  userId?: string;
  roomNumber?: string | null;
  department?: string | null;
  staffRole?: string | null;
  commsChannelId?: string;
  lastSeenAt?: string;
  lastKnownFloorId?: FloorId;
  trackingConfidence?: number;
  lastSignalSource?: "simulated_ble" | "ble" | "routing" | "camera" | "manual" | "hybrid";
  lastBeaconSignal?: {
    address: string;
    nodeId: string;
    rssi: number;
    confidence: number;
    distanceMeters: number;
    createdAt: string;
    kind?: "beacon" | "virtual_anchor";
  } | null;
}

export interface TrackingEvent {
  id: string;
  occupantId: string;
  occupantName: string;
  role: SimOccupant["role"];
  nodeId: string;
  floorId: FloorId;
  kind: "route_locked" | "reroute" | "beacon_lock" | "stair_entry" | "floor_change" | "exit_reached";
  source: "routing" | "beacon" | "barometer" | "hybrid";
  message: string;
  createdAt: string;
}

export interface TrackingStatus {
  currentNodeLabel: string;
  currentFloorLabel: string;
  nextInstruction: string;
  trackingMode: string;
  confidence: number;
  evidence: string[];
}

export interface CameraDefinition {
  id: string;
  label: string;
  floorId: FloorId;
  nodeId: string;
  zoneId: string;
  coverageNodeIds: string[];
}

export interface CameraDetection {
  id: string;
  cameraId: string;
  zoneId: string;
  label: string;
  hazardType: "smoke" | "fire" | "obstruction";
  status: "monitoring" | "warning" | "avoid" | "blocked";
  confidence: number;
  frameCount: number;
  createdAt: string;
  hazardNodeIds?: string[];
  triggeredNodeIds: string[];
  blockedNodeIds: string[];
  avoidNodeIds: string[];
  blockedEdgeIds: string[];
}

export interface SimulationState {
  activeHazardNodeIds: string[];
  avoidNodeIds: string[];
  blockedEdgeIds: string[];
  incidentMode: "normal" | "fire" | "drill";
  simulationRunning: boolean;
  graphNodes: EvacNode[];
  graphEdges: EvacEdge[];
  floorPlanImages: Partial<Record<FloorId, string>>;
  floorDimensions: Record<FloorId, FloorDimensions>;
  occupants: SimOccupant[];
  cameraDetections: CameraDetection[];
  trackingEvents: TrackingEvent[];
  selectedGuestId: string;
  selectedStaffId: string;
}

export interface EvacuationGuestRosterEntry {
  id: string;
  name: string;
  roomNumber?: string | null;
}

export interface EvacuationStaffRosterEntry {
  id: string;
  name: string;
  department?: string | null;
  role?: string | null;
  employeeId?: string | null;
}

export interface EvacuationRoster {
  guests?: EvacuationGuestRosterEntry[];
  staff?: EvacuationStaffRosterEntry[];
}

export interface GraphSnapshot {
  nodes: EvacNode[];
  edges: EvacEdge[];
  nodesById: Record<string, EvacNode>;
}

export interface RasterBlueprintAnchor {
  x: number;
  y: number;
  label?: string;
}

export interface RasterBlueprintSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RasterBlueprintLayout {
  imageWidth?: number;
  imageHeight?: number;
  dimensionsMeters?: {
    widthMeters: number | null;
    heightMeters: number | null;
    sourceText?: string | null;
    confidence?: number | null;
  };
  corridorSegments?: RasterBlueprintSegment[];
  junctionAnchors?: RasterBlueprintAnchor[];
  roomAnchors?: RasterBlueprintAnchor[];
  stairAnchors?: RasterBlueprintAnchor[];
  exitAnchors?: RasterBlueprintAnchor[];
  elevatorAnchors?: RasterBlueprintAnchor[];
  checkpointAnchors?: RasterBlueprintAnchor[];
  diagnostics?: string[];
}

export interface GeneratedFloorGraph {
  nodes: EvacNode[];
  edges: EvacEdge[];
  diagnostics: string[];
}

// --- Configuration Constants ---

const ROUTING_PENALTIES = {
  THREAT_CRITICAL: 320,
  THREAT_HIGH: 140,
  THREAT_MEDIUM: 55,
  CROWDING_CRITICAL: 24,
  CROWDING_HIGH: 10,
  CROWDING_MEDIUM: 4,
  INCIDENT_MAX_CROWDING: 76,
  HAZARD_BLOCKED: 10000,
  AVOID_NODE: 180,
  ELEVATOR_INCIDENT: 78,
  ELEVATOR_NORMAL: 24,
  ROOM_BASE: 2,
  STAIRS_INCIDENT: 8,
  STAIRS_NORMAL: 16,
  CROSS_FLOOR: 28,
} as const;

const GEOMETRY_TOLERANCES = {
  COLLINEAR: 0.0001,
  SNAP_DISTANCE: 0.8,
  NEAR_NODE: 2.5,
  NEAR_DUPLICATE: 2,
} as const;

export const FLOORS: FloorDefinition[] = [
  { id: "floor_1", label: "Ground Floor Lobby", level: 1, accent: "#175ead" },
  { id: "floor_2", label: "Level 2 Guest Wing", level: 2, accent: "#0f766e" },
  { id: "floor_3", label: "Level 3 Guest Wing", level: 3, accent: "#7c3aed" },
  { id: "floor_4", label: "Level 4 Guest Wing", level: 4, accent: "#d97706" },
  { id: "floor_5", label: "Level 5 Guest Wing", level: 5, accent: "#be123c" },
  { id: "floor_6", label: "Level 6 Guest Wing", level: 6, accent: "#2563eb" },
];

export const DEFAULT_FLOOR_DIMENSIONS: Record<FloorId, FloorDimensions> = {
  floor_1: { widthMeters: 42, heightMeters: 24, source: "default", calibrationNote: "Default lobby footprint" },
  floor_2: { widthMeters: 54, heightMeters: 18, source: "default", calibrationNote: "Default guest wing footprint" },
  floor_3: { widthMeters: 54, heightMeters: 18, source: "default", calibrationNote: "Default guest wing footprint" },
  floor_4: { widthMeters: 54, heightMeters: 18, source: "default", calibrationNote: "Default guest wing footprint" },
  floor_5: { widthMeters: 54, heightMeters: 18, source: "default", calibrationNote: "Default guest wing footprint" },
  floor_6: { widthMeters: 54, heightMeters: 18, source: "default", calibrationNote: "Default guest wing footprint" },
};

// --- Geometry Helpers ---

function getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getMountedCoordinates(node: Pick<EvacNode, "x" | "y" | "mountX" | "mountY">) {
  return {
    x: node.mountX ?? node.x,
    y: node.mountY ?? node.y,
  };
}

function clampPercent(value: number) {
  return Math.max(3, Math.min(97, Number(value.toFixed(2))));
}

function slugifyBlueprintToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
}

// --- Data Generation (Factory Pattern) ---

function buildDefaultDemoGraph() {
  const nodes: EvacNode[] = [];
  const edges: EvacEdge[] = [];
  const cameras: CameraDefinition[] = [];

  const beaconXs = [14, 22, 30, 38, 46, 54, 62, 70, 78, 86];
  const roomBeaconIndices = [1, 2, 3, 6, 7, 8];
  const northRoomY = 24;
  const southRoomY = 76;
  const corridorY = 50;

  function addNode(node: EvacNode) { nodes.push(node); }
  function addEdge(edge: EvacEdge) { edges.push(edge); }
  function beaconId(floorId: FloorId, index: number) { return `${floorId}_beacon_${index + 1}`; }
  function stairAId(floorId: FloorId) { return `${floorId}_stair_a`; }
  function stairBId(floorId: FloorId) { return `${floorId}_stair_b`; }
  function elevatorId(floorId: FloorId) { return `${floorId}_elevator`; }
  function roomId(floorId: FloorId, roomNo: string) { return `${floorId}_room_${roomNo}`; }

  function formatBleAddress(floorId: FloorId, index: number) {
    const floorNumber = floorId.split("_")[1].padStart(2, "0");
    return `AEG-${floorNumber}-BLE-${String(index).padStart(3, "0")}`;
  }

  function addTypicalGuestFloor(floor: FloorDefinition) {
    const level = floor.level;
    const prefix = String(level).padStart(2, "0");

    beaconXs.forEach((x, index) => {
      addNode({
        id: beaconId(floor.id, index),
        label: `Beacon ${index + 1}`,
        floorId: floor.id,
        x,
        y: corridorY,
        type: "beacon",
        zoneId: `${prefix}-CORRIDOR`,
        checkpoint: index === 0 || index === beaconXs.length - 1 || index === 4 || index === 5,
        beaconIndex: index + 1,
        beaconMajor: index + 1,
        bleAddress: formatBleAddress(floor.id, index + 1),
      });

      if (index < beaconXs.length - 1) {
        addEdge({
          id: `${floor.id}_corridor_${index + 1}`,
          from: beaconId(floor.id, index),
          to: beaconId(floor.id, index + 1),
          kind: "corridor",
        });
      }
    });

    addNode({ id: stairAId(floor.id), label: `Stair A ${level}`, floorId: floor.id, x: 6, y: corridorY, type: "stair", zoneId: `${prefix}-WEST`, checkpoint: true });
    addNode({ id: stairBId(floor.id), label: `Stair B ${level}`, floorId: floor.id, x: 94, y: corridorY, type: "stair", zoneId: `${prefix}-EAST`, checkpoint: true });
    addNode({ id: elevatorId(floor.id), label: `Lift Lobby ${level}`, floorId: floor.id, x: 50, y: corridorY, type: "elevator", zoneId: `${prefix}-CENTRAL`, checkpoint: true });

    addEdge({ id: `${floor.id}_stair_a_link`, from: stairAId(floor.id), to: beaconId(floor.id, 0), kind: "corridor" });
    addEdge({ id: `${floor.id}_stair_b_link`, from: stairBId(floor.id), to: beaconId(floor.id, beaconXs.length - 1), kind: "corridor" });
    addEdge({ id: `${floor.id}_lift_left`, from: elevatorId(floor.id), to: beaconId(floor.id, 4), kind: "corridor" });
    addEdge({ id: `${floor.id}_lift_right`, from: elevatorId(floor.id), to: beaconId(floor.id, 5), kind: "corridor" });

    roomBeaconIndices.forEach((beaconIndex, roomOffset) => {
      const northRoomNo = `${prefix}${2 + roomOffset * 2}`;
      const southRoomNo = `${prefix}${3 + roomOffset * 2}`;
      const roomX = beaconXs[beaconIndex];

      addNode({ id: roomId(floor.id, northRoomNo), label: `Room ${northRoomNo}`, floorId: floor.id, x: roomX, y: northRoomY, type: "room", zoneId: `${prefix}-NORTH`, checkpoint: true });
      addNode({ id: roomId(floor.id, southRoomNo), label: `Room ${southRoomNo}`, floorId: floor.id, x: roomX, y: southRoomY, type: "room", zoneId: `${prefix}-SOUTH`, checkpoint: true });

      addEdge({ id: `${floor.id}_${northRoomNo}_door`, from: roomId(floor.id, northRoomNo), to: beaconId(floor.id, beaconIndex), kind: "corridor" });
      addEdge({ id: `${floor.id}_${southRoomNo}_door`, from: roomId(floor.id, southRoomNo), to: beaconId(floor.id, beaconIndex), kind: "corridor" });
    });

    const cameraNodeId = `${floor.id}_camera_mid`;
    addNode({ id: cameraNodeId, label: `Corridor Cam ${level}`, floorId: floor.id, x: 82, y: 12, type: "camera", zoneId: `${prefix}-EAST`, cameraId: `cam-${floor.id}` });
    addEdge({ id: `${floor.id}_camera_link`, from: cameraNodeId, to: beaconId(floor.id, 8), kind: "corridor" });

    cameras.push({
      id: `cam-${floor.id}`,
      label: `Guest Corridor Camera L${level}`,
      floorId: floor.id,
      nodeId: cameraNodeId,
      zoneId: `${prefix}-EAST`,
      coverageNodeIds: [beaconId(floor.id, 6), beaconId(floor.id, 7), beaconId(floor.id, 8)],
    });
  }

  function addGroundFloor(floor: FloorDefinition) {
    const prefix = "GF";

    beaconXs.forEach((x, index) => {
      addNode({
        id: beaconId(floor.id, index),
        label: `Lobby Beacon ${index + 1}`,
        floorId: floor.id,
        x,
        y: corridorY,
        type: "beacon",
        zoneId: `${prefix}-MAIN`,
        checkpoint: true,
        beaconIndex: index + 1,
        beaconMajor: index + 1,
        bleAddress: formatBleAddress(floor.id, index + 1),
      });

      if (index < beaconXs.length - 1) {
        addEdge({
          id: `${floor.id}_corridor_${index + 1}`,
          from: beaconId(floor.id, index),
          to: beaconId(floor.id, index + 1),
          kind: "corridor",
        });
      }
    });

    addNode({ id: "floor_1_lobby", label: "Main Lobby", floorId: floor.id, x: 24, y: 24, type: "checkpoint", zoneId: `${prefix}-LOBBY`, checkpoint: true });
    addNode({ id: "floor_1_reception", label: "Reception", floorId: floor.id, x: 36, y: 24, type: "checkpoint", zoneId: `${prefix}-LOBBY`, checkpoint: true });
    addNode({ id: "floor_1_cafe", label: "Cafe Lounge", floorId: floor.id, x: 68, y: 24, type: "checkpoint", zoneId: `${prefix}-AMENITY`, checkpoint: true });
    addNode({ id: stairAId(floor.id), label: "Stair A G", floorId: floor.id, x: 6, y: corridorY, type: "stair", zoneId: `${prefix}-WEST`, checkpoint: true });
    addNode({ id: stairBId(floor.id), label: "Stair B G", floorId: floor.id, x: 94, y: corridorY, type: "stair", zoneId: `${prefix}-EAST`, checkpoint: true });
    addNode({ id: elevatorId(floor.id), label: "Lift Lobby G", floorId: floor.id, x: 50, y: corridorY, type: "elevator", zoneId: `${prefix}-CENTRAL`, checkpoint: true });
    addNode({ id: "floor_1_exit_main", label: "Main Exit", floorId: floor.id, x: 6, y: 86, type: "exit", zoneId: `${prefix}-EXIT`, isExit: true });
    addNode({ id: "floor_1_exit_service", label: "Service Exit", floorId: floor.id, x: 94, y: 86, type: "exit", zoneId: `${prefix}-EXIT`, isExit: true });
    addNode({ id: "floor_1_camera_lobby", label: "Lobby Camera", floorId: floor.id, x: 18, y: 10, type: "camera", zoneId: `${prefix}-LOBBY`, cameraId: "cam-floor_1" });

    addEdge({ id: "floor_1_lobby_link", from: "floor_1_lobby", to: beaconId(floor.id, 1), kind: "corridor" });
    addEdge({ id: "floor_1_reception_link", from: "floor_1_reception", to: beaconId(floor.id, 3), kind: "corridor" });
    addEdge({ id: "floor_1_cafe_link", from: "floor_1_cafe", to: beaconId(floor.id, 7), kind: "corridor" });
    addEdge({ id: "floor_1_stair_a_link", from: stairAId(floor.id), to: beaconId(floor.id, 0), kind: "corridor" });
    addEdge({ id: "floor_1_stair_b_link", from: stairBId(floor.id), to: beaconId(floor.id, 9), kind: "corridor" });
    addEdge({ id: "floor_1_lift_left", from: elevatorId(floor.id), to: beaconId(floor.id, 4), kind: "corridor" });
    addEdge({ id: "floor_1_lift_right", from: elevatorId(floor.id), to: beaconId(floor.id, 5), kind: "corridor" });
    addEdge({ id: "floor_1_exit_main_link", from: "floor_1_exit_main", to: stairAId(floor.id), kind: "corridor" });
    addEdge({ id: "floor_1_exit_service_link", from: "floor_1_exit_service", to: stairBId(floor.id), kind: "corridor" });
    addEdge({ id: "floor_1_camera_link", from: "floor_1_camera_lobby", to: beaconId(floor.id, 1), kind: "corridor" });

    cameras.push({
      id: "cam-floor_1",
      label: "Lobby Arrival Camera",
      floorId: floor.id,
      nodeId: "floor_1_camera_lobby",
      zoneId: `${prefix}-ARRIVAL`,
      coverageNodeIds: [beaconId(floor.id, 0), beaconId(floor.id, 1), beaconId(floor.id, 2)],
    });
  }

  FLOORS.forEach((floor) => {
    if (floor.id === "floor_1") {
      addGroundFloor(floor);
    } else {
      addTypicalGuestFloor(floor);
    }
  });

  for (let level = 1; level < FLOORS.length; level += 1) {
    const currentFloorId = FLOORS[level - 1].id;
    const nextFloorId = FLOORS[level].id;
    addEdge({ id: `${currentFloorId}_to_${nextFloorId}_stair_a`, from: stairAId(currentFloorId), to: stairAId(nextFloorId), kind: "stairs" });
    addEdge({ id: `${currentFloorId}_to_${nextFloorId}_stair_b`, from: stairBId(currentFloorId), to: stairBId(nextFloorId), kind: "stairs" });
    addEdge({ id: `${currentFloorId}_to_${nextFloorId}_lift`, from: elevatorId(currentFloorId), to: elevatorId(nextFloorId), kind: "elevator" });
  }

  return { nodes, edges, cameras };
}

const defaultGraph = buildDefaultDemoGraph();
export const NODES = defaultGraph.nodes;
export const EDGES = defaultGraph.edges;
export const CAMERAS = defaultGraph.cameras;

export function createGraphSnapshot(
  graphNodes: EvacNode[] = NODES,
  graphEdges: EvacEdge[] = EDGES
): GraphSnapshot {
  return {
    nodes: graphNodes,
    edges: graphEdges,
    nodesById: Object.fromEntries(graphNodes.map((node) => [node.id, node])) as Record<string, EvacNode>,
  };
}

export const nodesById = Object.fromEntries(NODES.map((node) => [node.id, node])) as Record<string, EvacNode>;

// --- Blueprint and Dimension Calculation ---

function formatCameraId(floorId: FloorId, index: number) {
  const floorNumber = floorId.split("_")[1].padStart(2, "0");
  return `CAM-${floorNumber}-${String(index).padStart(2, "0")}`;
}

function formatBleAddress(floorId: FloorId, index: number) {
  const floorNumber = floorId.split("_")[1].padStart(2, "0");
  return `AEG-${floorNumber}-BLE-${String(index).padStart(3, "0")}`;
}

export function getFloorDimensions(state: Pick<SimulationState, "floorDimensions">, floorId: FloorId) {
  return state.floorDimensions[floorId] ?? DEFAULT_FLOOR_DIMENSIONS[floorId];
}

export function getMetersPerPercent(dimensions: FloorDimensions) {
  return {
    x: dimensions.widthMeters / 100,
    y: dimensions.heightMeters / 100,
  };
}

export function getNodeMountPoint(node: Pick<EvacNode, "x" | "y" | "mountX" | "mountY">) {
  return {
    x: node.mountX ?? node.x,
    y: node.mountY ?? node.y,
  };
}

export function getNodeDistanceMeters(from: EvacNode, to: EvacNode, dimensions: FloorDimensions) {
  const metersPerPercent = getMetersPerPercent(dimensions);
  const dx = (to.x - from.x) * metersPerPercent.x;
  const dy = (to.y - from.y) * metersPerPercent.y;
  return Math.hypot(dx, dy);
}

export function getNodeSignalDistanceMeters(
  from: Pick<EvacNode, "x" | "y">,
  to: Pick<EvacNode, "x" | "y" | "mountX" | "mountY">,
  dimensions: FloorDimensions
) {
  const metersPerPercent = getMetersPerPercent(dimensions);
  const signalTarget = getNodeMountPoint(to);
  const dx = (signalTarget.x - from.x) * metersPerPercent.x;
  const dy = (signalTarget.y - from.y) * metersPerPercent.y;
  return Math.hypot(dx, dy);
}

export function calibrateFloorDimensionsByWalk(
  current: FloorDimensions,
  start: { x: number; y: number },
  end: { x: number; y: number },
  walkedMeters: number
) {
  if (!Number.isFinite(walkedMeters) || walkedMeters <= 0) {
    return current;
  }

  const currentDistance = Math.hypot(
    ((end.x - start.x) * current.widthMeters) / 100,
    ((end.y - start.y) * current.heightMeters) / 100
  );
  if (!Number.isFinite(currentDistance) || currentDistance <= 0.01) {
    return current;
  }

  const scale = walkedMeters / currentDistance;
  return {
    widthMeters: Number((current.widthMeters * scale).toFixed(2)),
    heightMeters: Number((current.heightMeters * scale).toFixed(2)),
    source: "walk" as const,
    calibrationNote: `Walk-calibrated from ${walkedMeters.toFixed(1)}m operator path`,
  };
}

// --- Blueprint Simulator & Layout Parsing Utilities ---

export function suggestBleSpacingMetersForFloor(
  floorId: FloorId,
  floorNodes: EvacNode[],
  floorEdges: EvacEdge[],
  dimensions: FloorDimensions
) {
  const graph = createGraphSnapshot(floorNodes, floorEdges);
  const relevantNodes = floorNodes.filter((node) => node.floorId === floorId && node.type !== "camera");
  const corridorEdges = floorEdges.filter((edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    return (
      edge.kind === "corridor" &&
      from?.floorId === floorId &&
      to?.floorId === floorId &&
      from.type !== "camera" &&
      to.type !== "camera"
    );
  });

  if (corridorEdges.length === 0) {
    return 3;
  }

  const structuralAnchors = relevantNodes.filter((node) =>
    node.type === "room" ||
    node.type === "checkpoint" ||
    node.type === "exit" ||
    node.type === "stair" ||
    node.type === "elevator"
  );
  const junctionCount = relevantNodes.filter((node) => node.type === "junction").length;
  const totalCorridorMeters = corridorEdges.reduce((total, edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    if (!from || !to) return total;
    return total + getNodeDistanceMeters(from, to, dimensions);
  }, 0);

  const areaMeters = Math.max(1, dimensions.widthMeters * dimensions.heightMeters);
  const supportDensity = (structuralAnchors.length * 1.4 + junctionCount * 2.1) / Math.max(totalCorridorMeters, 1);
  const areaDensity = structuralAnchors.length / areaMeters;

  let suggested = 4;
  if (supportDensity >= 0.33 || areaDensity >= 0.05) {
    suggested = 2.5;
  } else if (supportDensity >= 0.24 || areaDensity >= 0.037) {
    suggested = 3;
  } else if (supportDensity >= 0.16 || areaDensity >= 0.026) {
    suggested = 3.5;
  }

  return Number(suggested.toFixed(1));
}

function getBlueprintMetersPerPercent(layout?: RasterBlueprintLayout) {
  const widthMeters = layout?.dimensionsMeters?.widthMeters ?? null;
  const heightMeters = layout?.dimensionsMeters?.heightMeters ?? null;
  if (!widthMeters || !heightMeters || widthMeters <= 0 || heightMeters <= 0) {
    return null;
  }
  return { x: widthMeters / 100, y: heightMeters / 100 };
}

function getPointToSegmentDistancePercent(point: Pick<RasterBlueprintAnchor, "x" | "y">, segment: RasterBlueprintSegment) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= GEOMETRY_TOLERANCES.COLLINEAR) {
    return getDistance(point, { x: segment.x1, y: segment.y1 });
  }

  const ratio = Math.max(0, Math.min(1, ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lengthSquared));
  return getDistance(point, { x: segment.x1 + dx * ratio, y: segment.y1 + dy * ratio });
}

function getBlueprintPointDistance(left: Pick<RasterBlueprintAnchor, "x" | "y">, right: Pick<RasterBlueprintAnchor, "x" | "y">, layout?: RasterBlueprintLayout) {
  const metersPerPercent = getBlueprintMetersPerPercent(layout);
  if (!metersPerPercent) return null;
  return Math.hypot((right.x - left.x) * metersPerPercent.x, (right.y - left.y) * metersPerPercent.y);
}

function getBlueprintPointToSegmentDistance(point: Pick<RasterBlueprintAnchor, "x" | "y">, segment: RasterBlueprintSegment, layout?: RasterBlueprintLayout) {
  const metersPerPercent = getBlueprintMetersPerPercent(layout);
  if (!metersPerPercent) return null;

  const px = point.x * metersPerPercent.x;
  const py = point.y * metersPerPercent.y;
  const ax = segment.x1 * metersPerPercent.x;
  const ay = segment.y1 * metersPerPercent.y;
  const bx = segment.x2 * metersPerPercent.x;
  const by = segment.y2 * metersPerPercent.y;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= GEOMETRY_TOLERANCES.COLLINEAR) {
    return Math.hypot(px - ax, py - ay);
  }

  const ratio = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + dx * ratio), py - (ay + dy * ratio));
}

function filterSupportedRasterCorridorSegments(layout?: RasterBlueprintLayout) {
  const corridorSegments = layout?.corridorSegments ?? [];
  if (corridorSegments.length === 0) {
    return { segments: [] as RasterBlueprintSegment[], removedCount: 0 };
  }

  const roomAnchors = layout?.roomAnchors ?? [];
  const junctionAnchors = layout?.junctionAnchors ?? [];
  const supportAnchors = [
    ...junctionAnchors,
    ...roomAnchors,
    ...(layout?.stairAnchors ?? []),
    ...(layout?.exitAnchors ?? []),
    ...(layout?.elevatorAnchors ?? []),
    ...(layout?.checkpointAnchors ?? []),
  ];

  if (supportAnchors.length === 0) {
    return { segments: corridorSegments, removedCount: 0 };
  }

  const filteredSegments = corridorSegments.filter((segment) => {
    const length = getDistance({ x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 });
    const lengthMeters = getBlueprintPointDistance({ x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 }, layout);
    const sampleCount = Math.max(5, Math.min(11, Math.ceil(length / 10)));
    const segmentDx = segment.x2 - segment.x1;
    const segmentDy = segment.y2 - segment.y1;
    const segmentLengthSquared = segmentDx * segmentDx + segmentDy * segmentDy;
    const supportDistanceThreshold = lengthMeters ? 2.4 : 5.5;
    const roomDistanceThreshold = lengthMeters ? 2.1 : 4.5;
    const endpointDistanceThreshold = lengthMeters ? 2.8 : 5.5;

    const sampleSupportCount = Array.from({ length: sampleCount }, (_, index) => {
      const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1);
      const samplePoint = {
        x: segment.x1 + segmentDx * ratio,
        y: segment.y1 + segmentDy * ratio,
      };
      const nearestSupport = supportAnchors.reduce((best, anchor) => {
        const distance = getBlueprintPointDistance(anchor, samplePoint, layout) ?? getDistance(anchor, samplePoint);
        return Math.min(best, distance);
      }, Number.POSITIVE_INFINITY);
      return nearestSupport <= supportDistanceThreshold ? 1 : 0;
    }).reduce<number>((sum, value) => sum + value, 0);

    const supportRatios = supportAnchors.reduce<number[]>((ratios, anchor) => {
      const distanceToSegment = getBlueprintPointToSegmentDistance(anchor, segment, layout) ?? getPointToSegmentDistancePercent(anchor, segment);
      if (distanceToSegment > supportDistanceThreshold || segmentLengthSquared <= GEOMETRY_TOLERANCES.COLLINEAR) {
        return ratios;
      }
      const ratio = Math.max(0, Math.min(1, ((anchor.x - segment.x1) * segmentDx + (anchor.y - segment.y1) * segmentDy) / segmentLengthSquared));
      ratios.push(ratio);
      return ratios;
    }, []);
    const supportSpread = supportRatios.length > 1 ? Math.max(...supportRatios) - Math.min(...supportRatios) : 0;

    const endpointSupportCount = [
      { x: segment.x1, y: segment.y1 },
      { x: segment.x2, y: segment.y2 },
    ].filter((endpoint) =>
      supportAnchors.some((anchor) => {
        const distance = getBlueprintPointDistance(anchor, endpoint, layout) ?? getDistance(anchor, endpoint);
        return distance <= endpointDistanceThreshold;
      })
    ).length;

    const roomSupportCount = roomAnchors.filter(
      (anchor) => (getBlueprintPointToSegmentDistance(anchor, segment, layout) ?? getPointToSegmentDistancePercent(anchor, segment)) <= roomDistanceThreshold
    ).length;

    const junctionSupportCount = junctionAnchors.filter(
      (anchor) => (getBlueprintPointToSegmentDistance(anchor, segment, layout) ?? getPointToSegmentDistancePercent(anchor, segment)) <= supportDistanceThreshold
    ).length;

    const lowerHalfSupport = supportRatios.some((ratio) => ratio <= 0.35);
    const upperHalfSupport = supportRatios.some((ratio) => ratio >= 0.65);

    return (
      (sampleSupportCount >= Math.ceil(sampleCount * 0.45) &&
        ((lengthMeters ? lengthMeters <= 9 : length <= 18) || (lowerHalfSupport && upperHalfSupport && supportSpread >= 0.45))) ||
      (roomSupportCount >= 3 && lowerHalfSupport && upperHalfSupport) ||
      (junctionSupportCount >= 2 && supportSpread >= 0.24) ||
      (endpointSupportCount === 2 && (lengthMeters ? lengthMeters <= 12 : length <= 24))
    );
  });

  return {
    segments: filteredSegments,
    removedCount: corridorSegments.length - filteredSegments.length,
  };
}

function getClosestPointOnSegment(pX: number, pY: number, sX1: number, sY1: number, sX2: number, sY2: number) {
  const l2 = (sX2 - sX1) ** 2 + (sY2 - sY1) ** 2;
  if (l2 === 0) return { x: sX1, y: sY1 };
  let t = ((pX - sX1) * (sX2 - sX1) + (pY - sY1) * (sY2 - sY1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return { x: sX1 + t * (sX2 - sX1), y: sY1 + t * (sY2 - sY1) };
}

function normalizeRasterCorridorSegments(segments: RasterBlueprintSegment[]) {
  return segments.filter((segment, index, all) => {
    const normalizedSegment =
      segment.x1 < segment.x2 || (segment.x1 === segment.x2 && segment.y1 <= segment.y2)
        ? segment
        : { x1: segment.x2, y1: segment.y2, x2: segment.x1, y2: segment.y1 };

    return !all.some((candidate, candidateIndex) => {
      if (candidateIndex >= index) return false;
      const normalizedCandidate =
        candidate.x1 < candidate.x2 || (candidate.x1 === candidate.x2 && candidate.y1 <= candidate.y2)
          ? candidate
          : { x1: candidate.x2, y1: candidate.y2, x2: candidate.x1, y2: candidate.y1 };

      return (
        Math.abs(normalizedCandidate.x1 - normalizedSegment.x1) < GEOMETRY_TOLERANCES.SNAP_DISTANCE &&
        Math.abs(normalizedCandidate.y1 - normalizedSegment.y1) < GEOMETRY_TOLERANCES.SNAP_DISTANCE &&
        Math.abs(normalizedCandidate.x2 - normalizedSegment.x2) < GEOMETRY_TOLERANCES.SNAP_DISTANCE &&
        Math.abs(normalizedCandidate.y2 - normalizedSegment.y2) < GEOMETRY_TOLERANCES.SNAP_DISTANCE
      );
    });
  });
}

function getSegmentProjectionRatio(point: Pick<RasterBlueprintAnchor, "x" | "y">, segment: RasterBlueprintSegment) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= GEOMETRY_TOLERANCES.COLLINEAR) {
    return 0;
  }
  return Math.max(0, Math.min(1, ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lengthSquared));
}

function getRasterSegmentIntersection(left: RasterBlueprintSegment, right: RasterBlueprintSegment) {
  const denominator = (left.x1 - left.x2) * (right.y1 - right.y2) - (left.y1 - left.y2) * (right.x1 - right.x2);
  if (Math.abs(denominator) < GEOMETRY_TOLERANCES.COLLINEAR) {
    return null;
  }

  const t = ((left.x1 - right.x1) * (right.y1 - right.y2) - (left.y1 - right.y1) * (right.x1 - right.x2)) / denominator;
  const u = ((left.x1 - right.x1) * (left.y1 - left.y2) - (left.y1 - right.y1) * (left.x1 - left.x2)) / denominator;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) {
    return null;
  }

  return {
    x: clampPercent(left.x1 + t * (left.x2 - left.x1)),
    y: clampPercent(left.y1 + t * (left.y2 - left.y1)),
  };
}

function inferFloorZone(floorId: FloorId, y: number) {
  if (floorId === "floor_1") {
    return y < 35 ? "GF-LOBBY" : y > 65 ? "GF-EXIT" : "GF-MAIN";
  }
  const level = floorId.split("_")[1].padStart(2, "0");
  if (y < 38) return `${level}-NORTH`;
  if (y > 62) return `${level}-SOUTH`;
  return `${level}-CORRIDOR`;
}

function dedupeGeneratedNodes(nodesToCheck: EvacNode[]) {
  return nodesToCheck.filter((node, index, all) => {
    return !all.some((candidate, candidateIndex) => {
      if (candidateIndex >= index || candidate.type !== node.type || candidate.floorId !== node.floorId) {
        return false;
      }
      return Math.abs(candidate.x - node.x) < GEOMETRY_TOLERANCES.NEAR_DUPLICATE && Math.abs(candidate.y - node.y) < GEOMETRY_TOLERANCES.NEAR_DUPLICATE;
    });
  });
}

function dedupeAxisPositions(values: number[], minGap = 4) {
  return values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)
    .reduce<number[]>((positions, value) => {
      if (positions.length === 0 || Math.abs(value - positions[positions.length - 1]) >= minGap) {
        positions.push(Number(value.toFixed(2)));
      }
      return positions;
    }, []);
}

function parseSvgFloat(value: string | null | undefined, fallback = 0) {
  if (!value) return fallback;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function extractSvgTextNodes(svg: Document) {
  return Array.from(svg.querySelectorAll("text"))
    .map((element) => ({
      text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
      x: parseSvgFloat(element.getAttribute("x")),
      y: parseSvgFloat(element.getAttribute("y")),
    }))
    .filter((entry) => entry.text.length > 0);
}

function createFloorNodeId(floorId: FloorId, type: EvacNodeType, token: string) {
  return `${floorId}_${type}_${slugifyBlueprintToken(token) || Date.now().toString()}`;
}

function createSpatialBeaconEdges(floorId: FloorId, beacons: EvacNode[]) {
  if (beacons.length < 2) return [];

  const nearestDistances = beacons
    .map((beacon) => {
      const distances = beacons
        .filter((candidate) => candidate.id !== beacon.id)
        .map((candidate) => getDistance(candidate, beacon))
        .filter((distance) => distance > 0.1)
        .sort((left, right) => left - right);
      return distances[0];
    })
    .filter((distance): distance is number => Number.isFinite(distance))
    .sort((left, right) => left - right);

  const medianDistance =
    nearestDistances.length > 0
      ? nearestDistances[Math.floor(nearestDistances.length / 2)]
      : Math.max(4, getDistance(beacons[beacons.length - 1], beacons[0]) / Math.max(beacons.length - 1, 1));

  const alignmentTolerance = Math.max(2.25, Math.min(8, medianDistance * 0.75));
  const maxLinkDistance = Math.max(5, Math.min(18, medianDistance * 1.9));
  const edgeKeySet = new Set<string>();
  const edges: EvacEdge[] = [];

  const linkBeacons = (from: EvacNode, to: EvacNode) => {
    if (from.id === to.id) return;
    const key = [from.id, to.id].sort().join("::");
    if (edgeKeySet.has(key)) return;
    edgeKeySet.add(key);
    edges.push({
      id: `${floorId}_auto_corridor_${edges.length + 1}`,
      from: from.id,
      to: to.id,
      kind: "corridor",
    });
  };

  beacons.forEach((beacon) => {
    const directionalCandidates = {
      left: null as EvacNode | null,
      right: null as EvacNode | null,
      up: null as EvacNode | null,
      down: null as EvacNode | null,
    };

    beacons.forEach((candidate) => {
      if (candidate.id === beacon.id) return;

      const dx = candidate.x - beacon.x;
      const dy = candidate.y - beacon.y;
      const distance = Math.hypot(dx, dy);
      if (distance > maxLinkDistance) return;

      if (Math.abs(dy) <= alignmentTolerance) {
        if (dx < 0 && (!directionalCandidates.left || candidate.x > directionalCandidates.left.x)) directionalCandidates.left = candidate;
        if (dx > 0 && (!directionalCandidates.right || candidate.x < directionalCandidates.right.x)) directionalCandidates.right = candidate;
      }

      if (Math.abs(dx) <= alignmentTolerance) {
        if (dy < 0 && (!directionalCandidates.up || candidate.y > directionalCandidates.up.y)) directionalCandidates.up = candidate;
        if (dy > 0 && (!directionalCandidates.down || candidate.y < directionalCandidates.down.y)) directionalCandidates.down = candidate;
      }
    });

    Object.values(directionalCandidates).forEach((candidate) => {
      if (candidate) linkBeacons(beacon, candidate);
    });
  });

  if (edges.length > 0) return edges;

  return beacons.slice(1).map((beacon, index) => ({
    id: `${floorId}_auto_corridor_fallback_${index + 1}`,
    from: beacons[index].id,
    to: beacon.id,
    kind: "corridor" as const,
  }));
}

function buildCorridorScaffold(
  floorId: FloorId,
  nodesToConnect: EvacNode[],
  anchorPoints: Array<{ x: number; y: number }>
): GeneratedFloorGraph {
  const scaffoldAnchors = dedupeGeneratedNodes(
    anchorPoints.map((anchor, index) => ({
      id: `${floorId}_junction_scaffold_${index + 1}`,
      label: `J${index + 1}`,
      floorId,
      x: clampPercent(anchor.x),
      y: clampPercent(anchor.y),
      type: "junction" as const,
      zoneId: inferFloorZone(floorId, clampPercent(anchor.y)),
      checkpoint: false,
    }))
  ).map((node, index) => ({
    ...node,
    id: `${floorId}_junction_scaffold_${index + 1}`,
    label: `J${index + 1}`,
  }));

  const edges: EvacEdge[] = createSpatialBeaconEdges(floorId, scaffoldAnchors);
  nodesToConnect.forEach((node) => {
    const nearestAnchor = scaffoldAnchors.reduce((best, candidate) => {
      if (!best) return candidate;
      return getDistance(candidate, node) < getDistance(best, node) ? candidate : best;
    }, null as EvacNode | null);

    if (!nearestAnchor) return;

    edges.push({
      id: `${floorId}_scaffold_link_${slugifyBlueprintToken(node.id)}`,
      from: node.id,
      to: nearestAnchor.id,
      kind: "corridor",
    });
  });

  return {
    nodes: [...nodesToConnect, ...scaffoldAnchors],
    edges: edges.filter(
      (edge, index, all) =>
        edge.from !== edge.to &&
        all.findIndex(
          (candidate) =>
            candidate.kind === edge.kind &&
            ((candidate.from === edge.from && candidate.to === edge.to) ||
              (candidate.from === edge.to && candidate.to === edge.from))
        ) === index
    ),
    diagnostics: [],
  };
}

export function buildFloorEdgesFromNodes(floorId: FloorId, floorNodes: EvacNode[]): GeneratedFloorGraph {
  const diagnostics: string[] = [];
  const beacons = floorNodes
    .filter((node) => node.type === "beacon")
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((node, index) => ({
      ...node,
      beaconIndex: index + 1,
      beaconMajor: node.beaconMajor ?? index + 1,
      bleAddress: node.bleAddress ?? formatBleAddress(floorId, index + 1),
    }));

  const otherNodes = floorNodes.filter((node) => node.type !== "beacon");
  const nextNodes = [...otherNodes, ...beacons];
  const edges: EvacEdge[] = createSpatialBeaconEdges(floorId, beacons);

  otherNodes.forEach((node) => {
    if (beacons.length === 0) {
      diagnostics.push(`No beacons found for ${node.label}, so no corridor link was generated.`);
      return;
    }

    const nearestBeacon = beacons.reduce((best, beacon) => {
      const bestDistance = getDistance(best, node);
      const nextDistance = getDistance(beacon, node);
      return nextDistance < bestDistance ? beacon : best;
    }, beacons[0]);

    edges.push({
      id: `${floorId}_auto_link_${slugifyBlueprintToken(node.id)}`,
      from: node.id,
      to: nearestBeacon.id,
      kind: "corridor",
    });
  });

  return { nodes: nextNodes, edges, diagnostics };
}

function getNodeHash(x: number, y: number) {
  return `${x.toFixed(2)}:${y.toFixed(2)}`;
}

function getInterpolatedPosition(from: EvacNode, to: EvacNode, ratio: number) {
  return {
    x: clampPercent(from.x + (to.x - from.x) * ratio),
    y: clampPercent(from.y + (to.y - from.y) * ratio),
  };
}

export function projectMountedSensorPosition(
  anchor: Pick<EvacNode, "x" | "y">,
  from: Pick<EvacNode, "x" | "y">,
  to: Pick<EvacNode, "x" | "y">,
  dimensions: FloorDimensions,
  options?: {
    offsetMeters?: number;
    sideHint?: -1 | 1;
  }
) {
  const metersPerPercent = getMetersPerPercent(dimensions);
  const dxMeters = (to.x - from.x) * metersPerPercent.x;
  const dyMeters = (to.y - from.y) * metersPerPercent.y;
  const segmentLengthMeters = Math.hypot(dxMeters, dyMeters);

  if (segmentLengthMeters <= 0.01) {
    return {
      x: clampPercent(anchor.x),
      y: clampPercent(anchor.y),
    };
  }

  const sideHint = options?.sideHint === -1 ? -1 : 1;
  const offsetMeters = Math.max(0.55, Math.min(options?.offsetMeters ?? 0.9, 1.4));
  const perpendicularMeters = {
    x: (-dyMeters / segmentLengthMeters) * offsetMeters * sideHint,
    y: (dxMeters / segmentLengthMeters) * offsetMeters * sideHint,
  };

  return {
    x: clampPercent(anchor.x + perpendicularMeters.x / metersPerPercent.x),
    y: clampPercent(anchor.y + perpendicularMeters.y / metersPerPercent.y),
  };
}

function inferBeaconMountSideHint(
  anchor: Pick<EvacNode, "x" | "y">,
  from: Pick<EvacNode, "x" | "y">,
  to: Pick<EvacNode, "x" | "y">,
  dimensions: FloorDimensions,
  supportNodes: EvacNode[],
  fallbackSide: -1 | 1
) {
  const metersPerPercent = getMetersPerPercent(dimensions);
  const dxMeters = (to.x - from.x) * metersPerPercent.x;
  const dyMeters = (to.y - from.y) * metersPerPercent.y;
  const segmentLengthMeters = Math.hypot(dxMeters, dyMeters);

  if (segmentLengthMeters <= 0.01) {
    return fallbackSide;
  }

  const perpendicularUnit = {
    x: -dyMeters / segmentLengthMeters,
    y: dxMeters / segmentLengthMeters,
  };
  const sideScore = supportNodes.reduce((score, node) => {
    const relMeters = {
      x: (node.x - anchor.x) * metersPerPercent.x,
      y: (node.y - anchor.y) * metersPerPercent.y,
    };
    const radialDistance = Math.hypot(relMeters.x, relMeters.y);
    if (radialDistance > 8) {
      return score;
    }

    const dot = relMeters.x * perpendicularUnit.x + relMeters.y * perpendicularUnit.y;
    if (Math.abs(dot) < 0.2) {
      return score;
    }

    return score + Math.sign(dot);
  }, 0);

  return sideScore === 0 ? fallbackSide : (Math.sign(sideScore) as -1 | 1);
}

export function autoPlaceBleNodesForFloor(
  floorId: FloorId,
  floorNodes: EvacNode[],
  floorEdges: EvacEdge[],
  dimensions: FloorDimensions,
  spacingMeters = 3
): GeneratedFloorGraph {
  const diagnostics: string[] = [];
  const hasExistingBeacons = floorNodes.some((node) => node.floorId === floorId && node.type === "beacon");
  const hasRecoverableScaffold = floorNodes.some(
    (node) => node.floorId === floorId && node.type !== "camera" && node.type !== "beacon"
  );
  const collapsedScaffold =
    hasExistingBeacons && hasRecoverableScaffold
      ? collapseBeaconCorridorGraph(floorId, floorNodes, floorEdges)
      : null;
  const useCollapsedScaffold = Boolean(collapsedScaffold && collapsedScaffold.edges.length > 0);
  const workingNodes = useCollapsedScaffold
    ? [...collapsedScaffold!.nodes, ...floorNodes.filter((node) => node.floorId === floorId && node.type === "camera")]
    : floorNodes;
  const workingEdges = useCollapsedScaffold ? collapsedScaffold!.edges : floorEdges;
  const graph = createGraphSnapshot(workingNodes, workingEdges);
  const preservedRouteNodes = workingNodes.filter((node) => node.type !== "camera");
  const preservedCameraNodes = workingNodes.filter((node) => node.type === "camera");
  const supportNodes = preservedRouteNodes.filter(
    (node) =>
      node.floorId === floorId &&
      (node.type === "room" ||
        node.type === "checkpoint" ||
        node.type === "exit" ||
        node.type === "stair" ||
        node.type === "elevator")
  );
  const corridorPlacementNodeTypes = new Set<EvacNodeType>(["junction", "beacon"]);
  const floorCorridorEdges = workingEdges.filter((edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    return (
      edge.kind === "corridor" &&
      from?.floorId === floorId &&
      to?.floorId === floorId &&
      from.type !== "camera" &&
      to.type !== "camera"
    );
  });
  const corridorEdges = floorCorridorEdges.filter((edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    if (!from || !to || !corridorPlacementNodeTypes.has(from.type) || !corridorPlacementNodeTypes.has(to.type)) {
      return false;
    }

    return getNodeDistanceMeters(from, to, dimensions) >= Math.max(0.8, spacingMeters * 0.25);
  });
  const preservedConnectorEdges = floorCorridorEdges.filter((edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    if (!from || !to) return false;
    return !(corridorPlacementNodeTypes.has(from.type) && corridorPlacementNodeTypes.has(to.type));
  });

  if (useCollapsedScaffold) {
    diagnostics.push(...(collapsedScaffold?.diagnostics ?? []));
  }

  if (corridorEdges.length === 0) {
    diagnostics.push("No corridor spine edges found for BLE spacing. Build or draw junction-to-junction corridor lines first.");
    return { nodes: workingNodes, edges: workingEdges, diagnostics };
  }

  const generatedBeaconByHash = new Map<string, EvacNode>();
  const generatedEdges: EvacEdge[] = [];

  corridorEdges.forEach((edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    if (!from || !to) return;

    const segmentNodes = [from];
    const segmentDistance = getNodeDistanceMeters(from, to, dimensions);
    for (let stepMeters = spacingMeters; stepMeters < segmentDistance; stepMeters += spacingMeters) {
      const ratio = stepMeters / segmentDistance;
      const point = getInterpolatedPosition(from, to, ratio);
      const hash = getNodeHash(point.x, point.y);
      let beacon = generatedBeaconByHash.get(hash);
      if (!beacon) {
        const fallbackSide = ((generatedBeaconByHash.size + 1) % 2 === 0 ? 1 : -1) as -1 | 1;
        const sideHint = inferBeaconMountSideHint(point, from, to, dimensions, supportNodes, fallbackSide);
        const mountPoint = projectMountedSensorPosition(point, from, to, dimensions, {
          sideHint,
          offsetMeters: Math.max(0.7, Math.min(1.15, spacingMeters * 0.3)),
        });
        beacon = {
          id: `${floorId}_ble_auto_${generatedBeaconByHash.size + 1}`,
          label: `BLE Node ${generatedBeaconByHash.size + 1}`,
          floorId,
          x: point.x,
          y: point.y,
          mountX: mountPoint.x,
          mountY: mountPoint.y,
          type: "beacon",
          zoneId: from.zoneId,
          checkpoint: false,
        };
        generatedBeaconByHash.set(hash, beacon);
      }
      segmentNodes.push(beacon);
    }
    segmentNodes.push(to);

    segmentNodes.forEach((node, index) => {
      if (index === segmentNodes.length - 1) return;
      const nextNode = segmentNodes[index + 1];
      generatedEdges.push({
        id: `${floorId}_ble_edge_${edge.id}_${index + 1}`,
        from: node.id,
        to: nextNode.id,
        kind: "corridor",
      });
    });
  });

  const generatedBeacons = Array.from(generatedBeaconByHash.values())
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((node, index) => ({
      ...node,
      label: `BLE ${index + 1}`,
      beaconIndex: index + 1,
      beaconMajor: index + 1,
      bleAddress: formatBleAddress(floorId, index + 1),
    }));

  const finalNodes = [...preservedRouteNodes, ...generatedBeacons, ...preservedCameraNodes];
  const finalNodeIds = new Set(finalNodes.map((node) => node.id));
  const updatedEdges = generatedEdges.filter(
    (edge, index, all) =>
      edge.from !== edge.to &&
      all.findIndex((candidate) => candidate.from === edge.from && candidate.to === edge.to && candidate.kind === edge.kind) === index
  );

  const remappedEdges = [...updatedEdges, ...preservedConnectorEdges].filter(
    (edge, index, all) =>
      finalNodeIds.has(edge.from) &&
      finalNodeIds.has(edge.to) &&
      all.findIndex(
        (candidate) =>
          candidate.kind === edge.kind &&
          ((candidate.from === edge.from && candidate.to === edge.to) ||
            (candidate.from === edge.to && candidate.to === edge.from))
      ) === index
  );

  diagnostics.push(`Placed ${generatedBeacons.length} BLE nodes only on explicit corridor spine edges at ${spacingMeters}m spacing using ${dimensions.widthMeters}m x ${dimensions.heightMeters}m floor dimensions.`);
  diagnostics.push(`Preserved ${preservedConnectorEdges.length} room or connector access edge${preservedConnectorEdges.length === 1 ? "" : "s"} without placing BLE nodes on them.`);

  if (floorCorridorEdges.length > corridorEdges.length + preservedConnectorEdges.length) {
    diagnostics.push("Skipped tiny corridor fragments that were too short to act as usable spine segments.");
  }

  const referencedNodeIds = new Set(remappedEdges.flatMap((edge) => [edge.from, edge.to]));
  const cleanedNodes = finalNodes.filter((node) => node.type !== "junction" || referencedNodeIds.has(node.id));

  return {
    nodes: cleanedNodes,
    edges: remappedEdges,
    diagnostics,
  };
}

export function collapseBeaconCorridorGraph(
  floorId: FloorId,
  floorNodes: EvacNode[],
  floorEdges: EvacEdge[]
): GeneratedFloorGraph {
  const graph = createGraphSnapshot(floorNodes, floorEdges);
  const scaffoldNodes = floorNodes.filter((node) => node.floorId === floorId && node.type !== "beacon");
  const scaffoldNodeIds = new Set(scaffoldNodes.map((node) => node.id));
  const corridorEdges = floorEdges.filter((edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    return edge.kind === "corridor" && from?.floorId === floorId && to?.floorId === floorId;
  });
  const adjacency = new Map<string, Array<{ edgeId: string; nodeId: string }>>();

  corridorEdges.forEach((edge) => {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), { edgeId: edge.id, nodeId: edge.to }]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), { edgeId: edge.id, nodeId: edge.from }]);
  });

  const collapsedEdges: EvacEdge[] = [];
  const edgeKeys = new Set<string>();
  const diagnostics: string[] = [];

  const addCollapsedEdge = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const key = [fromId, toId].sort().join("::");
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    collapsedEdges.push({
      id: `${floorId}_collapsed_${collapsedEdges.length + 1}`,
      from: fromId,
      to: toId,
      kind: "corridor",
    });
  };

  scaffoldNodes.forEach((node) => {
    const neighbors = adjacency.get(node.id) ?? [];
    neighbors.forEach((neighbor) => {
      const neighborNode = graph.nodesById[neighbor.nodeId];
      if (!neighborNode) return;

      if (neighborNode.type !== "beacon") {
        addCollapsedEdge(node.id, neighborNode.id);
        return;
      }

      const stack = [{ fromId: node.id, beaconId: neighborNode.id }];
      const visitedBeacons = new Set<string>();

      while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visitedBeacons.has(current.beaconId)) continue;
        visitedBeacons.add(current.beaconId);

        (adjacency.get(current.beaconId) ?? []).forEach((nextHop) => {
          if (nextHop.nodeId === current.fromId) return;
          const nextNode = graph.nodesById[nextHop.nodeId];
          if (!nextNode) return;

          if (nextNode.type === "beacon") {
            stack.push({ fromId: current.beaconId, beaconId: nextNode.id });
            return;
          }
          if (scaffoldNodeIds.has(nextNode.id)) {
            addCollapsedEdge(node.id, nextNode.id);
          }
        });
      }
    });
  });

  if (collapsedEdges.length === 0) {
    diagnostics.push("No non-beacon corridor scaffold could be rebuilt from the current floor graph.");
  } else {
    diagnostics.push(`Recovered ${collapsedEdges.length} corridor scaffold edge${collapsedEdges.length === 1 ? "" : "s"} from the existing BLE graph.`);
  }

  return { nodes: scaffoldNodes, edges: collapsedEdges, diagnostics };
}

export function autoPlaceCameraNodesForFloor(
  floorId: FloorId,
  floorNodes: EvacNode[],
  floorEdges: EvacEdge[]
): GeneratedFloorGraph {
  const graph = createGraphSnapshot(floorNodes, floorEdges);
  const preservedNodes = floorNodes.filter((node) => node.type !== "camera");
  const beacons = preservedNodes.filter((node) => node.floorId === floorId && node.type === "beacon");

  if (beacons.length === 0) {
    return {
      nodes: floorNodes,
      edges: floorEdges,
      diagnostics: ["No BLE nodes found. Place BLE nodes before generating cameras."],
    };
  }

  const buildAdjacency = () => {
    const adjacency = new Map<string, string[]>();
    floorEdges.forEach((edge) => {
      const from = graph.nodesById[edge.from];
      const to = graph.nodesById[edge.to];
      if (!from || !to || from.floorId !== floorId || to.floorId !== floorId) return;
      adjacency.set(from.id, [...(adjacency.get(from.id) ?? []), to.id]);
      if (edge.bidirectional !== false) {
        adjacency.set(to.id, [...(adjacency.get(to.id) ?? []), from.id]);
      }
    });
    return adjacency;
  };

  const countNearbyNodes = (
    anchor: Pick<EvacNode, "x" | "y">,
    nodes: EvacNode[],
    radiusPercent: number,
    matcher?: (node: EvacNode) => boolean
  ) =>
    nodes.filter((node) => {
      if (matcher && !matcher(node)) return false;
      return getDistance(node, anchor) <= radiusPercent;
    }).length;

  const CAMERA_ANCHOR_PRIORITY: Record<string, number> = {
    exit: 56,
    stair: 52,
    checkpoint: 44,
    elevator: 38,
    junction: 30,
  };

  const getAnchorPriority = (node: EvacNode) => CAMERA_ANCHOR_PRIORITY[node.type] ?? 18;

  const chooseCoverageNodeIds = (anchor: EvacNode) =>
    beacons
      .slice()
      .sort((left, right) => getDistance(left, anchor) - getDistance(right, anchor))
      .slice(0, Math.min(4, Math.max(3, beacons.length)))
      .map((node) => node.id);

  const projectCameraPosition = (anchor: EvacNode, coverageNodeIds: string[]) => {
    const coverageNodes = coverageNodeIds
      .map((nodeId) => graph.nodesById[nodeId])
      .filter((node): node is EvacNode => Boolean(node));

    if (coverageNodes.length === 0) {
      return {
        x: clampPercent(anchor.x),
        y: clampPercent(anchor.y > 16 ? anchor.y - 10 : anchor.y + 10),
      };
    }

    const centroid = coverageNodes.reduce(
      (total, node) => ({ x: total.x + node.x, y: total.y + node.y }),
      { x: 0, y: 0 }
    );
    const centroidX = centroid.x / coverageNodes.length;
    const centroidY = centroid.y / coverageNodes.length;
    let dx = anchor.x - centroidX;
    let dy = anchor.y - centroidY;
    const magnitude = Math.hypot(dx, dy);

    if (magnitude < 0.8) {
      dx = anchor.x >= 50 ? 1 : -1;
      dy = anchor.y >= 50 ? 1 : -1;
    }

    const normalizedMagnitude = Math.max(1, Math.hypot(dx, dy));
    const offset = 6.5;
    return {
      x: clampPercent(anchor.x + (dx / normalizedMagnitude) * offset),
      y: clampPercent(anchor.y + (dy / normalizedMagnitude) * offset),
    };
  };

  const adjacency = buildAdjacency();
  const anchors = preservedNodes
    .filter(
      (node) =>
        node.floorId === floorId &&
        (node.type === "exit" || node.type === "stair" || node.type === "elevator" || node.type === "checkpoint" || node.type === "junction")
    )
    .sort((left, right) => left.x - right.x || left.y - right.y);

  const fallbackAnchors = beacons
    .filter(
      (_, index) =>
        index === 0 ||
        index === beacons.length - 1 ||
        index === Math.floor((beacons.length - 1) / 2) ||
        index === Math.floor((beacons.length - 1) / 3) ||
        index === Math.floor(((beacons.length - 1) * 2) / 3)
    )
    .slice(0, 5);

  const candidateAnchors = (anchors.length > 0 ? anchors : fallbackAnchors)
    .map((anchor) => {
      const degree = (adjacency.get(anchor.id) ?? []).length;
      const nearbyRooms = countNearbyNodes(anchor, preservedNodes, 18, (node) => node.floorId === floorId && node.type === "room");
      const nearbySupport = countNearbyNodes(
        anchor,
        preservedNodes,
        14,
        (node) => node.floorId === floorId && (node.type === "checkpoint" || node.type === "exit" || node.type === "stair" || node.type === "elevator")
      );
      const nearbyBeacons = countNearbyNodes(anchor, beacons, 11);

      return {
        anchor,
        degree,
        score: getAnchorPriority(anchor) + degree * 16 + nearbyRooms * 4 + nearbySupport * 5 + Math.min(nearbyBeacons, 4) * 3,
      };
    })
    .sort((left, right) => right.score - left.score || right.degree - left.degree);

  const selectedAnchors: typeof candidateAnchors = [];

  while (selectedAnchors.length < Math.min(4, Math.max(2, candidateAnchors.length))) {
    const remaining = candidateAnchors
      .filter((candidate) => !selectedAnchors.some((selected) => selected.anchor.id === candidate.anchor.id))
      .map((candidate) => {
        const spreadPenalty = selectedAnchors.reduce((penalty, selected) => {
          const distance = getDistance(selected.anchor, candidate.anchor);
          if (distance < 12) return penalty + 44;
          if (distance < 22) return penalty + 16;
          return penalty;
        }, 0);
        return { ...candidate, adjustedScore: candidate.score - spreadPenalty };
      })
      .sort((left, right) => right.adjustedScore - left.adjustedScore || right.score - left.score);

    const next = remaining[0];
    if (!next) break;
    selectedAnchors.push(next);
  }

  const camerasNodes = selectedAnchors.map(({ anchor }, index) => {
    const coverageNodeIds = chooseCoverageNodeIds(anchor);
    const position = projectCameraPosition(anchor, coverageNodeIds);

    return {
      id: `${floorId}_camera_auto_${index + 1}`,
      label: `${anchor.label} Camera`,
      floorId,
      x: position.x,
      y: position.y,
      type: "camera" as const,
      zoneId: anchor.zoneId,
      cameraId: formatCameraId(floorId, index + 1),
      coverageNodeIds,
    };
  });

  return {
    nodes: [...preservedNodes, ...camerasNodes],
    edges: floorEdges.filter((edge) => {
      const from = graph.nodesById[edge.from];
      const to = graph.nodesById[edge.to];
      return from?.type !== "camera" && to?.type !== "camera";
    }),
    diagnostics: [`Placed ${camerasNodes.length} camera nodes on higher-traffic exits, chokepoints, and corridor clusters.`],
  };
}

export function generateDemoFloorGraphFromRaster(
  floorId: FloorId,
  options?: RasterBlueprintLayout
): GeneratedFloorGraph {
  const imageWidth = options?.imageWidth ?? 1600;
  const imageHeight = options?.imageHeight ?? 1000;
  const generatedNodes: EvacNode[] = [];
  const generatedEdges: EvacEdge[] = [];

  const normalizedCorridorSegments = normalizeRasterCorridorSegments(options?.corridorSegments ?? []);
  const normalizedLayoutOptions = options ? { ...options, corridorSegments: normalizedCorridorSegments } : options;
  const { segments: filteredCorridorSegments, removedCount } = filterSupportedRasterCorridorSegments(normalizedLayoutOptions);
  const layoutOptions = normalizedLayoutOptions ? { ...normalizedLayoutOptions, corridorSegments: filteredCorridorSegments } : normalizedLayoutOptions;

  const hadDetectedLayout = Boolean(options?.corridorSegments?.length);
  const hasDetectedLayout = Boolean(layoutOptions?.corridorSegments?.length);
  const hasParsedBlueprint = Boolean(options);

  if (hasDetectedLayout) {
    const corridorSegments = layoutOptions?.corridorSegments ?? [];
    const junctionNodes: EvacNode[] = [];

    const upsertJunction = (x: number, y: number) => {
      const clampedX = clampPercent(x);
      const clampedY = clampPercent(y);
      const existing =
        junctionNodes.find((node) => Math.abs(node.x - clampedX) < 2.5 && Math.abs(node.y - clampedY) < 2.5) ??
        generatedNodes.find((node) => node.type === "junction" && Math.abs(node.x - clampedX) < 2.5 && Math.abs(node.y - clampedY) < 2.5);

      if (existing) return existing;

      const nextNode: EvacNode = {
        id: `${floorId}_raster_junction_${junctionNodes.length + 1}`,
        label: `J${junctionNodes.length + 1}`,
        floorId,
        x: clampedX,
        y: clampedY,
        type: "junction",
        zoneId: inferFloorZone(floorId, clampedY),
        checkpoint: false,
      };
      junctionNodes.push(nextNode);
      generatedNodes.push(nextNode);
      return nextNode;
    };

    const segmentProjections = new Map<number, Array<{ x: number; y: number }>>();
    const segmentIntersections = new Map<number, Array<{ x: number; y: number }>>();
    const allAnchors = [
      ...(layoutOptions?.junctionAnchors ?? []),
      ...(layoutOptions?.roomAnchors ?? []),
      ...(layoutOptions?.exitAnchors ?? []),
      ...(layoutOptions?.stairAnchors ?? []),
      ...(layoutOptions?.elevatorAnchors ?? []),
      ...(layoutOptions?.checkpointAnchors ?? []),
    ];

    corridorSegments.forEach((segment, segmentIndex) => {
      corridorSegments.slice(segmentIndex + 1).forEach((candidate, candidateOffset) => {
        const candidateIndex = segmentIndex + candidateOffset + 1;
        const intersection = getRasterSegmentIntersection(segment, candidate);
        if (!intersection) return;

        segmentIntersections.set(segmentIndex, [...(segmentIntersections.get(segmentIndex) ?? []), intersection]);
        segmentIntersections.set(candidateIndex, [...(segmentIntersections.get(candidateIndex) ?? []), intersection]);
      });
    });

    allAnchors.forEach((anchor) => {
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestProj: { x: number; y: number } | null = null;
      let bestSegmentIndex = -1;

      corridorSegments.forEach((seg, sIdx) => {
        const proj = getClosestPointOnSegment(anchor.x, anchor.y, seg.x1, seg.y1, seg.x2, seg.y2);
        const dist = getBlueprintPointToSegmentDistance(anchor, seg, layoutOptions) ?? getDistance(proj, anchor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestProj = proj;
          bestSegmentIndex = sIdx;
        }
      });

      const projectionThreshold = getBlueprintMetersPerPercent(layoutOptions) ? 4.2 : 6.5;
      if (bestProj && bestDistance <= projectionThreshold) {
        const list = segmentProjections.get(bestSegmentIndex) ?? [];
        list.push(bestProj);
        segmentProjections.set(bestSegmentIndex, list);
      }
    });

    corridorSegments.forEach((segment, segmentIndex) => {
      const segmentLength = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
      const subdivisions = Math.max(1, Math.ceil(segmentLength / 12));
      const points = Array.from({ length: subdivisions + 1 }, (_, index) => {
        const ratio = index / subdivisions;
        return {
          x: segment.x1 + (segment.x2 - segment.x1) * ratio,
          y: segment.y1 + (segment.y2 - segment.y1) * ratio,
        };
      });

      const projs = segmentProjections.get(segmentIndex) ?? [];
      const intersections = segmentIntersections.get(segmentIndex) ?? [];
      const segmentGuidePoints = [...points, ...projs, ...intersections]
        .map((point) => ({
          x: clampPercent(point.x),
          y: clampPercent(point.y),
          ratio: getSegmentProjectionRatio(point, segment),
        }))
        .sort((left, right) => left.ratio - right.ratio)
        .filter((point, index, all) => {
          if (index === 0) return true;
          const previous = all[index - 1];
          return getDistance(previous, point) >= 0.9;
        });

      const segmentNodes = segmentGuidePoints.map((pt) => upsertJunction(pt.x, pt.y));

      segmentNodes.forEach((node, index) => {
        if (index === segmentNodes.length - 1) return;
        const nextNode = segmentNodes[index + 1];
        if (node.id === nextNode.id) return;

        const edgeId = `${floorId}_raster_segment_${segmentIndex + 1}_${index + 1}`;
        if (generatedEdges.some((edge) => edge.id === edgeId || (edge.from === node.id && edge.to === nextNode.id))) return;

        generatedEdges.push({
          id: edgeId,
          from: node.id,
          to: nextNode.id,
          kind: "corridor",
        });
      });
    });

    const connectAnchorNode = (
      type: EvacNodeType,
      anchors: RasterBlueprintAnchor[] | undefined,
      labelFactory: (index: number, anchor: RasterBlueprintAnchor) => string,
      extraFactory?: (index: number, anchor: RasterBlueprintAnchor) => Partial<EvacNode>
    ) => {
      anchors?.forEach((anchor, index) => {
        const x = clampPercent(anchor.x);
        const y = clampPercent(anchor.y);
        const node: EvacNode = {
          id: `${floorId}_raster_${type}_${index + 1}`,
          label: anchor.label ?? labelFactory(index, anchor),
          floorId,
          x,
          y,
          type,
          zoneId: inferFloorZone(floorId, y),
          checkpoint: type === "room" || type === "checkpoint" || type === "exit" || type === "stair" || type === "elevator",
          ...extraFactory?.(index, anchor),
        };
        generatedNodes.push(node);

        const nearestJunction = junctionNodes.reduce((best, candidate) => {
          if (!best) return candidate;
          return getDistance(candidate, node) < getDistance(best, node) ? candidate : best;
        }, null as EvacNode | null);

        if (nearestJunction) {
          generatedEdges.push({
            id: `${floorId}_raster_link_${type}_${index + 1}`,
            from: node.id,
            to: nearestJunction.id,
            kind: "corridor",
          });
        }
      });
    };

    connectAnchorNode("room", layoutOptions?.roomAnchors, (index) => `Room ${floorId.split("_")[1]}${String(index + 1).padStart(2, "0")}`);
    connectAnchorNode("exit", layoutOptions?.exitAnchors, (index) => `EXIT ${index === 0 ? "WEST" : "EAST"}`, (_, anchor) => ({ isExit: true, label: anchor.label ?? undefined }));
    connectAnchorNode("stair", layoutOptions?.stairAnchors, (index) => `STAIR ${String.fromCharCode(65 + index)}`);
    connectAnchorNode("elevator", layoutOptions?.elevatorAnchors, () => "LIFT LOBBY");
    connectAnchorNode("checkpoint", layoutOptions?.checkpointAnchors, () => "ENTRY POINT");

  } else if (!hasParsedBlueprint) {
    const isWideLayout = imageWidth >= imageHeight;
    const corridorY = isWideLayout ? 54 : 50;
    const skeletonXs = isWideLayout ? [16, 34, 52, 70, 88] : [20, 40, 60, 80];

    skeletonXs.forEach((x, index) => {
      generatedNodes.push({
        id: `${floorId}_raster_junction_${index + 1}`,
        label: `J${index + 1}`,
        floorId,
        x,
        y: corridorY,
        type: "junction",
        zoneId: inferFloorZone(floorId, corridorY),
      });
      if (index > 0) {
        generatedEdges.push({
          id: `${floorId}_raster_segment_${index}`,
          from: `${floorId}_raster_junction_${index}`,
          to: `${floorId}_raster_junction_${index + 1}`,
          kind: "corridor",
        });
      }
    });

    generatedNodes.push(
      { id: `${floorId}_raster_room_1`, label: `Room ${floorId.split("_")[1]}01`, floorId, x: skeletonXs[1] ?? 34, y: corridorY - 22, type: "room", zoneId: inferFloorZone(floorId, corridorY - 22), checkpoint: true },
      { id: `${floorId}_raster_room_2`, label: `Room ${floorId.split("_")[1]}02`, floorId, x: skeletonXs[skeletonXs.length - 2] ?? 70, y: corridorY + 22, type: "room", zoneId: inferFloorZone(floorId, corridorY + 22), checkpoint: true },
      { id: `${floorId}_raster_exit_1`, label: "EXIT WEST", floorId, x: 8, y: corridorY, type: "exit", zoneId: inferFloorZone(floorId, corridorY), checkpoint: true, isExit: true },
      { id: `${floorId}_raster_exit_2`, label: "EXIT EAST", floorId, x: 92, y: corridorY, type: "exit", zoneId: inferFloorZone(floorId, corridorY), checkpoint: true, isExit: true },
      { id: `${floorId}_raster_stair_1`, label: "STAIR A", floorId, x: 10, y: corridorY, type: "stair", zoneId: inferFloorZone(floorId, corridorY), checkpoint: true },
      { id: `${floorId}_raster_stair_2`, label: "STAIR B", floorId, x: 90, y: corridorY, type: "stair", zoneId: inferFloorZone(floorId, corridorY), checkpoint: true },
      { id: `${floorId}_raster_lift_1`, label: "LIFT LOBBY", floorId, x: 50, y: corridorY, type: "elevator", zoneId: inferFloorZone(floorId, corridorY), checkpoint: true },
      { id: `${floorId}_raster_entry_1`, label: "ENTRY POINT", floorId, x: 56, y: Math.min(92, corridorY + 18), type: "checkpoint", zoneId: inferFloorZone(floorId, corridorY + 18), checkpoint: true }
    );
  }

  if (hasParsedBlueprint && !hasDetectedLayout) {
    return {
      nodes: [],
      edges: [],
      diagnostics: [
        ...(options?.diagnostics ?? []),
        ...(hadDetectedLayout && removedCount > 0 ? [`Filtered ${removedCount} unsupported corridor segment${removedCount === 1 ? "" : "s"} from the parsed layout.`] : []),
        "No confident walkable corridor layout was extracted from the uploaded blueprint.",
      ],
    };
  }

  const builtGraph = hasDetectedLayout
    ? {
      nodes: dedupeGeneratedNodes(generatedNodes),
      edges: generatedEdges.filter(
        (edge, index, all) =>
          edge.from !== edge.to &&
          all.findIndex(
            (candidate) =>
              candidate.kind === edge.kind &&
              ((candidate.from === edge.from && candidate.to === edge.to) ||
                (candidate.from === edge.to && candidate.to === edge.from))
          ) === index
      ),
      diagnostics: [] as string[],
    }
    : { ...buildFloorEdgesFromNodes(floorId, generatedNodes), diagnostics: [] as string[] };

  return {
    nodes: builtGraph.nodes,
    edges: builtGraph.edges,
    diagnostics: [
      `Raster blueprint detected (${imageWidth}x${imageHeight}).`,
      ...(options?.diagnostics ?? []),
      ...(removedCount > 0 ? [`Filtered unsupported corridor segments before graph build (${removedCount} removed).`] : []),
      hasDetectedLayout ? "Detected corridor spans from the uploaded raster blueprint and placed anchors against that structure." : "Built a generic raster fallback layout because no parsed blueprint geometry was supplied.",
      `Generated ${builtGraph.nodes.length} nodes and ${builtGraph.edges.length} edges for live simulation.`,
    ],
  };
}

export function generateFloorGraphFromSvg(svgMarkup: string, floorId: FloorId): GeneratedFloorGraph {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgRoot = documentNode.querySelector("svg");
  if (!svgRoot) {
    return { nodes: [], edges: [], diagnostics: ["SVG root not found."] };
  }

  const viewBox = svgRoot.getAttribute("viewBox")?.split(/\s+/).map(Number) ?? [];
  const viewBoxWidth = viewBox[2] || parseSvgFloat(svgRoot.getAttribute("width"), 1600);
  const viewBoxHeight = viewBox[3] || parseSvgFloat(svgRoot.getAttribute("height"), 1000);
  const toPercentX = (value: number) => clampPercent((value / viewBoxWidth) * 100);
  const toPercentY = (value: number) => clampPercent((value / viewBoxHeight) * 100);

  const texts = extractSvgTextNodes(documentNode);
  const diagnostics: string[] = [];
  const generatedNodes: EvacNode[] = [];

  const addGeneratedNode = (node: EvacNode) => generatedNodes.push(node);

  texts.filter((entry) => /^\d{3,4}$/.test(entry.text)).forEach((entry) => {
    addGeneratedNode({
      id: createFloorNodeId(floorId, "room", entry.text),
      label: `Room ${entry.text}`,
      floorId,
      x: toPercentX(entry.x),
      y: toPercentY(entry.y),
      type: "room",
      zoneId: inferFloorZone(floorId, toPercentY(entry.y)),
      checkpoint: true,
    });
  });

  texts.filter((entry) => /^stair\b/i.test(entry.text)).forEach((entry) => {
    addGeneratedNode({
      id: createFloorNodeId(floorId, "stair", entry.text),
      label: entry.text.toUpperCase(),
      floorId,
      x: toPercentX(entry.x),
      y: toPercentY(entry.y),
      type: "stair",
      zoneId: inferFloorZone(floorId, toPercentY(entry.y)),
      checkpoint: true,
    });
  });

  texts.filter((entry) => /\b(lift|elevator)\b/i.test(entry.text)).forEach((entry) => {
    addGeneratedNode({
      id: createFloorNodeId(floorId, "elevator", entry.text),
      label: entry.text.toUpperCase(),
      floorId,
      x: toPercentX(entry.x),
      y: toPercentY(entry.y),
      type: "elevator",
      zoneId: inferFloorZone(floorId, toPercentY(entry.y)),
      checkpoint: true,
    });
  });

  texts.filter((entry) => /\bexit\b/i.test(entry.text) && !/\bfire exit\b/i.test(entry.text) && !/^stair\b/i.test(entry.text)).forEach((entry) => {
    addGeneratedNode({
      id: createFloorNodeId(floorId, "exit", entry.text),
      label: entry.text,
      floorId,
      x: toPercentX(entry.x),
      y: toPercentY(entry.y),
      type: "exit",
      zoneId: inferFloorZone(floorId, toPercentY(entry.y)),
      checkpoint: true,
      isExit: true,
    });
  });

  texts.filter((entry) => /\bcamera\b/i.test(entry.text)).forEach((entry) => {
    const cameraToken = slugifyBlueprintToken(entry.text || "camera");
    addGeneratedNode({
      id: createFloorNodeId(floorId, "camera", entry.text),
      label: entry.text,
      floorId,
      x: toPercentX(entry.x),
      y: toPercentY(entry.y),
      type: "camera",
      zoneId: inferFloorZone(floorId, toPercentY(entry.y)),
      cameraId: `${floorId}-${cameraToken}`,
    });
  });

  texts.filter((entry) =>
    /lobby|reception|cafe|admin hub|concierge|security office/i.test(entry.text) &&
    !generatedNodes.some((node) => node.label.toLowerCase() === entry.text.toLowerCase())
  ).forEach((entry) => {
    addGeneratedNode({
      id: createFloorNodeId(floorId, "checkpoint", entry.text),
      label: entry.text,
      floorId,
      x: toPercentX(entry.x),
      y: toPercentY(entry.y),
      type: "checkpoint",
      zoneId: inferFloorZone(floorId, toPercentY(entry.y)),
      checkpoint: true,
    });
  });

  const svgCorridorAnchors = Array.from(documentNode.querySelectorAll("circle"))
    .map((element) => ({
      x: parseSvgFloat(element.getAttribute("cx")),
      y: parseSvgFloat(element.getAttribute("cy")),
      r: parseSvgFloat(element.getAttribute("r")),
    }))
    .filter((entry) => entry.r >= 4 && entry.r <= 12)
    .sort((a, b) => a.x - b.x)
    .map((entry) => ({ x: toPercentX(entry.x), y: toPercentY(entry.y) }));

  const roomNodes = generatedNodes.filter((node) => node.type === "room");
  const connectorNodes = generatedNodes.filter((node) => node.type === "checkpoint" || node.type === "stair" || node.type === "elevator" || node.type === "exit");
  const connectorYValues = connectorNodes.filter((node) => node.type !== "exit" || floorId === "floor_1").map((node) => node.y).sort((left, right) => left - right);
  const corridorY = connectorYValues[Math.floor(connectorYValues.length / 2)] ?? (roomNodes.length >= 2 ? Number((((Math.min(...roomNodes.map((node) => node.y)) + Math.max(...roomNodes.map((node) => node.y))) / 2)).toFixed(2)) : 50);

  const inferredXs = dedupeAxisPositions([...roomNodes.map((node) => node.x), ...connectorNodes.map((node) => node.x), 8, 18, 32, 50, 68, 82, 92]);
  const inferredCorridorAnchors = inferredXs.length > 0 ? inferredXs.map((x) => ({ x, y: corridorY })) : Array.from({ length: 8 }, (_, index) => ({ x: clampPercent(14 + index * 10), y: corridorY }));
  const scaffoldAnchors = svgCorridorAnchors.length >= 4 ? svgCorridorAnchors : inferredCorridorAnchors;

  if (svgCorridorAnchors.length >= 4) {
    diagnostics.push("SVG corridor markers detected and converted into a walkable scaffold for auto BLE placement.");
  } else {
    diagnostics.push("SVG had no reliable corridor markers, so a corridor scaffold was inferred from room and connector positions.");
  }

  const dedupedNodes = dedupeGeneratedNodes(generatedNodes);
  const builtGraph = buildCorridorScaffold(floorId, dedupedNodes, scaffoldAnchors);
  diagnostics.push(`Generated ${builtGraph.nodes.length} nodes and ${builtGraph.edges.length} edges from blueprint.`);

  return {
    nodes: builtGraph.nodes,
    edges: builtGraph.edges,
    diagnostics: [...builtGraph.diagnostics, ...diagnostics],
  };
}

// --- Pathfinding & A-Star Implementations ---

export function getOccupantById(state: SimulationState, occupantId: string) {
  return state.occupants.find((occupant) => occupant.id === occupantId) || null;
}

export function isBeaconNode(nodeId: string) {
  return nodesById[nodeId]?.type === "beacon";
}

function getFloorNumber(floorId: FloorId) {
  return Number(floorId.split("_")[1]);
}

function getConnectedNodes(nodeIds: string[], graph: GraphSnapshot = createGraphSnapshot(), matcher?: (nodeId: string) => boolean) {
  const idSet = new Set(nodeIds);
  const connected = new Set<string>();

  graph.edges.forEach((edge) => {
    if (idSet.has(edge.from) && (!matcher || matcher(edge.to))) connected.add(edge.to);
    if (idSet.has(edge.to) && (!matcher || matcher(edge.from))) connected.add(edge.from);
  });

  return Array.from(connected);
}

function getNeighborBeaconIds(camera: CameraDefinition, graph: GraphSnapshot = createGraphSnapshot()) {
  const coverageBeacons = camera.coverageNodeIds.map((nodeId) => graph.nodesById[nodeId]).filter((node): node is EvacNode => Boolean(node && node.type === "beacon"));
  if (coverageBeacons.length === 0) return [];

  const coverageIds = new Set(camera.coverageNodeIds);
  const adjacent = new Set<string>();

  graph.edges.forEach((edge) => {
    const fromNode = graph.nodesById[edge.from];
    const toNode = graph.nodesById[edge.to];
    if (fromNode?.type !== "beacon" || toNode?.type !== "beacon") return;
    if (coverageIds.has(fromNode.id) && !coverageIds.has(toNode.id)) adjacent.add(toNode.id);
    if (coverageIds.has(toNode.id) && !coverageIds.has(fromNode.id)) adjacent.add(fromNode.id);
  });

  return Array.from(adjacent).filter((nodeId) => graph.nodesById[nodeId]?.floorId === camera.floorId);
}

function getCameraHazardAnchorNodeId(camera: CameraDefinition, graph: GraphSnapshot = createGraphSnapshot()) {
  const coverageBeacons = camera.coverageNodeIds
    .map((nodeId) => graph.nodesById[nodeId])
    .filter((node): node is EvacNode => Boolean(node && node.type === "beacon"));
  const candidateBeacons = coverageBeacons.length > 0
    ? coverageBeacons
    : graph.nodes.filter((node) => node.floorId === camera.floorId && node.type === "beacon");
  if (candidateBeacons.length === 0) return null;

  const cameraNode = graph.nodesById[camera.nodeId];
  const cameraPoint = cameraNode ? getMountedCoordinates(cameraNode) : null;
  if (!cameraPoint) {
    return candidateBeacons[0]?.id ?? null;
  }

  return candidateBeacons
    .slice()
    .sort((left, right) => getDistance(getMountedCoordinates(left), cameraPoint) - getDistance(getMountedCoordinates(right), cameraPoint))
    [0]?.id ?? null;
}

function resolveGraphCameraDefinition(cameraId: string, graph: GraphSnapshot = createGraphSnapshot()) {
  const staticCamera = CAMERAS.find((entry) => entry.id === cameraId);
  if (staticCamera) return staticCamera;

  const cameraNode = graph.nodes.find((node) => node.cameraId === cameraId || node.id === cameraId);
  if (!cameraNode) return null;

  const coverageNodeIds =
    cameraNode.coverageNodeIds && cameraNode.coverageNodeIds.length > 0
      ? cameraNode.coverageNodeIds
      : graph.nodes
        .filter((node) => node.floorId === cameraNode.floorId && node.type === "beacon")
        .sort((a, b) => getDistance(a, cameraNode) - getDistance(b, cameraNode))
        .slice(0, 3)
        .map((node) => node.id);

  return {
    id: cameraId,
    label: cameraNode.label,
    floorId: cameraNode.floorId,
    nodeId: cameraNode.id,
    zoneId: cameraNode.zoneId,
    coverageNodeIds,
  } satisfies CameraDefinition;
}

export function resolveCameraImpact(
  cameraId: string,
  options?: { confidence?: number; frameCount?: number; hazardType?: CameraDetection["hazardType"] },
  graph: GraphSnapshot = createGraphSnapshot()
) {
  const camera = resolveGraphCameraDefinition(cameraId, graph);
  if (!camera) return null;

  const confidence = options?.confidence ?? 0.92;
  const frameCount = options?.frameCount ?? 3;
  const hazardType = options?.hazardType ?? "smoke";
  const hazardAnchorNodeId = getCameraHazardAnchorNodeId(camera, graph);
  const adjacentBeaconIds = getNeighborBeaconIds(camera, graph);
  const connectedRoomIds = getConnectedNodes(camera.coverageNodeIds, graph, (nodeId) => graph.nodesById[nodeId]?.type === "room");

  const hardBlock = confidence >= 0.88 && frameCount >= 3;
  const softAvoid = confidence >= 0.72 && frameCount >= 2;
  const hazardNodeIds = hazardAnchorNodeId ? [hazardAnchorNodeId] : [];

  const blockedNodeIds = hardBlock ? Array.from(new Set([...camera.coverageNodeIds, ...connectedRoomIds])) : [];
  const avoidNodeIds = hardBlock
    ? Array.from(new Set(adjacentBeaconIds))
    : softAvoid
      ? Array.from(new Set([...camera.coverageNodeIds, ...connectedRoomIds]))
      : [];

  const blockedNodeSet = new Set(blockedNodeIds);
  const blockedEdgeIds = hardBlock
    ? graph.edges.filter(
      (edge) =>
        blockedNodeSet.has(edge.from) ||
        blockedNodeSet.has(edge.to) ||
        (edge.kind === "corridor" && camera.coverageNodeIds.includes(edge.from) && camera.coverageNodeIds.includes(edge.to))
    ).map((edge) => edge.id)
    : [];

  const status: CameraDetection["status"] = hardBlock ? "blocked" : softAvoid ? "avoid" : "warning";
  const label =
    status === "blocked"
      ? `${camera.label} auto-blocked ${camera.zoneId}`
      : status === "avoid"
        ? `${camera.label} marked ${camera.zoneId} as avoid`
        : `${camera.label} raised ${hazardType} warning`;

  return {
    camera,
    zoneId: camera.zoneId,
    hazardType,
    confidence,
    frameCount,
    status,
    label,
    hazardNodeIds,
    blockedNodeIds,
    avoidNodeIds,
    blockedEdgeIds,
    triggeredNodeIds: Array.from(new Set([...camera.coverageNodeIds, ...connectedRoomIds])),
  };
}

interface RoutePenaltyContext {
  incidentActive: boolean;
  threatNodes: EvacNode[];
  occupantNodes: EvacNode[];
}

function buildRoutePenaltyContext(state: SimulationState, graph: GraphSnapshot): RoutePenaltyContext {
  const threatIds = Array.from(
    new Set([...state.activeHazardNodeIds, ...state.cameraDetections.flatMap((detection) => detection.triggeredNodeIds)])
  );

  return {
    incidentActive: state.simulationRunning || state.incidentMode !== "normal" || state.activeHazardNodeIds.length > 0 || state.cameraDetections.length > 0,
    threatNodes: threatIds.map((nodeId) => graph.nodesById[nodeId]).filter(Boolean) as EvacNode[],
    occupantNodes: state.occupants.map((occupant) => graph.nodesById[occupant.currentNodeId]).filter(Boolean) as EvacNode[],
  };
}

function getThreatProximityPenalty(node: EvacNode, context: RoutePenaltyContext) {
  const nearestThreat = context.threatNodes.reduce((best, threatNode) => {
    if (threatNode.floorId !== node.floorId || threatNode.id === node.id) return best;
    return Math.min(best, getDistance(threatNode, node));
  }, Number.POSITIVE_INFINITY);

  if (nearestThreat <= 5) return ROUTING_PENALTIES.THREAT_CRITICAL;
  if (nearestThreat <= 9) return ROUTING_PENALTIES.THREAT_HIGH;
  if (nearestThreat <= 16) return ROUTING_PENALTIES.THREAT_MEDIUM;
  return 0;
}

function getCrowdingPenalty(node: EvacNode, context: RoutePenaltyContext) {
  const penalty = context.occupantNodes.reduce((total, occupantNode) => {
    if (occupantNode.floorId !== node.floorId) return total;
    const distance = getDistance(occupantNode, node);
    if (distance <= 2.2) return total + ROUTING_PENALTIES.CROWDING_CRITICAL;
    if (distance <= 6) return total + ROUTING_PENALTIES.CROWDING_HIGH;
    if (distance <= 12) return total + ROUTING_PENALTIES.CROWDING_MEDIUM;
    return total;
  }, 0);

  return Math.min(context.incidentActive ? ROUTING_PENALTIES.INCIDENT_MAX_CROWDING : ROUTING_PENALTIES.CROWDING_CRITICAL, penalty);
}

function getNodePenalty(node: EvacNode, hazardNodeIds: Set<string>, avoidNodeIds: Set<string>, context: RoutePenaltyContext, allowHazardTarget = false) {
  if (!allowHazardTarget && hazardNodeIds.has(node.id)) return ROUTING_PENALTIES.HAZARD_BLOCKED;
  if (avoidNodeIds.has(node.id)) return ROUTING_PENALTIES.AVOID_NODE;

  const threatPenalty = allowHazardTarget ? 0 : getThreatProximityPenalty(node, context);
  const crowdingPenalty = getCrowdingPenalty(node, context);
  const congestionPenalty = context.incidentActive ? crowdingPenalty : Math.round(crowdingPenalty * 0.4);

  if (node.type === "elevator") {
    return (context.incidentActive ? ROUTING_PENALTIES.ELEVATOR_INCIDENT : ROUTING_PENALTIES.ELEVATOR_NORMAL) + threatPenalty + congestionPenalty;
  }
  if (node.type === "room") {
    return ROUTING_PENALTIES.ROOM_BASE + threatPenalty + congestionPenalty;
  }
  return threatPenalty + congestionPenalty;
}

function getEdgePenalty(edge: EvacEdge, incidentActive: boolean) {
  if (edge.kind === "stairs") return incidentActive ? ROUTING_PENALTIES.STAIRS_INCIDENT : ROUTING_PENALTIES.STAIRS_NORMAL;
  if (edge.kind === "elevator") return incidentActive ? ROUTING_PENALTIES.ELEVATOR_INCIDENT : ROUTING_PENALTIES.ELEVATOR_NORMAL;
  return 0;
}

interface PathQueueEntry {
  nodeId: string;
  score: number;
}

class MinPathQueue {
  private readonly items: PathQueueEntry[] = [];

  push(entry: PathQueueEntry) {
    this.items.push(entry);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const top = this.items[0];
    const tail = this.items.pop();
    if (tail && this.items.length > 0) {
      this.items[0] = tail;
      this.bubbleDown(0);
    }
    return top;
  }

  get size() {
    return this.items.length;
  }

  private bubbleUp(index: number) {
    let currentIndex = index;
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (this.items[parentIndex].score <= this.items[currentIndex].score) break;
      [this.items[parentIndex], this.items[currentIndex]] = [this.items[currentIndex], this.items[parentIndex]];
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number) {
    let currentIndex = index;
    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = currentIndex;

      if (leftIndex < this.items.length && this.items[leftIndex].score < this.items[smallestIndex].score) {
        smallestIndex = leftIndex;
      }
      if (rightIndex < this.items.length && this.items[rightIndex].score < this.items[smallestIndex].score) {
        smallestIndex = rightIndex;
      }
      if (smallestIndex === currentIndex) break;

      [this.items[currentIndex], this.items[smallestIndex]] = [this.items[smallestIndex], this.items[currentIndex]];
      currentIndex = smallestIndex;
    }
  }
}

function estimateRemainingDistance(nodeId: string, targetIds: string[], graph: GraphSnapshot) {
  const node = graph.nodesById[nodeId];
  if (!node) return Number.POSITIVE_INFINITY;

  return targetIds.reduce((best, targetId) => {
    const target = graph.nodesById[targetId];
    if (!target) return best;
    const floorPenalty = node.floorId === target.floorId ? 0 : ROUTING_PENALTIES.CROSS_FLOOR;
    return Math.min(best, getDistance(node, target) + floorPenalty);
  }, Number.POSITIVE_INFINITY);
}

export function findShortestPath(
  startId: string,
  targetIds: string[],
  state: SimulationState,
  options?: { allowHazardTargets?: boolean },
  graph: GraphSnapshot = createGraphSnapshot(state.graphNodes, state.graphEdges)
) {
  if (!graph.nodesById[startId]) return null;

  const allowedTargets = targetIds.filter((id) => graph.nodesById[id]);
  if (allowedTargets.length === 0) return null;

  const targetSet = new Set(allowedTargets);
  const hazardNodeIds = new Set([
    ...state.activeHazardNodeIds,
    ...state.cameraDetections.flatMap((detection) => detection.blockedNodeIds),
  ]);
  const avoidNodeIds = new Set(state.avoidNodeIds);
  const blockedEdgeIds = new Set(state.blockedEdgeIds);
  const penaltyContext = buildRoutePenaltyContext(state, graph);

  const adjacency = new Map<string, Array<{ edge: EvacEdge; nodeId: string }>>();
  graph.edges.forEach((edge) => {
    if (blockedEdgeIds.has(edge.id)) return;
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), { edge, nodeId: edge.to }]);
    if (edge.bidirectional !== false) {
      adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), { edge, nodeId: edge.from }]);
    }
  });

  const distances = new Map<string, number>();
  const estimatedTotals = new Map<string, number>();
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, string>();
  const openQueue = new MinPathQueue();

  graph.nodes.forEach((node) => distances.set(node.id, Number.POSITIVE_INFINITY));
  distances.set(startId, 0);

  const startEstimate = estimateRemainingDistance(startId, allowedTargets, graph);
  estimatedTotals.set(startId, startEstimate);
  openQueue.push({ nodeId: startId, score: startEstimate });

  while (openQueue.size > 0) {
    const current = openQueue.pop();
    if (!current) break;

    const currentId = current.nodeId;
    if (closedSet.has(currentId)) continue;
    if ((estimatedTotals.get(currentId) ?? Number.POSITIVE_INFINITY) < current.score) continue;

    closedSet.add(currentId);
    if (targetSet.has(currentId)) {
      const path = [currentId];
      let node = currentId;
      while (cameFrom.has(node)) {
        node = cameFrom.get(node)!;
        path.unshift(node);
      }
      return path;
    }

    const currentDistance = distances.get(currentId) ?? Number.POSITIVE_INFINITY;
    (adjacency.get(currentId) ?? []).forEach(({ edge, nodeId: neighborId }) => {
      if (closedSet.has(neighborId)) return;

      const currentNode = graph.nodesById[currentId];
      const neighborNode = graph.nodesById[neighborId];
      const neighborIsAllowedHazardTarget = Boolean(options?.allowHazardTargets && targetSet.has(neighborId));

      // Hazard-marked nodes are treated as hard blocks for navigation unless the
      // route is explicitly allowed to terminate on that hazard target.
      if (hazardNodeIds.has(neighborId) && !neighborIsAllowedHazardTarget) {
        return;
      }

      const floorPenalty = currentNode.floorId === neighborNode.floorId ? 0 : ROUTING_PENALTIES.CROSS_FLOOR;
      const baseDistance = getDistance(currentNode, neighborNode) + floorPenalty;

      const nextDistance =
        currentDistance +
        baseDistance +
        getEdgePenalty(edge, penaltyContext.incidentActive) +
        getNodePenalty(
          neighborNode,
          hazardNodeIds,
          avoidNodeIds,
          penaltyContext,
          neighborIsAllowedHazardTarget
        );

      if (nextDistance < (distances.get(neighborId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighborId, nextDistance);
        cameFrom.set(neighborId, currentId);

        const estimatedTotal = nextDistance + estimateRemainingDistance(neighborId, allowedTargets, graph);
        estimatedTotals.set(neighborId, estimatedTotal);
        openQueue.push({ nodeId: neighborId, score: estimatedTotal });
      }
    });
  }

  return null;
}

export function findSafeExitPath(startId: string, state: SimulationState, graph: GraphSnapshot = createGraphSnapshot(state.graphNodes, state.graphEdges)) {
  const exitIds = graph.nodes.filter((node) => node.isExit).map((node) => node.id);
  return findShortestPath(startId, exitIds, state, undefined, graph);
}

export function findSafeRefugePath(startId: string, state: SimulationState, graph: GraphSnapshot = createGraphSnapshot(state.graphNodes, state.graphEdges)) {
  const startNode = graph.nodesById[startId];
  if (!startNode || startNode.isRefuge) return null;

  const sameFloorRefugeIds = graph.nodes.filter((node) => node.isRefuge && node.floorId === startNode.floorId).map((node) => node.id);
  const refugeIds = sameFloorRefugeIds.length ? sameFloorRefugeIds : graph.nodes.filter((node) => node.isRefuge).map((node) => node.id);

  if (refugeIds.length > 0) {
    const refugePath = findShortestPath(startId, refugeIds, state, undefined, graph);
    if (refugePath) return refugePath;
  }

  return findSafeExitPath(startId, state, graph);
}

export function findResponsePath(startId: string, targetId: string, state: SimulationState, graph: GraphSnapshot = createGraphSnapshot(state.graphNodes, state.graphEdges)) {
  return findShortestPath(startId, [targetId], state, { allowHazardTargets: true }, graph);
}

export function buildRouteSteps(path: string[], graph: GraphSnapshot = createGraphSnapshot()) {
  if (path.length === 0) {
    return [];
  }

  const visibleStops = path
    .map((nodeId, index) => ({ nodeId, index, node: graph.nodesById[nodeId] }))
    .filter((entry, index) => index === 0 || index === path.length - 1 || entry.node.type !== "beacon");

  return visibleStops.slice(1).map((entry, stepIndex) => {
    const previous = visibleStops[stepIndex];
    const current = entry.node;
    const segment = path.slice(previous.index, entry.index + 1);
    const meters = segment.reduce((total, nodeId, index) => {
      if (index === 0) return total;
      const from = graph.nodesById[segment[index - 1]];
      const to = graph.nodesById[nodeId];
      if (from.floorId !== to.floorId) return total;
      if (from.type === "room" || to.type === "room") return total + 2;
      return total + 3;
    }, 0);

    const dx = current.x - previous.node.x;
    const direction = Math.abs(dx) < 3 ? "continue ahead" : dx > 0 ? "take right along the corridor" : "take left along the corridor";
    const distanceText = meters > 0 ? ` for ${meters}m` : "";

    if (previous.node.type === "room") {
      if (current.floorId !== previous.node.floorId) {
        return `Exit the room and use ${current.label} to level ${current.floorId.split("_")[1]}`;
      }
      return `Exit the room and ${direction}${distanceText} to ${current.label}`;
    }

    if (current.floorId !== previous.node.floorId) {
      const level = current.floorId.split("_")[1];
      return `${current.type === "stair" ? "Use the stairs" : "Use the lift"} to level ${level} at ${current.label}`;
    }

    if (current.type === "exit") {
      return `Continue${distanceText} and exit via ${current.label}`;
    }

    if (current.isRefuge) {
      if (previous.node.isExit) return `Exit via ${previous.node.label} and continue${distanceText} to ${current.label}`;
      return `Continue${distanceText} to ${current.label}`;
    }

    if (current.type === "stair" || current.type === "elevator") {
      return `${direction}${distanceText}, then take ${current.label}`;
    }

    return `${direction}${distanceText} to ${current.label}`;
  });
}

export function calculateRouteDistanceMeters(path: string[], graph: GraphSnapshot = createGraphSnapshot(), floorDimensions: Record<FloorId, FloorDimensions> = DEFAULT_FLOOR_DIMENSIONS) {
  return Number(
    path.reduce((total, nodeId, index) => {
      if (index === 0) return total;
      const from = graph.nodesById[path[index - 1]];
      const to = graph.nodesById[nodeId];
      if (!from || !to || from.floorId !== to.floorId) return total;
      return total + getNodeDistanceMeters(from, to, floorDimensions[from.floorId] ?? DEFAULT_FLOOR_DIMENSIONS[from.floorId]);
    }, 0).toFixed(1)
  );
}

export function getRouteBleAddresses(path: string[], graph: GraphSnapshot = createGraphSnapshot()) {
  return Array.from(
    new Set(
      path
        .map((nodeId) => graph.nodesById[nodeId])
        .filter((node): node is EvacNode => Boolean(node && (node.bleAddress || isTrackableAnchorNode(node.type))))
        .map((node) => buildAnchorAddress(node))
        .filter((address): address is string => Boolean(address))
    )
  );
}

export function getRouteFloors(path: string[], graph: GraphSnapshot = createGraphSnapshot()) {
  return Array.from(new Set(path.map((nodeId) => graph.nodesById[nodeId]?.floorId).filter(Boolean))) as FloorId[];
}

export function getFloorNodes(floorId: FloorId, graphNodes: EvacNode[] = NODES) {
  return graphNodes.filter((node) => node.floorId === floorId);
}

export function getFloorEdges(floorId: FloorId, graphNodes: EvacNode[] = NODES, graphEdges: EvacEdge[] = EDGES) {
  const graph = createGraphSnapshot(graphNodes, graphEdges);
  return graph.edges.filter((edge) => {
    const from = graph.nodesById[edge.from];
    const to = graph.nodesById[edge.to];
    return from?.floorId === floorId && to?.floorId === floorId;
  });
}

export function getCameraById(cameraId: string) {
  return CAMERAS.find((camera) => camera.id === cameraId) || null;
}

export function getTrackedOccupantNodeId(
  occupant: SimOccupant,
  graph: GraphSnapshot = createGraphSnapshot()
) {
  const signalNodeId = occupant.lastBeaconSignal?.nodeId;
  if (signalNodeId && graph.nodesById[signalNodeId]) {
    return signalNodeId;
  }

  return occupant.currentNodeId;
}

export function getTrackedOccupantNode(
  occupant: SimOccupant,
  graph: GraphSnapshot = createGraphSnapshot()
) {
  return graph.nodesById[getTrackedOccupantNodeId(occupant, graph)] ?? null;
}

export function getOccupantRoute(occupant: SimOccupant, state: SimulationState, graph: GraphSnapshot = createGraphSnapshot(state.graphNodes, state.graphEdges)) {
  const incidentActive = state.simulationRunning || state.incidentMode !== "normal" || state.activeHazardNodeIds.length > 0 || state.cameraDetections.length > 0;

  if (occupant.role === "staff" && occupant.targetNodeId) {
    return findResponsePath(occupant.currentNodeId, occupant.targetNodeId, state, graph);
  }
  if ((occupant.role === "guest" || occupant.role === "staff") && !incidentActive) {
    if (occupant.targetNodeId && occupant.targetNodeId !== occupant.currentNodeId) {
      return findShortestPath(occupant.currentNodeId, [occupant.targetNodeId], state, undefined, graph);
    }
    return null;
  }
  return findSafeRefugePath(occupant.currentNodeId, state, graph);
}

// --- Tracking Simulator Outcomes ---

export function createTrackingEvent(
  occupant: SimOccupant,
  nodeId: string,
  floorId: FloorId,
  kind: TrackingEvent["kind"],
  source: TrackingEvent["source"],
  message: string
): TrackingEvent {
  return {
    id: `${occupant.id}-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occupantId: occupant.id,
    occupantName: occupant.name,
    role: occupant.role,
    nodeId,
    floorId,
    kind,
    source,
    message,
    createdAt: new Date().toISOString(),
  };
}

export function describeTrackingTransition(
  occupant: SimOccupant,
  fromNode: EvacNode,
  toNode: EvacNode
): TrackingEvent | null {
  if (toNode.isRefuge) {
    return createTrackingEvent(
      occupant,
      toNode.id,
      toNode.floorId,
      "exit_reached",
      "hybrid",
      `${occupant.name} cleared ${fromNode.label} and reached ${toNode.label}. Outdoor refuge position confirmed from the exit handoff.`
    );
  }

  if (toNode.isExit) {
    return createTrackingEvent(
      occupant,
      toNode.id,
      toNode.floorId,
      "exit_reached",
      "hybrid",
      `${occupant.name} reached ${toNode.label}. Final exit confirmation came from the door anchor and corridor beacon handoff.`
    );
  }

  if (fromNode.floorId !== toNode.floorId) {
    const direction = getFloorNumber(toNode.floorId) < getFloorNumber(fromNode.floorId) ? "descent" : "ascent";
    return createTrackingEvent(
      occupant,
      toNode.id,
      toNode.floorId,
      "floor_change",
      "hybrid",
      `Floor change confirmed ${getFloorNumber(fromNode.floorId)} -> ${getFloorNumber(toNode.floorId)} via ${toNode.label}. Stairwell beacon handoff and barometer ${direction} trend matched.`
    );
  }

  if (toNode.type === "stair") {
    return createTrackingEvent(
      occupant,
      toNode.id,
      toNode.floorId,
      "stair_entry",
      "hybrid",
      `${occupant.name} entered ${toNode.label}. Stairwell beacon lock and walking-motion pattern confirm the vertical route.`
    );
  }

  if (toNode.type === "beacon") {
    const beaconLabel = toNode.beaconIndex ? `Beacon ${toNode.beaconIndex}` : toNode.label;
    return createTrackingEvent(
      occupant,
      toNode.id,
      toNode.floorId,
      "beacon_lock",
      "beacon",
      `${beaconLabel} locked in ${toNode.zoneId}. Corridor position refreshed for ${occupant.name}.`
    );
  }

  return null;
}

export function describeRouteLock(
  occupant: SimOccupant,
  route: string[],
  graph: GraphSnapshot = createGraphSnapshot()
): TrackingEvent | null {
  if (route.length < 2) {
    return null;
  }

  const currentNode = graph.nodesById[route[0]];
  const nextNode = graph.nodesById[route[1]];
  const destinationNode = graph.nodesById[route[route.length - 1]];
  if (!currentNode || !nextNode || !destinationNode) {
    return null;
  }

  return createTrackingEvent(
    occupant,
    currentNode.id,
    currentNode.floorId,
    occupant.lastRouteSignature ? "reroute" : "route_locked",
    "routing",
    occupant.lastRouteSignature
      ? `Route updated from ${currentNode.label}. Proceed toward ${nextNode.label} and continue to ${destinationNode.label}.`
      : `Safe route locked from ${currentNode.label}. Head to ${nextNode.label} for evacuation toward ${destinationNode.label}.`
  );
}

export function getTrackingStatus(
  occupant: SimOccupant,
  state: SimulationState,
  graph: GraphSnapshot = createGraphSnapshot(state.graphNodes, state.graphEdges)
): TrackingStatus | null {
  const currentNode = getTrackedOccupantNode(occupant, graph);
  if (!currentNode) {
    return null;
  }

  const route = getOccupantRoute(occupant, state, graph) ?? [];
  const nextNode = route.length > 1 ? graph.nodesById[route[1]] : null;
  const currentFloorLabel = FLOORS.find((floor) => floor.id === currentNode.floorId)?.label ?? currentNode.floorId;
  const activeAnchor = occupant.lastBeaconSignal;
  const virtualMode = activeAnchor?.kind === "virtual_anchor" || isVirtualBeaconMode();

  const stairTrackingLabel = virtualMode
    ? "Stairwell anchor + floor-change fusion"
    : "Stairwell beacon + barometer fusion";
  const corridorTrackingLabel = virtualMode
    ? "Corridor anchors guiding to stair core"
    : "Corridor beacons guiding to stair core";
  const lockTrackingLabel = virtualMode ? "Virtual corridor anchor lock" : "Corridor beacon lock";
  const lockEvidenceLabel = activeAnchor?.address ?? currentNode.label;

  if (currentNode.type === "stair" && nextNode && nextNode.floorId !== currentNode.floorId) {
    return {
      currentNodeLabel: currentNode.label,
      currentFloorLabel,
      nextInstruction: `Continue through ${currentNode.label} to floor ${getFloorNumber(nextNode.floorId)}.`,
      trackingMode: stairTrackingLabel,
      confidence: 0.96,
      evidence: [
        virtualMode ? `Landing anchor locked at ${currentNode.label}` : `Landing beacon locked at ${currentNode.label}`,
        `Altitude trend indicates movement from floor ${getFloorNumber(currentNode.floorId)} to floor ${getFloorNumber(nextNode.floorId)}`,
        "Route engine confirms this is the active vertical connector",
      ],
    };
  }

  if (nextNode?.type === "stair") {
    return {
      currentNodeLabel: currentNode.label,
      currentFloorLabel,
      nextInstruction: `Proceed to ${nextNode.label} and prepare to descend.`,
      trackingMode: corridorTrackingLabel,
      confidence: 0.89,
      evidence: [
        virtualMode ? `Virtual corridor anchor locked near ${currentNode.label}` : `Corridor anchor locked near ${currentNode.label}`,
        virtualMode ? "Anchor handoff sequence shows movement toward stair core" : "Beacon sequence shows movement toward stair core",
        "Next step matched against active evacuation graph",
      ],
    };
  }

  if (currentNode.type === "beacon" || activeAnchor) {
    return {
      currentNodeLabel: currentNode.label,
      currentFloorLabel,
      nextInstruction: nextNode ? `Continue toward ${nextNode.label}.` : "Awaiting next checkpoint.",
      trackingMode: lockTrackingLabel,
      confidence: 0.9,
      evidence: [
        virtualMode
          ? `${lockEvidenceLabel} is the latest virtual corridor anchor`
          : `Beacon ${currentNode.beaconIndex ?? "-"} is the latest corridor anchor`,
        virtualMode
          ? "Graph-backed corridor handoff is stable without dedicated BLE hardware"
          : "Neighbor beacon handoff sequence is stable",
        "Route guidance is synced to the current floor graph",
      ],
    };
  }

  if (currentNode.type === "room") {
    return {
      currentNodeLabel: currentNode.label,
      currentFloorLabel,
      nextInstruction: nextNode ? `Exit the room and move toward ${nextNode.label}.` : "Awaiting route lock.",
      trackingMode: "Room anchor start point",
      confidence: 0.78,
      evidence: [
        "Initial position came from the selected room/checkpoint anchor",
        virtualMode ? "Next update will switch to virtual corridor anchor tracking" : "Next update will switch to corridor beacon tracking",
      ],
    };
  }

  return {
    currentNodeLabel: currentNode.label,
    currentFloorLabel,
    nextInstruction: nextNode ? `Proceed toward ${nextNode.label}.` : "No next instruction available.",
    trackingMode: "Hybrid route tracking",
    confidence: 0.84,
    evidence: [
      `Current anchor: ${currentNode.label}`,
      "Route engine is monitoring the next connector",
    ],
  };
}

export const DEFAULT_SIMULATION_STATE: SimulationState = {
  activeHazardNodeIds: [],
  avoidNodeIds: [],
  blockedEdgeIds: [],
  incidentMode: "normal",
  simulationRunning: false,
  graphNodes: [],
  graphEdges: [],
  floorPlanImages: {},
  floorDimensions: DEFAULT_FLOOR_DIMENSIONS,
  occupants: [],
  cameraDetections: [],
  trackingEvents: [],
  selectedGuestId: "",
  selectedStaffId: "",
};
