"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export function ManualInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setIsInstalled(true);
        }
    };

    // If already installed or browser hasn't fired the prompt yet, show NOTHING
    if (isInstalled || !deferredPrompt) return null;

    return (
        <button
            onClick={handleInstall}
            className="flex items-center gap-3 p-3 mt-4 w-full rounded-xl bg-[#bc000a]/10 hover:bg-[#bc000a] text-[#bc000a] hover:text-white border border-[#bc000a]/20 transition-all group shadow-sm"
        >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
                download_for_offline
            </span>
            <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                    Install App
                </p>
                <p className="text-[8px] opacity-70 font-bold uppercase tracking-tighter mt-1">
                    Offline Tactical Link
                </p>
            </div>
        </button>
    );
}