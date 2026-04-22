"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GuestSidebar } from "@/components/GuestSidebar";
import { StaffSidebar } from "@/components/StaffSidebar";
import { useAuthSync } from "@/hooks/useAuthSync";

type IncidentItem = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  timestamp: string;
  roomId: string | null;
  guestName: string | null;
  timeAgo: string;
};

const isResolved = (status: string) => status.trim().toLowerCase() === "resolved";

const isPriorityIncident = (incident: IncidentItem) => {
  const severity = incident.severity.trim().toLowerCase();
  const status = incident.status.trim().toLowerCase();

  return (
    status.includes("priority") ||
    severity.includes("critical") ||
    severity.includes("urgent") ||
    severity.includes("high")
  );
};

const formatClock = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const formatLogId = (id: string) =>
  id.slice(0, 8).toUpperCase();

export default function GuestComplaints() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { dbUser, loading: authLoading, role } = useAuthSync();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const isStaffView = role === "admin" || role === "staff";
  const roomNumber = dbUser?.roomNumber || dbUser?.room || "";

  useEffect(() => {
    if (authLoading) return;
    if (!isStaffView && !roomNumber) {
      setIncidents([]);
      setIncidentsLoading(false);
      return;
    }

    let cancelled = false;

    const loadIncidents = async () => {
      setIncidentsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (!isStaffView) {
          params.set("room", roomNumber);
        }

        const query = params.toString();
        const response = await fetch(`/api/guest/incidents${query ? `?${query}` : ""}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load incidents");
        }

        if (!cancelled) {
          setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
        }
      } catch (fetchError) {
        console.error("Failed to load incidents:", fetchError);
        if (!cancelled) {
          setError("Unable to load guest requests right now.");
          setIncidents([]);
        }
      } finally {
        if (!cancelled) {
          setIncidentsLoading(false);
        }
      }
    };

    void loadIncidents();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isStaffView, roomNumber]);

  const activeCount = useMemo(
    () => incidents.filter((incident) => !isResolved(incident.status)).length,
    [incidents]
  );

  const priorityCount = useMemo(
    () => incidents.filter((incident) => !isResolved(incident.status) && isPriorityIncident(incident)).length,
    [incidents]
  );

  const summaryText = incidentsLoading
    ? "Loading live guest requests."
    : activeCount > 0
      ? `${activeCount} active request${activeCount === 1 ? "" : "s"} require attention.`
      : "No active guest requests right now.";

  const handleStatusToggle = async (incident: IncidentItem) => {
    if (!isStaffView) return;

    const nextStatus = isResolved(incident.status) ? "Active" : "Resolved";

    try {
      setActiveActionId(incident.id);
      const response = await fetch("/api/guest/incidents", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: incident.id,
          status: nextStatus,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.incident) {
        throw new Error(data.error || "Failed to update incident");
      }

      setIncidents((current) =>
        current.map((item) => (item.id === incident.id ? data.incident : item))
      );
    } catch (updateError) {
      console.error("Failed to update incident:", updateError);
      setError("Unable to update this issue right now.");
    } finally {
      setActiveActionId(null);
    }
  };

  const viewerName = dbUser?.name || (isStaffView ? "Staff User" : "Guest");
  const viewerRole = isStaffView
    ? dbUser?.staffRole || dbUser?.department || "Operations"
    : roomNumber
      ? `Room ${roomNumber}`
      : "Guest";

  return (
    <div className="bg-[#fafafa] dark:bg-[#0a0a0a] text-[#09090b] dark:text-[#e5e2e1] min-h-screen flex flex-col font-['Sora'] relative">
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.08) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <DashboardHeader
        title="Guest Requests"
        subtitle={isStaffView ? "Staff Dashboard" : "Guest Portal"}
        userName={viewerName}
        role={viewerRole}
        search={isStaffView}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 h-[calc(100vh-64px)] pt-16">
        {isStaffView ? (
          <StaffSidebar
            sidebarExpanded={sidebarExpanded}
            setSidebarExpanded={setSidebarExpanded}
            sidebarMobileOpen={sidebarMobileOpen}
            setSidebarMobileOpen={setSidebarMobileOpen}
            guestRequestsCount={activeCount}
          />
        ) : (
          <GuestSidebar
            sidebarExpanded={sidebarExpanded}
            setSidebarExpanded={setSidebarExpanded}
            sidebarMobileOpen={sidebarMobileOpen}
            setSidebarMobileOpen={setSidebarMobileOpen}
          />
        )}

        <main className="flex-1 overflow-auto p-4 lg:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/50 dark:border-white/5 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl w-full font-['Space_Grotesk'] group">
            <div>
              <h1 className="font-black text-3xl tracking-tighter text-[#081d2c] dark:text-white uppercase mb-1">
                Guest Requests & Issues
              </h1>
              <p className="text-[#414753] dark:text-[#c1c6d5] text-sm mt-1 font-['Outfit'] font-bold">
                {summaryText}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-[#ffdad6]/50 dark:bg-[#ba1a1a]/10 border border-[#bc000a]/20 dark:border-[#ffb4aa]/20 px-6 py-3 rounded-2xl text-center shadow-sm">
                <p className="text-[10px] text-[#93000a] dark:text-[#ffb4aa] uppercase tracking-widest font-black mb-1">
                  Priority Alert
                </p>
                <p className="font-black text-2xl text-[#93000a] dark:text-[#ffb4aa]">
                  {priorityCount.toString().padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="p-6 border-b border-[#c1c6d5]/30 dark:border-white/5 bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 flex justify-between items-center">
                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-[#081d2c] dark:text-[#e5e2e1]">
                  <span className="w-1.5 h-4 bg-[#175ead]" /> Active Guest Log
                </h3>
              </div>

              <div className="divide-y divide-[#c1c6d5]/30 dark:divide-white/5 font-['Outfit'] text-sm md:text-base">
                {incidentsLoading && (
                  <div className="p-8 text-sm font-semibold text-[#717785] dark:text-[#c1c6d5]">
                    Loading live requests...
                  </div>
                )}

                {!incidentsLoading && error && (
                  <div className="p-8 text-sm font-semibold text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {!incidentsLoading && !error && incidents.length === 0 && (
                  <div className="p-8 text-sm font-semibold text-[#717785] dark:text-[#c1c6d5]">
                    {isStaffView
                      ? "No guest issues have been submitted yet."
                      : "You have not submitted any issues for this room yet."}
                  </div>
                )}

                {!incidentsLoading &&
                  !error &&
                  incidents.map((incident) => {
                    const resolved = isResolved(incident.status);
                    const priority = !resolved && isPriorityIncident(incident);
                    const guestLabel =
                      incident.guestName || (!isStaffView ? dbUser?.name : null) || "Guest";

                    return (
                      <div
                        key={incident.id}
                        className="p-6 hover:bg-[#f7f9ff] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer group flex flex-col lg:flex-row gap-6 lg:items-center"
                      >
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#717785] group-hover:text-[#175ead] dark:group-hover:text-[#72aafe] transition-colors font-mono tracking-widest">
                              {formatLogId(incident.id)}
                            </span>
                            <span className="text-[10px] font-bold text-[#717785] bg-[#f7f9ff]/50 dark:bg-[#1e1e1e] px-2 py-1 rounded border border-[#c1c6d5]/30 dark:border-white/5 font-mono shadow-sm">
                              {formatClock(incident.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[#081d2c] dark:text-white">
                            <span className="material-symbols-outlined text-[#175ead] dark:text-[#72aafe]">
                              meeting_room
                            </span>
                            <span className="font-black text-xl font-['Space_Grotesk']">
                              Room {incident.roomId || roomNumber || "Pending"}
                            </span>
                          </div>
                          <p className="font-bold text-[#414753] dark:text-[#c1c6d5] text-xs uppercase tracking-widest flex items-center gap-1.5 mt-1 border border-[#c1c6d5]/50 dark:border-white/10 w-max px-3 py-1.5 rounded-lg bg-white dark:bg-[#1e1e1e] shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            {guestLabel}
                          </p>
                        </div>

                        <div className="flex-1 bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 border border-[#c1c6d5]/30 dark:border-white/5 p-5 rounded-2xl shadow-inner group-hover:bg-white dark:group-hover:bg-[#131313] transition-colors">
                          <p className="text-[10px] font-black tracking-widest uppercase text-[#717785] mb-2">
                            {incident.severity}
                          </p>
                          <p className="font-bold text-[#081d2c] dark:text-white leading-relaxed">
                            {incident.title}
                          </p>
                          {incident.description !== incident.title && (
                            <p className="mt-2 text-sm text-[#414753] dark:text-[#c1c6d5] leading-relaxed">
                              {incident.description}
                            </p>
                          )}
                          <p className="mt-3 text-[10px] font-black tracking-widest uppercase text-[#717785]">
                            Logged {incident.timeAgo}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[180px]">
                          <span
                            className={`text-[10px] font-black px-4 py-2 rounded-lg flex items-center justify-center gap-2 tracking-widest uppercase shadow-sm border w-full text-center ${
                              resolved
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-400/20"
                                : priority
                                  ? "bg-[#ffdad6] dark:bg-[#ba1a1a]/30 text-[#93000a] dark:text-[#ffb4aa] border-[#bc000a]/30"
                                  : "bg-[#e2efff] dark:bg-[#175ead]/30 text-[#003d79] dark:text-[#72aafe] border-[#175ead]/20 dark:border-[#72aafe]/20"
                            }`}
                          >
                            {priority && (
                              <span className="w-2 h-2 bg-current rounded-full animate-pulse shadow-sm" />
                            )}
                            {resolved ? "Resolved" : priority ? "Priority" : "Active"} Request
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleStatusToggle(incident)}
                            disabled={!isStaffView || activeActionId === incident.id}
                            className="bg-white dark:bg-[#1a1a1a] border border-[#c1c6d5]/50 dark:border-white/10 hover:border-[#175ead]/50 dark:hover:border-[#72aafe]/50 text-[#081d2c] dark:text-white hover:text-[#175ead] dark:hover:text-[#72aafe] font-black py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 w-full text-center hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                          >
                            {isStaffView
                              ? activeActionId === incident.id
                                ? "Updating..."
                                : resolved
                                  ? "Reopen Issue"
                                  : "Mark Resolved"
                              : "Awaiting Team"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
