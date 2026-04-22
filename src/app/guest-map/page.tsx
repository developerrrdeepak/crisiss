"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GuestSidebar } from "@/components/GuestSidebar";
import { EvacuationMap } from "@/components/evacuation/EvacuationMap";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useEvacuationSimulation } from "@/hooks/useEvacuationSimulation";
import { getBeaconModeCopy } from "@/lib/beacon-mode";
import {
  calculateRouteDistanceMeters,
  createGraphSnapshot,
  FLOORS,
  buildRouteSteps,
  findSafeExitPath,
  getOccupantById,
  getRouteBleAddresses,
  getRouteFloors,
  getTrackingStatus,
  type FloorId,
} from "@/lib/evacuation";

export default function GuestMap() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeFloorId, setActiveFloorId] = useState<FloorId>("floor_6");
  const { dbUser } = useAuthSync("guest");
  const roomNumber = dbUser?.roomNumber || dbUser?.room || "Pending";
  const { state, moveOccupant, setSelectedGuest } = useEvacuationSimulation();
  const beaconCopy = getBeaconModeCopy();
  const graph = createGraphSnapshot(state.graphNodes, state.graphEdges);
  const graphNodesById = graph.nodesById;
  const guest = getOccupantById(state, state.selectedGuestId);
  const guestCurrentNode = guest ? graphNodesById[guest.currentNodeId] ?? null : null;
  const guestStartNode = guest ? graphNodesById[guest.startNodeId] ?? guestCurrentNode : null;
  const route = guestCurrentNode ? findSafeExitPath(guestCurrentNode.id, state, graph) : null;
  const steps = route ? buildRouteSteps(route, graph) : [];
  const routeFloors = route ? getRouteFloors(route, graph) : [];
  const routeDistance = route ? calculateRouteDistanceMeters(route, graph, state.floorDimensions) : 0;
  const routeBleAddresses = route ? getRouteBleAddresses(route, graph) : [];
  const trackingStatus = guest ? getTrackingStatus(guest, state, graph) : null;
  const guestTrackingEvents = state.trackingEvents.filter((event) => event.occupantId === guest?.id).slice(0, 6);
  const hasDemoGraph = state.graphNodes.length > 0 && Object.keys(state.floorPlanImages).length > 0;

  useEffect(() => {
    if (guestCurrentNode) {
      setActiveFloorId(guestCurrentNode.floorId);
    }
  }, [guestCurrentNode]);

  const floorMarkers =
    guest && guestCurrentNode?.floorId === activeFloorId
      ? [{ id: guest.id, label: "You", nodeId: guestCurrentNode.id, tone: "guest" as const }]
      : [];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f7f9ff] font-['Outfit'] text-[#081d2c] transition-colors dark:bg-[#0a0a0a] dark:text-[#e5e2e1]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-[#175ead]/5 blur-[100px] dark:bg-[#175ead]/10" />
      </div>

      <DashboardHeader
        title="Emergency Route"
        subtitle="Local Guest Preview"
        userName={dbUser?.name || "Guest"}
        role={`Room ${roomNumber}`}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden pt-16">
        <GuestSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <div className="flex flex-1 flex-col overflow-auto p-4">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <section className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/5 dark:bg-[#111827]/60">
              <div className="flex flex-wrap gap-2">
                {FLOORS.map((floor) => (
                  <button
                    key={floor.id}
                    type="button"
                    onClick={() => setActiveFloorId(floor.id)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                      activeFloorId === floor.id
                        ? "bg-[#081d2c] text-white dark:bg-white dark:text-[#081d2c]"
                        : "border border-[#d5dbe6] bg-white/70 text-[#414753] dark:border-[#27272a] dark:bg-[#111827] dark:text-[#c1c6d5]"
                    }`}
                  >
                    {floor.label}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <EvacuationMap
                  floorId={activeFloorId}
                  floorPlanImageUrl={state.floorPlanImages[activeFloorId] ?? null}
                  dimensionsLabel={`${state.floorDimensions[activeFloorId].widthMeters}m x ${state.floorDimensions[activeFloorId].heightMeters}m`}
                  activeHazardNodeIds={state.activeHazardNodeIds}
                  avoidNodeIds={state.avoidNodeIds}
                  highlightedPath={hasDemoGraph ? route : null}
                  markers={floorMarkers}
                  graphNodes={hasDemoGraph ? state.graphNodes : []}
                  graphEdges={hasDemoGraph ? state.graphEdges : []}
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/5 dark:bg-[#111827]/60">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#175ead]">
                  Start Point
                </p>
                <h3 className="mt-2 text-xl font-black">Choose anchor checkpoint</h3>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#c1c6d5]">
                  {beaconCopy.mapMotionSummary}
                </p>
                <select
                  value={state.selectedGuestId || ""}
                  onChange={(event) => setSelectedGuest(event.target.value)}
                  className="mt-4 w-full rounded-2xl border border-[#d5dbe6] bg-white px-4 py-3 text-sm dark:border-[#27272a] dark:bg-[#0f1720]"
                >
                  {state.occupants.filter((occupant) => occupant.role === "guest").length === 0 ? (
                    <option value="">Build demo from admin map first</option>
                  ) : null}
                  {state.occupants
                    .filter((occupant) => occupant.role === "guest")
                    .map((occupant) => (
                      <option key={occupant.id} value={occupant.id}>
                        {occupant.name}
                      </option>
                    ))}
                </select>
                <select
                  value={guest?.startNodeId ?? ""}
                  onChange={(event) => guest && moveOccupant(guest.id, event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-[#d5dbe6] bg-white px-4 py-3 text-sm dark:border-[#27272a] dark:bg-[#0f1720]"
                >
                  {!hasDemoGraph ? <option value="">No active demo graph yet</option> : null}
                  {Object.values(graphNodesById)
                    .filter((node) => node.checkpoint)
                    .map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label} | {node.floorId.replace("_", " ")}
                      </option>
                    ))}
                </select>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/5 dark:bg-[#111827]/60">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f766e]">
                  Live Tracking
                </p>
                <h3 className="mt-2 text-xl font-black">Staircase and corridor inference</h3>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#c1c6d5]">
                  {beaconCopy.trackingStackSummary}
                </p>
                {trackingStatus ? (
                  <>
                    <div className="mt-4 rounded-2xl bg-white px-4 py-4 dark:bg-[#0a0a0a]">
                      <p className="text-sm font-bold">
                        {trackingStatus.currentNodeLabel} | {trackingStatus.currentFloorLabel}
                      </p>
                      <p className="mt-2 text-sm text-[#175ead] dark:text-[#7dd3fc]">
                        {trackingStatus.nextInstruction}
                      </p>
                      <p className="mt-2 text-xs text-[#717785] dark:text-[#c1c6d5]">
                        Tracking mode: {trackingStatus.trackingMode} | Confidence:{" "}
                        {Math.round(trackingStatus.confidence * 100)}%
                      </p>
                      <div className="mt-3 space-y-2">
                        {trackingStatus.evidence.map((item) => (
                          <div
                            key={item}
                            className="rounded-xl bg-[#f7f9ff] px-3 py-2 text-xs dark:bg-[#111827]"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {guestTrackingEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-[#0a0a0a]"
                        >
                          <p className="font-bold">{event.message}</p>
                          <p className="mt-1 text-xs text-[#717785] dark:text-[#c1c6d5]">
                            {event.kind.replace("_", " ")} | source: {event.source} | {event.floorId.replace("_", " ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    Tracking engine is waiting for a valid route.
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/5 dark:bg-[#111827]/60">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bc000a]">
                  Active Route
                </p>
                <h3 className="mt-2 text-xl font-black">{guest?.name || "Guest route"}</h3>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#c1c6d5]">
                  Incident mode: {state.incidentMode.toUpperCase()} | Floors crossed:{" "}
                  {routeFloors.join(" -> ")}
                </p>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#c1c6d5]">
                  Saved route distance: {routeDistance}m | {beaconCopy.routeCountLabel}: {routeBleAddresses.length}
                </p>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#c1c6d5]">
                  Live position: {guestCurrentNode?.label || "Unknown"} | Start anchor:{" "}
                  {guestStartNode?.label || "Unknown"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {routeBleAddresses.slice(0, 8).map((address) => (
                    <span
                      key={address}
                      className="rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
                    >
                      {address}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {steps.length > 0 ? (
                    steps.map((step) => (
                      <div key={step} className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-[#0a0a0a]">
                        {step}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      No safe exit available from the selected checkpoint.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
