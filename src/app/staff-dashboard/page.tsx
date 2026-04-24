"use client";

import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useEffect, useMemo, useState } from "react";
import { StaffSidebar } from "@/components/StaffSidebar";
import { EvacuationMap } from "@/components/evacuation/EvacuationMap";
import { DashboardMessagingCard } from "@/components/messaging/DashboardMessagingCard";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useEvacuationSimulation } from "@/hooks/useEvacuationSimulation";
import { useMessagingOverview } from "@/hooks/useMessagingOverview";
import { getBeaconModeCopy } from "@/lib/beacon-mode";
import { deriveStaffSector, deriveStaffShift } from "@/lib/admin-data";
import { formatStaffDisplayDate } from "@/components/StaffIdCard";
import {
  MessagingViewer,
  buildAllStaffThread,
  buildDepartmentThread,
  buildStaffDirectThread,
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

interface StaffDirectoryEntry {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  department: string;
  phone: string;
  emergencyContact: string;
  bloodGroup: string;
  joiningDate: string;
  validTill: string;
  photoUrl: string;
  sector: string;
  shift: string;
  st: string;
}

function buildChecklist(entry: {
  employeeId?: string | null;
  emergencyContact?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  validTill?: string | null;
  role: string;
  department: string;
}) {
  return [
    {
      title: "Identity card issued",
      detail: entry.employeeId ? `Card mapped to ${entry.employeeId}` : "Employee ID pending",
      ready: Boolean(entry.employeeId),
      icon: "badge",
    },
    {
      title: "Photo on profile",
      detail: entry.photoUrl ? "Uploaded and ready for the ID card" : "Upload pending",
      ready: Boolean(entry.photoUrl),
      icon: "photo_camera",
    },
    {
      title: "Emergency contact verified",
      detail: entry.emergencyContact || "Add an emergency contact",
      ready: Boolean(entry.emergencyContact),
      icon: "contact_phone",
    },
    {
      title: "Duty assignment",
      detail: `${entry.role} | ${entry.department}`,
      ready: Boolean(entry.role && entry.department),
      icon: "assignment_ind",
    },
    {
      title: "Card validity",
      detail: formatStaffDisplayDate(entry.validTill),
      ready: Boolean(entry.validTill),
      icon: "event_available",
    },
    {
      title: "Operational phone",
      detail: entry.phone || "Contact number pending",
      ready: Boolean(entry.phone),
      icon: "call",
    },
  ];
}

export default function StaffDashboard() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [roster, setRoster] = useState<StaffDirectoryEntry[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const { dbUser, loading } = useAuthSync("staff");
  const { state } = useEvacuationSimulation();

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const res = await fetch("/api/admin/staff", { cache: "no-store" });
        const data = await res.json();

        if (!active || !res.ok || !data.success || !Array.isArray(data.staff)) {
          return;
        }

        setRoster(data.staff as StaffDirectoryEntry[]);
      } catch (error) {
        console.error("Failed to load staff roster:", error);
      } finally {
        if (active) {
          setLoadingRoster(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const profile = useMemo(() => {
    const role = dbUser?.staffRole || "Staff";
    const department = dbUser?.department || "General Operations";

    return {
      name: dbUser?.name || "Staff Member",
      role,
      department,
      employeeId: dbUser?.employeeId || null,
      phone: dbUser?.phone || null,
      emergencyContact: dbUser?.emergencyContact || null,
      validTill: dbUser?.validTill || null,
      photoUrl: dbUser?.photoUrl || null,
      status: dbUser?.status || "Active",
      sector: deriveStaffSector({ role, department }),
      shift: deriveStaffShift({ role }),
      email: dbUser?.email || "Not assigned",
      joiningDate: dbUser?.joiningDate || null,
    };
  }, [dbUser]);
  const messagingViewer = useMemo<MessagingViewer | null>(() => {
    if (!dbUser?.id) return null;

    const profileId = dbUser.profileId || dbUser.id;

    return {
      role: "staff",
      userId: profileId,
      aliasIds: [
        dbUser.id,
        dbUser.loginId ?? null,
        dbUser.firebaseUid,
        dbUser.employeeId ?? null,
      ].filter((value): value is string => Boolean(value)),
      name: dbUser.name || "Staff",
      department: dbUser.department || "Operations",
    };
  }, [dbUser]);
  const messagingBaseThreads = useMemo(() => {
    if (!messagingViewer) return [];

    return [
      buildStaffDirectThread(messagingViewer, {
        id: messagingViewer.userId,
        name: messagingViewer.name,
        department: messagingViewer.department,
      }),
      buildAllStaffThread(messagingViewer),
      buildDepartmentThread(messagingViewer, messagingViewer.department || "Operations"),
    ];
  }, [messagingViewer]);
  const directThreadId =
    messagingViewer &&
    buildStaffDirectThread(messagingViewer, {
      id: messagingViewer.userId,
      name: messagingViewer.name,
      department: messagingViewer.department,
    }).id;
  const departmentThreadId =
    messagingViewer
      ? buildDepartmentThread(messagingViewer, messagingViewer.department || "Operations").id
      : null;
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

  const sameDepartmentStaff = useMemo(
    () =>
      roster.filter(
        (member) =>
          member.department &&
          member.department.toLowerCase() === profile.department.toLowerCase()
      ),
    [profile.department, roster]
  );

  const checklist = useMemo(
    () =>
      buildChecklist({
        employeeId: profile.employeeId,
        emergencyContact: profile.emergencyContact,
        phone: profile.phone,
        photoUrl: profile.photoUrl,
        validTill: profile.validTill,
        role: profile.role,
        department: profile.department,
      }),
    [profile]
  );

  const readyCount = checklist.filter((item) => item.ready).length;
  const beaconCopy = getBeaconModeCopy();
  const activeTeamCount = sameDepartmentStaff.filter(
    (member) => member.st.toLowerCase() !== "inactive"
  ).length;
  const cardStatus = profile.validTill
    ? `Valid till ${formatStaffDisplayDate(profile.validTill)}`
    : "Validity pending";
  const graph = useMemo(() => createGraphSnapshot(state.graphNodes, state.graphEdges), [state.graphEdges, state.graphNodes]);
  const selectedStaff =
    getOccupantById(state, state.selectedStaffId) ??
    state.occupants.find((occupant) => occupant.role === "staff") ??
    null;
  const selectedStaffNode = selectedStaff ? graph.nodesById[selectedStaff.currentNodeId] ?? null : null;
  const selectedStaffFloorId = (selectedStaffNode?.floorId ?? "floor_4") as FloorId;
  const selectedStaffRoute = selectedStaff ? getOccupantRoute(selectedStaff, state, graph) : null;
  const selectedStaffRouteSteps = selectedStaffRoute ? buildRouteSteps(selectedStaffRoute, graph).slice(0, 4) : [];
  const selectedStaffRouteDistance = selectedStaffRoute
    ? calculateRouteDistanceMeters(selectedStaffRoute, graph, state.floorDimensions)
    : 0;
  const selectedStaffBleAddresses = selectedStaffRoute ? getRouteBleAddresses(selectedStaffRoute, graph) : [];
  const selectedStaffTrackingStatus = selectedStaff ? getTrackingStatus(selectedStaff, state, graph) : null;
  const staffMarkers =
    selectedStaff && selectedStaffNode
      ? [{ id: selectedStaff.id, label: "S", nodeId: selectedStaffNode.id, tone: "staff" as const }]
      : [];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#fafafa] font-['Sora'] text-[#09090b] transition-colors selection:bg-black selection:text-white dark:bg-[#09090b] dark:text-[#fafafa] dark:selection:bg-white dark:selection:text-black">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.1) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <DashboardHeader
        title="Staff Operations"
        userName={profile.name}
        role={profile.role}
        search={true}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden pt-16">
        <StaffSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="mx-auto flex w-full max-w-[1600px] flex-1 overflow-y-auto p-4 md:p-10 lg:p-12">
          <div className="w-full">
            <div className="mb-10 flex flex-col gap-2">
              <h1 className="text-3xl font-light tracking-tight">Shift Overview</h1>
              <p className="text-sm text-[#71717a] dark:text-[#a1a1aa]">
                {loading
                  ? "Loading your staff profile..."
                  : `${profile.role} | ${profile.department} | ${profile.sector}`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="grid grid-cols-2 gap-4 lg:col-span-12 lg:grid-cols-4">
                {[
                  {
                    label: "Employee ID",
                    value: profile.employeeId || "Pending",
                    icon: "badge",
                  },
                  {
                    label: "Department Team",
                    value: loadingRoster ? "--" : `${activeTeamCount}`,
                    icon: "groups",
                  },
                  {
                    label: "Profile Readiness",
                    value: `${readyCount}/${checklist.length}`,
                    icon: "task_alt",
                  },
                  {
                    label: "Card Status",
                    value: profile.validTill ? "Ready" : "Pending",
                    icon: "verified",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm transition-colors hover:border-[#a1a1aa] dark:border-[#27272a] dark:bg-[#09090b] dark:hover:border-[#52525b]"
                  >
                    <div className="relative z-10 flex items-start justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#71717a] dark:text-[#a1a1aa]">
                        {stat.label}
                      </p>
                      <span className="material-symbols-outlined text-[18px] text-[#a1a1aa] dark:text-[#52525b]">
                        {stat.icon}
                      </span>
                    </div>
                    <p className="relative z-10 text-2xl font-light tracking-tight text-[#09090b] dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-8 lg:col-span-8">
                <div className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white shadow-sm dark:border-[#27272a] dark:bg-[#09090b]">
                  <div className="flex items-center justify-between border-b border-[#f4f4f5] p-6 dark:border-[#27272a]">
                    <div>
                      <h3 className="text-sm font-medium text-[#09090b] dark:text-[#fafafa]">
                        Snapshot
                      </h3>
                      <p className="mt-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                        Real-time view from the authenticated staff profile.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f4f4f5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#09090b] dark:bg-[#27272a] dark:text-white">
                      {profile.status}
                    </span>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-2">
                    {[
                      { label: "Assigned Sector", value: profile.sector, icon: "pin_drop" },
                      { label: "Shift Window", value: profile.shift, icon: "schedule" },
                      { label: "Login Email", value: profile.email, icon: "mail" },
                      {
                        label: "Date Joined",
                        value: formatStaffDisplayDate(profile.joiningDate),
                        icon: "calendar_today",
                      },
                    ].map((field) => (
                      <div
                        key={field.label}
                        className="rounded-2xl border border-[#e4e4e7] bg-[#fafafa] p-5 dark:border-[#27272a] dark:bg-[#121215]"
                      >
                        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#71717a] dark:text-[#a1a1aa]">
                          <span className="material-symbols-outlined text-[14px]">{field.icon}</span>
                          {field.label}
                        </p>
                        <p className="text-sm font-semibold text-[#09090b] dark:text-white">
                          {field.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#f4f4f5] bg-[#fafafa] p-4 dark:border-[#27272a] dark:bg-[#0f0f0f]">
                    <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">{cardStatus}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm dark:border-[#27272a] dark:bg-[#09090b]">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#09090b] dark:text-[#fafafa]">
                      Profile
                    </h3>
                    <Link
                      href="/staff-profile"
                      className="flex items-center gap-1 text-xs text-[#71717a] transition-colors hover:text-[#09090b] dark:hover:text-white"
                    >
                      Open Profile
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {checklist.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 transition-colors dark:border-[#27272a] dark:bg-[#18181b]"
                      >
                        <div className="mb-2 flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-[#71717a] dark:text-[#a1a1aa]">
                              {item.icon}
                            </span>
                            <p className="text-sm font-semibold text-[#09090b] dark:text-white">
                              {item.title}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                              item.ready
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            {item.ready ? "Ready" : "Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8 lg:col-span-4">
                <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm dark:border-[#27272a] dark:bg-[#09090b]">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#09090b] dark:text-[#fafafa]">
                      Team
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#71717a] dark:text-[#a1a1aa]">
                      {sameDepartmentStaff.length} listed
                    </span>
                  </div>
                  <div className="space-y-4">
                    {(loadingRoster ? [] : sameDepartmentStaff.slice(0, 4)).map((member) => (
                      <div
                        key={member.id}
                        className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 dark:border-[#27272a] dark:bg-[#18181b]"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#09090b] dark:text-white">
                            {member.name}
                          </p>
                          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#71717a] dark:text-[#a1a1aa]">
                            {member.st}
                          </span>
                        </div>
                        <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">{member.role}</p>
                        <p className="mt-2 text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                          {member.shift || member.department}
                        </p>
                      </div>
                    ))}

                    {!loadingRoster && sameDepartmentStaff.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#d4d4d8] p-4 text-sm text-[#71717a] dark:border-[#27272a] dark:text-[#a1a1aa]">
                        No team entries yet.
                      </div>
                    )}

                    {loadingRoster && (
                      <div className="rounded-xl border border-dashed border-[#d4d4d8] p-4 text-sm text-[#71717a] dark:border-[#27272a] dark:text-[#a1a1aa]">
                        Loading team...
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm dark:border-[#27272a] dark:bg-[#09090b]">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#71717a] dark:text-[#a1a1aa]">
                      contacts
                    </span>
                    <h3 className="text-sm font-medium text-[#09090b] dark:text-[#fafafa]">
                      Contacts
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Primary Phone", value: profile.phone || "Not recorded" },
                      {
                        label: "Emergency Contact",
                        value: profile.emergencyContact || "Not recorded",
                      },
                    ].map((field) => (
                      <div
                        key={field.label}
                        className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-4 dark:border-[#27272a] dark:bg-[#18181b]"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717a] dark:text-[#a1a1aa]">
                          {field.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#09090b] dark:text-white">
                          {field.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-12">
                <DashboardMessagingCard
                  eyebrow="Shift Messaging"
                  title="Command Bridge"
                  description="Admin line, department room, staff feed."
                  recentThreads={recentMessageThreads}
                  totalThreads={totalMessageThreads}
                  activeThreads={activeMessageThreads}
                  loading={messagingLoading}
                  error={messagingError}
                  emptyLabel="Your command channels are ready. New admin updates and department traffic will surface here automatically."
                  actions={[
                    { href: "/staff-messages", label: "Open Inbox", icon: "arrow_forward" },
                    ...(directThreadId
                      ? [
                          {
                            href: `/staff-messages?thread=${encodeURIComponent(directThreadId)}`,
                            label: "Admin Line",
                            icon: "support_agent",
                          },
                        ]
                      : []),
                    ...(departmentThreadId
                      ? [
                          {
                            href: `/staff-messages?thread=${encodeURIComponent(departmentThreadId)}`,
                            label: "Department Room",
                            icon: "groups",
                          },
                        ]
                      : []),
                  ]}
                />
              </div>

              <div className="lg:col-span-12 rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm dark:border-[#27272a] dark:bg-[#09090b]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a] dark:text-[#a1a1aa]">
                      Live Route
                    </p>
                    <h3 className="mt-1 text-2xl font-light tracking-tight text-[#09090b] dark:text-white">
                      {selectedStaff?.assignment || "No active assignment"}
                    </h3>
                    <p className="mt-2 text-sm text-[#71717a] dark:text-[#a1a1aa]">
                      {selectedStaffTrackingStatus?.nextInstruction || "Generate the tactical map to begin live routing."}
                    </p>
                  </div>
                  <div className="rounded-full bg-[#f4f4f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#175ead] dark:bg-[#18181b] dark:text-[#7dd3fc]">
                    {selectedStaffRoute && selectedStaffRoute.length > 1 ? `${selectedStaffRouteDistance} m active` : "Route pending"}
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="overflow-hidden rounded-[18px] border border-[#e4e4e7] dark:border-[#27272a]">
                    <EvacuationMap
                      compact
                      floorId={selectedStaffFloorId}
                      floorPlanImageUrl={state.floorPlanImages[selectedStaffFloorId] ?? null}
                      dimensionsLabel={`${state.floorDimensions[selectedStaffFloorId].widthMeters}m x ${state.floorDimensions[selectedStaffFloorId].heightMeters}m`}
                      activeHazardNodeIds={state.activeHazardNodeIds}
                      avoidNodeIds={state.avoidNodeIds}
                      highlightedPath={selectedStaffRoute}
                      markers={staffMarkers}
                      graphNodes={state.graphNodes}
                      graphEdges={state.graphEdges}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-5 dark:border-[#27272a] dark:bg-[#18181b]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a] dark:text-[#a1a1aa]">
                        Position
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#09090b] dark:text-white">
                        {selectedStaffNode?.label || "Current anchor unavailable"}
                      </p>
                      <p className="mt-2 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                        {selectedStaffTrackingStatus
                          ? `${selectedStaffTrackingStatus.trackingMode} | confidence ${Math.round(selectedStaffTrackingStatus.confidence * 100)}%`
                          : "Routing telemetry will appear after the admin map is generated."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-5 dark:border-[#27272a] dark:bg-[#18181b]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a] dark:text-[#a1a1aa]">
                        {beaconCopy.routeLocksLabel}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedStaffBleAddresses.length > 0 ? (
                          selectedStaffBleAddresses.slice(0, 6).map((address) => (
                            <span
                              key={address}
                              className="rounded-full bg-sky-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
                            >
                              {address}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                            {beaconCopy.routeLocksPending}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#e4e4e7] bg-[#fafafa] p-5 dark:border-[#27272a] dark:bg-[#18181b]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#71717a] dark:text-[#a1a1aa]">
                        Route Steps
                      </p>
                      <div className="mt-3 space-y-2">
                        {selectedStaffRouteSteps.length > 0 ? (
                          selectedStaffRouteSteps.map((step) => (
                            <div key={step} className="rounded-xl bg-white px-4 py-3 text-sm text-[#09090b] dark:bg-[#09090b] dark:text-white">
                              {step}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">
                            No live staff route is available right now.
                          </p>
                        )}
                      </div>
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
