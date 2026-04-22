"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_FLOOR_DIMENSIONS,
  DEFAULT_SIMULATION_STATE,
  FLOORS,
  autoPlaceBleNodesForFloor,
  autoPlaceCameraNodesForFloor,
  buildFloorEdgesFromNodes,
  calibrateFloorDimensionsByWalk,
  createTrackingEvent,
  createGraphSnapshot,
  describeRouteLock,
  describeTrackingTransition,
  getFloorDimensions,
  getNodeSignalDistanceMeters,
  getOccupantRoute,
  resolveCameraImpact,
  type EvacuationRoster,
  type EvacEdge,
  type EvacNode,
  type FloorDimensions,
  type FloorId,
  type SimulationState,
  type TrackingEvent,
} from "@/lib/evacuation";
import { buildAnchorAddress, isTrackableAnchorNode, isVirtualBeaconMode } from "@/lib/beacon-mode";
import { saveSharedSimulationState, subscribeSharedSimulationState } from "@/lib/evacuation-sync";

const STORAGE_KEY = "aegis-evacuation-sim-upload-first-v2";
const SIMULATION_TICK_MS = 650;
const DEMO_GUEST_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
const DEFAULT_STATE_SERIALIZED = JSON.stringify(DEFAULT_SIMULATION_STATE);

interface UseEvacuationSimulationOptions {
  enableSharedSync?: boolean;
  simulationDriver?: boolean;
  sourceRole?: "admin" | "staff" | "guest" | "system";
}

function getIncidentActive(state: SimulationState) {
  return state.simulationRunning || state.incidentMode !== "normal" || state.activeHazardNodeIds.length > 0 || state.cameraDetections.length > 0;
}

function compactNodePlan(nodeIds: Array<string | null | undefined>) {
  return nodeIds.reduce<string[]>((plan, nodeId) => {
    if (!nodeId) {
      return plan;
    }
    if (plan[plan.length - 1] !== nodeId) {
      plan.push(nodeId);
    }
    return plan;
  }, []);
}

function buildOutAndBackPlan(nodeIds: string[]) {
  if (nodeIds.length <= 2) {
    return nodeIds;
  }
  return [...nodeIds, ...nodeIds.slice(1, -1).reverse()];
}

function selectNearestNode(origin: EvacNode, candidates: EvacNode[]) {
  return candidates.reduce((best, candidate) => {
    if (!best) {
      return candidate;
    }
    return Math.hypot(candidate.x - origin.x, candidate.y - origin.y) < Math.hypot(best.x - origin.x, best.y - origin.y)
      ? candidate
      : best;
  }, null as EvacNode | null);
}

function selectFarthestNode(origin: EvacNode, candidates: EvacNode[]) {
  return candidates.reduce((best, candidate) => {
    if (!best) {
      return candidate;
    }
    return Math.hypot(candidate.x - origin.x, candidate.y - origin.y) > Math.hypot(best.x - origin.x, best.y - origin.y)
      ? candidate
      : best;
  }, null as EvacNode | null);
}

function pickRandomRespawnNode(
  occupantNode: EvacNode | null,
  state: SimulationState,
  graph: ReturnType<typeof createGraphSnapshot>
) {
  const preferredFloorId = occupantNode?.floorId;
  const blockedNodeIds = new Set([
    ...state.activeHazardNodeIds,
    ...state.avoidNodeIds,
    ...state.cameraDetections.flatMap((detection) => detection.blockedNodeIds),
  ]);
  const beaconCandidates = graph.nodes.filter(
    (node) =>
      node.type === "beacon" &&
      !blockedNodeIds.has(node.id) &&
      node.id !== occupantNode?.id &&
      (!preferredFloorId || node.floorId === preferredFloorId)
  );
  const fallbackBeaconCandidates = beaconCandidates.length
    ? beaconCandidates
    : graph.nodes.filter(
        (node) => node.type === "beacon" && !blockedNodeIds.has(node.id) && node.id !== occupantNode?.id
      );
  const candidates = fallbackBeaconCandidates.length
    ? fallbackBeaconCandidates
    : graph.nodes.filter(
        (node) =>
          node.floorId === preferredFloorId &&
          (node.type === "junction" || (node.type === "checkpoint" && !node.isRefuge)) &&
          !blockedNodeIds.has(node.id) &&
          node.id !== occupantNode?.id
      );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

function getHoldTicksForNode() {
  return 0;
}

function buildGuestRoutine(occupantNode: EvacNode | null, startNode: EvacNode | null, graph: ReturnType<typeof createGraphSnapshot>) {
  const homeNode = startNode ?? occupantNode;
  if (!homeNode) {
    return [];
  }

  const sharedAnchors = graph.nodes
    .filter(
      (node) =>
        node.floorId === homeNode.floorId &&
        node.id !== homeNode.id &&
        ((node.type === "checkpoint" && !node.isRefuge) ||
          node.type === "junction" ||
          node.type === "elevator" ||
          node.type === "stair")
    )
    .sort((left, right) => left.x - right.x || left.y - right.y);
  const nearestSharedAnchor = selectNearestNode(homeNode, sharedAnchors);
  const centralAnchor =
    [...sharedAnchors].sort(
      (left, right) =>
        Math.abs(left.x - 50) + Math.abs(left.y - homeNode.y) - (Math.abs(right.x - 50) + Math.abs(right.y - homeNode.y))
    )[0] ?? null;
  const farSharedAnchor = selectFarthestNode(homeNode, sharedAnchors);

  return compactNodePlan([
    homeNode.id,
    nearestSharedAnchor?.id,
    centralAnchor?.id,
    farSharedAnchor?.id,
    homeNode.id,
  ]);
}

function buildStaffPatrolRoutine(occupantNode: EvacNode | null, startNode: EvacNode | null, graph: ReturnType<typeof createGraphSnapshot>) {
  const anchorNode = startNode ?? occupantNode;
  if (!anchorNode) {
    return [];
  }

  const patrolAnchors = graph.nodes
    .filter(
      (node) =>
        node.floorId === anchorNode.floorId &&
        (((node.type === "checkpoint" && !node.isRefuge) ||
          node.type === "junction" ||
          node.type === "stair" ||
          node.type === "elevator" ||
          node.type === "exit"))
    )
    .sort((left, right) => left.x - right.x || left.y - right.y);
  const orderedPatrol = patrolAnchors.map((node) => node.id);
  const outAndBackPatrol = buildOutAndBackPlan(orderedPatrol);

  return compactNodePlan([anchorNode.id, ...outAndBackPatrol, anchorNode.id]);
}

function chooseNextRoutineTarget(occupant: SimulationState["occupants"][number], routineNodeIds: string[]) {
  if (routineNodeIds.length === 0) {
    return { targetNodeId: undefined, routineCursor: undefined };
  }

  const activeCursor =
    occupant.routineCursor !== undefined && routineNodeIds[occupant.routineCursor] === occupant.targetNodeId
      ? occupant.routineCursor
      : occupant.targetNodeId
        ? routineNodeIds.findIndex((nodeId) => nodeId === occupant.targetNodeId)
        : routineNodeIds.findIndex((nodeId) => nodeId === occupant.currentNodeId);
  let nextCursor = activeCursor >= 0 ? (activeCursor + 1) % routineNodeIds.length : 0;
  if (routineNodeIds.length > 1 && routineNodeIds[nextCursor] === occupant.currentNodeId) {
    nextCursor = (nextCursor + 1) % routineNodeIds.length;
  }

  return {
    targetNodeId: routineNodeIds[nextCursor],
    routineCursor: nextCursor,
  };
}

function chooseStaffResponseTarget(state: SimulationState, occupantNode: EvacNode | null, graph: ReturnType<typeof createGraphSnapshot>) {
  if (!occupantNode) {
    return undefined;
  }

  const impactedIds = Array.from(
    new Set([...state.activeHazardNodeIds, ...state.cameraDetections.flatMap((detection) => detection.triggeredNodeIds)])
  );
  const impactedNodes = impactedIds.map((nodeId) => graph.nodesById[nodeId]).filter(Boolean);
  const impactedFloorIds = new Set(impactedNodes.map((node) => node.floorId));
  const candidateNodes = graph.nodes.filter(
    (node) =>
      !state.activeHazardNodeIds.includes(node.id) &&
      !state.avoidNodeIds.includes(node.id) &&
      (node.type === "checkpoint" || node.type === "junction" || node.type === "stair" || node.type === "elevator")
  );

  const prioritized = candidateNodes
    .filter((node) => impactedFloorIds.size === 0 || impactedFloorIds.has(node.floorId))
    .sort((left, right) => Math.hypot(left.x - occupantNode.x, left.y - occupantNode.y) - Math.hypot(right.x - occupantNode.x, right.y - occupantNode.y));

  return prioritized[0]?.id ?? candidateNodes[0]?.id;
}

function pickAutoCameraScenario(state: SimulationState, graph: ReturnType<typeof createGraphSnapshot>) {
  if (getIncidentActive(state) || state.cameraDetections.length >= 2) {
    return null;
  }

  const cameraNodes = graph.nodes.filter((node) => node.type === "camera" && node.cameraId);
  const occupantNodeIds = new Set(state.occupants.map((occupant) => occupant.currentNodeId));
  const candidates = cameraNodes
    .map((cameraNode) => {
      const coverage =
        cameraNode.coverageNodeIds?.length
          ? cameraNode.coverageNodeIds
          : graph.nodes
              .filter((node) => node.floorId === cameraNode.floorId && node.type === "beacon")
              .sort(
                (left, right) =>
                  Math.hypot(left.x - cameraNode.x, left.y - cameraNode.y) -
                  Math.hypot(right.x - cameraNode.x, right.y - cameraNode.y)
              )
              .slice(0, 3)
              .map((node) => node.id);
      const occupiedCoverage = coverage.filter((nodeId) => occupantNodeIds.has(nodeId)).length;
      const sameFloorOccupants = state.occupants.filter(
        (occupant) => graph.nodesById[occupant.currentNodeId]?.floorId === cameraNode.floorId
      ).length;
      return {
        cameraNode,
        occupiedCoverage,
        sameFloorOccupants,
        score: occupiedCoverage * 5 + sameFloorOccupants * 2 + Math.random(),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  const selected = candidates[0]?.cameraNode;
  if (!selected) {
    return null;
  }

  if (Math.random() < 0.72) {
    return null;
  }

  return {
    cameraId: selected.cameraId!,
    hazardType: Math.random() > 0.8 ? "fire" : Math.random() > 0.55 ? "obstruction" : "smoke",
    confidence: Number((0.84 + Math.random() * 0.13).toFixed(2)),
    frameCount: 3 + Math.floor(Math.random() * 3),
  } as const;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function extractRoomNumber(label?: string | null) {
  if (!label) {
    return null;
  }
  const match = label.match(/(\d{3,4}[A-Z]?)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function buildCommsChannelId(role: "guest" | "staff" | "admin", seed: string) {
  const safeSeed = slugify(seed) || `${role}-bridge`;
  return `channel-${role}-${safeSeed}`;
}

function createRosterOccupantsForFloor(floorId: FloorId, floorNodes: EvacNode[], roster?: EvacuationRoster) {
  const roomNodes = floorNodes.filter((node) => node.type === "room");
  const checkpointNodes = floorNodes.filter((node) => node.type === "checkpoint" && !node.isRefuge);
  const connectorNodes = floorNodes.filter(
    (node) =>
      node.type === "stair" ||
      node.type === "elevator" ||
      node.type === "exit" ||
      node.type === "beacon" ||
      (node.type === "checkpoint" && !node.isRefuge)
  );

  if (connectorNodes.length === 0) {
    return [] as SimulationState["occupants"];
  }

  const roomByNumber = new Map(
    roomNodes
      .map((node) => [extractRoomNumber(node.label), node] as const)
      .filter((entry): entry is [string, EvacNode] => Boolean(entry[0] && entry[1]))
  );

  const guests = (roster?.guests ?? [])
    .map((guest, index) => {
      const roomNumber = guest.roomNumber?.toUpperCase() ?? null;
      const startNode =
        (roomNumber ? roomByNumber.get(roomNumber) : null) ??
        roomNodes[index % Math.max(roomNodes.length, 1)] ??
        checkpointNodes[index % Math.max(checkpointNodes.length, 1)] ??
        connectorNodes[index % connectorNodes.length];
      const targetNode =
        checkpointNodes[index % Math.max(checkpointNodes.length, 1)] ??
        connectorNodes[(index + 1) % connectorNodes.length] ??
        startNode;

      return {
        id: `guest-${slugify(guest.id || guest.name || String(index + 1))}`,
        userId: guest.id,
        name: guest.name || `Guest ${index + 1}`,
        role: "guest" as const,
        roomNumber,
        commsChannelId: buildCommsChannelId("guest", guest.id || roomNumber || guest.name || String(index + 1)),
        startNodeId: startNode.id,
        currentNodeId: startNode.id,
        targetNodeId: targetNode.id,
        holdTicksRemaining: 0,
        simulationMode: "guest_wander" as const,
      };
    })
    .filter((occupant) => Boolean(occupant.startNodeId));

  const staff = (roster?.staff ?? []).map((member, index) => {
    const startNode = connectorNodes[index % connectorNodes.length] ?? roomNodes[0];
    const targetNode =
      checkpointNodes[index % Math.max(checkpointNodes.length, 1)] ??
      roomNodes[index % Math.max(roomNodes.length, 1)] ??
      connectorNodes[(index + 1) % connectorNodes.length] ??
      startNode;

    return {
      id: `staff-${slugify(member.id || member.employeeId || member.name || String(index + 1))}`,
      userId: member.id,
      name: member.name || `Staff ${index + 1}`,
      role: "staff" as const,
      department: member.department ?? null,
      staffRole: member.role ?? null,
      commsChannelId: buildCommsChannelId("staff", member.id || member.employeeId || member.name || String(index + 1)),
      startNodeId: startNode.id,
      currentNodeId: startNode.id,
      targetNodeId: targetNode.id,
      assignment: member.department
        ? `Monitor ${member.department} response path on ${floorId.replace("_", " ")}`
        : `Support evacuation on ${floorId.replace("_", " ")}`,
      holdTicksRemaining: 0,
      simulationMode: "staff_patrol" as const,
    };
  });

  return [...guests, ...staff];
}

function estimateSignalConfidence(distanceMeters: number) {
  if (distanceMeters <= 1.5) {
    return 0.98;
  }
  if (distanceMeters <= 3) {
    return 0.94;
  }
  if (distanceMeters <= 6) {
    return 0.88;
  }
  if (distanceMeters <= 10) {
    return 0.78;
  }
  return 0.64;
}

function estimateBleRssi(distanceMeters: number) {
  const boundedDistance = Math.max(0.75, distanceMeters);
  const jitter = ((Math.round(boundedDistance * 10) % 5) - 2) * 1.25;
  return Math.round(-46 - 18 * Math.log10(boundedDistance) + jitter);
}

function buildSimulatedBeaconSignal(
  occupantNode: EvacNode | null,
  state: SimulationState,
  graph: ReturnType<typeof createGraphSnapshot>
) {
  if (!occupantNode) {
    return null;
  }

  const floorDimensions = getFloorDimensions(state, occupantNode.floorId);
  const virtualMode = isVirtualBeaconMode();
  const candidateAnchors = graph.nodes
    .filter(
      (node) =>
        node.floorId === occupantNode.floorId &&
        isTrackableAnchorNode(node.type) &&
        (node.type === "beacon" || node.id !== occupantNode.id)
    )
    .map((anchor) => {
      const distanceMeters = getNodeSignalDistanceMeters(occupantNode, anchor, floorDimensions);
      return {
        anchor,
        distanceMeters,
      };
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  const bestCandidate = candidateAnchors[0];
  if (!bestCandidate) {
    return null;
  }

  const signalKind: "beacon" | "virtual_anchor" =
    !virtualMode && bestCandidate.anchor.type === "beacon" && bestCandidate.anchor.bleAddress
      ? "beacon"
      : "virtual_anchor";
  const baseConfidence = estimateSignalConfidence(bestCandidate.distanceMeters);
  const confidence =
    signalKind === "virtual_anchor"
      ? Math.max(0.68, Number((baseConfidence - 0.05).toFixed(2)))
      : Number(baseConfidence.toFixed(2));

  return {
    address: buildAnchorAddress(bestCandidate.anchor),
    nodeId: bestCandidate.anchor.id,
    rssi: estimateBleRssi(bestCandidate.distanceMeters),
    confidence,
    distanceMeters: Number(bestCandidate.distanceMeters.toFixed(1)),
    createdAt: new Date().toISOString(),
    kind: signalKind,
  };
}

function applyLiveTrackingToOccupant(
  occupant: SimulationState["occupants"][number],
  state: SimulationState,
  graph: ReturnType<typeof createGraphSnapshot>,
  nextEvents: TrackingEvent[]
) {
  const currentNode = graph.nodesById[occupant.currentNodeId] ?? null;
  const simulatedSignal = buildSimulatedBeaconSignal(currentNode, state, graph);
  if (
    currentNode &&
    simulatedSignal &&
    occupant.lastBeaconSignal?.nodeId !== simulatedSignal.nodeId &&
    currentNode.type !== "beacon"
  ) {
    const virtualAnchorLock = simulatedSignal.kind === "virtual_anchor";
    nextEvents.push(
      createTrackingEvent(
        occupant,
        simulatedSignal.nodeId,
        currentNode.floorId,
        "beacon_lock",
        virtualAnchorLock ? "hybrid" : "beacon",
        virtualAnchorLock
          ? `${simulatedSignal.address} virtual anchor placed ${occupant.name} near ${currentNode.label} at ${simulatedSignal.rssi} dBm.`
          : `${simulatedSignal.address} simulated lock placed ${occupant.name} near ${currentNode.label} at ${simulatedSignal.rssi} dBm.`
      )
    );
  }

  return {
    ...occupant,
    lastSeenAt: new Date().toISOString(),
    lastKnownFloorId: currentNode?.floorId ?? occupant.lastKnownFloorId,
    trackingConfidence: simulatedSignal?.confidence ?? occupant.trackingConfidence ?? 0.72,
    lastSignalSource:
      simulatedSignal?.kind === "virtual_anchor"
        ? "hybrid"
        : simulatedSignal
          ? "simulated_ble"
          : occupant.lastSignalSource ?? "routing",
    lastBeaconSignal: simulatedSignal ?? occupant.lastBeaconSignal ?? null,
  };
}

function buildManualTrackingSignal(node: EvacNode) {
  if (!isTrackableAnchorNode(node.type)) {
    return null;
  }

  const virtualMode = isVirtualBeaconMode();
  const signalKind: "beacon" | "virtual_anchor" =
    !virtualMode && node.type === "beacon" && node.bleAddress ? "beacon" : "virtual_anchor";

  return {
    address: buildAnchorAddress(node),
    nodeId: node.id,
    rssi: estimateBleRssi(0.8),
    confidence: signalKind === "beacon" ? 0.99 : 0.9,
    distanceMeters: 0.8,
    createdAt: new Date().toISOString(),
    kind: signalKind,
  };
}

function normalizeState(candidate: Partial<SimulationState>): SimulationState {
  const graphNodes = (candidate.graphNodes ?? DEFAULT_SIMULATION_STATE.graphNodes).filter((node) =>
    Boolean(node.id)
  );
  const graphEdges = (candidate.graphEdges ?? DEFAULT_SIMULATION_STATE.graphEdges).filter((edge) =>
    Boolean(edge.id && edge.from && edge.to)
  );
  const graph = createGraphSnapshot(graphNodes, graphEdges);
  const defaultOccupants = Object.fromEntries(
    DEFAULT_SIMULATION_STATE.occupants.map((occupant) => [occupant.id, occupant])
  );
  const firstGraphNodeId = graph.nodes[0]?.id ?? "";

  const occupants = (candidate.occupants ?? DEFAULT_SIMULATION_STATE.occupants).map((occupant) => {
    const fallback = defaultOccupants[occupant.id] ?? occupant;
    const startNodeId = graph.nodesById[occupant.startNodeId]
      ? occupant.startNodeId
      : graph.nodesById[fallback.startNodeId]
        ? fallback.startNodeId
        : firstGraphNodeId;
    const currentNodeId = graph.nodesById[occupant.currentNodeId] ? occupant.currentNodeId : startNodeId;
    const targetNodeId =
      occupant.targetNodeId && graph.nodesById[occupant.targetNodeId]
        ? occupant.targetNodeId
        : fallback.targetNodeId && graph.nodesById[fallback.targetNodeId]
          ? fallback.targetNodeId
          : undefined;
    const routineNodeIds = (occupant.routineNodeIds ?? fallback.routineNodeIds ?? []).filter(
      (nodeId) => Boolean(graph.nodesById[nodeId])
    );
    const routineCursorCandidate = occupant.routineCursor ?? fallback.routineCursor;
    const routineCursor =
      Number.isInteger(routineCursorCandidate) &&
      routineCursorCandidate! >= 0 &&
      routineCursorCandidate! < routineNodeIds.length
        ? routineCursorCandidate
        : undefined;

    return {
      ...fallback,
      ...occupant,
      startNodeId,
      currentNodeId,
      targetNodeId,
      routineNodeIds: routineNodeIds.length > 0 ? routineNodeIds : undefined,
      routineCursor,
    };
  });

  const guestIds = new Set(occupants.filter((occupant) => occupant.role === "guest").map((occupant) => occupant.id));
  const staffIds = new Set(occupants.filter((occupant) => occupant.role === "staff").map((occupant) => occupant.id));

  return {
    ...DEFAULT_SIMULATION_STATE,
    ...candidate,
    graphNodes,
    graphEdges,
    floorPlanImages: candidate.floorPlanImages ?? DEFAULT_SIMULATION_STATE.floorPlanImages,
    floorDimensions: {
      ...DEFAULT_FLOOR_DIMENSIONS,
      ...(candidate.floorDimensions ?? DEFAULT_SIMULATION_STATE.floorDimensions),
    },
    occupants,
    activeHazardNodeIds: (candidate.activeHazardNodeIds ?? DEFAULT_SIMULATION_STATE.activeHazardNodeIds).filter((nodeId) =>
      Boolean(graph.nodesById[nodeId])
    ),
    avoidNodeIds: (candidate.avoidNodeIds ?? DEFAULT_SIMULATION_STATE.avoidNodeIds).filter((nodeId) =>
      Boolean(graph.nodesById[nodeId])
    ),
    blockedEdgeIds: (candidate.blockedEdgeIds ?? DEFAULT_SIMULATION_STATE.blockedEdgeIds).filter((edgeId) =>
      graph.edges.some((edge) => edge.id === edgeId)
    ),
    cameraDetections: (candidate.cameraDetections ?? DEFAULT_SIMULATION_STATE.cameraDetections).map(
      (detection) => ({
        ...detection,
        zoneId: detection.zoneId ?? "UNKNOWN",
        hazardType: detection.hazardType ?? "smoke",
        confidence: detection.confidence ?? 0.85,
        frameCount: detection.frameCount ?? 1,
        blockedNodeIds: detection.blockedNodeIds ?? detection.triggeredNodeIds ?? [],
        avoidNodeIds: detection.avoidNodeIds ?? [],
        blockedEdgeIds: detection.blockedEdgeIds ?? [],
      })
    ),
    trackingEvents: candidate.trackingEvents ?? DEFAULT_SIMULATION_STATE.trackingEvents,
    selectedGuestId: guestIds.has(candidate.selectedGuestId ?? "")
      ? (candidate.selectedGuestId as string)
      : occupants.find((occupant) => occupant.role === "guest")?.id ?? DEFAULT_SIMULATION_STATE.selectedGuestId,
    selectedStaffId: staffIds.has(candidate.selectedStaffId ?? "")
      ? (candidate.selectedStaffId as string)
      : occupants.find((occupant) => occupant.role === "staff")?.id ?? DEFAULT_SIMULATION_STATE.selectedStaffId,
  };
}

function mergeFloorGraphState(current: SimulationState, floorId: FloorId, floorNodes: EvacNode[], floorEdges: EvacEdge[]) {
  const currentGraph = createGraphSnapshot(current.graphNodes, current.graphEdges);
  const graphNodes = [...current.graphNodes.filter((node) => node.floorId !== floorId), ...floorNodes];
  const baseEdges = current.graphEdges.filter((edge) => {
    const from = currentGraph.nodesById[edge.from];
    const to = currentGraph.nodesById[edge.to];
    return from?.floorId !== floorId && to?.floorId !== floorId;
  });

  const nextGraph = createGraphSnapshot(graphNodes, []);
  const linkedEdges: EvacEdge[] = [];
  const floorIndex = FLOORS.findIndex((floor) => floor.id === floorId);
  const previousFloorId = floorIndex > 0 ? FLOORS[floorIndex - 1]?.id : null;
  const nextFloorId = floorIndex >= 0 && floorIndex < FLOORS.length - 1 ? FLOORS[floorIndex + 1]?.id : null;
  const currentStairs = floorNodes.filter((node) => node.type === "stair").sort((a, b) => a.x - b.x);
  const currentElevators = floorNodes.filter((node) => node.type === "elevator").sort((a, b) => a.x - b.x);

  [previousFloorId, nextFloorId].forEach((adjacentFloorId) => {
    if (!adjacentFloorId) {
      return;
    }

    const adjacentNodes = graphNodes.filter((node) => node.floorId === adjacentFloorId);
    const adjacentStairs = adjacentNodes.filter((node) => node.type === "stair").sort((a, b) => a.x - b.x);
    const adjacentElevators = adjacentNodes.filter((node) => node.type === "elevator").sort((a, b) => a.x - b.x);

    currentStairs.forEach((stairNode, index) => {
      const adjacent = adjacentStairs[index];
      if (!adjacent) {
        return;
      }
      linkedEdges.push({
        id: `${stairNode.id}_${adjacent.id}_stairs`,
        from: stairNode.id,
        to: adjacent.id,
        kind: "stairs",
      });
    });

    currentElevators.forEach((liftNode, index) => {
      const adjacent = adjacentElevators[index];
      if (!adjacent) {
        return;
      }
      linkedEdges.push({
        id: `${liftNode.id}_${adjacent.id}_lift`,
        from: liftNode.id,
        to: adjacent.id,
        kind: "elevator",
      });
    });
  });

  return {
    graphNodes,
    graphEdges: [...baseEdges, ...floorEdges, ...linkedEdges].filter(
      (edge, index, all) =>
        nextGraph.nodesById[edge.from] &&
        nextGraph.nodesById[edge.to] &&
        all.findIndex((candidate) => candidate.id === edge.id) === index
    ),
  };
}

function createDemoOccupantsForFloor(floorId: FloorId, floorNodes: EvacNode[], roster?: EvacuationRoster) {
  const roomAnchors = floorNodes
    .filter((node) => node.type === "room" || (node.type === "checkpoint" && !node.isRefuge))
    .sort((left, right) => right.x - left.x || right.y - left.y);
  const connectorAnchors = floorNodes
    .filter(
      (node) =>
        node.type === "stair" ||
        node.type === "elevator" ||
        node.type === "exit" ||
        (node.type === "checkpoint" && !node.isRefuge) ||
        node.type === "beacon"
    )
    .sort((left, right) => left.x - right.x || left.y - right.y);
  const guestAnchors = [...roomAnchors, ...connectorAnchors].reduce<EvacNode[]>((unique, node) => {
    if (unique.some((entry) => entry.id === node.id)) {
      return unique;
    }
    unique.push(node);
    return unique;
  }, []);
  const staffStart = connectorAnchors[0] ?? roomAnchors[0];
  const staffTarget = roomAnchors[0] ?? connectorAnchors[connectorAnchors.length - 1];

  if (guestAnchors.length === 0 || !staffStart) {
    return [];
  }

  const rosterOccupants = createRosterOccupantsForFloor(floorId, floorNodes, roster);
  if (rosterOccupants.length > 0) {
    return rosterOccupants;
  }

  const guestCount = Math.min(DEMO_GUEST_NAMES.length, Math.max(2, Math.min(guestAnchors.length, 5)));
  const guests = guestAnchors.slice(0, guestCount).map((anchor, index) => {
    const nextAnchor = guestAnchors[(index + 1) % guestCount] ?? connectorAnchors[0] ?? anchor;
    const guestName = DEMO_GUEST_NAMES[index] ?? `Guest ${index + 1}`;
    const roomNumber = extractRoomNumber(anchor.label);

    return {
      id: `guest-${floorId}-${guestName.toLowerCase()}`,
      name: `Guest ${guestName}`,
      role: "guest" as const,
      roomNumber,
      commsChannelId: buildCommsChannelId("guest", `${floorId}-${guestName}-${roomNumber ?? index + 1}`),
      startNodeId: anchor.id,
      currentNodeId: anchor.id,
      targetNodeId: nextAnchor.id,
      holdTicksRemaining: 0,
      simulationMode: "guest_wander" as const,
    };
  });

  return [
    ...guests,
    {
      id: `staff-${floorId}-lead`,
      name: `Response Lead ${floorId.split("_")[1]}`,
      role: "staff" as const,
      commsChannelId: buildCommsChannelId("staff", `${floorId}-lead`),
      startNodeId: staffStart.id,
      currentNodeId: staffStart.id,
      targetNodeId: staffTarget?.id,
      assignment: `Support evacuation on ${floorId.replace("_", " ")}`,
      holdTicksRemaining: 0,
      simulationMode: "staff_patrol" as const,
    },
  ];
}

function ensureDemoAnchorsForFloor(floorId: FloorId, floorNodes: EvacNode[]) {
  const beacons = floorNodes.filter((node) => node.type === "beacon").sort((left, right) => left.x - right.x);
  const leftBeacon = beacons[0];
  const rightBeacon = beacons[beacons.length - 1];
  const middleBeacon = beacons[Math.floor(beacons.length / 2)];
  const nextNodes = [...floorNodes];

  if (!nextNodes.some((node) => node.isExit || node.type === "exit")) {
    if (leftBeacon) {
      nextNodes.push({
        id: `${floorId}_demo_exit_west`,
        label: "EXIT WEST",
        floorId,
        x: Math.max(4, leftBeacon.x - 8),
        y: leftBeacon.y,
        type: "exit",
        zoneId: leftBeacon.zoneId,
        checkpoint: true,
        isExit: true,
      });
    }
    if (rightBeacon && rightBeacon !== leftBeacon) {
      nextNodes.push({
        id: `${floorId}_demo_exit_east`,
        label: "EXIT EAST",
        floorId,
        x: Math.min(96, rightBeacon.x + 8),
        y: rightBeacon.y,
        type: "exit",
        zoneId: rightBeacon.zoneId,
        checkpoint: true,
        isExit: true,
      });
    }
  }

  if (!nextNodes.some((node) => node.type === "checkpoint")) {
    const anchor = middleBeacon ?? leftBeacon ?? rightBeacon;
    if (anchor) {
      nextNodes.push({
        id: `${floorId}_demo_entry`,
        label: "ENTRY POINT",
        floorId,
        x: anchor.x,
        y: Math.max(8, anchor.y - 10),
        type: "checkpoint",
        zoneId: anchor.zoneId,
        checkpoint: true,
      });
    }
  }

  if (!nextNodes.some((node) => node.isRefuge)) {
    const exitNodes = nextNodes.filter((node) => node.floorId === floorId && (node.isExit || node.type === "exit"));
    exitNodes.forEach((exitNode, index) => {
      const upperLabel = exitNode.label.toUpperCase();
      const hintedOffset =
        upperLabel.includes("LEFT") || upperLabel.includes("WEST")
          ? { dx: -8, dy: 0 }
          : upperLabel.includes("RIGHT") || upperLabel.includes("EAST")
            ? { dx: 8, dy: 0 }
            : upperLabel.includes("TOP") || upperLabel.includes("NORTH")
              ? { dx: 0, dy: -8 }
              : upperLabel.includes("BOTTOM") || upperLabel.includes("SOUTH")
                ? { dx: 0, dy: 8 }
                : null;
      const outwardOffset = hintedOffset ?? [
        { dx: -8, dy: 0, distanceToBorder: exitNode.x },
        { dx: 8, dy: 0, distanceToBorder: 100 - exitNode.x },
        { dx: 0, dy: -8, distanceToBorder: exitNode.y },
        { dx: 0, dy: 8, distanceToBorder: 100 - exitNode.y },
      ].sort((left, right) => left.distanceToBorder - right.distanceToBorder)[0] ?? { dx: 8, dy: 0 };
      const refugeSuffix = exitNode.label.replace(/^EXIT\s*/i, "").trim().replace(/[()]/g, "").trim();

      nextNodes.push({
        id: `${floorId}_demo_refuge_${index + 1}`,
        label: refugeSuffix ? `ASSEMBLY ${refugeSuffix}` : `ASSEMBLY ${index + 1}`,
        floorId,
        x: Math.max(4, Math.min(96, exitNode.x + outwardOffset.dx)),
        y: Math.max(4, Math.min(96, exitNode.y + outwardOffset.dy)),
        type: "checkpoint",
        zoneId: exitNode.zoneId,
        checkpoint: true,
        isRefuge: true,
      });
    });
  }

  return nextNodes;
}

function readState(): SimulationState {
  if (typeof window === "undefined") {
    return DEFAULT_SIMULATION_STATE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return DEFAULT_SIMULATION_STATE;
  }

  try {
    return normalizeState(JSON.parse(stored) as Partial<SimulationState>);
  } catch (error) {
    console.error("Failed to parse evacuation simulation state:", error);
    return DEFAULT_SIMULATION_STATE;
  }
}

export function useEvacuationSimulation(options: UseEvacuationSimulationOptions = {}) {
  const enableSharedSync = options.enableSharedSync ?? true;
  const simulationDriver = options.simulationDriver ?? false;
  const sourceRole = options.sourceRole ?? "system";
  const [state, setState] = useState<SimulationState>(DEFAULT_SIMULATION_STATE);
  const [sharedSyncReady, setSharedSyncReady] = useState<boolean>(!enableSharedSync);
  const hydratedRef = useRef(false);
  const lastAppliedRemoteRef = useRef<string | null>(null);
  const lastSavedStateRef = useRef<string | null>(null);

  useEffect(() => {
    const initialState = readState();
    hydratedRef.current = true;
    setState(initialState);
    if (!enableSharedSync) {
      setSharedSyncReady(true);
    }
  }, [enableSharedSync]);

  useEffect(() => {
    if (!enableSharedSync) {
      setSharedSyncReady(true);
      return;
    }

    let firstSnapshot = true;
    return subscribeSharedSimulationState({
      onData: (remoteState) => {
        if (remoteState) {
          const normalizedRemoteState = normalizeState(remoteState);
          const serializedRemoteState = JSON.stringify(normalizedRemoteState);
          lastAppliedRemoteRef.current = serializedRemoteState;
          lastSavedStateRef.current = serializedRemoteState;
          setState((current) =>
            JSON.stringify(current) === serializedRemoteState ? current : normalizedRemoteState
          );
        } else if (firstSnapshot) {
          const localState = readState();
          const serializedLocalState = JSON.stringify(localState);
          if (serializedLocalState !== DEFAULT_STATE_SERIALIZED) {
            lastSavedStateRef.current = serializedLocalState;
            void saveSharedSimulationState(localState, { sourceRole }).catch((error) => {
              console.error("Failed to seed shared evacuation state:", error);
              lastSavedStateRef.current = null;
            });
          }
        }

        firstSnapshot = false;
        setSharedSyncReady(true);
      },
      onError: (error) => {
        console.error("Failed to subscribe to shared evacuation state:", error);
        setSharedSyncReady(true);
      },
    });
  }, [enableSharedSync, sourceRole]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydratedRef.current) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!enableSharedSync || !sharedSyncReady || !hydratedRef.current) {
      return;
    }

    const serializedState = JSON.stringify(state);
    if (
      serializedState === lastAppliedRemoteRef.current ||
      serializedState === lastSavedStateRef.current
    ) {
      return;
    }

    lastSavedStateRef.current = serializedState;
    void saveSharedSimulationState(state, { sourceRole }).catch((error) => {
      console.error("Failed to persist shared evacuation state:", error);
      lastSavedStateRef.current = null;
    });
  }, [enableSharedSync, sharedSyncReady, sourceRole, state]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setState(readState());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!simulationDriver || !state.simulationRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setState((current) => {
        const graph = createGraphSnapshot(current.graphNodes, current.graphEdges);
        const nextEvents: TrackingEvent[] = [];
        let workingState = current;
        const autoCameraScenario = pickAutoCameraScenario(workingState, graph);

        if (autoCameraScenario) {
          const impact = resolveCameraImpact(
            autoCameraScenario.cameraId,
            {
              confidence: autoCameraScenario.confidence,
              frameCount: autoCameraScenario.frameCount,
              hazardType: autoCameraScenario.hazardType,
            },
            graph
          );

          if (impact) {
            const cameraOccupant =
              workingState.occupants.find((occupant) => impact.triggeredNodeIds.includes(occupant.currentNodeId)) ??
              workingState.occupants.find(
                (occupant) => graph.nodesById[occupant.currentNodeId]?.floorId === impact.camera.floorId
              ) ??
              workingState.occupants[0];

            if (cameraOccupant) {
              nextEvents.push(
                createTrackingEvent(
                  cameraOccupant,
                  impact.camera.nodeId,
                  impact.camera.floorId,
                  "reroute",
                  "hybrid",
                  `${impact.camera.label} auto-detected ${impact.hazardType}. ${impact.label}.`
                )
              );
            }

            workingState = {
              ...workingState,
              incidentMode: "fire",
              activeHazardNodeIds: Array.from(new Set([...workingState.activeHazardNodeIds, ...(impact.hazardNodeIds ?? impact.blockedNodeIds)])),
              avoidNodeIds: Array.from(new Set([...workingState.avoidNodeIds, ...impact.avoidNodeIds])),
              blockedEdgeIds: Array.from(new Set([...workingState.blockedEdgeIds, ...impact.blockedEdgeIds])),
              cameraDetections: [
                {
                  id: `${impact.camera.id}-${Date.now()}`,
                  cameraId: impact.camera.id,
                  zoneId: impact.zoneId,
                  label: impact.label,
                  hazardType: impact.hazardType,
                  status: impact.status,
                  confidence: impact.confidence,
                  frameCount: impact.frameCount,
                  createdAt: new Date().toISOString(),
                  hazardNodeIds: impact.hazardNodeIds,
                  triggeredNodeIds: impact.triggeredNodeIds,
                  blockedNodeIds: impact.blockedNodeIds,
                  avoidNodeIds: impact.avoidNodeIds,
                  blockedEdgeIds: impact.blockedEdgeIds,
                },
                ...workingState.cameraDetections,
              ].slice(0, 12),
            };
          }
        }

        const incidentActive = getIncidentActive(workingState);
        const occupants = workingState.occupants.map((occupant) => {
          const currentNode = graph.nodesById[occupant.currentNodeId] ?? null;
          let nextOccupant = { ...occupant };
          const startNode = graph.nodesById[nextOccupant.startNodeId] ?? currentNode;

          if (incidentActive) {
            if (occupant.role === "guest") {
              nextOccupant = {
                ...nextOccupant,
                targetNodeId: undefined,
                holdTicksRemaining: 0,
                simulationMode: "guest_evacuating",
              };
            } else if (occupant.role === "staff") {
              const responseTarget = chooseStaffResponseTarget(workingState, currentNode, graph);
              nextOccupant = {
                ...nextOccupant,
                targetNodeId: responseTarget ?? nextOccupant.targetNodeId,
                simulationMode: "staff_response",
              };
              if (responseTarget) {
                nextOccupant.assignment = `Respond to incident near ${graph.nodesById[responseTarget]?.label ?? responseTarget}`;
              }
            }
          } else if (occupant.role === "guest") {
            if (!nextOccupant.targetNodeId || nextOccupant.currentNodeId === nextOccupant.targetNodeId) {
              const routineNodeIds = buildGuestRoutine(currentNode, startNode, graph);
              const nextRoutine = chooseNextRoutineTarget(nextOccupant, routineNodeIds);
              nextOccupant = {
                ...nextOccupant,
                routineNodeIds,
                routineCursor: nextRoutine.routineCursor,
                targetNodeId: nextRoutine.targetNodeId,
                simulationMode: "guest_wander",
              };
            }
          } else if (occupant.role === "staff") {
            if (!nextOccupant.targetNodeId || nextOccupant.currentNodeId === nextOccupant.targetNodeId) {
              const routineNodeIds = buildStaffPatrolRoutine(currentNode, startNode, graph);
              const nextRoutine = chooseNextRoutineTarget(nextOccupant, routineNodeIds);
              nextOccupant = {
                ...nextOccupant,
                routineNodeIds,
                routineCursor: nextRoutine.routineCursor,
                targetNodeId: nextRoutine.targetNodeId,
                simulationMode: "staff_patrol",
                assignment: currentNode ? `Patrolling ${currentNode.floorId.replace("_", " ")} route` : nextOccupant.assignment,
              };
            }
          }

          if ((nextOccupant.holdTicksRemaining ?? 0) > 0) {
            return {
              ...nextOccupant,
              holdTicksRemaining: Math.max(0, (nextOccupant.holdTicksRemaining ?? 0) - 1),
            };
          }

          const route = getOccupantRoute(nextOccupant, workingState, graph);
          const routeSignature = route?.join(">") ?? "";
          if (route && routeSignature && routeSignature !== nextOccupant.lastRouteSignature) {
            const routeEvent = describeRouteLock(nextOccupant, route, graph);
            if (routeEvent) {
              nextEvents.push(routeEvent);
            }
          }
          if (!route || route.length < 2) {
            if (
              incidentActive &&
              nextOccupant.role === "guest" &&
              currentNode &&
              (currentNode.isRefuge || currentNode.isExit)
            ) {
              const respawnNode = pickRandomRespawnNode(currentNode, workingState, graph);
              if (respawnNode) {
                nextEvents.push(
                  createTrackingEvent(
                    nextOccupant,
                    respawnNode.id,
                    respawnNode.floorId,
                    "beacon_lock",
                    "beacon",
                    `${nextOccupant.name} recycled to ${respawnNode.label} for continuous evacuation playback.`
                  )
                );
                return {
                  ...nextOccupant,
                  startNodeId: respawnNode.id,
                  currentNodeId: respawnNode.id,
                  targetNodeId: undefined,
                  routineNodeIds: undefined,
                  routineCursor: undefined,
                  lastRouteSignature: undefined,
                  holdTicksRemaining: 0,
                  simulationMode: "guest_evacuating" as const,
                };
              }
            }

            return {
              ...nextOccupant,
              lastRouteSignature: routeSignature || nextOccupant.lastRouteSignature,
            };
          }

          const fromNode = graph.nodesById[nextOccupant.currentNodeId];
          const toNode = graph.nodesById[route[1]];
          const movementEvent =
            fromNode && toNode ? describeTrackingTransition(nextOccupant, fromNode, toNode) : null;
          if (movementEvent) {
            nextEvents.push(movementEvent);
          }

          return {
            ...nextOccupant,
             currentNodeId: route[1],
             lastRouteSignature: routeSignature,
             holdTicksRemaining: toNode ? getHoldTicksForNode() : 0,
             targetNodeId:
               incidentActive
                 ? nextOccupant.targetNodeId
                : route[1] === nextOccupant.targetNodeId
                  ? undefined
                  : nextOccupant.targetNodeId,
          };
        });

        const trackedOccupants = occupants.map((occupant) =>
          applyLiveTrackingToOccupant(occupant, workingState, graph, nextEvents)
        );

        return normalizeState({
          ...workingState,
          occupants: trackedOccupants,
          trackingEvents: [...nextEvents.reverse(), ...workingState.trackingEvents].slice(0, 80),
        });
      });
    }, SIMULATION_TICK_MS);

    return () => window.clearInterval(timer);
  }, [simulationDriver, state.simulationRunning]);

  const toggleHazardNode = useCallback((nodeId: string) => {
    setState((current) => ({
      ...current,
      activeHazardNodeIds: current.activeHazardNodeIds.includes(nodeId)
        ? current.activeHazardNodeIds.filter((entry) => entry !== nodeId)
        : [...current.activeHazardNodeIds, nodeId],
      avoidNodeIds: current.avoidNodeIds.filter((entry) => entry !== nodeId),
    }));
  }, []);

  const clearHazards = useCallback(() => {
    setState((current) => ({
      ...current,
      activeHazardNodeIds: [],
      avoidNodeIds: [],
      blockedEdgeIds: [],
      cameraDetections: [],
      trackingEvents: [],
      incidentMode: "normal",
    }));
  }, []);

  const setIncidentMode = useCallback((incidentMode: SimulationState["incidentMode"]) => {
    setState((current) => ({ ...current, incidentMode }));
  }, []);

  const moveOccupant = useCallback((occupantId: string, nodeId: string) => {
    setState((current) => {
      const graph = createGraphSnapshot(current.graphNodes, current.graphEdges);
      const currentNode = graph.nodesById[nodeId] ?? null;
      const manualSignal = currentNode ? buildManualTrackingSignal(currentNode) : null;
      return {
        ...current,
        trackingEvents: [
          ...current.occupants.flatMap((occupant) =>
            occupant.id === occupantId && currentNode && manualSignal
              ? [
                  createTrackingEvent(
                    occupant,
                    currentNode.id,
                    currentNode.floorId,
                    "beacon_lock",
                    manualSignal.kind === "virtual_anchor" ? "hybrid" : "beacon",
                    manualSignal.kind === "virtual_anchor"
                      ? `${occupant.name} manually locked to virtual anchor ${manualSignal.address} at ${currentNode.label}.`
                      : `${occupant.name} manually locked to beacon ${manualSignal.address} at ${currentNode.label}.`
                  ),
                ]
              : []
          ),
          ...current.trackingEvents,
        ].slice(0, 80),
        occupants: current.occupants.map((occupant) =>
          occupant.id === occupantId
            ? {
                ...occupant,
                startNodeId: nodeId,
                currentNodeId: nodeId,
                targetNodeId: undefined,
                routineNodeIds: undefined,
                routineCursor: undefined,
                lastRouteSignature: undefined,
                lastSeenAt: new Date().toISOString(),
                lastKnownFloorId: currentNode?.floorId ?? occupant.lastKnownFloorId,
                lastSignalSource: manualSignal?.kind === "virtual_anchor" ? ("hybrid" as const) : ("manual" as const),
                trackingConfidence: manualSignal?.confidence ?? occupant.trackingConfidence,
                lastBeaconSignal: manualSignal ?? occupant.lastBeaconSignal ?? null,
              }
            : occupant
        ),
      };
    });
  }, []);

  const setSelectedGuest = useCallback((selectedGuestId: string) => {
    setState((current) => ({ ...current, selectedGuestId }));
  }, []);

  const setSelectedStaff = useCallback((selectedStaffId: string) => {
    setState((current) => ({ ...current, selectedStaffId }));
  }, []);

  const addGraphNode = useCallback((node: EvacNode) => {
    setState((current) => ({
      ...current,
      graphNodes: current.graphNodes.some((entry) => entry.id === node.id)
        ? current.graphNodes.map((entry) => (entry.id === node.id ? node : entry))
        : [...current.graphNodes, node],
    }));
  }, []);

  const updateGraphNode = useCallback((nodeId: string, patch: Partial<EvacNode>) => {
    setState((current) => ({
      ...current,
      graphNodes: current.graphNodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    }));
  }, []);

  const deleteGraphNode = useCallback((nodeId: string) => {
    setState((current) => ({
      ...current,
      graphNodes: current.graphNodes.filter((node) => node.id !== nodeId),
      graphEdges: current.graphEdges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
      activeHazardNodeIds: current.activeHazardNodeIds.filter((id) => id !== nodeId),
      avoidNodeIds: current.avoidNodeIds.filter((id) => id !== nodeId),
    }));
  }, []);

  const addGraphEdge = useCallback((edge: EvacEdge) => {
    setState((current) => ({
      ...current,
      graphEdges: current.graphEdges.some((entry) => entry.id === edge.id)
        ? current.graphEdges.map((entry) => (entry.id === edge.id ? edge : entry))
        : [...current.graphEdges, edge],
    }));
  }, []);

  const deleteGraphEdge = useCallback((edgeId: string) => {
    setState((current) => ({
      ...current,
      graphEdges: current.graphEdges.filter((edge) => edge.id !== edgeId),
      blockedEdgeIds: current.blockedEdgeIds.filter((entry) => entry !== edgeId),
    }));
  }, []);

  const setFloorPlanImage = useCallback((floorId: FloorId, imageDataUrl: string) => {
    setState((current) => ({
      ...current,
      floorPlanImages: {
        ...current.floorPlanImages,
        [floorId]: imageDataUrl,
      },
    }));
  }, []);

  const clearFloorPlanImage = useCallback((floorId: FloorId) => {
    setState((current) => {
      const nextImages = { ...current.floorPlanImages };
      delete nextImages[floorId];
      return {
        ...current,
        floorPlanImages: nextImages,
      };
    });
  }, []);

  const setFloorDimensions = useCallback((floorId: FloorId, dimensions: FloorDimensions) => {
    setState((current) => ({
      ...current,
      floorDimensions: {
        ...current.floorDimensions,
        [floorId]: dimensions,
      },
    }));
  }, []);

  const calibrateFloorWalk = useCallback(
    (floorId: FloorId, start: { x: number; y: number }, end: { x: number; y: number }, walkedMeters: number) => {
      setState((current) => ({
        ...current,
        floorDimensions: {
          ...current.floorDimensions,
          [floorId]: calibrateFloorDimensionsByWalk(getFloorDimensions(current, floorId), start, end, walkedMeters),
        },
      }));
    },
    []
  );

  const replaceFloorGraph = useCallback((floorId: FloorId, floorNodes: EvacNode[], floorEdges: EvacEdge[]) => {
    setState((current) => {
      const merged = mergeFloorGraphState(current, floorId, floorNodes, floorEdges);
      return normalizeState({
        ...current,
        ...merged,
      });
    });
  }, []);

  const autoConnectFloorByBeacons = useCallback((floorId: FloorId) => {
    setState((current) => {
      const floorNodes = current.graphNodes.filter((node) => node.floorId === floorId);
      const built = buildFloorEdgesFromNodes(floorId, floorNodes);
      const currentGraph = createGraphSnapshot(current.graphNodes, current.graphEdges);
      const graphNodes = [...current.graphNodes.filter((node) => node.floorId !== floorId), ...built.nodes];
      const baseEdges = current.graphEdges.filter((edge) => {
        const from = currentGraph.nodesById[edge.from];
        const to = currentGraph.nodesById[edge.to];
        return from?.floorId !== floorId && to?.floorId !== floorId;
      });
      const nextGraph = createGraphSnapshot(graphNodes, []);
      const linkedEdges: EvacEdge[] = [];
      const floorIndex = FLOORS.findIndex((floor) => floor.id === floorId);
      const previousFloorId = floorIndex > 0 ? FLOORS[floorIndex - 1]?.id : null;
      const nextFloorId = floorIndex >= 0 && floorIndex < FLOORS.length - 1 ? FLOORS[floorIndex + 1]?.id : null;
      const currentStairs = built.nodes.filter((node) => node.type === "stair").sort((a, b) => a.x - b.x);
      const currentElevators = built.nodes.filter((node) => node.type === "elevator").sort((a, b) => a.x - b.x);

      [previousFloorId, nextFloorId].forEach((adjacentFloorId) => {
        if (!adjacentFloorId) {
          return;
        }

        const adjacentNodes = graphNodes.filter((node) => node.floorId === adjacentFloorId);
        const adjacentStairs = adjacentNodes.filter((node) => node.type === "stair").sort((a, b) => a.x - b.x);
        const adjacentElevators = adjacentNodes.filter((node) => node.type === "elevator").sort((a, b) => a.x - b.x);

        currentStairs.forEach((stairNode, index) => {
          const adjacent = adjacentStairs[index];
          if (!adjacent) {
            return;
          }
          linkedEdges.push({
            id: `${stairNode.id}_${adjacent.id}_stairs`,
            from: stairNode.id,
            to: adjacent.id,
            kind: "stairs",
          });
        });

        currentElevators.forEach((liftNode, index) => {
          const adjacent = adjacentElevators[index];
          if (!adjacent) {
            return;
          }
          linkedEdges.push({
            id: `${liftNode.id}_${adjacent.id}_lift`,
            from: liftNode.id,
            to: adjacent.id,
            kind: "elevator",
          });
        });
      });

      return normalizeState({
        ...current,
        graphNodes,
        graphEdges: [...baseEdges, ...built.edges, ...linkedEdges].filter(
          (edge, index, all) =>
            nextGraph.nodesById[edge.from] &&
            nextGraph.nodesById[edge.to] &&
            all.findIndex((candidate) => candidate.id === edge.id) === index
        ),
      });
    });
  }, []);

  const autoPlaceBleNodes = useCallback((floorId: FloorId, spacingMeters = 3) => {
    setState((current) => {
      const floorNodes = current.graphNodes.filter((node) => node.floorId === floorId);
      const floorEdges = current.graphEdges.filter((edge) => {
        const graph = createGraphSnapshot(current.graphNodes, current.graphEdges);
        const from = graph.nodesById[edge.from];
        const to = graph.nodesById[edge.to];
        return from?.floorId === floorId && to?.floorId === floorId;
      });
      const built = autoPlaceBleNodesForFloor(
        floorId,
        floorNodes,
        floorEdges,
        getFloorDimensions(current, floorId),
        spacingMeters
      );
      const currentGraph = createGraphSnapshot(current.graphNodes, current.graphEdges);
      const graphNodes = [...current.graphNodes.filter((node) => node.floorId !== floorId), ...built.nodes];
      const baseEdges = current.graphEdges.filter((edge) => {
        const from = currentGraph.nodesById[edge.from];
        const to = currentGraph.nodesById[edge.to];
        return from?.floorId !== floorId && to?.floorId !== floorId;
      });

      return normalizeState({
        ...current,
        graphNodes,
        graphEdges: [...baseEdges, ...built.edges],
      });
    });
  }, []);

  const autoPlaceCameras = useCallback((floorId: FloorId) => {
    setState((current) => {
      const graph = createGraphSnapshot(current.graphNodes, current.graphEdges);
      const floorNodes = current.graphNodes.filter((node) => node.floorId === floorId);
      const floorEdges = current.graphEdges.filter((edge) => {
        const from = graph.nodesById[edge.from];
        const to = graph.nodesById[edge.to];
        return from?.floorId === floorId && to?.floorId === floorId;
      });
      const built = autoPlaceCameraNodesForFloor(floorId, floorNodes, floorEdges);
      return normalizeState({
        ...current,
        graphNodes: [...current.graphNodes.filter((node) => node.floorId !== floorId), ...built.nodes],
        graphEdges: [
          ...current.graphEdges.filter((edge) => {
            const from = graph.nodesById[edge.from];
            const to = graph.nodesById[edge.to];
            return from?.floorId !== floorId && to?.floorId !== floorId;
          }),
          ...built.edges,
        ],
      });
    });
  }, []);

  const buildDemoFloor = useCallback((
    floorId: FloorId,
    floorNodes: EvacNode[],
    floorEdges: EvacEdge[],
    spacingMeters = 3,
    roster?: EvacuationRoster
  ) => {
    setState((current) => {
      const dimensions = getFloorDimensions(current, floorId);

      // Preserve manually placed nodes & edges — merge raster output ON TOP of them
      const existingFloorNodes = current.graphNodes.filter((n) => n.floorId === floorId);
      const existingFloorEdges = current.graphEdges.filter((e) => {
        const from = current.graphNodes.find((n) => n.id === e.from);
        const to = current.graphNodes.find((n) => n.id === e.to);
        return from?.floorId === floorId && to?.floorId === floorId;
      });
      const existingIds = new Set(existingFloorNodes.map((n) => n.id));

      // Raster nodes that don't already exist on the floor (avoid overwriting manual placements)
      const newRasterNodes = floorNodes.filter((n) => !existingIds.has(n.id));
      const mergedInputNodes = [...existingFloorNodes, ...newRasterNodes];
      const existingEdgeKeys = new Set(existingFloorEdges.map((e) => [e.from, e.to].sort().join("::")));
      const newRasterEdges = floorEdges.filter((e) => !existingEdgeKeys.has([e.from, e.to].sort().join("::")));
      const mergedInputEdges = [...existingFloorEdges, ...newRasterEdges];

      const withBle = autoPlaceBleNodesForFloor(floorId, mergedInputNodes, mergedInputEdges, dimensions, spacingMeters);
      const ensuredNodes = ensureDemoAnchorsForFloor(floorId, withBle.nodes);
      const withBleGraph = createGraphSnapshot(withBle.nodes, withBle.edges);
      const existingNodeIds = new Set(withBle.nodes.map((node) => node.id));
      const exitNodes = ensuredNodes.filter(
        (node) => node.floorId === floorId && (node.isExit || node.type === "exit")
      );
      const anchorNodes = withBle.nodes.filter(
        (node) => node.floorId === floorId && (node.type === "beacon" || node.type === "junction" || node.type === "checkpoint")
      );
      const ensuredEdges = [
        ...withBle.edges,
        ...ensuredNodes
          .filter((node) => !existingNodeIds.has(node.id))
          .flatMap((node) => {
            const nearestAnchor = anchorNodes.reduce((best, anchor) => {
              if (!best) {
                return anchor;
              }
              return Math.hypot(anchor.x - node.x, anchor.y - node.y) < Math.hypot(best.x - node.x, best.y - node.y)
                ? anchor
                : best;
            }, null as EvacNode | null);

            if (!nearestAnchor || withBleGraph.nodesById[node.id]) {
              return [];
            }

            const nearestExit = node.isRefuge
              ? exitNodes.reduce((best, exitNode) => {
                  if (!best) {
                    return exitNode;
                  }
                  return Math.hypot(exitNode.x - node.x, exitNode.y - node.y) < Math.hypot(best.x - node.x, best.y - node.y)
                    ? exitNode
                    : best;
                }, null as EvacNode | null)
              : null;
            return [{
              id: `${floorId}_demo_anchor_${node.id}`,
              from: node.id,
              to: (nearestExit ?? nearestAnchor).id,
              kind: "corridor" as const,
            }];
          }),
      ];
      const withCameras = autoPlaceCameraNodesForFloor(floorId, ensuredNodes, ensuredEdges);
      const merged = mergeFloorGraphState(current, floorId, withCameras.nodes, withCameras.edges);
      const demoOccupants = createDemoOccupantsForFloor(
        floorId,
        merged.graphNodes.filter((node) => node.floorId === floorId),
        roster
      );
      const selectedGuestId = demoOccupants.find((occupant) => occupant.role === "guest")?.id ?? "";
      const selectedStaffId = demoOccupants.find((occupant) => occupant.role === "staff")?.id ?? "";

      return normalizeState({
        ...current,
        ...merged,
        occupants: demoOccupants,
        selectedGuestId,
        selectedStaffId,
        activeHazardNodeIds: [],
        avoidNodeIds: [],
        blockedEdgeIds: [],
        cameraDetections: [],
        trackingEvents: [],
        incidentMode: "normal",
        simulationRunning: true,
      });
    });
  }, []);

  const triggerCameraDetection = useCallback(
    (
      cameraId: string,
      options?: { confidence?: number; frameCount?: number; hazardType?: "smoke" | "fire" | "obstruction" }
    ) => {
      setState((current) => {
        const graph = createGraphSnapshot(current.graphNodes, current.graphEdges);
        const impact = resolveCameraImpact(cameraId, options, graph);
        if (!impact) {
          return current;
        }

        const impactedOccupant =
          current.occupants.find((occupant) => impact.triggeredNodeIds.includes(occupant.currentNodeId)) ??
          current.occupants.find((occupant) => graph.nodesById[occupant.currentNodeId]?.floorId === impact.camera.floorId) ??
          current.occupants[0];

        return {
          ...current,
          incidentMode: "fire",
          activeHazardNodeIds: Array.from(new Set([...current.activeHazardNodeIds, ...(impact.hazardNodeIds ?? impact.blockedNodeIds)])),
          avoidNodeIds: Array.from(new Set([...current.avoidNodeIds, ...impact.avoidNodeIds])),
          blockedEdgeIds: Array.from(new Set([...current.blockedEdgeIds, ...impact.blockedEdgeIds])),
          cameraDetections: [
            {
              id: `${cameraId}-${Date.now()}`,
              cameraId,
              zoneId: impact.zoneId,
              label: impact.label,
              hazardType: impact.hazardType,
              status: impact.status,
              confidence: impact.confidence,
              frameCount: impact.frameCount,
              createdAt: new Date().toISOString(),
              hazardNodeIds: impact.hazardNodeIds,
              triggeredNodeIds: impact.triggeredNodeIds,
              blockedNodeIds: impact.blockedNodeIds,
              avoidNodeIds: impact.avoidNodeIds,
              blockedEdgeIds: impact.blockedEdgeIds,
            },
            ...current.cameraDetections,
          ].slice(0, 12),
          trackingEvents: [
            ...(impactedOccupant
              ? [createTrackingEvent(
                  impactedOccupant,
                  impact.camera.nodeId,
                  impact.camera.floorId,
                  "reroute",
                  "hybrid",
                  `${impact.camera.label} flagged ${impact.hazardType}. ${impact.label}.`
                )]
              : []),
            ...current.trackingEvents,
          ].slice(0, 80),
        };
      });
    },
    []
  );

  const resetSimulation = useCallback(() => {
    setState(DEFAULT_SIMULATION_STATE);
  }, []);

  const setSimulationRunning = useCallback((simulationRunning: boolean) => {
    setState((current) => ({ ...current, simulationRunning }));
  }, []);

  return useMemo(
    () => ({
      state,
      toggleHazardNode,
      clearHazards,
      setIncidentMode,
      moveOccupant,
      setSelectedGuest,
      setSelectedStaff,
      addGraphNode,
      updateGraphNode,
      deleteGraphNode,
      addGraphEdge,
      deleteGraphEdge,
      triggerCameraDetection,
      resetSimulation,
      setSimulationRunning,
      setFloorPlanImage,
      setFloorDimensions,
      calibrateFloorWalk,
      clearFloorPlanImage,
      replaceFloorGraph,
      autoConnectFloorByBeacons,
      autoPlaceBleNodes,
      autoPlaceCameras,
      buildDemoFloor,
    }),
    [
      addGraphEdge,
      addGraphNode,
      clearHazards,
      deleteGraphEdge,
      deleteGraphNode,
      moveOccupant,
      resetSimulation,
      clearFloorPlanImage,
      setFloorDimensions,
      calibrateFloorWalk,
      autoConnectFloorByBeacons,
      autoPlaceBleNodes,
      autoPlaceCameras,
      buildDemoFloor,
      setIncidentMode,
      setFloorPlanImage,
      setSelectedGuest,
      setSelectedStaff,
      setSimulationRunning,
      state,
      toggleHazardNode,
      triggerCameraDetection,
      updateGraphNode,
      replaceFloorGraph,
    ]
  );
}
