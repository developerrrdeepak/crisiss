"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { EvacuationMap } from "@/components/evacuation/EvacuationMap";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useEvacuationSimulation } from "@/hooks/useEvacuationSimulation";
import { useSocket } from "@/hooks/useSocket";
import { useRadio } from "@/hooks/useRadio";
import { getBeaconModeCopy } from "@/lib/beacon-mode";
import {
  getDataUrlMimeType,
  loadSvgBlueprintSource,
  prepareBlueprintUpload,
  requestBlueprintVisionAnalysis,
  type BlueprintAutomationAsset,
} from "@/lib/blueprint-client";
import {
  calculateRouteDistanceMeters,
  generateFloorGraphFromSvg,
  generateDemoFloorGraphFromRaster,
  createGraphSnapshot,
  getTrackedOccupantNode,
  getRouteBleAddresses,
  getOccupantRoute,
  projectMountedSensorPosition,
  suggestBleSpacingMetersForFloor,
  type EvacuationRoster,
  type EvacNodeType,
  FLOORS,
  type FloorId,
} from "@/lib/evacuation";
import {
  buildMediaMtxViewerUrl,
  fetchRuntimeClientMediaTargets,
  type MediaMtxClientTarget,
} from "@/lib/mediamtx";
import { buildAnchorAddress, isTrackableAnchorNode } from "@/lib/beacon-mode";

type CameraSource = {
  id: string;
  label: string;
  path: string;
  type: "phone" | "rtsp";
};

const PHONE_SOURCE_STORAGE_KEY = "admin-phone-camera-source";
const RTSP_SOURCES_STORAGE_KEY = "admin-rtsp-camera-sources";
const CAMERA_BINDINGS_STORAGE_KEY = "tactical-camera-stream-bindings";
const DEFAULT_PHONE_PATH = "phone-cctv";
const DEFAULT_PHONE_LABEL = "Phone CCTV";

function sanitizePathName(value: string | undefined, fallback: string) {
  const normalized = (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return normalized || fallback;
}

export default function AdminTacticalMap() {
  type EditorMode =
    | "inspect"
    | "add_room"
    | "add_junction"
    | "add_exit"
    | "add_camera"
    | "add_beacon"
    | "move"
    | "connect"
    | "delete";
  type FollowMode = "selected" | "active";
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeFloorId, setActiveFloorId] = useState<FloorId>("floor_6");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("inspect");
  const [pendingEdgeStartId, setPendingEdgeStartId] = useState<string | null>(null);
  const [pendingBeaconStart, setPendingBeaconStart] = useState<{ x: number; y: number } | null>(null);
  const [blueprintStatus, setBlueprintStatus] = useState<string>(
    "Upload an SVG, PNG, or PDF floor plan to build the tactical map with vector parsing or Gemini vision."
  );
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [followModeEnabled, setFollowModeEnabled] = useState(true);
  const [followMode, setFollowMode] = useState<FollowMode>("selected");
  const [followOccupantId, setFollowOccupantId] = useState<string>("guest-aanya");
  const [bleSpacingMeters, setBleSpacingMeters] = useState("3");
  const [dimensionDraft, setDimensionDraft] = useState({ width: "54", height: "18" });
  const [walkDistanceMeters, setWalkDistanceMeters] = useState("12");
  const [walkCalibrationMode, setWalkCalibrationMode] = useState(false);
  const [walkCalibrationStart, setWalkCalibrationStart] = useState<{ x: number; y: number } | null>(null);
  const [walkCalibrationEnd, setWalkCalibrationEnd] = useState<{ x: number; y: number } | null>(null);
  const [bleTestOccupantId, setBleTestOccupantId] = useState<string>("guest-aanya");
  const [bleTestAddress, setBleTestAddress] = useState<string>("");
  const [previewProtocol, setPreviewProtocol] = useState<"webrtc" | "hls">("webrtc");
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [mediaTargets, setMediaTargets] = useState<MediaMtxClientTarget[]>([]);
  const [activeMediaTargetId, setActiveMediaTargetId] = useState<MediaMtxClientTarget["id"]>("primary");
  const [cameraSources, setCameraSources] = useState<CameraSource[]>([]);
  const [cameraBindings, setCameraBindings] = useState<Record<string, string>>({});
  const [selectedCameraSourcePath, setSelectedCameraSourcePath] = useState<string>("");
  const [blueprintAssets, setBlueprintAssets] = useState<Partial<Record<FloorId, BlueprintAutomationAsset>>>({});
  const [liveRoster, setLiveRoster] = useState<EvacuationRoster>({});
  const searchParams = useSearchParams();
  const beaconCopy = getBeaconModeCopy();
  const { dbUser } = useAuthSync();
  const {
    state,
    toggleHazardNode,
    clearHazards,
    resetSimulation,
    setSimulationRunning,
    moveOccupant,
    setSelectedGuest,
    setSelectedStaff,
    addGraphNode,
    updateGraphNode,
    deleteGraphNode,
    addGraphEdge,
    setFloorPlanImage,
    clearFloorPlanImage,
    setFloorDimensions,
    calibrateFloorWalk,
    autoConnectFloorByBeacons,
    autoPlaceBleNodes,
    autoPlaceCameras,
    buildDemoFloor,
    triggerCameraDetection,
  } = useEvacuationSimulation({ simulationDriver: true, sourceRole: "admin" });
  const floorPlanInputRef = useRef<HTMLInputElement | null>(null);
  const focusedQueryRef = useRef<string | null>(null);
  const socket = useSocket("admin");
  const graph = useMemo(() => createGraphSnapshot(state.graphNodes, state.graphEdges), [state.graphEdges, state.graphNodes]);
  const graphNodesById = graph.nodesById;

  const selectedNode = selectedNodeId ? graphNodesById[selectedNodeId] : null;
  const openIncidentCount = state.activeHazardNodeIds.length;
  const activeFloorPlanImage = state.floorPlanImages[activeFloorId] ?? null;
  const activeFloorMeta = FLOORS.find((floor) => floor.id === activeFloorId) ?? null;
  const hasUploadedActiveBlueprint = Boolean(activeFloorPlanImage);
  const hasAnyUploadedBlueprint = Object.keys(state.floorPlanImages).length > 0;
  const hasActiveFloorGraph = state.graphNodes.some((node) => node.floorId === activeFloorId);
  const visibleGraphNodes = hasUploadedActiveBlueprint ? state.graphNodes : [];
  const visibleGraphEdges = hasUploadedActiveBlueprint ? state.graphEdges : [];
  const floorCameraNodes = (hasUploadedActiveBlueprint ? state.graphNodes : []).filter(
    (node) => node.floorId === activeFloorId && node.type === "camera" && node.cameraId
  );
  const activeFloorDimensions = state.floorDimensions[activeFloorId];
  const followedOccupant =
    state.occupants.find((occupant) => occupant.id === followOccupantId) ?? state.occupants[0] ?? null;
  const followedOccupantNode = followedOccupant ? getTrackedOccupantNode(followedOccupant, graph) : null;
  const activeCommandOccupant = followedOccupant ?? state.occupants[0] ?? null;
  const activeCommandChannel = activeCommandOccupant?.commsChannelId ?? "";
  const { isMicActive: isCommandMicActive, toggleMic: toggleCommandMic } = useRadio(socket, activeCommandChannel);
  const followedOccupantRoute =
    hasAnyUploadedBlueprint && followedOccupant
      ? getOccupantRoute(
          followedOccupantNode ? { ...followedOccupant, currentNodeId: followedOccupantNode.id } : followedOccupant,
          state,
          graph
        )
      : null;
  const guestPreviewOccupant =
    state.occupants.find((occupant) => occupant.id === state.selectedGuestId && occupant.role === "guest") ??
    state.occupants.find((occupant) => occupant.role === "guest") ??
    null;
  const guestPreviewNode = guestPreviewOccupant ? getTrackedOccupantNode(guestPreviewOccupant, graph) : null;
  const guestPreviewRoute =
    hasAnyUploadedBlueprint && guestPreviewOccupant
      ? getOccupantRoute(
          guestPreviewNode ? { ...guestPreviewOccupant, currentNodeId: guestPreviewNode.id } : guestPreviewOccupant,
          state,
          graph
        )
      : null;
  const guestPreviewDistance = guestPreviewRoute
    ? calculateRouteDistanceMeters(guestPreviewRoute, graph, state.floorDimensions)
    : 0;
  const guestPreviewBleAddresses = guestPreviewRoute ? getRouteBleAddresses(guestPreviewRoute, graph) : [];
  const guestPreviewRoom = guestPreviewOccupant?.roomNumber ?? "Room not assigned";
  const selectedCameraNode = selectedNode?.type === "camera" ? selectedNode : null;
  const selectedCameraCoverage = selectedCameraNode
    ? (selectedCameraNode.coverageNodeIds?.length
        ? selectedCameraNode.coverageNodeIds
        : state.graphNodes
            .filter((node) => node.floorId === selectedCameraNode.floorId && node.type === "beacon")
            .sort(
              (left, right) =>
                Math.hypot(left.x - selectedCameraNode.x, left.y - selectedCameraNode.y) -
                Math.hypot(right.x - selectedCameraNode.x, right.y - selectedCameraNode.y)
            )
            .slice(0, 3)
            .map((node) => node.id))
          .map((nodeId) => graphNodesById[nodeId])
          .filter(Boolean)
    : [];
  const selectedCameraDetection =
    selectedCameraNode && selectedCameraNode.cameraId
      ? state.cameraDetections.find((detection) => detection.cameraId === selectedCameraNode.cameraId) ?? null
      : null;
  const activeMediaTarget = mediaTargets.find((target) => target.id === activeMediaTargetId) ?? mediaTargets[0] ?? null;
  const availableCameraSources = useMemo(() => {
    const normalized = cameraSources.map((source) => ({
      ...source,
      path: sanitizePathName(source.path, source.type === "phone" ? DEFAULT_PHONE_PATH : "camera-feed"),
    }));
    const seen = new Set<string>();
    return normalized.filter((source) => {
      if (seen.has(source.path)) {
        return false;
      }
      seen.add(source.path);
      return true;
    });
  }, [cameraSources]);
  const selectedCameraBindingKey = selectedCameraNode?.cameraId || selectedCameraNode?.id || "";
  const selectedCameraSource =
    availableCameraSources.find((source) => source.path === selectedCameraSourcePath) ??
    availableCameraSources[0] ??
    null;
  const selectedCameraPreviewUrl = useMemo(() => {
    if (!selectedCameraSource || !activeMediaTarget) {
      return "";
    }

    const baseUrl =
      previewProtocol === "webrtc" ? activeMediaTarget.webrtcBaseUrl : activeMediaTarget.hlsBaseUrl;
    if (!baseUrl) {
      return "";
    }

    const url = new URL(buildMediaMtxViewerUrl(baseUrl, selectedCameraSource.path));
    url.searchParams.set("v", String(previewRefreshKey));
    return url.toString();
  }, [activeMediaTarget, previewProtocol, previewRefreshKey, selectedCameraSource]);
  const anchorNodesOnActiveFloor = state.graphNodes
    .filter((node) => node.floorId === activeFloorId && isTrackableAnchorNode(node.type))
    .sort((left, right) => left.y - right.y || left.x - right.x);
  const floorActivity = useMemo(() => {
    const occupancyByFloor = new Map<FloorId, { guestCount: number; staffCount: number; adminCount: number }>();
    const eventsByFloor = new Map<FloorId, number>();
    const recentThreshold = Date.now() - 5 * 60 * 1000;

    state.occupants.forEach((occupant) => {
      const node = getTrackedOccupantNode(occupant, graph);
      if (!node) {
        return;
      }

      const floorStats = occupancyByFloor.get(node.floorId) ?? { guestCount: 0, staffCount: 0, adminCount: 0 };
      if (occupant.role === "guest") {
        floorStats.guestCount += 1;
      } else if (occupant.role === "staff") {
        floorStats.staffCount += 1;
      } else {
        floorStats.adminCount += 1;
      }
      occupancyByFloor.set(node.floorId, floorStats);
    });

    state.trackingEvents.forEach((event) => {
      const eventTime = Date.parse(event.createdAt);
      if (Number.isNaN(eventTime) || eventTime < recentThreshold) {
        return;
      }
      eventsByFloor.set(event.floorId, (eventsByFloor.get(event.floorId) ?? 0) + 1);
    });

    return FLOORS.map((floor) => {
      const occupancy = occupancyByFloor.get(floor.id) ?? { guestCount: 0, staffCount: 0, adminCount: 0 };
      const recentEventCount = eventsByFloor.get(floor.id) ?? 0;
      const hazardCount = state.activeHazardNodeIds.filter((nodeId) => graphNodesById[nodeId]?.floorId === floor.id).length;
      const occupantCount = occupancy.guestCount + occupancy.staffCount + occupancy.adminCount;
      return {
        ...floor,
        guestCount: occupancy.guestCount,
        staffCount: occupancy.staffCount,
        adminCount: occupancy.adminCount,
        occupantCount,
        recentEventCount,
        hazardCount,
        score: recentEventCount * 20 + hazardCount * 8 + occupantCount * 5 + occupancy.staffCount * 2,
      };
    }).sort((left, right) => right.score - left.score || right.occupantCount - left.occupantCount || right.level - left.level);
  }, [graphNodesById, state.activeHazardNodeIds, state.occupants, state.trackingEvents]);
  const activeTrackedFloorId =
    followMode === "selected"
      ? followedOccupantNode?.floorId ?? activeFloorId
      : floorActivity[0]?.id ?? activeFloorId;
  const secondaryTrackedFloor = floorActivity.find((floor) => floor.id !== activeTrackedFloorId && (floor.score > 0 || floor.occupantCount > 0)) ?? null;
  const trackedFloorSummary = floorActivity.find((floor) => floor.id === activeTrackedFloorId) ?? null;
  const recentTrackingEvents = state.trackingEvents.slice(0, 6);
  const buildFloorMarkers = (floorId: FloorId) =>
    state.occupants.flatMap((occupant) => {
      const node = getTrackedOccupantNode(occupant, graph);
      if (!node || node.floorId !== floorId) return [];
      const firstName = occupant.name.split(" ")[0] || occupant.name;
      const detailParts = [
        occupant.role.toUpperCase(),
        occupant.roomNumber ? `Room ${occupant.roomNumber}` : null,
        node.label,
        occupant.lastBeaconSignal?.address ?? null,
      ].filter(Boolean);
      return [{
        id: occupant.id,
        label: `${occupant.role === "guest" ? "G" : occupant.role === "staff" ? "S" : "A"} ${firstName}`,
        nodeId: node.id,
        tone: occupant.role === "guest" ? "guest" : "staff",
        detail: detailParts.join(" | "),
      } as const];
    });
  const floorMarkers = hasUploadedActiveBlueprint ? buildFloorMarkers(activeFloorId) : [];

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

    const nextSources: CameraSource[] = [];

    try {
      const storedPhone = window.localStorage.getItem(PHONE_SOURCE_STORAGE_KEY);
      const parsedPhone = storedPhone ? (JSON.parse(storedPhone) as { label?: string; path?: string }) : null;
      nextSources.push({
        id: "phone-source",
        label: parsedPhone?.label?.trim() || DEFAULT_PHONE_LABEL,
        path: sanitizePathName(parsedPhone?.path, DEFAULT_PHONE_PATH),
        type: "phone",
      });
    } catch {
      nextSources.push({
        id: "phone-source",
        label: DEFAULT_PHONE_LABEL,
        path: DEFAULT_PHONE_PATH,
        type: "phone",
      });
    }

    try {
      const storedRtsp = window.localStorage.getItem(RTSP_SOURCES_STORAGE_KEY);
      const parsedRtsp = storedRtsp ? (JSON.parse(storedRtsp) as CameraSource[]) : [];
      if (Array.isArray(parsedRtsp)) {
        nextSources.push(...parsedRtsp);
      }
    } catch (error) {
      console.error("Failed to read tactical camera sources:", error);
    }

    setCameraSources(nextSources);

    try {
      const storedBindings = window.localStorage.getItem(CAMERA_BINDINGS_STORAGE_KEY);
      if (storedBindings) {
        const parsedBindings = JSON.parse(storedBindings) as Record<string, string>;
        setCameraBindings(parsedBindings && typeof parsedBindings === "object" ? parsedBindings : {});
      }
    } catch (error) {
      console.error("Failed to read tactical camera bindings:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CAMERA_BINDINGS_STORAGE_KEY, JSON.stringify(cameraBindings));
  }, [cameraBindings]);

  useEffect(() => {
    const floorParam = searchParams.get("floor");
    const nodeParam = searchParams.get("node");
    const cameraParam = searchParams.get("camera");
    const sourceParam = searchParams.get("source");
    const streamParam = searchParams.get("stream");
    const hazardParam = searchParams.get("hazard");
    const focusKey = [floorParam, nodeParam, cameraParam, sourceParam, streamParam, hazardParam].join("|");

    if (!focusKey.replace(/\|/g, "")) {
      return;
    }

    if (focusedQueryRef.current === focusKey) {
      return;
    }

    const cameraNode =
      cameraParam
        ? state.graphNodes.find((node) => node.type === "camera" && node.cameraId === cameraParam) ?? null
        : null;
    const selectedFromQuery = nodeParam ? graphNodesById[nodeParam] ?? null : null;
    const nextNode = cameraNode ?? selectedFromQuery;
    const nextFloorId =
      nextNode?.floorId ??
      (floorParam && FLOORS.some((floor) => floor.id === floorParam) ? (floorParam as FloorId) : null);

    focusedQueryRef.current = focusKey;
    setFollowModeEnabled(false);

    if (nextFloorId) {
      setActiveFloorId(nextFloorId);
    }

    if (nextNode) {
      setSelectedNodeId(nextNode.id);
    }

    if (sourceParam || cameraParam) {
      const focusLabel = cameraNode?.label ?? cameraParam ?? nextNode?.label ?? nextFloorId ?? "selected area";
      setBlueprintStatus(
        `${sourceParam === "camera-console" ? "Focused from camera page" : "Focused from shared map link"} on ${focusLabel}${hazardParam ? `. Hazard preset: ${hazardParam}.` : "."}`,
      );
    }

    if (streamParam) {
      const normalizedStream = sanitizePathName(streamParam, DEFAULT_PHONE_PATH);
      setSelectedCameraSourcePath(normalizedStream);
      if (cameraNode?.cameraId) {
        setCameraBindings((current) => ({
          ...current,
          [cameraNode.cameraId as string]: normalizedStream,
        }));
      }
    }
  }, [graphNodesById, searchParams, state.graphNodes]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [guestResponse, staffResponse] = await Promise.all([
          fetch("/api/admin/guests", { cache: "no-store" }),
          fetch("/api/admin/staff", { cache: "no-store" }),
        ]);
        const [guestPayload, staffPayload] = await Promise.all([
          guestResponse.json().catch(() => null),
          staffResponse.json().catch(() => null),
        ]);

        if (!active) {
          return;
        }

        setLiveRoster({
          guests: Array.isArray(guestPayload?.guests)
            ? guestPayload.guests.map((guest: { id: string; name: string; room?: string; roomNumber?: string }) => ({
                id: guest.id,
                name: guest.name,
                roomNumber: guest.roomNumber ?? guest.room ?? null,
              }))
            : [],
          staff: Array.isArray(staffPayload?.staff)
            ? staffPayload.staff.map(
                (member: {
                  id: string;
                  name: string;
                  department?: string | null;
                  staffRole?: string | null;
                  role?: string | null;
                  employeeId?: string | null;
                }) => ({
                  id: member.id,
                  name: member.name,
                  department: member.department ?? null,
                  role: member.staffRole ?? member.role ?? null,
                  employeeId: member.employeeId ?? null,
                })
              )
            : [],
        });
      } catch (error) {
        console.error("Failed to load tactical map roster:", error);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!followedOccupant && state.occupants[0]) {
      setFollowOccupantId(state.occupants[0].id);
    }
  }, [followedOccupant, state.occupants]);

  useEffect(() => {
    setDimensionDraft({
      width: String(activeFloorDimensions?.widthMeters ?? 54),
      height: String(activeFloorDimensions?.heightMeters ?? 18),
    });
  }, [activeFloorDimensions, activeFloorId]);

  useEffect(() => {
    if (!bleTestAddress && anchorNodesOnActiveFloor[0]) {
      setBleTestAddress(buildAnchorAddress(anchorNodesOnActiveFloor[0]));
    }
  }, [anchorNodesOnActiveFloor, bleTestAddress]);

  useEffect(() => {
    if (!followModeEnabled) {
      return;
    }
    if (activeTrackedFloorId !== activeFloorId) {
      setActiveFloorId(activeTrackedFloorId);
    }
  }, [activeFloorId, activeTrackedFloorId, followModeEnabled]);

  useEffect(() => {
    if (editorMode !== "add_beacon") {
      setPendingBeaconStart(null);
    }
  }, [editorMode]);

  useEffect(() => {
    if (!selectedCameraNode) {
      return;
    }

    const bindingKey = selectedCameraNode.cameraId || selectedCameraNode.id;
    const boundPath = cameraBindings[bindingKey];
    const nextSourcePath =
      boundPath ||
      selectedCameraSourcePath ||
      availableCameraSources.find((source) => source.path === DEFAULT_PHONE_PATH)?.path ||
      availableCameraSources[0]?.path ||
      "";

    if (nextSourcePath && nextSourcePath !== selectedCameraSourcePath) {
      setSelectedCameraSourcePath(nextSourcePath);
    }
  }, [availableCameraSources, cameraBindings, selectedCameraNode, selectedCameraSourcePath]);

  const handleNodeClick = (nodeId: string) => {
    if (editorMode === "connect") {
      if (!pendingEdgeStartId) {
        setPendingEdgeStartId(nodeId);
        setSelectedNodeId(nodeId);
        return;
      }
      if (pendingEdgeStartId !== nodeId) {
        addGraphEdge({
          id: `${pendingEdgeStartId}_${nodeId}_${Date.now()}`,
          from: pendingEdgeStartId,
          to: nodeId,
          kind: "corridor",
        });
      }
      setPendingEdgeStartId(null);
    } else if (editorMode === "delete") {
      deleteGraphNode(nodeId);
      setSelectedNodeId(null);
      return;
    } else {
      setSelectedNodeId(nodeId);
      const node = graphNodesById[nodeId];
      if (node?.type === "camera") {
        const bindingKey = node.cameraId || node.id;
        const boundPath = cameraBindings[bindingKey];
        if (boundPath) {
          setSelectedCameraSourcePath(boundPath);
        }
        setPreviewRefreshKey((current) => current + 1);
      }
    }
  };

  const handleMapClick = (x: number, y: number) => {
    if (walkCalibrationMode) {
      if (!walkCalibrationStart || walkCalibrationEnd) {
        setWalkCalibrationStart({ x, y });
        setWalkCalibrationEnd(null);
        setBlueprintStatus("Walk calibration started. Click the second point on the map.");
        return;
      }

      setWalkCalibrationEnd({ x, y });
      setBlueprintStatus("Walk calibration anchor captured. Apply walked distance to update dimensions.");
      return;
    }

    if (editorMode === "move" && selectedNode) {
      updateGraphNode(selectedNode.id, { x, y });
      return;
    }

    if (editorMode === "inspect" || editorMode === "connect" || editorMode === "delete") {
      return;
    }

    if (editorMode === "add_beacon") {
      if (!pendingBeaconStart) {
        setPendingBeaconStart({ x, y });
        setBlueprintStatus("Point 1 selected. Click the second point on the map to draw spaced beacons.");
        return;
      }

      const spacing = Number.parseFloat(bleSpacingMeters) || 2.5;
      const tStart = pendingBeaconStart;
      const tEnd = { x, y };

      const dimensions = activeFloorDimensions || { widthMeters: 54, heightMeters: 18 };
      const metersPerPercentX = dimensions.widthMeters / 100;
      const metersPerPercentY = dimensions.heightMeters / 100;
      const dxMeters = (tEnd.x - tStart.x) * metersPerPercentX;
      const dyMeters = (tEnd.y - tStart.y) * metersPerPercentY;
      const segmentDistance = Math.hypot(dxMeters, dyMeters);

      const count = Math.floor(segmentDistance / spacing);
      const limit = count + (segmentDistance % spacing > 0 ? 1 : 0);
      
      let suffixOffset = state.graphNodes.filter((node) => node.floorId === activeFloorId && node.type === "beacon").length;
      const floorNumber = activeFloorId.split("_")[1].padStart(2, "0");
      
      let previousNodeId: string | null = null;
      let addedNodesCount = 0;

      for (let i = 0; i <= limit; i++) {
        const ratio = i === limit && segmentDistance > 0 ? 1 : (i * spacing) / segmentDistance;
        if (ratio > 1 && i > 0) continue;

        const ptX = tStart.x + (tEnd.x - tStart.x) * ratio;
        const ptY = tStart.y + (tEnd.y - tStart.y) * ratio;
        const mountPoint = projectMountedSensorPosition(
          { x: ptX, y: ptY },
          tStart,
          tEnd,
          dimensions,
          {
            sideHint: (i + suffixOffset) % 2 === 0 ? 1 : -1,
            offsetMeters: Math.max(0.7, Math.min(1.15, spacing * 0.3)),
          }
        );

        suffixOffset++;
        addedNodesCount++;
        const id = `${activeFloorId}_beacon_${Date.now()}_${i}`;
        
        addGraphNode({
          id,
          floorId: activeFloorId,
          x: ptX,
          y: ptY,
          mountX: mountPoint.x,
          mountY: mountPoint.y,
          type: "beacon",
          label: `Beacon ${suffixOffset}`,
          zoneId: `${activeFloorId.toUpperCase()}-ZONE`,
          checkpoint: false,
          beaconIndex: suffixOffset,
          beaconMajor: suffixOffset,
          bleAddress: `AEG-${floorNumber}-MAN-${String(suffixOffset).padStart(3, "0")}`,
        });

        if (previousNodeId) {
          addGraphEdge({
            id: `${previousNodeId}_${id}_link`,
            from: previousNodeId,
            to: id,
            kind: "corridor",
          });
        }
        previousNodeId = id;
      }

      setPendingBeaconStart(null);
      setBlueprintStatus(`Drawn ${addedNodesCount} BLE nodes spaced sequentially.`);
      return;
    }

    const nodeTypeMap: Record<Exclude<EditorMode, "inspect" | "move" | "connect" | "delete" | "add_beacon">, EvacNodeType> = {
      add_room: "room",
      add_junction: "junction",
      add_exit: "exit",
      add_camera: "camera",
    };
    const nodeType = nodeTypeMap[editorMode as keyof typeof nodeTypeMap];
    if (!nodeType) return;
    
    const suffix = state.graphNodes.filter((node) => node.floorId === activeFloorId && node.type === nodeType).length + 1;
    const id = `${activeFloorId}_${nodeType}_${Date.now()}`;
    const floorNumber = activeFloorId.split("_")[1].padStart(2, "0");
    addGraphNode({
      id,
      floorId: activeFloorId,
      x,
      y,
      type: nodeType,
      label: `${nodeType} ${suffix}`,
      zoneId: `${activeFloorId.toUpperCase()}-ZONE`,
      checkpoint: nodeType !== "camera",
      isExit: nodeType === "exit",
      cameraId: nodeType === "camera" ? `CAM-${floorNumber}-MAN-${String(suffix).padStart(2, "0")}` : undefined,
    });
  };

  const handleFloorPlanUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    void (async () => {
      try {
        const preparedUpload = await prepareBlueprintUpload(file);
        setFloorPlanImage(activeFloorId, preparedUpload.previewImageUrl);
        setBlueprintAssets((current) => ({
          ...current,
          [activeFloorId]: preparedUpload.asset,
        }));
        setBlueprintStatus(preparedUpload.statusMessage);
      } catch (error) {
        setBlueprintStatus(error instanceof Error ? error.message : "Floor plan upload failed.");
      } finally {
        event.target.value = "";
      }
    })();
  };

  const handleAutoGenerateFromBlueprint = async () => {
    setIsGeneratingBlueprint(true);
    try {
      if (!activeFloorPlanImage) {
        setBlueprintStatus("Upload a floor plan first. Live demo generation requires an uploaded map.");
        return;
      }

      let blueprintAsset = blueprintAssets[activeFloorId] ?? null;
      if (!blueprintAsset) {
        const fallbackSvgMarkup = await loadSvgBlueprintSource(activeFloorPlanImage);
        if (fallbackSvgMarkup) {
          blueprintAsset = {
            kind: "svg",
            mimeType: "image/svg+xml",
            dataUrl: activeFloorPlanImage,
            svgMarkup: fallbackSvgMarkup,
          };
        } else {
          const previewMimeType = getDataUrlMimeType(activeFloorPlanImage);
          if (!previewMimeType?.startsWith("image/")) {
            setBlueprintStatus("Original blueprint source missing hai. PNG ya PDF dobara upload karo for Gemini parsing.");
            return;
          }
          blueprintAsset = {
            kind: "vision",
            mimeType: previewMimeType,
            dataUrl: activeFloorPlanImage,
            fileName: `${activeFloorId}.png`,
          };
        }

        setBlueprintAssets((current) => ({
          ...current,
          [activeFloorId]: blueprintAsset!,
        }));
      }

      let generated;
      let dimensionNote = "";
      let effectiveDimensions = activeFloorDimensions;
      if (blueprintAsset.kind === "svg") {
        const svgMarkup = blueprintAsset.svgMarkup ?? (await loadSvgBlueprintSource(blueprintAsset.dataUrl));
        if (!svgMarkup) {
          throw new Error("SVG markup could not be read for the uploaded floor plan.");
        }
        generated = generateFloorGraphFromSvg(svgMarkup, activeFloorId);
      } else {
        try {
          const rasterAnalysis = await requestBlueprintVisionAnalysis({
            floorId: activeFloorId,
            floorLabel: activeFloorMeta?.label ?? activeFloorId.replace("_", " "),
            asset: blueprintAsset,
          });

          const extractedWidth = rasterAnalysis.dimensionsMeters?.widthMeters ?? null;
          const extractedHeight = rasterAnalysis.dimensionsMeters?.heightMeters ?? null;
          if (extractedWidth && extractedHeight) {
            effectiveDimensions = {
              widthMeters: extractedWidth,
              heightMeters: extractedHeight,
              source: "vision",
              calibrationNote:
                rasterAnalysis.dimensionsMeters?.sourceText ??
                "Gemini vision extracted the floor dimensions from blueprint measurements.",
            };
            setFloorDimensions(activeFloorId, {
              widthMeters: extractedWidth,
              heightMeters: extractedHeight,
              source: "vision",
              calibrationNote:
                rasterAnalysis.dimensionsMeters?.sourceText ??
                "Gemini vision extracted the floor dimensions from blueprint measurements.",
            });
            dimensionNote = `Applied ${extractedWidth}m x ${extractedHeight}m from blueprint measurements.`;
          } else if (rasterAnalysis.dimensionsMeters?.sourceText) {
            dimensionNote = `Measurement note: ${rasterAnalysis.dimensionsMeters.sourceText}. Manual dimensions remain active until both axes are confirmed.`;
          }

          generated = generateDemoFloorGraphFromRaster(activeFloorId, rasterAnalysis);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Vision AI blueprint parsing failed.";
          throw new Error(
            `Gemini blueprint parsing failed for ${activeFloorMeta?.label ?? activeFloorId.replace("_", " ")}. ${errorMessage}`
          );
        }
      }
      if (generated.nodes.length === 0) {
        setBlueprintStatus(generated.diagnostics[0] ?? "No nodes could be generated from this blueprint.");
        return;
      }

      const recommendedSpacing = suggestBleSpacingMetersForFloor(
        activeFloorId,
        generated.nodes,
        generated.edges,
        effectiveDimensions
      );
      setBleSpacingMeters(String(recommendedSpacing));
      buildDemoFloor(
        activeFloorId,
        generated.nodes,
        generated.edges,
        recommendedSpacing,
        liveRoster
      );
      setBlueprintStatus(
        [
          generated.diagnostics.join(" "),
          dimensionNote,
          `BLE spacing auto-tuned to ${recommendedSpacing}m for this floor geometry.`,
          "Live demo build complete: graph, BLE, cameras, and demo occupants are ready.",
        ]
          .filter(Boolean)
          .join(" ")
      );
    } catch (error) {
      setBlueprintStatus(error instanceof Error ? error.message : "Blueprint automation failed.");
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  const handleAutoConnectBeacons = () => {
    autoConnectFloorByBeacons(activeFloorId);
    setBlueprintStatus("Beacon corridor graph regenerated for the active floor.");
  };

  const handleAutoPlaceBle = () => {
    const spacing = Number.parseFloat(bleSpacingMeters);
    autoPlaceBleNodes(activeFloorId, Number.isFinite(spacing) && spacing > 0 ? spacing : 3);
    setBlueprintStatus(`BLE nodes regenerated on ${activeFloorId.replace("_", " ")} using ${Number.isFinite(spacing) && spacing > 0 ? spacing : 3}m spacing.`);
  };

  const handleAutoPlaceCameras = () => {
    autoPlaceCameras(activeFloorId);
    setBlueprintStatus(`Camera nodes regenerated around BLE major clusters for ${activeFloorId.replace("_", " ")}.`);
  };

  const handleSmartOptimizeFloor = () => {
    const floorNodes = state.graphNodes.filter((node) => node.floorId === activeFloorId);
    const floorEdges = state.graphEdges.filter((edge) => {
      const from = graphNodesById[edge.from];
      const to = graphNodesById[edge.to];
      return from?.floorId === activeFloorId && to?.floorId === activeFloorId;
    });

    if (floorNodes.length === 0 || floorEdges.length === 0) {
      setBlueprintStatus("Build the live floor graph first, then run smart optimization for BLE and camera coverage.");
      return;
    }

    const recommendedSpacing = suggestBleSpacingMetersForFloor(
      activeFloorId,
      floorNodes,
      floorEdges,
      activeFloorDimensions
    );

    setBleSpacingMeters(String(recommendedSpacing));
    autoPlaceBleNodes(activeFloorId, recommendedSpacing);
    autoPlaceCameras(activeFloorId);
    setBlueprintStatus(
      `Smart optimization applied on ${activeFloorMeta?.label ?? activeFloorId.replace("_", " ")}. BLE spacing tuned to ${recommendedSpacing}m and camera coverage rebalanced around chokepoints.`
    );
  };

  const handleApplyDimensions = () => {
    const widthMeters = Number.parseFloat(dimensionDraft.width);
    const heightMeters = Number.parseFloat(dimensionDraft.height);
    if (!Number.isFinite(widthMeters) || !Number.isFinite(heightMeters) || widthMeters <= 0 || heightMeters <= 0) {
      setBlueprintStatus("Enter valid floor dimensions before applying.");
      return;
    }

    setFloorDimensions(activeFloorId, {
      widthMeters,
      heightMeters,
      source: "manual",
      calibrationNote: "Manually entered by admin",
    });
    setBlueprintStatus(`Floor dimensions updated to ${widthMeters}m x ${heightMeters}m.`);
  };

  const handleApplyWalkCalibration = () => {
    const walkedMeters = Number.parseFloat(walkDistanceMeters);
    if (!walkCalibrationStart || !walkCalibrationEnd) {
      setBlueprintStatus("Capture two points on the map before applying walk calibration.");
      return;
    }
    if (!Number.isFinite(walkedMeters) || walkedMeters <= 0) {
      setBlueprintStatus("Enter the walked distance in meters before calibration.");
      return;
    }

    calibrateFloorWalk(activeFloorId, walkCalibrationStart, walkCalibrationEnd, walkedMeters);
    setWalkCalibrationMode(false);
    setWalkCalibrationStart(null);
    setWalkCalibrationEnd(null);
    setBlueprintStatus(`Walk calibration applied using ${walkedMeters}m measured path.`);
  };

  const handleInjectBleScan = () => {
    const occupant = state.occupants.find((entry) => entry.id === bleTestOccupantId);
    const bleNode = anchorNodesOnActiveFloor.find((node) => buildAnchorAddress(node) === bleTestAddress);
    if (!occupant) {
      setBlueprintStatus("Select a person before sending a BLE scan.");
      return;
    }
    if (!bleNode) {
      setBlueprintStatus("Selected anchor address was not found on the active floor graph.");
      return;
    }

    moveOccupant(occupant.id, bleNode.id);
    if (occupant.role === "guest") {
      setSelectedGuest(occupant.id);
    }
    if (occupant.role === "staff") {
      setSelectedStaff(occupant.id);
    }
    setFollowOccupantId(occupant.id);
    setActiveFloorId(bleNode.floorId);
    setBlueprintStatus(`${occupant.name} locked onto ${bleNode.label} via ${buildAnchorAddress(bleNode)}. Route recalculated from the active anchor simulator.`);
  };

  const handleFollowOccupantChange = (occupantId: string) => {
    setFollowOccupantId(occupantId);
    const occupant = state.occupants.find((entry) => entry.id === occupantId);
    if (!occupant) {
      return;
    }

    if (occupant.role === "guest") {
      setSelectedGuest(occupant.id);
    }
    if (occupant.role === "staff") {
      setSelectedStaff(occupant.id);
    }

    const node = getTrackedOccupantNode(occupant, graph);
    if (node) {
      setActiveFloorId(node.floorId);
    }
  };

  const handleBindSelectedCameraSource = () => {
    if (!selectedCameraNode || !selectedCameraSource) {
      setBlueprintStatus("Select a camera node and source before binding a live feed.");
      return;
    }

    const bindingKey = selectedCameraNode.cameraId || selectedCameraNode.id;
    setCameraBindings((current) => ({
      ...current,
      [bindingKey]: selectedCameraSource.path,
    }));
    setBlueprintStatus(
      `${selectedCameraNode.label} is now bound to ${selectedCameraSource.label}. Tactical map clicks will open that live feed.`,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-[#0a0a0a] dark:via-slate-950 dark:to-[#0a0a0a] font-['Inter'] text-slate-900 dark:text-slate-100">
      <DashboardHeader
        title="Tactical Map"
        userName={dbUser?.name || "Administrator"}
        role="Command Center"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
          alertCount={openIncidentCount}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:gap-8">
            <div className="space-y-6">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Floor Plan</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Interactive tactical overview</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {FLOORS.map((floor) => (
                      <button
                        key={floor.id}
                        onClick={() => setActiveFloorId(floor.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm ${
                          activeFloorId === floor.id
                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {floor.label}
                      </button>
                    ))}
                  </div>
                </div>

                <EvacuationMap
                  floorId={activeFloorId}
                  floorPlanImageUrl={activeFloorPlanImage}
                  dimensionsLabel={`${activeFloorDimensions.widthMeters}m x ${activeFloorDimensions.heightMeters}m`}
                  activeHazardNodeIds={state.activeHazardNodeIds}
                  avoidNodeIds={state.avoidNodeIds}
                  highlightedPath={followedOccupantRoute}
                  selectedNodeId={selectedNodeId}
                  markers={floorMarkers}
                  graphNodes={visibleGraphNodes}
                  graphEdges={visibleGraphEdges}
                  onNodeClick={handleNodeClick}
                  onMarkerClick={handleFollowOccupantChange}
                  onMapClick={handleMapClick}
                />
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 p-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Editor Tools</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditorMode("add_room")} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${editorMode === "add_room" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}>
                    🏠 Room
                  </button>
                  <button onClick={() => setEditorMode("add_junction")} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${editorMode === "add_junction" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}>
                    🔀 Junction
                  </button>
                  <button onClick={() => setEditorMode("add_exit")} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${editorMode === "add_exit" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}>
                    🚪 Exit
                  </button>
                  <button onClick={() => setEditorMode("add_beacon")} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${editorMode === "add_beacon" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}>
                    📡 Beacon
                  </button>
                  <button onClick={() => setEditorMode("connect")} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${editorMode === "connect" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}>
                    🔗 Connect
                  </button>
                  <button onClick={() => setEditorMode("move")} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${editorMode === "move" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}>
                    ↔️ Move
                  </button>
                  <button onClick={() => setEditorMode("delete")} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${editorMode === "delete" ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"}`}>
                    🗑️ Delete
                  </button>
                  <button onClick={() => setEditorMode("inspect")} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700">
                    🔍 Inspect
                  </button>
                </div>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 p-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">⚙️</span> Controls
                </h3>
                <div className="space-y-2.5">
                  <button onClick={() => floorPlanInputRef.current?.click()} className="w-full px-3 py-2 bg-[#175ead] text-white rounded-lg text-sm">
                    Upload Floor Plan
                  </button>
                  <button
                    onClick={handleAutoGenerateFromBlueprint}
                    disabled={isGeneratingBlueprint || !hasUploadedActiveBlueprint}
                    className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {isGeneratingBlueprint ? "Building Demo..." : "Build Live Demo From Upload"}
                  </button>
                  <button onClick={handleAutoConnectBeacons} disabled={!hasUploadedActiveBlueprint} className="w-full px-3 py-2 bg-[#0f766e] text-white rounded-lg text-sm disabled:opacity-50">
                    Auto Link By Beacons
                  </button>
                  <button onClick={handleAutoPlaceBle} disabled={!hasUploadedActiveBlueprint} className="w-full px-3 py-2 bg-sky-600 text-white rounded-lg text-sm disabled:opacity-50">
                    Auto Place BLE Every {bleSpacingMeters || "3"}m
                  </button>
                  <button onClick={handleAutoPlaceCameras} disabled={!hasUploadedActiveBlueprint} className="w-full px-3 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">
                    Auto Place Camera Nodes
                  </button>
                  <button
                    onClick={handleSmartOptimizeFloor}
                    disabled={!hasActiveFloorGraph}
                    className="w-full px-3 py-2 bg-[#081d2c] text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    Smart Optimize Floor
                  </button>
                  <button
                    onClick={() => {
                      clearFloorPlanImage(activeFloorId);
                      setBlueprintAssets((current) => {
                        const next = { ...current };
                        delete next[activeFloorId];
                        return next;
                      });
                    }}
                    disabled={!activeFloorPlanImage}
                    className="w-full px-3 py-2 bg-[#f4f4f5] dark:bg-[#18181b] rounded-lg text-sm disabled:opacity-50"
                  >
                    Clear Floor Plan
                  </button>
                  <button onClick={() => setSimulationRunning(!state.simulationRunning)} className={`w-full px-3 py-2 rounded-lg text-sm text-white ${state.simulationRunning ? "bg-yellow-600" : "bg-green-600"}`}>
                    {state.simulationRunning ? "Pause" : "Start"} Simulation
                  </button>
                  <button onClick={clearHazards} className="w-full px-3 py-2 bg-[#f4f4f5] dark:bg-[#18181b] rounded-lg text-sm">
                    Clear Hazards
                  </button>
                  <button onClick={resetSimulation} className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm">
                    Reset
                  </button>
                </div>
                <div className="mt-3 rounded-lg bg-[#f4f4f5] px-3 py-3 text-xs text-zinc-500 dark:bg-[#18181b] dark:text-zinc-400">
                  {state.simulationRunning
                    ? beaconCopy.simulationActiveSummary
                    : beaconCopy.simulationIdleSummary}
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">{blueprintStatus}</p>
                <input ref={floorPlanInputRef} type="file" accept="image/*,.svg,.pdf,application/pdf" className="hidden" onChange={handleFloorPlanUpload} />
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">{beaconCopy.simulatorPanelLabel}</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <label className="col-span-1 text-xs text-slate-500 dark:text-zinc-400">
                      {beaconCopy.simulatorSpacingLabel}
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={bleSpacingMeters}
                        onChange={(event) => setBleSpacingMeters(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-[#f4f4f5] px-3 py-2 text-sm dark:border-zinc-800/80 dark:bg-[#18181b]"
                      />
                    </label>
                    <label className="col-span-1 text-xs text-slate-500 dark:text-zinc-400">
                      Width (m)
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={dimensionDraft.width}
                        onChange={(event) => setDimensionDraft((current) => ({ ...current, width: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-[#f4f4f5] px-3 py-2 text-sm dark:border-zinc-800/80 dark:bg-[#18181b]"
                      />
                    </label>
                    <label className="col-span-1 text-xs text-slate-500 dark:text-zinc-400">
                      Height (m)
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={dimensionDraft.height}
                        onChange={(event) => setDimensionDraft((current) => ({ ...current, height: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-[#f4f4f5] px-3 py-2 text-sm dark:border-zinc-800/80 dark:bg-[#18181b]"
                      />
                    </label>
                  </div>
                  <button onClick={handleApplyDimensions} className="w-full rounded-lg bg-[#081d2c] px-3 py-2 text-sm text-white">
                    Apply Floor Dimensions
                  </button>
                  <div className="rounded-lg border border-dashed border-[#cbd5e1] px-3 py-3 dark:border-[#334155]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">Walk Calibration</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                          Click two map points, then enter walked distance to auto-scale dimensions.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWalkCalibrationMode((current) => !current);
                          setWalkCalibrationStart(null);
                          setWalkCalibrationEnd(null);
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${walkCalibrationMode ? "bg-amber-500 text-white" : "bg-[#f4f4f5] dark:bg-[#18181b]"}`}
                      >
                        {walkCalibrationMode ? "Cancel Measure" : "Start Measure"}
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={walkDistanceMeters}
                        onChange={(event) => setWalkDistanceMeters(event.target.value)}
                        placeholder="Walked meters"
                        className="rounded-lg border border-slate-200 bg-[#f4f4f5] px-3 py-2 text-sm dark:border-zinc-800/80 dark:bg-[#18181b]"
                      />
                      <button onClick={handleApplyWalkCalibration} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">
                        Apply
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                      Current scale: {activeFloorDimensions.widthMeters}m x {activeFloorDimensions.heightMeters}m | source: {activeFloorDimensions.source}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Start: {walkCalibrationStart ? `${walkCalibrationStart.x.toFixed(1)}%, ${walkCalibrationStart.y.toFixed(1)}%` : "not set"} | End: {walkCalibrationEnd ? `${walkCalibrationEnd.x.toFixed(1)}%, ${walkCalibrationEnd.y.toFixed(1)}%` : "not set"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">{beaconCopy.liveTestLabel}</h3>
                <div className="space-y-3">
                  <select
                    value={bleTestOccupantId}
                    onChange={(event) => setBleTestOccupantId(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#f4f4f5] px-3 py-2 text-sm dark:border-zinc-800/80 dark:bg-[#18181b]"
                  >
                    {state.occupants.map((occupant) => (
                      <option key={occupant.id} value={occupant.id}>
                        {occupant.name} | {occupant.role.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bleTestAddress}
                    onChange={(event) => setBleTestAddress(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#f4f4f5] px-3 py-2 text-sm dark:border-zinc-800/80 dark:bg-[#18181b]"
                  >
                    {anchorNodesOnActiveFloor.map((node) => (
                      <option key={node.id} value={buildAnchorAddress(node)}>
                        {buildAnchorAddress(node)} | {node.label}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleInjectBleScan} className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm text-white">
                    {beaconCopy.injectActionLabel}
                  </button>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {beaconCopy.injectActionSummary}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Auto Follow Person</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-3 rounded-lg bg-[#f4f4f5] px-3 py-2 text-sm dark:bg-[#18181b]">
                    <span>Follow floor automatically</span>
                    <input
                      type="checkbox"
                      checked={followModeEnabled}
                      onChange={(event) => setFollowModeEnabled(event.target.checked)}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFollowMode("selected")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        followMode === "selected"
                          ? "bg-[#175ead] text-white"
                          : "bg-[#f4f4f5] dark:bg-[#18181b]"
                      }`}
                    >
                      Selected Person
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowMode("active")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        followMode === "active"
                          ? "bg-[#175ead] text-white"
                          : "bg-[#f4f4f5] dark:bg-[#18181b]"
                      }`}
                    >
                      Most Active Floor
                    </button>
                  </div>
                  <select
                    value={followOccupantId}
                    onChange={(event) => handleFollowOccupantChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#f4f4f5] px-3 py-2 text-sm dark:border-zinc-800/80 dark:bg-[#18181b]"
                  >
                    {state.occupants.map((occupant) => (
                      <option key={occupant.id} value={occupant.id}>
                        {occupant.name} | {occupant.role.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div className="rounded-lg bg-[#f4f4f5] px-3 py-3 text-sm dark:bg-[#18181b]">
                    <div className="font-medium">
                      {followedOccupant?.name ?? "No person selected"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Current floor: {followedOccupantNode?.floorId.replace("_", " ") ?? "Unknown"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Route nodes: {followedOccupantRoute?.length ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-zinc-800/80">
                    <div className="font-medium">
                      Primary tracked floor: {trackedFloorSummary?.label ?? "Unknown"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Mode: {followMode === "selected" ? "selected person" : "most active floor"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Occupants: {trackedFloorSummary?.occupantCount ?? 0} | Hazards: {trackedFloorSummary?.hazardCount ?? 0} | Recent events: {trackedFloorSummary?.recentEventCount ?? 0}
                    </div>
                    {secondaryTrackedFloor ? (
                      <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                        Secondary watch: {secondaryTrackedFloor.label} ({secondaryTrackedFloor.occupantCount} occupants)
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Live Command Bridge</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        Control talk/listen for selected guest or staff channel directly from here.
                      </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleCommandMic()}
                    disabled={!activeCommandChannel}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                      isCommandMicActive ? "bg-red-600" : "bg-[#175ead]"
                    }`}
                  >
                    {isCommandMicActive ? "Mute Bridge" : "Open Mic"}
                  </button>
                </div>

                <div className="mt-4 rounded-lg bg-[#f4f4f5] px-3 py-3 text-sm dark:bg-[#18181b]">
                  <div className="font-medium">{activeCommandOccupant?.name ?? "No live occupant selected"}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                    Channel: {activeCommandChannel || "Waiting for a mapped comms channel"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                    Position: {followedOccupantNode?.label ?? "Unknown"} | Floor: {followedOccupantNode?.floorId.replace("_", " ") ?? "Unknown"}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-zinc-800/80">
                    <div className="font-semibold">Tracking confidence</div>
                    <div className="mt-1 text-slate-500 dark:text-zinc-400">
                      {Math.round((activeCommandOccupant?.trackingConfidence ?? 0) * 100)}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-zinc-800/80">
                    <div className="font-semibold">Last signal</div>
                    <div className="mt-1 text-slate-500 dark:text-zinc-400">
                      {activeCommandOccupant?.lastSignalSource ?? "routing"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-dashed border-[#cbd5e1] px-3 py-3 text-xs dark:border-[#334155]">
                  <div className="font-semibold">
                    {beaconCopy.liveLockLabel}: {activeCommandOccupant?.lastBeaconSignal?.address ?? beaconCopy.pendingLockLabel}
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-zinc-400">
                    RSSI: {activeCommandOccupant?.lastBeaconSignal?.rssi ?? "--"} dBm | Distance: {activeCommandOccupant?.lastBeaconSignal?.distanceMeters ?? "--"}m
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-zinc-400">
                    Last seen: {activeCommandOccupant?.lastSeenAt ? new Date(activeCommandOccupant.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "No live sample yet"}
                  </div>
                </div>
              </div>

              {secondaryTrackedFloor ? (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Secondary Floor Watch</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        Live preview for next busiest floor - no need to switch constantly.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFloorId(secondaryTrackedFloor.id)}
                      className="rounded-lg bg-[#f4f4f5] px-3 py-2 text-xs font-medium dark:bg-[#18181b]"
                    >
                      Open Floor
                    </button>
                  </div>
                  <EvacuationMap
                    compact
                    floorId={secondaryTrackedFloor.id}
                    floorPlanImageUrl={state.floorPlanImages[secondaryTrackedFloor.id] ?? null}
                    dimensionsLabel={`${state.floorDimensions[secondaryTrackedFloor.id].widthMeters}m x ${state.floorDimensions[secondaryTrackedFloor.id].heightMeters}m`}
                    activeHazardNodeIds={state.activeHazardNodeIds}
                    avoidNodeIds={state.avoidNodeIds}
                    highlightedPath={followedOccupantRoute}
                    selectedNodeId={null}
                    markers={buildFloorMarkers(secondaryTrackedFloor.id)}
                    graphNodes={state.graphNodes}
                    graphEdges={state.graphEdges}
                  />
                </div>
              ) : null}

              {selectedNode && (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Selected Node</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-zinc-400">Label</label>
                      <input
                        type="text"
                        value={selectedNode.label}
                        onChange={(e) => updateGraphNode(selectedNode.id, { label: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-[#f4f4f5] dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800/80 rounded-lg text-sm"
                      />
                    </div>
                    {selectedNode.type === "beacon" ? (
                      <div className="rounded-lg bg-[#f4f4f5] px-3 py-3 text-sm dark:bg-[#18181b]">
                        <div className="font-medium">{selectedNode.bleAddress ?? "BLE address pending"}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                          Major: {selectedNode.beaconMajor ?? selectedNode.beaconIndex ?? "-"} | Zone: {selectedNode.zoneId}
                        </div>
                        {typeof selectedNode.mountX === "number" && typeof selectedNode.mountY === "number" ? (
                          <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                            Mounted at: {selectedNode.mountX.toFixed(1)}%, {selectedNode.mountY.toFixed(1)}%
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {selectedCameraNode ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-[#081d2c] p-3 text-white dark:border-zinc-800/80">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-sky-200">Live Preview</div>
                              <div className="mt-1 text-sm font-semibold">{selectedCameraNode.cameraId}</div>
                            </div>
                            <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                              Feed Active
                            </div>
                          </div>
                          <div className="mt-3 rounded-lg border border-white/10 bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-3">
                            {selectedCameraPreviewUrl ? (
                              <iframe
                                key={`${selectedCameraNode.id}-${selectedCameraSource?.path || "none"}-${previewProtocol}-${previewRefreshKey}`}
                                src={selectedCameraPreviewUrl}
                                title={`${selectedCameraNode.label} live preview`}
                                className="mb-3 aspect-video w-full rounded-lg border border-white/10 bg-black"
                                allow="autoplay; fullscreen"
                              />
                            ) : (
                              <div className="mb-3 flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/40 px-4 text-center text-xs text-slate-300">
                                Bind a MediaMTX source to this camera to see the live preview on the tactical map.
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.16em] text-sky-100/80">
                              <div className="rounded-md bg-white/5 px-2 py-2">{previewProtocol === "webrtc" ? "Low latency" : "Stability mode"}</div>
                              <div className="rounded-md bg-white/5 px-2 py-2">{activeMediaTarget?.label ?? "No backend"}</div>
                              <div className="rounded-md bg-white/5 px-2 py-2">Coverage {selectedCameraCoverage.length} majors</div>
                              <div className="rounded-md bg-white/5 px-2 py-2">
                                {selectedCameraDetection ? selectedCameraDetection.status : "monitoring"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-300">
                            Coverage BLE: {selectedCameraCoverage.map((node) => node?.bleAddress ?? node?.label).join(", ") || "No linked BLE nodes"}
                          </div>
                          <div className="mt-3 grid gap-2">
                            <select
                              value={selectedCameraSource?.path ?? ""}
                              onChange={(event) => setSelectedCameraSourcePath(event.target.value)}
                              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                            >
                              {availableCameraSources.length === 0 ? (
                                <option value="">No saved camera sources found</option>
                              ) : null}
                              {availableCameraSources.map((source) => (
                                <option key={source.id} value={source.path}>
                                  {source.label} | {source.path}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewProtocol("webrtc")}
                                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                                  previewProtocol === "webrtc" ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-200"
                                }`}
                              >
                                WebRTC
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewProtocol("hls")}
                                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                                  previewProtocol === "hls" ? "bg-sky-500 text-white" : "bg-slate-700 text-slate-200"
                                }`}
                              >
                                HLS
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewRefreshKey((current) => current + 1)}
                                className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white"
                              >
                                Refresh
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={handleBindSelectedCameraSource}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white"
                              >
                                Bind Feed To Camera
                              </button>
                              {selectedCameraPreviewUrl ? (
                                <Link
                                  href={selectedCameraPreviewUrl}
                                  target="_blank"
                                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white"
                                >
                                  Open Feed
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => selectedCameraNode.cameraId && triggerCameraDetection(selectedCameraNode.cameraId, { hazardType: "smoke", confidence: 0.93, frameCount: 4 })}
                            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white"
                          >
                            Smoke
                          </button>
                          <button
                            onClick={() => selectedCameraNode.cameraId && triggerCameraDetection(selectedCameraNode.cameraId, { hazardType: "fire", confidence: 0.97, frameCount: 5 })}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white"
                          >
                            Fire
                          </button>
                          <button
                            onClick={() => selectedCameraNode.cameraId && triggerCameraDetection(selectedCameraNode.cameraId, { hazardType: "obstruction", confidence: 0.84, frameCount: 3 })}
                            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white"
                          >
                            Obstruction
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <button
                      onClick={() => toggleHazardNode(selectedNode.id)}
                      className={`w-full px-3 py-2 rounded-lg text-sm text-white ${
                        state.activeHazardNodeIds.includes(selectedNode.id) ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      {state.activeHazardNodeIds.includes(selectedNode.id) ? "Clear Hazard" : "Mark Hazard"}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Guest Saved Route</h3>
                {guestPreviewOccupant ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-[#f4f4f5] px-3 py-3 text-sm dark:bg-[#18181b]">
                      <div className="font-medium">{guestPreviewOccupant.name}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        Room: {guestPreviewRoom}
                      </div>
                      {guestPreviewRoute ? (
                        <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                          Saved route distance: {guestPreviewDistance}m
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        Live reroute reacts to blocked BLE nodes and camera hazards automatically.
                      </div>
                    </div>
                    {guestPreviewRoute ? (
                      <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-zinc-800/80">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                          BLE sequence
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {guestPreviewBleAddresses.length > 0 ? (
                            guestPreviewBleAddresses.slice(0, 8).map((address) => (
                              <span key={address} className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                                {address}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-zinc-400">No BLE anchors yet on the saved route.</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#cbd5e1] px-3 py-3 text-xs text-slate-500 dark:border-[#334155] dark:text-zinc-400">
                        No safe guest route is available right now. Active hazards are blocking this guest path.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Guest route preview will appear once a valid BLE-linked route is available.
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Active Hazards</span>
                    <span className="font-semibold">{openIncidentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Total Nodes</span>
                    <span className="font-semibold">{state.graphNodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Occupants</span>
                    <span className="font-semibold">{state.occupants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">Camera Alerts</span>
                    <span className="font-semibold">{state.cameraDetections.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Simulation Feed</h3>
                {recentTrackingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {recentTrackingEvents.map((event) => (
                      <div key={event.id} className="rounded-lg bg-[#f4f4f5] px-3 py-2 text-xs dark:bg-[#18181b]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold uppercase tracking-[0.16em] text-[#175ead] dark:text-sky-300">
                            {event.kind.replaceAll("_", " ")}
                          </span>
                          <span className="text-slate-500 dark:text-zinc-400">
                            {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                        <div className="mt-1 text-[#18181b] dark:text-[#f4f4f5]">{event.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Simulation feed will show BLE locks, floor changes, camera alerts, and reroutes once the scenario starts.
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Live Camera Integration</h3>
                {floorCameraNodes.length > 0 ? (
                  <div className="space-y-2">
                    {floorCameraNodes.map((cameraNode) => (
                      <button
                        key={cameraNode.id}
                        onClick={() => {
                          if (cameraNode.cameraId) {
                            triggerCameraDetection(cameraNode.cameraId, { hazardType: "smoke", confidence: 0.93, frameCount: 4 });
                            setBlueprintStatus(`${cameraNode.label} pushed a live smoke alert into the routing engine.`);
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 dark:border-zinc-800/80 px-3 py-2 text-left text-sm hover:bg-[#f4f4f5] dark:hover:bg-[#18181b]"
                      >
                        <div className="font-medium">{cameraNode.label}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">
                          Trigger smoke event for {cameraNode.zoneId}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    No camera nodes on this floor yet. Generate from SVG or add cameras manually.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
