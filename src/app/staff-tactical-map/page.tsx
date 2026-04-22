"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StaffSidebar } from "@/components/StaffSidebar";
import { EvacuationMap } from "@/components/evacuation/EvacuationMap";
import { useEvacuationSimulation } from "@/hooks/useEvacuationSimulation";
import { useSocket } from "@/hooks/useSocket";
import { useRadio } from "@/hooks/useRadio";
import { getBeaconModeCopy } from "@/lib/beacon-mode";
import {
  createGraphSnapshot,
  FLOORS,
  buildRouteSteps,
  findResponsePath,
  getOccupantById,
  getRouteFloors,
  type FloorId,
} from "@/lib/evacuation";
import { useAuthSync } from "@/hooks/useAuthSync";

export default function StaffTacticalMap() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeFloorId, setActiveFloorId] = useState<FloorId>("floor_4");
  const { dbUser } = useAuthSync();
  const { state, moveOccupant, setSelectedStaff } = useEvacuationSimulation({
    sourceRole: "staff",
  });
  const beaconCopy = getBeaconModeCopy();
  const socket = useSocket("staff");
  const graph = createGraphSnapshot(state.graphNodes, state.graphEdges);
  const graphNodesById = graph.nodesById;
  const currentStaffIdentity = useMemo(
    () =>
      [
        dbUser?.id,
        dbUser?.firebaseUid,
        dbUser?.employeeId,
        dbUser?.name?.toLowerCase(),
      ].filter((value): value is string => Boolean(value)),
    [dbUser?.employeeId, dbUser?.firebaseUid, dbUser?.id, dbUser?.name]
  );
  const matchedStaffOccupant =
    state.occupants.find(
      (occupant) =>
        occupant.role === "staff" &&
        (
          currentStaffIdentity.includes(occupant.userId ?? "") ||
          currentStaffIdentity.includes(occupant.name.toLowerCase()) ||
          currentStaffIdentity.includes((occupant.staffRole ?? "").toLowerCase())
        )
    ) ?? null;
  const selectedStaff = matchedStaffOccupant ?? getOccupantById(state, state.selectedStaffId);
  const selectedStaffCurrentNode = selectedStaff ? graphNodesById[selectedStaff.currentNodeId] ?? null : null;
  const activeCommandChannel =
    selectedStaff?.commsChannelId ??
    (dbUser?.employeeId ? `channel-staff-${dbUser.employeeId.toLowerCase()}` : "");
  const { isMicActive, toggleMic } = useRadio(socket, activeCommandChannel);
  const responseTargetId = selectedStaff?.targetNodeId || state.activeHazardNodeIds[0];
  const responseTargetNode = responseTargetId ? graphNodesById[responseTargetId] ?? null : null;
  const responsePath =
    selectedStaffCurrentNode && responseTargetNode
      ? findResponsePath(selectedStaffCurrentNode.id, responseTargetNode.id, state, graph)
      : null;
  const responseFloors = responsePath ? getRouteFloors(responsePath, graph) : [];
  const hasDemoGraph = state.graphNodes.length > 0 && Object.keys(state.floorPlanImages).length > 0;

  useEffect(() => {
    if (matchedStaffOccupant && matchedStaffOccupant.id !== state.selectedStaffId) {
      setSelectedStaff(matchedStaffOccupant.id);
    }
  }, [matchedStaffOccupant, setSelectedStaff, state.selectedStaffId]);

  useEffect(() => {
    if (selectedStaffCurrentNode) {
      setActiveFloorId(selectedStaffCurrentNode.floorId);
    }
  }, [selectedStaffCurrentNode]);

  const floorMarkers = state.occupants.flatMap((occupant) => {
    const node = graphNodesById[occupant.currentNodeId];
    if (!node || node.floorId !== activeFloorId) {
      return [];
    }
    return [
      {
        id: occupant.id,
        label: occupant.role === "staff" ? "S" : "G",
        nodeId: occupant.currentNodeId,
        tone: occupant.role === "guest" ? "guest" : "staff",
      } as const,
    ];
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9ff] font-['Outfit'] text-[#081d2c] transition-colors dark:bg-[#0a0a0a] dark:text-[#e5e2e1]">
      <DashboardHeader
        title="Responder Map"
        subtitle="Local Staff Simulation"
        userName={dbUser?.name || "Staff Member"}
        role={dbUser?.role ? dbUser.role.toUpperCase() : "STAFF"}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden pt-16">
        <StaffSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
            <section className="rounded-[2rem] border border-[#d5dbe6] bg-white p-5 shadow-xl dark:border-[#27272a] dark:bg-[#09090b]">
              <div className="flex flex-wrap gap-2">
                {FLOORS.map((floor) => (
                  <button
                    key={floor.id}
                    type="button"
                    onClick={() => setActiveFloorId(floor.id)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                      activeFloorId === floor.id
                        ? "bg-[#081d2c] text-white dark:bg-white dark:text-[#081d2c]"
                        : "border border-[#d5dbe6] bg-[#f8fbff] text-[#414753] dark:border-[#27272a] dark:bg-[#111827] dark:text-[#c1c6d5]"
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
                  activeHazardNodeIds={state.activeHazardNodeIds}
                  avoidNodeIds={state.avoidNodeIds}
                  highlightedPath={hasDemoGraph ? responsePath : null}
                  markers={floorMarkers}
                  graphNodes={hasDemoGraph ? state.graphNodes : []}
                  graphEdges={hasDemoGraph ? state.graphEdges : []}
                />
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[2rem] border border-[#d5dbe6] bg-white p-5 shadow-xl dark:border-[#27272a] dark:bg-[#09090b]">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#175ead]">
                  Dispatch Unit
                </p>
                <select
                  value={state.selectedStaffId || ""}
                  onChange={(event) => setSelectedStaff(event.target.value)}
                  className="mt-4 w-full rounded-2xl border border-[#d5dbe6] bg-[#f8fbff] px-4 py-3 text-sm dark:border-[#27272a] dark:bg-[#111827]"
                >
                  {state.occupants.filter((occupant) => occupant.role === "staff").length === 0 ? (
                    <option value="">Build demo from admin map first</option>
                  ) : null}
                  {state.occupants
                    .filter((occupant) => occupant.role === "staff")
                    .map((occupant) => (
                      <option key={occupant.id} value={occupant.id}>
                        {occupant.name}
                      </option>
                    ))}
                </select>
                <select
                  value={selectedStaff?.startNodeId ?? ""}
                  onChange={(event) => selectedStaff && moveOccupant(selectedStaff.id, event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-[#d5dbe6] bg-[#f8fbff] px-4 py-3 text-sm dark:border-[#27272a] dark:bg-[#111827]"
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
              </section>

              <section className="rounded-[2rem] border border-[#d5dbe6] bg-white p-5 shadow-xl dark:border-[#27272a] dark:bg-[#09090b]">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#175ead]">
                  Command Bridge
                </p>
                <h3 className="mt-2 text-xl font-black">{selectedStaff?.name || "Awaiting mapped responder"}</h3>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#a1a1aa]">
                  Channel: {activeCommandChannel || "No staff bridge assigned yet"}
                </p>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#a1a1aa]">
                  {beaconCopy.liveLockLabel}: {selectedStaff?.lastBeaconSignal?.address ?? beaconCopy.pendingLockLabel} | Confidence: {Math.round((selectedStaff?.trackingConfidence ?? 0) * 100)}%
                </p>
                <button
                  type="button"
                  onClick={() => void toggleMic()}
                  disabled={!activeCommandChannel}
                  className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                    isMicActive ? "bg-red-600" : "bg-[#175ead]"
                  }`}
                >
                  {isMicActive ? "Mute Staff Mic" : "Open Staff Mic"}
                </button>
              </section>

              <section className="rounded-[2rem] border border-[#d5dbe6] bg-white p-5 shadow-xl dark:border-[#27272a] dark:bg-[#09090b]">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#bc000a]">
                  Response Route
                </p>
                <h3 className="mt-2 text-xl font-black">{selectedStaff?.assignment || "No assignment"}</h3>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#a1a1aa]">
                  Objective: {responseTargetNode?.label || "None"}
                </p>
                <p className="mt-2 text-sm text-[#717785] dark:text-[#a1a1aa]">
                  Live position: {selectedStaffCurrentNode?.label || "Unknown"} | Floors:{" "}
                  {responseFloors.join(" -> ")}
                </p>
                <div className="mt-4 space-y-2">
                  {(responsePath ? buildRouteSteps(responsePath, graph) : ["No safe response path available"]).map(
                    (step) => (
                      <div
                        key={step}
                        className="rounded-2xl bg-[#f8fbff] px-4 py-3 text-sm dark:bg-[#111827]"
                      >
                        {step}
                      </div>
                    )
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
