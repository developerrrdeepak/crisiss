"use client";
import { useState, useEffect } from "react";

export function ConnectivityBanner() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const updateStatus = () => setIsOffline(!navigator.onLine);
        window.addEventListener("offline", updateStatus);
        window.addEventListener("online", updateStatus);
        return () => {
            window.removeEventListener("offline", updateStatus);
            window.removeEventListener("online", updateStatus);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
            <div className="bg-[#bc000a] text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md">
                <span className="material-symbols-outlined text-sm animate-pulse">wifi_off</span>
                <span className="font-['Space_Grotesk'] font-bold text-[10px] tracking-widest uppercase">
                    Tactical Link Severed — Operating Offline
                </span>
            </div>
        </div>
    );
}