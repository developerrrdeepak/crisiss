"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { ensureFirebaseConfigured, getAuthInstance } from "@/lib/firebase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const configured = await ensureFirebaseConfigured();
        if (!configured || cancelled) {
          throw new Error("Firebase config unavailable.");
        }

        const auth = getAuthInstance();

        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (cancelled) {
            return;
          }

          setUser(currentUser);
          setLoading(false);
          
          const isAuthenticated = currentUser;

          if (!isAuthenticated && pathname !== "/admin/login") {
            router.push("/admin/login");
          } else if (isAuthenticated && pathname === "/admin/login") {
            router.push("/admin");
          }
        });
      } catch {
        if (cancelled) {
          return;
        }

        setLoading(false);
        if (pathname !== "/admin/login") {
          router.push("/admin/login");
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router, pathname]);

  // Prevent flashing content while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] relative overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/8 to-violet-500/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-tl from-blue-500/8 to-cyan-500/5 blur-3xl" />
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.06) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>

        <div className="relative flex flex-col items-center gap-8">
          {/* Orbital spinner */}
          <div className="relative w-20 h-20">
            {/* Outer ring */}
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "2.4s" }} viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="url(#grad1)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="180 48" />
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            {/* Inner ring */}
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "1.6s", animationDirection: "reverse" }} viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="26" fill="none" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" strokeDasharray="100 64" />
              <defs>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse" />
            </div>
          </div>

          {/* Brand mark */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#a1a1aa]">Aegis</span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full bg-indigo-500"
                  style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <p className="text-xs text-[#71717a] dark:text-[#52525b] font-medium mt-1">Verifying session…</p>
          </div>
        </div>
      </div>
    );
  }

  const isAuthenticated = user;

  // Additional safety net
  if (!isAuthenticated && pathname !== "/admin/login") return null;

  return <div className="dashboard-root h-full">{children}</div>;
}
