"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useRadio } from "@/hooks/useRadio";
import { useSosTransport } from "@/hooks/useSosTransport";
import {
  getTransportLabel,
  type SosTransport,
  type TransportChannels,
} from "@/lib/sos-transport";

interface Alert {
  incidentId: string;
  guestId?: string;
  guestName: string;
  roomId: string;
  audioChannel: string;
  timestamp?: string;
  type?: string;
  originRole?: "guest" | "staff";
  activeTransport?: SosTransport;
  transportMode?: "auto" | "manual";
  transportChannels?: TransportChannels;
}

export default function AdminEmergency() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [activeRadioChannel, setActiveRadioChannel] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [transportSelections, setTransportSelections] = useState<
    Record<string, SosTransport>
  >({});

  const socket = useSocket("admin");
  const { isMicActive, toggleMic } = useRadio(socket, activeRadioChannel || "");
  const {
    activeTransport: adminTransport,
    manualTransport,
    setManualTransport,
    recommendedLabel,
    assessment,
  } = useSosTransport({ mode: "manual" });

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on("sos-alert", (payload: Alert) => {
      setActiveAlerts((prev) => {
        const existingIndex = prev.findIndex(
          (alert) => alert.incidentId === payload.incidentId
        );

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...payload };
          return next;
        }

        return [payload, ...prev];
      });

      setTransportSelections((prev) => ({
        ...prev,
        [payload.incidentId]: payload.activeTransport || prev[payload.incidentId] || "internet",
      }));
    });

    socket.on("alert-resolved", (payload: { incidentId: string }) => {
      setActiveAlerts((prev) =>
        prev.filter((alert) => alert.incidentId !== payload.incidentId)
      );
      setTransportSelections((prev) => {
        const next = { ...prev };
        delete next[payload.incidentId];
        return next;
      });
      if (selectedAlertId === payload.incidentId) {
        setSelectedAlertId(null);
        setActiveRadioChannel(null);
      }
    });

    return () => {
      socket.off("sos-alert");
      socket.off("alert-resolved");
    };
  }, [selectedAlertId, socket]);

  const getAlertOriginLabel = (alert: Alert) =>
    alert.originRole === "staff" ? alert.roomId : `Room ${alert.roomId}`;

  const getAlertIdentityLabel = (alert: Alert) =>
    alert.originRole === "staff" ? "Identified Staff" : "Identified Guest";

  const resolveAlertChannel = (alert: Alert) => {
    const selectedTransport =
      transportSelections[alert.incidentId] || alert.activeTransport || "internet";

    if (alert.transportChannels?.[selectedTransport]) {
      return alert.transportChannels[selectedTransport];
    }

    return alert.audioChannel;
  };

  const joinAlertRadio = async (alert: Alert) => {
    const selectedTransport =
      transportSelections[alert.incidentId] || alert.activeTransport || "internet";

    setSelectedAlertId(alert.incidentId);
    setManualTransport(selectedTransport);
    setActiveRadioChannel(resolveAlertChannel(alert));

    setTimeout(async () => {
      if (!isMicActive) {
        await toggleMic();
      }
    }, 200);
  };

  const handleTransportSelection = (alert: Alert, transport: SosTransport) => {
    setTransportSelections((prev) => ({
      ...prev,
      [alert.incidentId]: transport,
    }));
    setManualTransport(transport);

    if (selectedAlertId === alert.incidentId) {
      setActiveRadioChannel(alert.transportChannels?.[transport] || alert.audioChannel);
    }
  };

  const handleResolve = async (alert: Alert) => {
    const currentChannel = resolveAlertChannel(alert);

    if (activeRadioChannel === currentChannel && isMicActive) {
      await toggleMic();
      setActiveRadioChannel(null);
      setSelectedAlertId(null);
    }

    socket?.emit("resolve-alert", alert);
    setActiveAlerts((prev) =>
      prev.filter((item) => item.incidentId !== alert.incidentId)
    );
    setTransportSelections((prev) => {
      const next = { ...prev };
      delete next[alert.incidentId];
      return next;
    });
  };

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
      {activeAlerts.length > 0 && (
        <div className="absolute inset-0 z-0 pointer-events-none animate-pulse border-4 border-red-500/50 blur-sm" />
      )}

      <DashboardHeader
        title="Emergency Control"
        userName="Administrator"
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="relative z-10 flex h-[calc(100vh-64px)] flex-1 overflow-hidden pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-auto p-4 md:p-10 lg:p-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-10 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {activeAlerts.length > 0 ? (
                <span className="h-3 w-3 animate-ping rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]" />
              ) : (
                <span className="h-3 w-3 rounded-full bg-green-500" />
              )}
              <h1
                className={`text-3xl font-light tracking-tight ${
                  activeAlerts.length > 0 ? "text-red-600 dark:text-red-400" : ""
                }`}
              >
                {activeAlerts.length > 0 ? "Active SOS Alerts" : "System Secure"}
              </h1>
            </div>
            <p className="text-sm text-[#71717a] dark:text-[#a1a1aa]">
              Real-time emergency broadcast tracking with manual admin transport switching.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="flex h-[500px] flex-col rounded-2xl border border-[#e4e4e7] bg-white p-8 shadow-sm dark:border-white/5 dark:bg-[#0f0f0f] lg:col-span-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-medium">Property Grid Isolation</h3>
                {activeAlerts.length > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700 dark:bg-red-950 dark:text-red-400">
                    {activeAlerts.length} Active Signal
                  </span>
                )}
              </div>

              <div
                className={`relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-[#fafafa] dark:bg-[#050505] ${
                  activeAlerts.length > 0
                    ? "border-red-500/50"
                    : "border-[#e4e4e7] dark:border-[#27272a]"
                }`}
              >
                {activeAlerts.length === 0 && (
                  <div className="flex flex-col items-center text-xs opacity-50 text-[#71717a]">
                    <span className="material-symbols-outlined mb-2 text-4xl">radar</span>
                    Monitoring Grid Active
                  </div>
                )}

                {activeAlerts.map((alert, index) => {
                  const selectedTransport =
                    transportSelections[alert.incidentId] ||
                    alert.activeTransport ||
                    "internet";
                  const resolvedChannel = resolveAlertChannel(alert);
                  const isSelectedActive =
                    selectedAlertId === alert.incidentId &&
                    activeRadioChannel === resolvedChannel &&
                    isMicActive;

                  return (
                    <div
                      key={alert.incidentId}
                      className="absolute flex flex-col items-center"
                      style={{ top: `${40 + index * 10}%`, left: `${30 + index * 20}%` }}
                    >
                      <span className="material-symbols-outlined text-3xl text-red-500 animate-bounce drop-shadow-lg">
                        location_on
                      </span>
                      <div className="absolute top-1 -left-4 h-16 w-16 animate-ping rounded-full border-2 border-red-500 opacity-50" />
                      <span className="mt-2 rounded border border-red-500 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600 dark:bg-black dark:text-red-400">
                        {getAlertOriginLabel(alert)}
                      </span>

                      <button
                        onClick={() => void joinAlertRadio(alert)}
                        className={`mt-3 flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          isSelectedActive
                            ? "animate-pulse bg-green-500 text-white hover:bg-red-500"
                            : "bg-black text-white hover:scale-105 dark:bg-white dark:text-black"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isSelectedActive ? "mic" : "headset_mic"}
                        </span>
                        {isSelectedActive ? "Live Comms Open" : "Connect Audio"}
                      </button>

                      <button
                        onClick={() => void handleResolve(alert)}
                        className="mt-2 rounded-full border border-red-200 bg-red-100 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 transition-all hover:scale-105 hover:bg-red-200 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/80"
                      >
                        Resolve & End Call
                      </button>

                      <div className="mt-3 w-[235px] rounded-2xl border border-[#175ead]/20 bg-white/95 p-3 shadow-sm dark:border-white/10 dark:bg-[#0f0f0f]">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#175ead] dark:text-[#72aafe]">
                          Manual Transport
                        </p>
                        <p className="mt-2 text-[11px] font-bold text-[#414753] dark:text-[#c1c6d5]">
                          Caller route: {getTransportLabel(alert.activeTransport || "internet")}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {(["internet", "ip", "ble"] as const).map((transport) => (
                            <button
                              key={transport}
                              onClick={() => handleTransportSelection(alert, transport)}
                              className={`rounded-lg border px-2 py-2 text-[9px] font-bold uppercase tracking-[0.12em] ${
                                selectedTransport === transport
                                  ? "border-[#175ead] bg-[#175ead] text-white dark:border-[#72aafe] dark:bg-[#72aafe] dark:text-[#081d2c]"
                                  : "border-[#c1c6d5]/40 bg-[#f8fafc] text-[#414753] dark:border-white/10 dark:bg-[#171717] dark:text-[#c1c6d5]"
                              }`}
                            >
                              {transport === "ble" ? "Beacon" : getTransportLabel(transport)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-4">
              <div
                className={`rounded-2xl p-8 transition-all ${
                  activeAlerts.length > 0
                    ? "border border-red-500/30 bg-white shadow-[0_0_30px_rgba(239,68,68,0.05)] dark:bg-[#0f0f0f]"
                    : "border border-[#e4e4e7] bg-white shadow-sm dark:border-white/5 dark:bg-[#0f0f0f]"
                }`}
              >
                <h3
                  className={`mb-6 text-sm font-medium ${
                    activeAlerts.length > 0 ? "text-red-600 dark:text-red-400" : ""
                  }`}
                >
                  Protocol Execution
                </h3>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#175ead]/20 bg-[#e2efff]/40 p-4 dark:border-white/10 dark:bg-[#121212]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#175ead] dark:text-[#72aafe]">
                      Admin Call Routing
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#081d2c] dark:text-white">
                      Manual route: {getTransportLabel(adminTransport)}
                    </p>
                    <p className="mt-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                      Recommendation: {recommendedLabel}. Admin transport never auto-switches.
                    </p>
                    <p className="mt-1 text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                      Network health: {assessment.qualityLabel}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {(["internet", "ip", "ble"] as const).map((transport) => (
                        <button
                          key={transport}
                          onClick={() => setManualTransport(transport)}
                          className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                            manualTransport === transport
                              ? "border-[#175ead] bg-[#175ead] text-white dark:border-[#72aafe] dark:bg-[#72aafe] dark:text-[#081d2c]"
                              : "border-[#c1c6d5]/40 bg-white text-[#414753] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#c1c6d5]"
                          }`}
                        >
                          {transport === "ble" ? "Beacon" : getTransportLabel(transport)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-600 py-4 font-semibold text-white shadow-sm transition-colors hover:bg-red-700">
                    <span className="material-symbols-outlined">campaign</span>
                    Broadcast Evacuation
                  </button>
                  <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#f4f4f5] py-4 font-semibold text-[#09090b] shadow-sm transition-colors hover:bg-[#e4e4e7] dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-[#252525]">
                    <span className="material-symbols-outlined">lock</span>
                    Seal Sector 3
                  </button>
                  <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-transparent bg-[#f4f4f5] py-4 font-semibold text-[#09090b] shadow-sm transition-colors hover:border-blue-500 hover:bg-[#e4e4e7] dark:bg-[#27272a] dark:text-white dark:hover:bg-[#3f3f46]">
                    <span className="material-symbols-outlined text-blue-500">local_police</span>
                    Dispatch Authorities
                  </button>
                </div>
              </div>

              <div className="flex-1 rounded-2xl border border-[#e4e4e7] bg-white p-8 shadow-sm dark:border-white/5 dark:bg-[#0f0f0f]">
                <h3 className="mb-4 text-sm font-medium">Latest Signal Details</h3>
                {activeAlerts.length > 0 ? (
                  <div className="space-y-4 border-t border-[#f4f4f5] pt-4 text-sm dark:border-[#27272a]">
                    <div className="flex justify-between border-b border-dashed border-[#e4e4e7] pb-2 dark:border-[#27272a]">
                      <span className="text-xs font-medium text-[#a1a1aa]">Origin</span>
                      <span className="text-xs font-semibold text-[#09090b] dark:text-white">
                        {getAlertOriginLabel(activeAlerts[0])}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#e4e4e7] pb-2 dark:border-[#27272a]">
                      <span className="text-xs font-medium text-[#a1a1aa]">
                        {getAlertIdentityLabel(activeAlerts[0])}
                      </span>
                      <span className="text-xs font-semibold text-[#09090b] dark:text-white">
                        {activeAlerts[0].guestName}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#e4e4e7] pb-2 dark:border-[#27272a]">
                      <span className="text-xs font-medium text-[#a1a1aa]">Signal ID</span>
                      <span className="font-mono text-xs text-[#09090b] dark:text-white">
                        {activeAlerts[0].incidentId}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-[#e4e4e7] pb-2 dark:border-[#27272a]">
                      <span className="text-xs font-medium text-[#a1a1aa]">Caller Route</span>
                      <span className="text-xs font-semibold text-[#09090b] dark:text-white">
                        {getTransportLabel(activeAlerts[0].activeTransport || "internet")}
                      </span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-xs font-medium text-[#a1a1aa]">Admin Route</span>
                      <span className="text-xs font-semibold text-[#09090b] dark:text-white">
                        {getTransportLabel(
                          transportSelections[activeAlerts[0].incidentId] || manualTransport
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="border-t border-[#f4f4f5] pt-4 text-xs text-[#a1a1aa] dark:border-[#27272a]">
                    Awaiting incoming transmissions...
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
