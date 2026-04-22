"use client";
import { useEffect, useState } from "react";

interface SerwistWindow extends Window {
    serwist?: {
        addEventListener(event: string, handler: () => void): void;
    };
}

export function PWAUpdater() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator
        ) {
            const serwistWindow = window as Window & SerwistWindow;
            if (serwistWindow.serwist !== undefined) {
                const serwist = serwistWindow.serwist;

                serwist.addEventListener("waiting", () => {
                    setShow(true);
                });
            }
        }
    }, []);

    const handleUpdate = () => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
                reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
            });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed top-20 right-4 z-[100] animate-in slide-in-from-right-4">
            <div className="bg-white dark:bg-[#1c1b1b] border border-[#175ead] p-4 rounded-2xl shadow-2xl max-w-[250px]">
                <p className="text-[10px] font-black uppercase text-[#175ead] mb-2 tracking-widest">System Update Available</p>
                <p className="text-xs text-[#717785] mb-4 font-medium">New tactical protocols have been downloaded.</p>
                <button
                    onClick={handleUpdate}
                    className="w-full bg-[#175ead] text-white text-[10px] font-black py-2 rounded-lg uppercase tracking-widest hover:bg-[#081d2c] transition-colors"
                >
                    Update Now
                </button>
            </div>
        </div>
    );
}