"use client";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useState, useEffect, useMemo } from "react";
import { GuestSidebar } from "@/components/GuestSidebar";
import { EvacuationMap } from "@/components/evacuation/EvacuationMap";
import { DashboardMessagingCard } from "@/components/messaging/DashboardMessagingCard";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useEvacuationSimulation } from "@/hooks/useEvacuationSimulation";
import { useMessagingOverview } from "@/hooks/useMessagingOverview";
import { useSocket } from "@/hooks/useSocket";
import { useRadio } from "@/hooks/useRadio";
import { getBeaconModeCopy } from "@/lib/beacon-mode";
import {
  MessagingViewer,
  buildAllGuestsThread,
  buildGuestDirectThread,
} from "@/lib/messaging";
import {
  buildRouteSteps,
  calculateRouteDistanceMeters,
  createGraphSnapshot,
  getOccupantById,
  getOccupantRoute,
  getRouteBleAddresses,
  getTrackingStatus,
  type FloorId,
} from "@/lib/evacuation";

function getRoomStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "occupied": return { label: "Occupied", cls: "text-red-500 dark:text-red-400" };
    case "cleaning": return { label: "Being Cleaned", cls: "text-blue-500 dark:text-blue-400" };
    case "maintenance": return { label: "Maintenance", cls: "text-yellow-500 dark:text-yellow-400" };
    default: return { label: "Ready", cls: "text-emerald-500 dark:text-emerald-400" };
  }
}

export default function GuestDashboard() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { dbUser } = useAuthSync("guest");
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const { state } = useEvacuationSimulation({ sourceRole: "guest" });
  const socket = useSocket("guest");

  const guestName = dbUser?.name || "Guest";
  const firstName = guestName.split(" ")[0] || "Guest";
  const roomNumber = dbUser?.roomNumber || dbUser?.room || "Pending";
  const beaconCopy = getBeaconModeCopy();
  const checkoutLabel = dbUser?.checkOut
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(
        new Date(dbUser.checkOut)
      )
    : "your scheduled checkout";
  const statusLabel = dbUser?.status || "Verified";
  const normalizedRoomNumber = String(dbUser?.roomNumber || dbUser?.room || "").toUpperCase();
  const messagingViewer = useMemo<MessagingViewer | null>(() => {
    if (!dbUser?.id) return null;

    const profileId = dbUser.profileId || dbUser.id;

    return {
      role: "guest",
      userId: profileId,
      aliasIds: [dbUser.id, dbUser.loginId ?? null, dbUser.firebaseUid].filter(
        (value): value is string => Boolean(value)
      ),
      name: dbUser.name || "Guest",
      roomNumber: dbUser.roomNumber || dbUser.room || null,
    };
  }, [dbUser]);
  const messagingBaseThreads = useMemo(() => {
    if (!messagingViewer) return [];

    return [
      buildGuestDirectThread(messagingViewer, {
        id: messagingViewer.userId,
        name: messagingViewer.name,
        roomNumber: messagingViewer.roomNumber,
      }),
      buildAllGuestsThread(messagingViewer),
    ];
  }, [messagingViewer]);
  const directThreadId =
    messagingViewer &&
    buildGuestDirectThread(messagingViewer, {
      id: messagingViewer.userId,
      name: messagingViewer.name,
      roomNumber: messagingViewer.roomNumber,
    }).id;
  const announcementsThreadId =
    messagingViewer ? buildAllGuestsThread(messagingViewer).id : null;
  const {
    recentThreads: recentMessageThreads,
    totalThreads: totalMessageThreads,
    activeThreads: activeMessageThreads,
    loading: messagingLoading,
    error: messagingError,
  } = useMessagingOverview({
    viewer: messagingViewer,
    baseThreads: messagingBaseThreads,
  });

  useEffect(() => {
    if (!dbUser?.id) return;
    void fetch(`/api/guest/details?id=${dbUser.id}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (data.success && data.guest?.roomStatus) setRoomStatus(data.guest.roomStatus); })
      .catch(() => {});
  }, [dbUser?.id]);

  const roomStatusInfo = roomStatus ? getRoomStatusStyle(roomStatus) : null;
  const graph = useMemo(() => createGraphSnapshot(state.graphNodes, state.graphEdges), [state.graphEdges, state.graphNodes]);
  const identityCandidates = useMemo(
    () =>
      [dbUser?.id, dbUser?.firebaseUid, normalizedRoomNumber]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase()),
    [dbUser?.firebaseUid, dbUser?.id, normalizedRoomNumber]
  );
  const guestOccupant =
    state.occupants.find(
      (occupant) =>
        occupant.role === "guest" &&
        (
          identityCandidates.includes((occupant.userId ?? "").toLowerCase()) ||
          identityCandidates.includes((occupant.roomNumber ?? "").toLowerCase())
        )
    ) ??
    getOccupantById(state, state.selectedGuestId) ??
    state.occupants.find((occupant) => occupant.role === "guest") ??
    null;
  const guestCurrentNode = guestOccupant ? graph.nodesById[guestOccupant.currentNodeId] ?? null : null;
  const guestFloorId = (guestCurrentNode?.floorId ?? "floor_6") as FloorId;
  const guestRoute = guestOccupant ? getOccupantRoute(guestOccupant, state, graph) : null;
  const guestRouteSteps = guestRoute ? buildRouteSteps(guestRoute, graph).slice(0, 3) : [];
  const guestRouteDistance = guestRoute ? calculateRouteDistanceMeters(guestRoute, graph, state.floorDimensions) : 0;
  const guestBleAddresses = guestRoute ? getRouteBleAddresses(guestRoute, graph) : [];
  const guestTrackingStatus = guestOccupant ? getTrackingStatus(guestOccupant, state, graph) : null;
  const activeCommandChannel =
    guestOccupant?.commsChannelId ??
    (normalizedRoomNumber ? `channel-guest-${normalizedRoomNumber.toLowerCase()}` : "");
  const { isMicActive, toggleMic } = useRadio(socket, activeCommandChannel);
  const guestMarkers =
    guestOccupant && guestCurrentNode
      ? [{ id: guestOccupant.id, label: "You", nodeId: guestCurrentNode.id, tone: "guest" as const }]
      : [];

  return (
    <div className="bg-transparent text-[#232D42] dark:text-[#f0f2ff] h-screen overflow-hidden flex flex-col transition-colors relative dashboard-root">

      {/* Hope UI Clean Background */}

      <DashboardHeader
        title="GUEST PORTAL"
        userName={guestName}
        role={`Room ${roomNumber}`}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 pt-16">

        <GuestSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto 2xl:max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-500">

          <div className="mb-8 flex flex-col gap-1">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-gray-900 dark:text-white">
              Welcome back, {firstName}.
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Your stay is confirmed through {checkoutLabel}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">

            {/* TOP IDENTITY BLOCK */}
            <div className="lg:col-span-8 dashboard-card rounded-[20px] p-8 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-400 uppercase mb-1">Aegis Smart Hotel</p>
                <h2 className="text-4xl sm:text-5xl font-light tracking-tighter text-gray-900 dark:text-white mb-10">
                  {guestName.toUpperCase()}
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Inner Box */}
                <div className="bg-[#f8f9fa] dark:bg-[#1c202e] p-5 rounded-[15px] flex-1">
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-gray-400 dark:text-gray-500">meeting_room</span> Room
                  </p>
                  <p className="text-3xl font-light text-gray-900 dark:text-white">{roomNumber}</p>
                </div>
                {/* Inner Box */}
                <div className="bg-[#f8f9fa] dark:bg-[#1c202e] p-5 rounded-[15px] flex-1">
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-gray-400 dark:text-gray-500">verified_user</span> Status
                  </p>
                  <p className="text-3xl font-light text-emerald-500 dark:text-emerald-400">{statusLabel}</p>
                </div>
                {roomStatusInfo && (
                  <div className="bg-[#f8f9fa] dark:bg-[#1c202e] p-5 rounded-[15px] flex-1">
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-gray-400 dark:text-gray-500">door_front</span> Room Status
                    </p>
                    <p className={`text-3xl font-light ${roomStatusInfo.cls}`}>{roomStatusInfo.label}</p>
                  </div>
                )}              </div>
            </div>

            {/* EMERGENCY SOS BLOCK - Remains dark even in light mode to match screenshots */}
            <div className="lg:col-span-4 dashboard-card rounded-[20px] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <Link href="/guest-sos" className="w-36 h-36 rounded-full bg-[#ef4444] shadow-[0_0_60px_rgba(239,68,68,0.35)] flex flex-col items-center justify-center text-white hover:scale-105 transition-transform relative z-10 border border-red-500">
                <span className="font-['Space_Grotesk'] font-bold text-[10px] tracking-[0.2em] mb-0.5">SOS</span>
                <span className="font-['Space_Grotesk'] font-black text-2xl tracking-[0.1em]">SOS</span>
              </Link>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-8 relative z-10 font-bold">Press for immediate assistance</p>
            </div>

            {/* SERVICES BLOCK */}
            <div className="lg:col-span-7 dashboard-card rounded-[20px] p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[20px] text-gray-900 dark:text-white">room_service</span>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Hotel Services</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1">
                <Link href="/rapid-reporting" className="bg-[#f8f9fa] dark:bg-[#1c202e] hover:bg-[#e9ecef] dark:hover:bg-[#2a3042] transition-all rounded-[15px] p-8 flex flex-col items-center justify-center text-center gap-3 group h-full cursor-pointer">
                  <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">report_problem</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest leading-tight text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Report Issue</span>
                </Link>
                <Link href="/guest-map" className="bg-[#f8f9fa] dark:bg-[#1c202e] hover:bg-[#e9ecef] dark:hover:bg-[#2a3042] transition-all rounded-[15px] p-8 flex flex-col items-center justify-center text-center gap-3 group h-full cursor-pointer">
                  <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">map</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest leading-tight text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Hotel Map</span>
                </Link>
              </div>
            </div>

            {/* SAFETY & SECURITY BLOCK */}
            <div className="lg:col-span-5 dashboard-card rounded-[20px] p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-gray-900 dark:text-white">shield</span>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Safety & Security</h3>
                </div>
                <span className="text-[10px] uppercase text-emerald-500 dark:text-emerald-400 font-bold tracking-widest">Optimal</span>
              </div>

              <div className="flex-1 flex flex-col justify-start">
                <div className="flex items-start gap-4 p-5 rounded-[15px] bg-[#f8f9fa] dark:bg-[#1c202e]">
                  <div className="text-emerald-500 w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Active Room Monitoring</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">Your stay is secured by Aegis AI. Environmental sensors are fully operational.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <DashboardMessagingCard
                eyebrow="Guest Messaging"
                title="Concierge Channel"
                description="Your direct admin line and hotel announcements now surface inside the guest dashboard so you can jump into the right conversation without leaving this view."
                recentThreads={recentMessageThreads}
                totalThreads={totalMessageThreads}
                activeThreads={activeMessageThreads}
                loading={messagingLoading}
                error={messagingError}
                emptyLabel="Your guest inbox is ready. The direct admin line and announcement feed will appear here as soon as a message arrives."
                actions={[
                  { href: "/guest-messages", label: "Open Inbox", icon: "arrow_forward" },
                  ...(directThreadId
                    ? [
                        {
                          href: `/guest-messages?thread=${encodeURIComponent(directThreadId)}`,
                          label: "Direct Line",
                          icon: "support_agent",
                        },
                      ]
                    : []),
                  ...(announcementsThreadId
                    ? [
                        {
                          href: `/guest-messages?thread=${encodeURIComponent(announcementsThreadId)}`,
                          label: "Announcements",
                          icon: "campaign",
                        },
                      ]
                    : []),
                ]}
              />
            </div>

            <div className="lg:col-span-12 dashboard-card rounded-[20px] p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-400 uppercase">
                    Live Route Guidance
                  </p>
                  <h3 className="mt-1 text-2xl font-light text-gray-900 dark:text-white">
                    {guestTrackingStatus?.nextInstruction || "Waiting for a valid live route"}
                  </h3>
                </div>
                <div className="rounded-full bg-[#f8f9fa] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#175ead] dark:bg-[#1c202e] dark:text-[#7dd3fc]">
                  {guestRoute && guestRoute.length > 1 ? `${guestRouteDistance} m routed` : "Route pending"}
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
                <div className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white dark:border-[#2a3042] dark:bg-[#111827]">
                  <EvacuationMap
                    compact
                    floorId={guestFloorId}
                    floorPlanImageUrl={state.floorPlanImages[guestFloorId] ?? null}
                    dimensionsLabel={`${state.floorDimensions[guestFloorId].widthMeters}m x ${state.floorDimensions[guestFloorId].heightMeters}m`}
                    activeHazardNodeIds={state.activeHazardNodeIds}
                    avoidNodeIds={state.avoidNodeIds}
                    highlightedPath={guestRoute}
                    markers={guestMarkers}
                    graphNodes={state.graphNodes}
                    graphEdges={state.graphEdges}
                  />
                </div>

                <div className="space-y-4">
                  <div className="rounded-[18px] bg-[#f8f9fa] p-5 dark:bg-[#1c202e]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">
                      Tracking
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {guestCurrentNode?.label || "Position unknown"}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">
                      {guestTrackingStatus
                        ? `${guestTrackingStatus.trackingMode} • confidence ${Math.round(guestTrackingStatus.confidence * 100)}%`
                        : "Build the admin tactical map first to unlock live guest routing."}
                    </p>
                  </div>

                  <div className="rounded-[18px] bg-[#f8f9fa] p-5 dark:bg-[#1c202e]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">
                      Command Bridge
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {guestOccupant?.lastBeaconSignal?.address ?? beaconCopy.pendingLockLabel}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-zinc-400">
                      Channel: {activeCommandChannel || "No guest bridge assigned yet"} • Confidence {Math.round((guestOccupant?.trackingConfidence ?? 0) * 100)}%
                    </p>
                    <button
                      type="button"
                      onClick={() => void toggleMic()}
                      disabled={!activeCommandChannel}
                      className={`mt-4 w-full rounded-[14px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                        isMicActive ? "bg-red-600" : "bg-[#175ead]"
                      }`}
                    >
                      {isMicActive ? "Mute Guest Mic" : "Talk To Command Center"}
                    </button>
                  </div>

                  <div className="rounded-[18px] bg-[#f8f9fa] p-5 dark:bg-[#1c202e]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">
                      {beaconCopy.routeListLabel}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guestBleAddresses.length > 0 ? (
                        guestBleAddresses.slice(0, 6).map((address) => (
                          <span
                            key={address}
                            className="rounded-full bg-sky-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
                          >
                            {address}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          {beaconCopy.routeSequencePending}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-[#f8f9fa] p-5 dark:bg-[#1c202e]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400">
                      Next Steps
                    </p>
                    <div className="mt-3 space-y-2">
                      {guestRouteSteps.length > 0 ? (
                        guestRouteSteps.map((step) => (
                          <div key={step} className="rounded-[14px] bg-white px-4 py-3 text-sm text-gray-700 dark:bg-[#111827] dark:text-[#e5e7eb]">
                            {step}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          No safe route is active right now.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
