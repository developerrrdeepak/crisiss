"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FLOORS,
  type EvacEdge,
  type EvacNode,
  getFloorEdges,
  getFloorNodes,
  type FloorId,
} from "@/lib/evacuation";

interface FloorMarker {
  id: string;
  label: string;
  nodeId: string;
  tone: "guest" | "staff" | "camera";
  detail?: string;
}

export function EvacuationMap({
  floorId,
  floorPlanImageUrl,
  activeHazardNodeIds,
  avoidNodeIds = [],
  highlightedPath,
  selectedNodeId,
  markers = [],
  compact = false,
  dimensionsLabel,
  onNodeClick,
  onMarkerClick,
  onMapClick,
  graphNodes,
  graphEdges,
}: {
  floorId: FloorId;
  floorPlanImageUrl?: string | null;
  activeHazardNodeIds: string[];
  avoidNodeIds?: string[];
  highlightedPath?: string[] | null;
  selectedNodeId?: string | null;
  markers?: FloorMarker[];
  compact?: boolean;
  dimensionsLabel?: string;
  onNodeClick?: (nodeId: string) => void;
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: (x: number, y: number) => void;
  graphNodes?: EvacNode[];
  graphEdges?: EvacEdge[];
}) {
  const allNodes = graphNodes ?? undefined;
  const allEdges = graphEdges ?? undefined;
  const nodes = getFloorNodes(floorId, allNodes);
  const edges = getFloorEdges(floorId, allNodes, allEdges);
  const localNodesById = Object.fromEntries((allNodes ?? nodes).map((node) => [node.id, node])) as Record<string, EvacNode>;
  const floorMeta = FLOORS.find((floor) => floor.id === floorId);
  const hazardSet = new Set(activeHazardNodeIds);
  const avoidSet = new Set(avoidNodeIds);
  const routeSet = new Set(highlightedPath || []);
  const markersByNodeId = markers.reduce((map, marker) => {
    const existing = map.get(marker.nodeId) ?? [];
    existing.push(marker);
    map.set(marker.nodeId, existing);
    return map;
  }, new Map<string, FloorMarker[]>());
  const hazardCountOnFloor = nodes.filter((node) => hazardSet.has(node.id)).length;
  const routeNodeCount = highlightedPath?.length ?? 0;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const nextImage = floorPlanImageUrl;
    if (!nextImage) {
      setImageSize(null);
      return;
    }

    let active = true;
    const image = new window.Image();
    image.onload = () => {
      if (!active) {
        return;
      }
      const naturalWidth = image.naturalWidth || image.width || 1600;
      const naturalHeight = image.naturalHeight || image.height || 1000;
      setImageSize({ width: naturalWidth, height: naturalHeight });
    };
    image.onerror = () => {
      if (active) {
        setImageSize(null);
      }
    };
    image.src = nextImage;

    return () => {
      active = false;
    };
  }, [floorPlanImageUrl]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) {
      return;
    }

    const syncSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    };

    syncSize();
    const observer = new ResizeObserver(() => syncSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const imageFrame = useMemo(() => {
    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    if (containerWidth <= 0 || containerHeight <= 0) {
      return {
        leftPx: 0,
        topPx: 0,
        widthPx: 0,
        heightPx: 0,
        leftPct: 5,
        topPct: 5,
        widthPct: 90,
        heightPct: 90,
      };
    }

    const insetLeftPx = containerWidth * 0.05;
    const insetTopPx = containerHeight * 0.05;
    const insetWidthPx = containerWidth * 0.9;
    const insetHeightPx = containerHeight * 0.9;
    if (!floorPlanImageUrl || !imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
      return {
        leftPx: insetLeftPx,
        topPx: insetTopPx,
        widthPx: insetWidthPx,
        heightPx: insetHeightPx,
        leftPct: 5,
        topPct: 5,
        widthPct: 90,
        heightPct: 90,
      };
    }

    const frameAspect = insetWidthPx / insetHeightPx;
    const imageAspect = imageSize.width / imageSize.height;
    let widthPx = insetWidthPx;
    let heightPx = insetHeightPx;
    let leftPx = insetLeftPx;
    let topPx = insetTopPx;

    if (imageAspect > frameAspect) {
      heightPx = insetWidthPx / imageAspect;
      topPx = insetTopPx + (insetHeightPx - heightPx) / 2;
    } else {
      widthPx = insetHeightPx * imageAspect;
      leftPx = insetLeftPx + (insetWidthPx - widthPx) / 2;
    }

    return {
      leftPx,
      topPx,
      widthPx,
      heightPx,
      leftPct: (leftPx / containerWidth) * 100,
      topPct: (topPx / containerHeight) * 100,
      widthPct: (widthPx / containerWidth) * 100,
      heightPct: (heightPx / containerHeight) * 100,
    };
  }, [containerSize.height, containerSize.width, floorPlanImageUrl, imageSize]);

  const projectX = (value: number) => `${imageFrame.leftPct + (value / 100) * imageFrame.widthPct}%`;
  const projectY = (value: number) => `${imageFrame.topPct + (value / 100) * imageFrame.heightPct}%`;
  const projectMountedX = (node: EvacNode) => projectX(node.mountX ?? node.x);
  const projectMountedY = (node: EvacNode) => projectY(node.mountY ?? node.y);
  const mountedHardwareNodes = nodes.filter(
    (node) =>
      typeof node.mountX === "number" &&
      typeof node.mountY === "number" &&
      (Math.abs(node.mountX - node.x) > 0.15 || Math.abs(node.mountY - node.y) > 0.15)
  );

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onMapClick || !mapRef.current || imageFrame.widthPx <= 0 || imageFrame.heightPx <= 0) {
      return;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    if (
      localX < imageFrame.leftPx ||
      localX > imageFrame.leftPx + imageFrame.widthPx ||
      localY < imageFrame.topPx ||
      localY > imageFrame.topPx + imageFrame.heightPx
    ) {
      return;
    }

    const x = ((localX - imageFrame.leftPx) / imageFrame.widthPx) * 100;
    const y = ((localY - imageFrame.topPx) / imageFrame.heightPx) * 100;
    onMapClick(Number(x.toFixed(2)), Number(y.toFixed(2)));
  };

  return (
    <div
      ref={mapRef}
      className={`relative w-full overflow-hidden border border-[#c9d8ea] bg-[#edf4fb] shadow-[0_18px_50px_rgba(15,23,42,0.12)] ${
        compact ? "aspect-[16/11] min-h-[280px] rounded-[1.35rem]" : "aspect-[16/10] min-h-[620px] rounded-[1.75rem]"
      }`}
      onClick={handleContainerClick}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7fbff_0%,#ebf3fb_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] tactical-grid" />
      <div className="absolute inset-[3%] rounded-[1.45rem] border border-[#d5e1ee] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />
      {floorPlanImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={floorPlanImageUrl}
          alt={`${floorMeta?.label} floor plan`}
          className="pointer-events-none absolute inset-[5%] h-[90%] w-[90%] object-contain"
        />
      ) : (
        <div className="pointer-events-none absolute inset-[5%] flex h-[90%] w-[90%] items-center justify-center rounded-[1.25rem] border border-dashed border-[#cbd5e1] bg-[rgba(255,255,255,0.62)] px-6 text-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#64748b]">No Uploaded Map</p>
            <p className="mt-2 text-sm font-medium text-[#0f172a]">
              Admin upload ke baad isi blueprint par live simulation render hogi.
            </p>
          </div>
        </div>
      )}
      <div className={`absolute left-[4.5%] top-[4.5%] rounded-[1rem] border border-[#cfdded] bg-[rgba(255,255,255,0.92)] shadow-sm ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <p className={`font-black uppercase text-[#175ead] ${compact ? "text-[9px] tracking-[0.16em]" : "text-[10px] tracking-[0.2em]"}`}>Floor Plan</p>
        <p className={`mt-1 font-semibold text-[#081d2c] ${compact ? "text-xs" : "text-sm"}`}>{floorMeta?.label}</p>
      </div>
      <div className={`absolute right-[4.5%] top-[4.5%] flex ${compact ? "gap-1.5" : "gap-2"}`}>
        <div className={`rounded-[1rem] border border-[#cfdded] bg-[rgba(255,255,255,0.92)] text-center shadow-sm ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <p className={`uppercase tracking-[0.18em] text-[#64748b] ${compact ? "text-[8px]" : "text-[9px]"}`}>Hazards</p>
          <p className={`mt-1 font-black text-[#081d2c] ${compact ? "text-xs" : "text-sm"}`}>{hazardCountOnFloor}</p>
        </div>
        <div className={`rounded-[1rem] border border-[#cfdded] bg-[rgba(255,255,255,0.92)] text-center shadow-sm ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <p className={`uppercase tracking-[0.18em] text-[#64748b] ${compact ? "text-[8px]" : "text-[9px]"}`}>Route</p>
          <p className={`mt-1 font-black text-[#081d2c] ${compact ? "text-xs" : "text-sm"}`}>{routeNodeCount}</p>
        </div>
      </div>

      <svg className="absolute inset-0 h-full w-full">
        {edges.map((edge) => {
          const from = localNodesById[edge.from];
          const to = localNodesById[edge.to];
          if (!from || !to) {
            return null;
          }
          const isHighlighted =
            highlightedPath &&
            routeSet.has(from.id) &&
            routeSet.has(to.id) &&
            Math.abs(highlightedPath.indexOf(from.id) - highlightedPath.indexOf(to.id)) === 1;

          return (
            <g key={edge.id}>
              {isHighlighted && (
                <line
                  x1={projectX(from.x)}
                  y1={projectY(from.y)}
                  x2={projectX(to.x)}
                  y2={projectY(to.y)}
                  stroke="#0ea5e9"
                  strokeWidth={8}
                  opacity={0.12}
                  strokeLinecap="round"
                />
              )}
              <line
                x1={projectX(from.x)}
                y1={projectY(from.y)}
                x2={projectX(to.x)}
                y2={projectY(to.y)}
                stroke={isHighlighted ? "#0284c7" : edge.kind === "stairs" ? "#2563eb" : "#94a3b8"}
                strokeWidth={isHighlighted ? 4 : edge.kind === "corridor" ? 2 : 3}
                strokeDasharray={edge.kind === "stairs" ? "7 4" : undefined}
                opacity={isHighlighted ? 1 : 0.8}
                strokeLinecap="round"
                className={isHighlighted ? "animate-pulse" : undefined}
              />
            </g>
          );
        })}
        {(highlightedPath ?? []).map((nodeId) => {
          const node = localNodesById[nodeId];
          if (!node) {
            return null;
          }

          return (
            <circle
              key={`${nodeId}-route`}
              cx={projectX(node.x)}
              cy={projectY(node.y)}
              r="8"
              fill="rgba(14, 165, 233, 0.12)"
              stroke="#0284c7"
              strokeWidth="2"
              className="animate-pulse"
            />
          );
        })}
        {mountedHardwareNodes.map((node) => (
          <line
            key={`${node.id}-mount-link`}
            x1={projectX(node.x)}
            y1={projectY(node.y)}
            x2={projectMountedX(node)}
            y2={projectMountedY(node)}
            stroke={node.type === "camera" ? "#8b5cf6" : "#06b6d4"}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.65}
          />
        ))}
      </svg>

      {nodes.map((node) => {
        const isHazard = hazardSet.has(node.id);
        const isAvoid = !isHazard && avoidSet.has(node.id);
        const isSelected = selectedNodeId === node.id;
        const isOnRoute = routeSet.has(node.id);
        const logicalNodeMarkers = markersByNodeId.get(node.id) ?? [];
        const nodeMarkers: FloorMarker[] = [];
        const beacon = node.type === "beacon";
        let width = 18;
        let height = 18;
        let shapeClass = "rounded-full border border-[#475569] bg-white";
        let inlineLabel = "";
        let inlineLabelClass = "text-[10px] font-black uppercase tracking-[0.14em] text-[#081d2c]";

        if (node.type === "beacon") {
          width = 8;
          height = 8;
          shapeClass = "rounded-full border border-[#0891b2] bg-[#22d3ee]";
          if (logicalNodeMarkers.length > 0) {
            width = 14;
            height = 14;
            shapeClass = "rounded-full border-2 border-[#0369a1] bg-[#67e8f9] shadow-[0_0_0_4px_rgba(14,165,233,0.14)]";
          }
        } else if (node.type === "room") {
          width = 56;
          height = 36;
          shapeClass = "rounded-[0.9rem] border border-[#cbd5e1] bg-[rgba(255,255,255,0.88)] shadow-sm";
          inlineLabel = node.label.replace("Room ", "");
          inlineLabelClass = "text-[11px] font-black uppercase tracking-[0.08em] text-[#0f172a]";
        } else if (node.type === "stair") {
          width = 56;
          height = 48;
          shapeClass = "rounded-[1rem] border border-[#2563eb] bg-[#eff6ff] shadow-sm";
          inlineLabel = node.label;
          inlineLabelClass = "px-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#1d4ed8]";
        } else if (node.type === "elevator") {
          width = 60;
          height = 54;
          shapeClass = "rounded-[1rem] border border-[#ea580c] bg-[#fff7ed] shadow-sm";
          inlineLabel = node.label;
          inlineLabelClass = "px-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#c2410c]";
        } else if (node.type === "exit") {
          width = 62;
          height = 34;
          shapeClass = "rounded-[0.9rem] border border-emerald-500 bg-[#ecfdf5] shadow-sm";
          inlineLabel = node.label;
          inlineLabelClass = "px-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#047857]";
        } else if (node.type === "camera") {
          width = 34;
          height = 34;
          shapeClass = "rounded-full border border-violet-500 bg-[#f5f3ff] shadow-sm";
          inlineLabel = "CAM";
          inlineLabelClass = "text-[9px] font-black uppercase tracking-[0.12em] text-[#6d28d9]";
        } else if (node.type === "checkpoint") {
          width = 52;
          height = 34;
          shapeClass = "rounded-[0.9rem] border border-teal-500 bg-[#f0fdfa] shadow-sm";
          inlineLabel = node.label;
          inlineLabelClass = "px-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#0f766e]";
        }

        if (isOnRoute && node.type !== "exit") {
          shapeClass = shapeClass.replace(/bg-\[[^\]]+\]|bg-[a-z]+-\d+/g, "bg-[#e0f2fe]");
        }
        if (isHazard) {
          shapeClass = shapeClass.replace(/bg-\[[^\]]+\]|bg-[a-z]+-\d+/g, "bg-[#fee2e2]");
        } else if (isAvoid) {
          shapeClass = shapeClass.replace(/bg-\[[^\]]+\]|bg-[a-z]+-\d+/g, "bg-[#fef3c7]");
        }
        const showLabel = isSelected && !beacon && !inlineLabel;

        return (
          <button
            key={node.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNodeClick?.(node.id);
            }}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-all duration-200 hover:scale-105 ${shapeClass} ${isSelected ? "ring-2 ring-[#0f172a]" : ""} ${isHazard ? "ring-2 ring-red-400/70" : ""} ${isAvoid ? "ring-2 ring-amber-400/70" : ""}`}
            style={{
              left: projectMountedX(node),
              top: projectMountedY(node),
              width,
              height,
            }}
          >
            <span className="sr-only">{node.label}</span>
            {(isHazard || isSelected) && (
              <span
                className={`signal-orbit pointer-events-none absolute inset-[-8px] rounded-full border ${
                  isHazard ? "border-red-400/50" : "border-slate-500/35"
                }`}
              />
            )}
            {inlineLabel ? <span className={inlineLabelClass}>{inlineLabel}</span> : null}
            {nodeMarkers.length > 0 ? (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 items-center gap-1">
                {nodeMarkers.slice(0, 2).map((marker) => (
                  <span
                    key={marker.id}
                    className={`flex h-6 items-center justify-center rounded-full border border-white/80 px-2 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-md ${
                      marker.tone === "guest"
                        ? "bg-[#0f766e]"
                        : marker.tone === "staff"
                          ? "bg-[#175ead]"
                          : "bg-[#7c3aed]"
                    }`}
                    title={marker.detail ? `${marker.label} • ${marker.detail}` : marker.label}
                  >
                    {marker.label}
                  </span>
                ))}
                {nodeMarkers.length > 2 ? (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full border border-white/80 bg-[#0f172a] px-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-md">
                    +{nodeMarkers.length - 2}
                  </span>
                ) : null}
              </span>
            ) : null}
            {showLabel && (
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 min-w-max -translate-x-1/2 rounded-full border border-white/10 bg-[#d8e6ff] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#031327] shadow-md">
                {node.label}
              </span>
            )}
          </button>
        );
      })}

      {nodes.map((node) => {
        const nodeMarkers = markersByNodeId.get(node.id) ?? [];
        if (nodeMarkers.length === 0) {
          return null;
        }

        return (
          <div
            key={`${node.id}-logical-markers`}
            className="absolute left-0 top-0 z-20"
            style={{
              left: projectX(node.x),
              top: projectY(node.y),
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <div className="flex items-center gap-1">
              {nodeMarkers.slice(0, 2).map((marker) => (
                <button
                  key={marker.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkerClick?.(marker.id);
                  }}
                  className={`flex h-6 items-center justify-center rounded-full border border-white/80 px-2 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-md ${
                    marker.tone === "guest"
                      ? "bg-[#0f766e]"
                      : marker.tone === "staff"
                        ? "bg-[#175ead]"
                        : "bg-[#7c3aed]"
                  }`}
                  title={marker.detail ? `${marker.label} | ${marker.detail}` : marker.label}
                >
                  {marker.label}
                </button>
              ))}
              {nodeMarkers.length > 2 ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full border border-white/80 bg-[#0f172a] px-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-md">
                  +{nodeMarkers.length - 2}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className={`absolute bottom-[4.5%] left-[4.5%] flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
        <div className="rounded-full border border-[#cfdded] bg-[rgba(255,255,255,0.94)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#334155]">
          Blue: route
        </div>
        <div className="rounded-full border border-[#cfdded] bg-[rgba(255,255,255,0.94)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#334155]">
          Cyan: beacons
        </div>
        <div className="rounded-full border border-[#cfdded] bg-[rgba(255,255,255,0.94)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#334155]">
          Teal: entry
        </div>
        <div className="rounded-full border border-[#cfdded] bg-[rgba(255,255,255,0.94)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#334155]">
          Red: blocked
        </div>
        {mountedHardwareNodes.length > 0 ? (
          <div className="rounded-full border border-[#cfdded] bg-[rgba(255,255,255,0.94)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#334155]">
            Tether: mounted hardware
          </div>
        ) : null}
      </div>

      <div className={`absolute bottom-[4.5%] right-[4.5%] rounded-[1rem] border border-[#cfdded] bg-[rgba(255,255,255,0.94)] text-right shadow-sm ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <p className={`font-black uppercase tracking-[0.22em] text-[#64748b] ${compact ? "text-[8px]" : "text-[10px]"}`}>Status</p>
        <p className={`mt-1 font-semibold text-[#0f172a] ${compact ? "text-xs" : "text-sm"}`}>
          {routeNodeCount > 0 ? "Route ready" : "Monitoring"}
        </p>
        <p className={`mt-1 text-[#64748b] ${compact ? "text-[10px]" : "text-xs"}`}>
          {hazardCountOnFloor > 0
            ? `${hazardCountOnFloor} hazard nodes affecting pathing`
            : "No active floor-specific reroute pressure"}
        </p>
        {dimensionsLabel ? (
          <p className={`mt-1 text-[#64748b] ${compact ? "text-[10px]" : "text-xs"}`}>{dimensionsLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
