"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: (value: boolean) => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (value: boolean) => void;
  alertCount?: number;
  messageCount?: number;
}

export function AdminSidebar({
  sidebarExpanded,
  setSidebarExpanded,
  sidebarMobileOpen,
  setSidebarMobileOpen,
  alertCount = 0,
  messageCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname() || "/admin";
  const isOpen = sidebarExpanded || sidebarMobileOpen;

  const mainNav = [
    { icon: "dashboard", label: "Home", href: "/admin" },
    { icon: "map", label: "Map", href: "/admin/tactical-map" },
    {
      icon: "chat",
      label: "Messages",
      href: "/admin/messages",
      badge: messageCount > 0 ? String(messageCount) : undefined,
    },
    { icon: "emergency", label: "Emergency", href: "/admin/emergency" },
  ];

  const systemNav = [
    { icon: "meeting_room", label: "Rooms", href: "/admin/rooms" },
    { icon: "videocam", label: "Cameras", href: "/admin/cameras" },
    { icon: "badge", label: "Staff", href: "/admin/staff" },
    { icon: "person", label: "Guests", href: "/admin/guests" },
    { icon: "add_home", label: "Inventory", href: "/admin/manage-rooms" },
  ];

  const renderNavItem = (item: { icon: string; label: string; href: string; badge?: string }) => {
    const isActive = pathname === item.href || (item.href === "/admin" && pathname === "/admin");
    return (
      <Link
        href={item.href}
        key={item.href}
        className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
          isActive
            ? "bg-[#101828] text-white shadow-lg shadow-black/10 dark:bg-white dark:text-[#101828]"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        <span
          className="material-symbols-outlined shrink-0 text-[22px]"
          style={{ fontVariationSettings: isActive ? '"FILL" 1' : '"FILL" 0' }}
        >
          {item.icon}
        </span>

        <span
          className="overflow-hidden whitespace-nowrap text-[13px] font-semibold tracking-tight"
          style={{
            transition: isOpen
              ? "opacity 220ms ease 160ms, transform 220ms ease 160ms, max-width 400ms ease"
              : "opacity 120ms ease, transform 120ms ease, max-width 400ms ease",
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateX(0)" : "translateX(-8px)",
            maxWidth: isOpen ? "160px" : "0px",
            pointerEvents: isOpen ? "auto" : "none",
          }}
        >
          {item.label}
        </span>

        {item.badge && (
          <span
            className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
              isActive ? "bg-white/20 text-white dark:bg-black/10 dark:text-[#101828]" : "bg-red-500 text-white"
            }`}
            style={{
              transition: "opacity 160ms ease, transform 160ms ease",
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "scale(1)" : "scale(0)",
            }}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/55 backdrop-blur-md md:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-[64px] z-50 flex h-[calc(100vh-64px)] flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--glass-bg)] backdrop-blur-xl ${
          sidebarMobileOpen ? "translate-x-0 w-[272px]" : "-translate-x-full md:translate-x-0"
        } ${sidebarExpanded ? "md:w-[272px]" : "md:w-[84px]"}`}
        style={{
          transition: "width 420ms cubic-bezier(0.4, 0, 0.2, 1), transform 420ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="flex items-center justify-end border-b border-[var(--border-color)] p-4 md:hidden">
          <button
            onClick={() => setSidebarMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <nav className="flex w-[272px] flex-1 flex-col overflow-y-auto overflow-x-hidden p-3 pt-7">
          <div className="mb-2 px-3">
            <span
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]"
              style={{
                transition: "opacity 180ms ease, transform 180ms ease",
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "translateX(0)" : "translateX(-8px)",
              }}
            >
              Core
            </span>
          </div>
          <div className="flex flex-col gap-1">{mainNav.map(renderNavItem)}</div>

          <div className="mb-2 mt-7 px-3">
            <span
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]"
              style={{
                transition: "opacity 180ms ease, transform 180ms ease",
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "translateX(0)" : "translateX(-8px)",
              }}
            >
              System
            </span>
          </div>
          <div className="flex flex-col gap-1">{systemNav.map(renderNavItem)}</div>
        </nav>

        <div
          className="border-t border-[var(--border-color)] p-3"
          style={{
            transition: "opacity 220ms ease, transform 220ms ease",
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <div className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Status
              </span>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-primary)]">
                {alertCount > 0 ? `${alertCount} alerts` : "Clear"}
              </span>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-primary)]">
                {messageCount > 0 ? `${messageCount} inbox` : "Inbox ready"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`hidden shrink-0 md:block ${sidebarExpanded ? "w-[272px]" : "w-[84px]"}`}
        style={{ transition: "width 420ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
    </>
  );
}
