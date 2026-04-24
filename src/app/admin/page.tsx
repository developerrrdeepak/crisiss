"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthSync } from "@/hooks/useAuthSync";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardMessagingCard } from "@/components/messaging/DashboardMessagingCard";
import { useMessagingOverview } from "@/hooks/useMessagingOverview";
import {
  MessagingViewer,
  buildAllGuestsThread,
  buildAllStaffThread,
} from "@/lib/messaging";

interface Incident {
  id: string;
  title: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  timestamp: string;
  guestId: string;
}

interface Guest {
  id: string;
  name: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "alert";
  title: string;
  message: string;
  time: string;
}

interface DashboardSummary {
  totalGuests: number;
  activeStaff: number;
  roomsAvailable: number;
  systemAlerts: number;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
}

interface DashboardResponse {
  success: boolean;
  data?: {
    incidents?: Incident[];
    guests?: Guest[];
    notifications?: Notification[];
    summary?: DashboardSummary;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

export default function AdminDashboard() {
  const router = useRouter();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { firebaseUser, dbUser, loading } = useAuthSync();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalGuests: 0,
    activeStaff: 0,
    roomsAvailable: 0,
    systemAlerts: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    occupancyRate: 0,
  });
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const messagingViewer = useMemo<MessagingViewer | null>(() => {
    if (!firebaseUser) return null;

    return {
      role: "admin",
      userId: dbUser?.profileId || dbUser?.id || dbUser?.firebaseUid || firebaseUser.uid,
      aliasIds: [
        dbUser?.id,
        dbUser?.loginId ?? null,
        dbUser?.firebaseUid,
        dbUser?.employeeId ?? null,
        firebaseUser.uid,
      ].filter((value): value is string => Boolean(value)),
      name: dbUser?.name || dbUser?.displayName || "Administrator",
      department: dbUser?.department || "Command Center",
    };
  }, [dbUser, firebaseUser]);
  const messagingBaseThreads = useMemo(
    () =>
      messagingViewer
        ? [buildAllStaffThread(messagingViewer), buildAllGuestsThread(messagingViewer)]
        : [],
    [messagingViewer]
  );
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
  const allStaffThreadId = messagingBaseThreads[0]?.id ?? null;
  const allGuestsThreadId = messagingBaseThreads[1]?.id ?? null;

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push("/admin/login");
    }
  }, [loading, firebaseUser, router]);

  useEffect(() => {
    let active = true;

    const refreshDashboard = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const json = (await res.json()) as DashboardResponse;

        if (!active || !json.success) return;

        setIncidents(json.data?.incidents || []);
        setGuests(json.data?.guests || []);
        setNotifications(json.data?.notifications || []);
        setSummary(
          json.data?.summary || {
            totalGuests: 0,
            activeStaff: 0,
            roomsAvailable: 0,
            systemAlerts: 0,
            totalRooms: 0,
            occupiedRooms: 0,
            occupancyRate: 0,
          }
        );
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void refreshDashboard();

    const interval = setInterval(() => {
      void refreshDashboard();
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const fetchLatestDashboard = async () => {
    const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const json = (await res.json()) as DashboardResponse;

    if (!json.success) return;

    setIncidents(json.data?.incidents || []);
    setGuests(json.data?.guests || []);
    setNotifications(json.data?.notifications || []);
    setSummary(
      json.data?.summary || {
        totalGuests: 0,
        activeStaff: 0,
        roomsAvailable: 0,
        systemAlerts: 0,
        totalRooms: 0,
        occupiedRooms: 0,
        occupancyRate: 0,
      }
    );
  };

  const handleReviewIncident = async (incident: Incident) => {
    try {
      setActiveAction(`incident-${incident.id}`);

      const response = await fetch("/api/admin/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: incident.id,
          status: incident.status === "Resolved" ? "Active" : "Resolved",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to review incident");
      }

      await fetchLatestDashboard();
    } catch (error) {
      console.error("Failed to review incident:", error);
    } finally {
      setActiveAction(null);
    }
  };

  const handleOverride = async (
    key: "lockdown" | "fire"
  ) => {
    const incidentPayload =
      key === "lockdown"
        ? {
          title: "Lockdown Protocol",
          severity: "Critical",
          description: "Administrative lockdown protocol initiated from control center.",
        }
        : {
          title: "Fire Evacuation",
          severity: "Urgent",
          description: "Evacuation protocol initiated from control center.",
        };

    try {
      setActiveAction(`override-${key}`);

      await fetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incidentPayload),
      });

      await fetchLatestDashboard();
    } catch (error) {
      console.error("Failed to trigger override:", error);
    } finally {
      setActiveAction(null);
    }
  };

  const stats = [
    {
      label: "GUESTS",
      val: summary.totalGuests,
      icon: "groups",
      change:
        summary.totalGuests > 0
          ? `${summary.occupiedRooms} active rooms`
          : "No records",
    },
    {
      label: "STAFF",
      val: summary.activeStaff,
      icon: "badge",
      change:
        summary.activeStaff > 0 ? "On shift" : "No roster",
    },
    {
      label: "ROOMS",
      val: summary.roomsAvailable,
      icon: "meeting_room",
      change:
        summary.totalRooms > 0
          ? `${summary.occupancyRate}% full`
          : "No inventory",
    },
    {
      label: "ALERTS",
      val: summary.systemAlerts,
      icon: "notification_important",
      change: summary.systemAlerts > 0 ? "Needs review" : "Clear",
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>;
      case "warning":
        return <span className="material-symbols-outlined text-orange-500 text-[20px] mt-0.5">info</span>;
      case "success":
        return <span className="material-symbols-outlined text-green-500 text-[20px] mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5 text-blue-500">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>person</span>
          </div>
        );
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/8 to-violet-500/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-tl from-blue-500/8 to-cyan-500/5 blur-3xl" />
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.06) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>
        <div className="relative flex flex-col items-center gap-8">
          <div className="relative w-20 h-20">
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "2.4s" }} viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="url(#grad1)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="180 48" />
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "1.6s", animationDirection: "reverse" }} viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="26" fill="none" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" strokeDasharray="100 64" />
              <defs>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#a1a1aa]">Aegis</span>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-indigo-500" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <p className="text-xs text-[#71717a] dark:text-[#52525b] font-medium mt-1">Loading Command Center...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#fafafa] dark:bg-[#0a0a0a] text-[#09090b] dark:text-[#e5e2e1] h-screen overflow-hidden flex flex-col font-['Sora'] relative"
    >
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.08) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <DashboardHeader
        title={<span className="text-[#4F46E5] dark:text-[#818CF8] uppercase tracking-[0.2em] font-black text-sm">ADMINISTRATOR</span>}
        userName={dbUser?.name || "Operations Lead"}
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 pt-16 overflow-y-auto">

        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
          alertCount={summary.systemAlerts}
          messageCount={activeMessageThreads}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 w-full max-w-[1600px] mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <h1 className="text-3xl font-light tracking-tight">
              Command Center
            </h1>
            <p className="text-sm text-[#71717a] dark:text-[#a1a1aa] mt-2">Live operations.</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-8"
          >
            {/* STATS GRID */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#0f0f0f] p-5"
                >
                  <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-[#a1a1aa]">{stat.label}</p>
                  <p className="text-3xl font-light tracking-tight mt-3">{stat.val}</p>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-2">{stat.change}</p>
                </div>
              ))}
            </motion.div>

            {/* LOWER CONTENT GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full">

              <motion.div variants={itemVariants} className="xl:col-span-8 flex flex-col gap-8">
                <DashboardMessagingCard
                  eyebrow="Integrated Messaging"
                  title="Communications Hub"
                  description="Staff and guest channels."
                  recentThreads={recentMessageThreads}
                  totalThreads={totalMessageThreads}
                  activeThreads={activeMessageThreads}
                  loading={messagingLoading}
                  error={messagingError}
                  emptyLabel="Broadcast channels are initialized. Live staff and guest conversations will appear here as soon as the first message lands."
                  actions={[
                    { href: "/admin/messages", label: "Open Message Center", icon: "arrow_forward" },
                    ...(allStaffThreadId
                      ? [
                          {
                            href: `/admin/messages?thread=${encodeURIComponent(allStaffThreadId)}`,
                            label: "Broadcast Staff",
                            icon: "groups",
                          },
                        ]
                      : []),
                    ...(allGuestsThreadId
                      ? [
                          {
                            href: `/admin/messages?thread=${encodeURIComponent(allGuestsThreadId)}`,
                            label: "Broadcast Guests",
                            icon: "campaign",
                          },
                        ]
                      : []),
                  ]}
                />

                {/* LIVE ACTIVITY FEED */}
                <div className="rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#0f0f0f] p-6 lg:p-8 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center mb-6 pb-6 border-b border-[#e4e4e7] dark:border-[#27272a]">
                    <h3 className="text-lg font-semibold tracking-tight">Live Feed</h3>
                    <Link href="/admin/cameras" className="text-[11px] font-bold tracking-widest uppercase text-[#4F46E5] dark:text-[#818CF8] hover:text-[#4338ca] dark:hover:text-[#a5b4fc] flex items-center gap-2 transition-colors px-4 py-2 bg-[#4F46E5]/5 dark:bg-[#818CF8]/10 rounded-full hover:bg-[#4F46E5]/10">
                      Cameras <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3">
                    <AnimatePresence mode="popLayout">
                      {notifications.map((notif, i) => (
                        <motion.div
                          key={notif.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex gap-4 p-4 lg:p-5 hover:bg-white dark:hover:bg-[#121215] rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-[#27272a] hover:shadow-sm transition-all group"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1.5">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#dc2626] dark:group-hover:text-[#ffb4aa] transition-colors">{notif.title}</p>
                              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 dark:text-[#52525b] shrink-0 bg-gray-50 dark:bg-[#121215] px-2 py-1 rounded-md">{notif.time}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-[#a1a1aa] leading-relaxed font-medium">{notif.message}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {notifications.length === 0 && (
                      <div className="p-4 text-xs text-gray-500 dark:text-[#71717a]">
                        No live notifications available.
                      </div>
                    )}
                  </div>
                </div>

                {/* SECURITY INCIDENTS */}
                <div className="rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#0f0f0f] p-6 lg:p-8 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center mb-6 pb-6 border-b border-[#e4e4e7] dark:border-[#27272a]">
                    <h3 className="text-lg font-semibold tracking-tight flex items-center gap-3">
                      Incidents
                      <span className="relative flex h-3 w-3">
                        {incidents.filter(i => i.status === 'Active').length > 0 && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        )}
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </h3>
                    <span className="text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      {incidents.filter(i => i.status === 'Active').length} ACTIVE
                    </span>
                  </div>

                  <div className="space-y-4">
                    {incidents.slice(0, 5).map((inc, i) => (
                      <motion.div
                        key={inc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all ${inc.status === 'Active'
                            ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20'
                            : 'bg-[#f8f9fa] dark:bg-[#1c202e] border-transparent hover:bg-[#e9ecef] dark:hover:bg-[#2a3042]'
                          }`}
                      >
                        <div className="flex items-start sm:items-center gap-4 mb-4 sm:mb-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${inc.severity === 'Urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            }`}>
                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>policy</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{inc.title}</p>
                            <p className="text-[11px] font-medium text-gray-500 dark:text-[#a1a1aa]">{inc.description || inc.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-[56px] sm:ml-0">
                          <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg border ${inc.severity === 'Urgent'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                            }`}>
                            {inc.status}
                          </span>
                          <button
                            onClick={() => void handleReviewIncident(inc)}
                            disabled={activeAction === `incident-${inc.id}`}
                            className="text-[11px] font-bold px-5 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-[#0a0a0a] shadow-lg shadow-gray-900/20 dark:shadow-white/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                          >
                            Review
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {incidents.length === 0 && (
                      <div className="p-4 text-xs text-gray-500 dark:text-[#71717a]">
                        No incidents recorded.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="xl:col-span-4 flex flex-col gap-8">

                {/* SYSTEM OVERRIDES */}
                <div className="rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#0f0f0f] p-6 lg:p-8 flex flex-col shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-500/5 blur-[50px] pointer-events-none transition-all group-hover:bg-red-500/20"></div>

                  <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-red-500">warning</span>
                    Overrides
                  </h3>

                  <div className="flex flex-col gap-4 relative z-10">
                    <button
                      onClick={() => void handleOverride("lockdown")}
                      disabled={activeAction === "override-lockdown"}
                      className="flex items-center justify-between p-5 rounded-2xl border border-gray-200 dark:border-[#27272a] hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 transition-all duration-200 group/btn shadow-sm disabled:opacity-60 hover:shadow-md hover:-translate-y-0.5"
                    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-[14px] font-bold text-slate-900 dark:text-[#f0f2ff] group-hover/btn:text-red-600 dark:group-hover/btn:text-red-400 transition-colors uppercase tracking-wider">Lockdown Protocol</span>
        <span className="text-[11px] font-medium text-slate-500 dark:text-[#8892b0]">Seals all perimeter doors instantly</span>
      </div>
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center group-hover/btn:bg-red-500 group-hover/btn:text-white transition-all duration-200 border border-gray-200 dark:border-[#27272a] group-hover/btn:border-red-500 text-slate-400 dark:text-slate-500 group-hover/btn:scale-110 group-hover/btn:shadow-lg group-hover/btn:shadow-red-500/30">
        <span className="material-symbols-outlined">lock</span>
      </div>
    </button>

                    <button
                      onClick={() => void handleOverride("fire")}
                      disabled={activeAction === "override-fire"}
                      className="flex items-center justify-between p-5 rounded-2xl border border-gray-200 dark:border-[#27272a] hover:border-orange-300 dark:hover:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950 transition-all duration-200 group/btn shadow-sm disabled:opacity-60 hover:shadow-md hover:-translate-y-0.5"
                    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-[14px] font-bold text-slate-900 dark:text-[#f0f2ff] group-hover/btn:text-orange-600 dark:group-hover/btn:text-orange-400 transition-colors uppercase tracking-wider">Fire Evacuation</span>
        <span className="text-[11px] font-medium text-slate-500 dark:text-[#8892b0]">Unlocks all emergency exits</span>
      </div>
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-all duration-200 border border-gray-200 dark:border-[#27272a] group-hover/btn:border-orange-500 text-slate-400 dark:text-slate-500 group-hover/btn:scale-110 group-hover/btn:shadow-lg group-hover/btn:shadow-orange-500/30">
        <span className="material-symbols-outlined">local_fire_department</span>
      </div>
    </button>
                  </div>
                </div>

                {/* GUEST WATCHLIST */}
                <div className="rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#0f0f0f] p-6 lg:p-8 shadow-sm flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6 pb-6 border-b border-[#e4e4e7] dark:border-[#27272a]">
                    <h3 className="text-lg font-semibold tracking-tight">Guests</h3>
                    <Link href="/admin/guests" className="text-[11px] font-bold tracking-widest uppercase text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                      View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>

                  <AnimatePresence mode="popLayout">
                    <div className="flex flex-col gap-3">
                      {guests.slice(0, 5).map((g, i) => (
                        <motion.div
                          key={g.id || g.room}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex justify-between items-center p-4 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-[#2d3255] hover:bg-slate-50 dark:hover:bg-[#13152b] hover:shadow-sm transition-all group cursor-pointer"
                        >
                          <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1e2235] border border-slate-200 dark:border-[#2d3255] flex items-center justify-center text-[13px] font-black text-slate-600 dark:text-slate-300 shadow-sm group-hover:scale-110 transition-transform">
                              {g.name ? g.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[14px] font-bold text-slate-900 dark:text-[#f0f2ff] group-hover:text-amber-600 dark:group-hover:text-[#a5b4fc] transition-colors">{g.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 dark:text-[#71717a]">
                                <span className="material-symbols-outlined text-[12px]">meeting_room</span>
                                Room {g.room || 'N/A'}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] px-3 py-1.5 rounded-lg uppercase font-bold tracking-widest border shadow-sm ${g.status === 'In Room'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-100 dark:bg-[#232845] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#2d3255]'
                            }`}>
                            {g.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </motion.div>
  );
}
