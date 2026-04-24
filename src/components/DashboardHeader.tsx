"use client";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthSync } from "@/hooks/useAuthSync";
import { HeaderNotificationItem } from "@/lib/header-notifications";

function mergeNotifications(
  nextNotifications: HeaderNotificationItem[],
  currentNotifications: HeaderNotificationItem[]
) {
  const readState = new Map(
    currentNotifications.map((notification) => [notification.id, notification.unread])
  );

  return nextNotifications.map((notification) => ({
    ...notification,
    unread: readState.get(notification.id) ?? notification.unread,
  }));
}

export function DashboardHeader({
  title,
  subtitle,
  userName: propUserName,
  role: propRole,
  search = false,
  onMenuClick,
  notifications: propNotifications
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  userName?: string;
  role?: string;
  search?: boolean;
  onMenuClick?: () => void;
  notifications?: HeaderNotificationItem[];
}) {
  const userName = propUserName || "Guest";
  const role = propRole || "Role";
  const pathname = usePathname() || "";
  const { dbUser, loading } = useAuthSync();
  const routeRole =
    pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/staff") ? "staff" : "guest";
  const notificationRole = dbUser?.role || routeRole;
  const initialNotifications = propNotifications || [];
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotificationItem[]>(initialNotifications);
  
  let profileLink = "/guest-profile";
  let settingsLink = "/guest-settings";
  if (pathname.startsWith("/admin")) {
    profileLink = "/admin/profile";
    settingsLink = "/admin/settings";
  } else if (pathname.startsWith("/staff")) {
    profileLink = "/staff-profile";
    settingsLink = "/staff-settings";
  } else if (dbUser?.role?.toLowerCase() === "admin") {
    profileLink = "/admin/profile";
    settingsLink = "/admin/settings";
  } else if (dbUser?.role?.toLowerCase() === "staff") {
    profileLink = "/staff-profile";
    settingsLink = "/staff-settings";
  }

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    if (!propNotifications) return;

    setNotifications((current) => mergeNotifications(propNotifications, current));
  }, [propNotifications]);

  useEffect(() => {
    if (propNotifications) return;
    if (notificationRole !== "admin" && loading) return;
    if (notificationRole !== "admin" && !dbUser?.firebaseUid) {
      setNotifications([]);
      return;
    }

    let active = true;

    const loadNotifications = async () => {
      try {
        const params = new URLSearchParams({ role: notificationRole });
        if (notificationRole !== "admin" && dbUser?.firebaseUid) {
          params.set("uid", dbUser.firebaseUid);
        }

        const res = await fetch(`/api/header-notifications?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!active || !data.success || !Array.isArray(data.notifications)) {
          return;
        }

        setNotifications((current) => mergeNotifications(data.notifications, current));
      } catch (error) {
        console.error("Failed to load header notifications:", error);
      }
    };

    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [dbUser?.firebaseUid, loading, notificationRole, propNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 flex justify-between items-center w-full px-4 md:px-6 py-0 h-16 bg-white/80 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-800 z-[60] shrink-0 font-['Sora']"
    >
      <div className="flex items-center gap-3 lg:gap-5">
        {onMenuClick && (
          <motion.button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-500 dark:text-zinc-400 hover:bg-[#f4f4f5] dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all duration-200"
            whileTap={{ scale: 0.95 }}
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </motion.button>
        )}
        <div>
          <h2 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white whitespace-nowrap">{title}</h2>
          {subtitle && <p className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-[0.18em] hidden md:block mt-0.5">{subtitle}</p>}
        </div>
        {search && (
          <div className="relative items-center hidden xl:flex">
            <span className="material-symbols-outlined absolute left-3 text-zinc-400 text-[18px]">search</span>
            <motion.input
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-[#f4f4f5] dark:bg-zinc-900 border border-transparent focus:border-[#09090b] dark:focus:border-white text-slate-900 dark:text-white text-xs py-2 pl-9 pr-4 placeholder:text-zinc-400 outline-none rounded-xl transition-all duration-200 w-64"
              placeholder="Search…"
              type="text"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <div className="flex items-center gap-1 pr-2 sm:pr-3 border-r border-slate-200 dark:border-zinc-800">
          <ThemeToggle />
          <div className="relative" ref={notifRef}>
            <motion.button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="p-2 hover:bg-[#f4f4f5] dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 relative rounded-xl"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
              aria-expanded={notifOpen}
              whileTap={{ scale: 0.95 }}
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0a0a0a]"
                  />
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-14 right-0 w-[340px] sm:w-[380px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-2xl z-[100] overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-zinc-800/80 bg-gradient-to-r from-white to-[#fafafa] dark:from-[#0f0f0f] dark:to-[#111111]">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
                      <AnimatePresence>
                        {unreadCount > 0 && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                      {notifications.map(n => (
                        <motion.button key={n.id} layout
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left flex items-start gap-4 px-5 py-4 transition-all duration-150 hover:bg-slate-50 dark:hover:bg-zinc-900 ${n.unread ? "bg-slate-50/60 dark:bg-zinc-900/50/60" : "bg-transparent"}`}
                        >
                          <motion.div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.iconBg}`} whileHover={{ scale: 1.08 }}>
                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>{n.icon}</span>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug mb-0.5 ${n.unread ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-500 dark:text-zinc-400"}`}>{n.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-500 leading-relaxed line-clamp-2">{n.body}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-[#3f3f46] mt-1.5 font-medium uppercase tracking-wide">{n.time}</p>
                          </div>
                          <AnimatePresence>
                            {n.unread && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                            )}
                          </AnimatePresence>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    {notifications.length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">No live notifications yet.</div>
                    )}
                  </div>

                  <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/50">
                    <button className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors w-full text-center">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3" ref={profileRef}>
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 tracking-[0.18em] uppercase whitespace-nowrap mt-0.5">{role}</p>
          </div>
          <motion.button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="w-9 h-9 bg-gradient-to-br from-[#f4f4f5] to-[#e4e4e7] dark:from-[#1a1a1a] dark:to-[#111111] border border-slate-200 dark:border-zinc-800/80 flex items-center justify-center rounded-full hover:border-[#09090b] dark:hover:border-white transition-all duration-200 overflow-hidden"
            aria-label="User profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            whileTap={{ scale: 0.95 }}
          >
            <span className="material-symbols-outlined text-[20px] text-slate-500 dark:text-zinc-400">person</span>
          </motion.button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute top-12 right-0 min-w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 shadow-2xl shadow-black/10 dark:shadow-black/40 py-2 flex flex-col z-[100] rounded-2xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800/80 sm:hidden">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{userName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-[0.18em] mt-0.5">{role}</p>
                </div>
                <div className="px-4 py-2 text-[10px] text-zinc-400 uppercase font-bold tracking-[0.2em] hidden sm:block">Account</div>
                <Link href={profileLink} onClick={() => setProfileOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-slate-900 dark:text-zinc-50 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-3 transition-all duration-150">
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-zinc-400">manage_accounts</span> Profile Info
                </Link>
                <Link href={settingsLink} onClick={() => setProfileOpen(false)} className="w-full text-left px-4 py-2.5 text-sm text-slate-900 dark:text-zinc-50 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-3 transition-all duration-150">
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-zinc-400">settings</span> Settings
                </Link>
                <div className="my-1 border-b border-slate-200 dark:border-zinc-800/80" />
                <Link href="/" className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 transition-all duration-150 font-medium">
                  <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
