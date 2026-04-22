"use client";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useState, useRef, useEffect, useMemo } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useRadio } from "@/hooks/useRadio";
import { useSosTransport } from "@/hooks/useSosTransport";
import { getDb } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  buildTransportChannels,
  getTransportLabel,
} from "@/lib/sos-transport";

import { GuestSidebar } from "@/components/GuestSidebar";
import { useAuthSync } from "@/hooks/useAuthSync";

export default function GuestSOS() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    if (sosActive) return;
    pressTimer.current = setTimeout(() => {
        handleSOSTrigger();
    }, 3000);
  };

  const endPress = () => {
     if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
     }
  };

  // 1. Initialize Realtime Hooks
  const { dbUser } = useAuthSync();
  const userName = dbUser?.name || "Guest";
  const roomId = dbUser?.roomNumber || dbUser?.room || "Pending";
  const incidentBaseChannel = useMemo(() => `channel-guest-room-${roomId}`, [roomId]);
  const transportChannels = useMemo(
    () => buildTransportChannels(incidentBaseChannel),
    [incidentBaseChannel]
  );
  const {
    activeTransport,
    assessment,
    activeLabel,
  } = useSosTransport({ mode: "auto" });
  const audioChannel = transportChannels[activeTransport];
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);

  const socket = useSocket('guest');
  const { isMicActive, toggleMic } = useRadio(socket, audioChannel);

  const isMicActiveRef = useRef(isMicActive);
  useEffect(() => {
     isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  interface AlertResolvedPayload {
    roomId: string;
    incidentId: string;
  }

  useEffect(() => {
    if (!socket) return;
    const handleResolved = async (payload: AlertResolvedPayload) => {
        if (payload.roomId === roomId) {
            setSosActive(false);
            setActiveIncidentId(null);
            if (isMicActiveRef.current) {
                await toggleMic();
            }
        }
    };
    socket.on('alert-resolved', handleResolved);
    return () => { socket.off('alert-resolved', handleResolved); };
  }, [socket, toggleMic, roomId]);

  const handleCancel = async () => {
      setSosActive(false);
      const incidentId = activeIncidentId || "GUEST-CANCEL";
      setActiveIncidentId(null);
      if (isMicActive) {
          await toggleMic();
      }
      socket?.emit('resolve-alert', { roomId: roomId, incidentId });
  };

  const handleSOSTrigger = async () => {
    if (sosActive) return;
    const incidentId = `INC-${Math.floor(Math.random() * 10000)}`;
    setSosActive(true);
    setActiveIncidentId(incidentId);

    // 1. Save to Firestore (Wrapped in try/catch in case of mock credentials)
    try {
      const db = getDb();
      await addDoc(collection(db, "incidents"), {
        guestName: userName,
        roomId: roomId,
        incidentId,
        type: "SOS Distress",
        status: "Active",
        timestamp: serverTimestamp(),
        audioChannel,
        activeTransport,
        transportMode: "auto",
        transportChannels,
        originRole: "guest",
      });
    } catch {
      console.log("Firestore bypassed (likely using mock credentials), proceeding with realtime broadcast.");
    }

    // 2. Broadcast via Socket.io to Admins & Staff
    socket?.emit('trigger-sos', {
      incidentId,
      guestName: userName,
      roomId: roomId,
      audioChannel,
      activeTransport,
      transportMode: "auto",
      transportChannels,
      originRole: "guest",
    });

    // 3. Auto-open Mic to transmit audio to staff
    await toggleMic();
  };

  const handleSOSKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      await handleSOSTrigger();
    }
  };

  const handleCallFrontDesk = async () => {
    if (!isMicActive) {
      await toggleMic();
    }
    // Broadcast a call-front-desk event
    socket?.emit('call-front-desk', {
      incidentId: `CALL-${Math.floor(Math.random() * 10000)}`,
      guestName: userName,
      roomId: roomId,
      type: "Front Desk Call",
      audioChannel,
      activeTransport,
      transportMode: "auto",
      transportChannels,
      originRole: "guest",
    });
  };

  useEffect(() => {
    if (!socket || !sosActive || !activeIncidentId) {
      return;
    }

    socket.emit("trigger-sos", {
      incidentId: activeIncidentId,
      guestName: userName,
      roomId,
      audioChannel,
      activeTransport,
      transportMode: "auto",
      transportChannels,
      originRole: "guest",
    });
  }, [
    activeIncidentId,
    activeTransport,
    audioChannel,
    roomId,
    socket,
    sosActive,
    transportChannels,
    userName,
  ]);

  return (
    <div className="bg-[#f5f6fa] dark:bg-[#151824] text-[#081d2c] dark:text-[#e5e2e1] min-h-screen flex flex-col font-['Outfit'] transition-colors relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#bc000a]/10 dark:bg-[#e2241f]/10 rounded-full blur-[120px] animate-blob" />
      </div>

      <DashboardHeader
        title="Emergency SOS"
        subtitle="Aegis Smart Hotel"
        userName={userName}
        role={`Room ${roomId}`}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 h-[calc(100vh-64px)] pt-16">
        <GuestSidebar 
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 overflow-auto p-4 md:p-8 max-w-3xl mx-auto w-full flex flex-col items-center justify-center space-y-8 font-['Space_Grotesk']">
          <div className="w-full bg-white/80 dark:bg-[#131313]/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl border border-white/50 dark:border-white/5 relative flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700 min-h-[400px]">

            <div className="relative group flex items-center justify-center cursor-pointer mb-6 mt-4 hover:scale-105 active:scale-95 transition-transform duration-300">
              <div className="absolute inset-0 bg-[#bc000a] dark:bg-[#ff5449] rounded-full blur-[40px] opacity-60 animate-pulse hidden md:block"></div>

              {/* DYNAMIC SOS BUTTON */}
              <button
                onPointerDown={startPress}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onKeyDown={handleSOSKeyDown}
                className={`w-48 h-48 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center shadow-[inset_0_-15px_30px_rgba(0,0,0,0.4),_0_20px_40px_rgba(188,0,10,0.5)] border-[6px] relative z-10 transition-all duration-500
                    ${sosActive
                    ? "bg-red-900 border-red-500 animate-pulse ring-8 ring-red-500/50"
                    : "bg-gradient-to-t from-[#bc000a] to-[#ff5449] border-white/90 dark:border-[#1a1a1a]"
                  }
                  `}
                aria-label={sosActive ? "SOS Active - Emergency Transmitting" : "Activate SOS - Hold for 3 seconds"}
                role="button"
                tabIndex={0}
              >
                <span className="material-symbols-outlined text-6xl md:text-7xl text-white mb-2 drop-shadow-lg" style={{ fontVariationSettings: '"FILL" 1' }}>
                  {isMicActive ? "mic" : "sos"}
                </span>
                <span className="font-black font-['Space_Grotesk'] tracking-[0.2em] text-lg text-white uppercase drop-shadow-md">
                  {sosActive ? "Transmitting" : "Distress Call"}
                </span>
              </button>
            </div>

            <p className={`text-xs font-bold tracking-[0.3em] uppercase font-['Space_Grotesk'] mb-8 px-4 py-2 rounded-xl transition-colors
                ${sosActive ? "text-red-500 bg-red-500/10 animate-pulse" : "text-[#bc000a] bg-[#bc000a]/10 dark:bg-[#ffb4aa]/10"}
             `}>
              {sosActive ? "Staff Notified. Microphone Active." : "Hold completely for 3 seconds"}
            </p>

            <div className="mb-6 w-full rounded-2xl border border-[#175ead]/20 bg-[#e2efff]/40 dark:bg-[#111827]/60 p-5 text-left">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#003d79] dark:text-[#72aafe]">
                    Auto Transport Routing
                  </p>
                  <p className="mt-2 text-sm font-black text-[#081d2c] dark:text-white">
                    Live path: {activeLabel}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#414753] dark:text-[#c1c6d5]">
                    {assessment.summary}
                  </p>
                </div>
                <span className="rounded-full border border-[#175ead]/20 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#175ead] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#72aafe]">
                  {assessment.qualityLabel}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {(["internet", "ip", "ble"] as const).map((transport) => {
                  const active = activeTransport === transport;
                  return (
                    <div
                      key={transport}
                      className={`rounded-2xl border px-4 py-3 transition-colors ${
                        active
                          ? "border-[#175ead] bg-[#175ead]/10 dark:border-[#72aafe] dark:bg-[#72aafe]/10"
                          : "border-[#175ead]/15 bg-white/60 dark:border-white/10 dark:bg-[#151515]"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#717785] dark:text-[#8e95a8]">
                        {getTransportLabel(transport)}
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#081d2c] dark:text-white">
                        {active ? "Currently active" : "Standby fallback"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {sosActive && (
                <button onClick={handleCancel} className="mb-6 px-6 py-2 border border-red-500 text-red-500 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors">
                   Cancel Emergency
                </button>
            )}

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {/* Dynamic Analysis Card */}
              <div className={`backdrop-blur-md border p-5 rounded-2xl shadow-inner transition-colors ${sosActive ? "bg-red-950/20 border-red-500/50" : "bg-[#ffdad6]/50 dark:bg-[#ba1a1a]/10 border-[#bc000a]/30"}`}>
                <h3 className="font-black text-[10px] text-[#93000a] dark:text-[#ffb4aa] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#bc000a] animate-pulse" /> Live Analysis
                </h3>
                <p className="font-black text-sm text-[#410001] dark:text-white mb-1 leading-tight tracking-tight">
                  {sosActive ? "Emergency Response Triggered" : "Active Room Alert"}
                </p>
                <p className="text-xs text-[#93000a] dark:text-[#ffb4aa]/80 font-['Outfit'] font-bold leading-relaxed">
                  {sosActive ? "Your distress signal has been securely transmitted. A responding unit is en route." : "Smoke detector triggered independently. Hotel staff has been notified."}
                </p>
              </div>

              <div className="bg-[#e2efff]/50 dark:bg-[#131313]/50 backdrop-blur-md border border-[#175ead]/30 dark:border-white/5 p-5 rounded-2xl shadow-inner font-['Outfit'] flex flex-col justify-center">
                <h3 className="font-black font-['Space_Grotesk'] text-[10px] text-[#003d79] dark:text-[#72aafe] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">support_agent</span> Connect with Staff
                </h3>
                <p className="text-xs font-bold text-[#414753] dark:text-[#c1c6d5] leading-relaxed mb-3">Our 24/7 hospitality team is ready to assist you safely.</p>
                <button
                  onClick={handleCallFrontDesk}
                  className={`border rounded-xl py-2 font-black text-xs uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 w-full
                    ${isMicActive ? "bg-red-500 text-white border-red-600 animate-pulse" : "bg-white dark:bg-[#1a1a1a] text-[#081d2c] dark:text-white border-[#c1c6d5]/50 dark:border-white/10 hover:-translate-y-0.5"}
                 `}>
                  <span className="material-symbols-outlined text-[16px]">{isMicActive ? "mic" : "call"}</span>
                  {isMicActive ? "Voice Channel Open" : "Call Front Desk"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
