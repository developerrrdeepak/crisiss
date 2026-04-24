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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 relative">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-12 h-12">
            <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="100 40" className="text-blue-600 dark:text-blue-500" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-zinc-800" opacity="0.3" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-white font-['Space_Grotesk']">Aegis Secure</span>
            <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium tracking-wide uppercase">Establishing Command Link...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAuthenticated = user;

  // Additional safety net
  if (!isAuthenticated && pathname !== "/admin/login") return null;

  return <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors">{children}</div>;
}
