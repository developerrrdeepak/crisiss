"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthSync } from "@/hooks/useAuthSync";
import { HeaderNotificationItem } from "@/lib/header-notifications";
import { ThemeToggle } from "./ThemeToggle";

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
  notifications: propNotifications,
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

  const unreadCount = notifications.filter((notification) => notification.unread).length;

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

        const response = await fetch(`/api/header-notifications?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await response.json();

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
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false }))
    );
  };

  const markRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification
      )
    );
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed left-0 right-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-[var(--border-color)] bg-[var(--glass-bg)] px-4 backdrop-blur-xl md:px-6"
    >
      <div className="flex items-center gap-3 lg:gap-5">
        {onMenuClick && (
          <motion.button
            onClick={onMenuClick}
            className="rounded-2xl border border-transparent p-2 text-[var(--text-muted)] transition-all duration-200 hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] lg:hidden"
            whileTap={{ scale: 0.95 }}
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </motion.button>
        )}

        <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-muted)] md:flex">
          <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">
            grid_view
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 hidden text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] md:block">
              {subtitle}
            </p>
          )}
        </div>

        {search && (
          <div className="relative hidden items-center xl:flex">
            <span className="material-symbols-outlined absolute left-3 text-[18px] text-[var(--text-muted)]">
              search
            </span>
            <motion.input
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-64 rounded-full border border-transparent bg-[var(--surface-muted)] py-2 pl-9 pr-4 text-xs text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[color:var(--primary)]"
              placeholder="Search..."
              type="text"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2 sm:pr-3">
          <ThemeToggle />

          <div className="relative" ref={notifRef}>
            <motion.button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative rounded-2xl border border-transparent p-2 text-[var(--text-muted)] transition-all duration-200 hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
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
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0a0a0a]"
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
                  className="absolute right-0 top-14 z-[100] w-[340px] overflow-hidden rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--glass-bg)] shadow-2xl shadow-black/10 sm:w-[380px]"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Notifications
                      </h3>
                      <AnimatePresence>
                        {unreadCount > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white"
                          >
                            {unreadCount}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                      {notifications.map((notification) => (
                        <motion.button
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          onClick={() => markRead(notification.id)}
                          className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-all duration-150 hover:bg-[var(--bg-secondary)] ${
                            notification.unread ? "bg-[var(--bg-secondary)]/70" : "bg-transparent"
                          }`}
                        >
                          <motion.div
                            className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${notification.iconBg}`}
                            whileHover={{ scale: 1.08 }}
                          >
                            <span
                              className="material-symbols-outlined text-[18px]"
                              style={{ fontVariationSettings: '"FILL" 1' }}
                            >
                              {notification.icon}
                            </span>
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`mb-0.5 text-xs leading-snug ${
                                notification.unread
                                  ? "font-semibold text-[var(--text-primary)]"
                                  : "font-medium text-[var(--text-secondary)]"
                              }`}
                            >
                              {notification.title}
                            </p>
                            <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
                              {notification.body}
                            </p>
                            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                              {notification.time}
                            </p>
                          </div>
                          <AnimatePresence>
                            {notification.unread && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500"
                              />
                            )}
                          </AnimatePresence>
                        </motion.button>
                      ))}
                    </AnimatePresence>

                    {notifications.length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                        No notifications yet.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-color)] px-5 py-3">
                    <button className="w-full text-center text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3" ref={profileRef}>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
              {userName}
            </p>
            <p className="mt-0.5 whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {role}
            </p>
          </div>

          <motion.button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] transition-all duration-200 hover:border-[color:var(--primary)]"
            aria-label="User profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            whileTap={{ scale: 0.95 }}
          >
            <span className="material-symbols-outlined text-[20px] text-[var(--text-muted)]">
              person
            </span>
          </motion.button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-12 z-[100] flex min-w-52 flex-col overflow-hidden rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--glass-bg)] py-2 shadow-2xl shadow-black/10"
              >
                <div className="border-b border-[var(--border-color)] px-4 py-3 sm:hidden">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{userName}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {role}
                  </p>
                </div>
                <div className="hidden px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] sm:block">
                  Account
                </div>
                <Link
                  href={profileLink}
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--bg-secondary)]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
                    manage_accounts
                  </span>
                  Profile
                </Link>
                <Link
                  href={settingsLink}
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--bg-secondary)]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
                    settings
                  </span>
                  Settings
                </Link>
                <div className="my-1 border-b border-[var(--border-color)]" />
                <Link
                  href="/"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-500/8 dark:text-red-300"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
