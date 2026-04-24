"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { StaffSidebar } from "@/components/StaffSidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useSocket } from "@/hooks/useSocket";
import { useRadio } from "@/hooks/useRadio";
import { useSosTransport } from "@/hooks/useSosTransport";
import { getBeaconModeCopy } from "@/lib/beacon-mode";
import { getDb } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  buildTransportChannels,
  getTransportLabel,
} from "@/lib/sos-transport";
import { persistIncident, updateIncidentStatus } from "@/lib/incident-client";

export default function StaffSOSPage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const { dbUser } = useAuthSync("staff");

  const staffName = dbUser?.name || "Staff Member";
  const role = dbUser?.staffRole || dbUser?.role || "Staff";
  const employeeId = dbUser?.employeeId || "OPS-001";
  const sector = dbUser?.department || "Operations";
  const beaconCopy = getBeaconModeCopy();
  const incidentBaseChannel = useMemo(
    () => `channel-staff-${employeeId.toLowerCase()}`,
    [employeeId]
  );
  const transportChannels = useMemo(
    () => buildTransportChannels(incidentBaseChannel),
    [incidentBaseChannel]
  );
  const { activeTransport, activeLabel, assessment } = useSosTransport({
    mode: "auto",
  });
  const audioChannel = transportChannels[activeTransport];

  const socket = useSocket("staff");
  const { isMicActive, toggleMic } = useRadio(socket, audioChannel);
  const isMicActiveRef = useRef(isMicActive);

  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleResolved = async (payload: { incidentId?: string }) => {
      if (payload.incidentId && payload.incidentId === activeIncidentId) {
        setSosActive(false);
        setActiveIncidentId(null);
        if (isMicActiveRef.current) {
          await toggleMic();
        }
      }
    };

    socket.on("alert-resolved", handleResolved);

    return () => {
      socket.off("alert-resolved", handleResolved);
    };
  }, [activeIncidentId, socket, toggleMic]);

  useEffect(() => {
    if (!socket || !sosActive || !activeIncidentId) {
      return;
    }

    socket.emit("trigger-sos", {
      incidentId: activeIncidentId,
      guestId: employeeId,
      guestName: staffName,
      roomId: sector,
      audioChannel,
      activeTransport,
      transportMode: "auto",
      transportChannels,
      originRole: "staff",
      type: "Staff SOS",
    });
  }, [
    activeIncidentId,
    activeTransport,
    audioChannel,
    employeeId,
    sector,
    socket,
    sosActive,
    staffName,
    transportChannels,
  ]);

  const startPress = () => {
    if (sosActive) {
      return;
    }

    pressTimer.current = setTimeout(() => {
      void handleSOSTrigger();
    }, 3000);
  };

  const endPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleSOSTrigger = async () => {
    if (sosActive) {
      return;
    }

    const incidentId = `STF-${Math.floor(Math.random() * 10000)}`;
    setSosActive(true);
    setActiveIncidentId(incidentId);

    try {
      const db = getDb();
      await addDoc(collection(db, "incidents"), {
        incidentId,
        guestId: employeeId,
        guestName: staffName,
        roomId: sector,
        type: "Staff SOS",
        status: "Active",
        timestamp: serverTimestamp(),
        audioChannel,
        activeTransport,
        transportMode: "auto",
        transportChannels,
        originRole: "staff",
      });
    } catch {
      // Keep realtime SOS active even when Firestore is unavailable.
    }

    try {
      await persistIncident({
        id: incidentId,
        title: "Staff SOS",
        description: `Staff member ${staffName} triggered an SOS alert from ${sector}. Active transport: ${activeTransport}. Channel: ${audioChannel}.`,
        severity: "Critical",
        roomId: sector,
        status: "Active",
      });
    } catch (error) {
      console.error("Failed to persist staff SOS incident:", error);
    }

    await toggleMic();
  };

  const handleCancel = async () => {
    const incidentId = activeIncidentId || "STAFF-CANCEL";
    setSosActive(false);
    setActiveIncidentId(null);

    if (isMicActive) {
      await toggleMic();
    }

    if (activeIncidentId) {
      try {
        await updateIncidentStatus(incidentId, "Resolved");
      } catch (error) {
        console.error("Failed to resolve staff SOS incident:", error);
      }
    }

    socket?.emit("resolve-alert", {
      incidentId,
      roomId: sector,
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f9ff] font-['Outfit'] text-[#081d2c] transition-colors dark:bg-[#0a0a0a] dark:text-[#e5e2e1]">
      <DashboardHeader
        title="Staff Emergency SOS"
        subtitle="Operational fallback routing"
        userName={staffName}
        role={role}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="relative z-10 flex h-[calc(100vh-64px)] flex-1 overflow-hidden pt-16">
        <StaffSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center overflow-auto p-4 md:p-8">
          <div className="rounded-[32px] border border-white/40 bg-white/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/5 dark:bg-[#131313]/80">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#175ead] dark:text-[#72aafe]">
                  Staff SOS Chain
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-[#081d2c] dark:text-white">
                  {beaconCopy.transportHeadline}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold text-[#414753] dark:text-[#c1c6d5]">
                  Staff trigger auto-routing follows the same fallback order as guest SOS.
                  Admin can monitor it, but transport changes stay manual on the control side.
                </p>
              </div>
              <div className="rounded-2xl border border-[#175ead]/20 bg-[#e2efff]/70 px-4 py-3 dark:border-white/10 dark:bg-[#141414]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#717785] dark:text-[#8e95a8]">
                  Current Route
                </p>
                <p className="mt-2 text-sm font-black text-[#175ead] dark:text-[#72aafe]">
                  {activeLabel}
                </p>
                <p className="mt-1 text-xs font-bold text-[#414753] dark:text-[#c1c6d5]">
                  {assessment.summary}
                </p>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {(["internet", "ip", "ble"] as const).map((transport) => {
                const active = activeTransport === transport;
                return (
                  <div
                    key={transport}
                    className={`rounded-2xl border px-5 py-4 ${
                      active
                        ? "border-[#175ead] bg-[#175ead]/10 dark:border-[#72aafe] dark:bg-[#72aafe]/10"
                        : "border-[#c1c6d5]/40 bg-[#f7f9ff]/70 dark:border-white/10 dark:bg-[#111111]"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#717785] dark:text-[#8e95a8]">
                      {getTransportLabel(transport)}
                    </p>
                    <p className="mt-2 text-sm font-black text-[#081d2c] dark:text-white">
                      {active ? "Active transport" : "Fallback standby"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center rounded-[28px] border border-[#bc000a]/20 bg-[#ffdad6]/30 p-8 text-center dark:border-[#ff5449]/20 dark:bg-[#280a0a]/40">
              <button
                onPointerDown={startPress}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                className={`flex h-48 w-48 items-center justify-center rounded-full border-[6px] text-white shadow-[inset_0_-15px_30px_rgba(0,0,0,0.4),_0_20px_40px_rgba(188,0,10,0.5)] transition-all duration-500 md:h-60 md:w-60 ${
                  sosActive
                    ? "animate-pulse border-red-500 bg-red-900 ring-8 ring-red-500/40"
                    : "border-white/90 bg-gradient-to-t from-[#bc000a] to-[#ff5449]"
                }`}
                aria-label="Trigger staff SOS"
              >
                <div>
                  <span
                    className="material-symbols-outlined mb-3 block text-6xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    {isMicActive ? "mic" : "sos"}
                  </span>
                  <span className="text-lg font-black uppercase tracking-[0.2em]">
                    {sosActive ? "Live" : "Staff SOS"}
                  </span>
                </div>
              </button>

              <p className="mt-6 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#bc000a]">
                {sosActive
                  ? "Admin notified. Mic stays on current route."
                  : "Hold for 3 seconds to trigger staff emergency"}
              </p>

              {sosActive && (
                <button
                  onClick={() => void handleCancel()}
                  className="mt-4 rounded-full border border-red-500 px-6 py-2 text-xs font-bold uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                >
                  Cancel Emergency
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
