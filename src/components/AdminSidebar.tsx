"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: (v: boolean) => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (v: boolean) => void;
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
    { icon: "dashboard", label: "Dashboard", href: "/admin" },
    { icon: "map", label: "Tactical Map", href: "/admin/tactical-map" },
    {
      icon: "chat",
      label: "Messages",
      href: "/admin/messages",
      badge: messageCount > 0 ? String(messageCount) : undefined,
    },
    { icon: "emergency", label: "Emergency SOS", href: "/admin/emergency" },
  ];

  const managementNav = [
    { icon: "meeting_room", label: "Room Allocation", href: "/admin/rooms" },
    { icon: "videocam", label: "Camera Access", href: "/admin/cameras" },
    { icon: "badge", label: "Staff Details", href: "/admin/staff" },
    { icon: "person", label: "Guest Details", href: "/admin/guests" },
    { icon: "add_home", label: "Manage Rooms", href: "/admin/manage-rooms" },
  ];

  const renderNavItem = (n: { icon: string; label: string; href: string; badge?: string }) => {
    const isActive =
      pathname === n.href || (n.label === "Dashboard" && pathname === "/admin");
    return (
      <Link
        href={n.href}
        key={n.label}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
          isActive
            ? "bg-[#09090b] dark:bg-white text-white dark:text-[#09090b] shadow-md shadow-black/10"
            : "text-[#71717a] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#1a1a1a] hover:text-[#09090b] dark:hover:text-white"
        }`}
      >
        <span
          className={`material-symbols-outlined shrink-0 text-[22px] transition-transform duration-200 group-hover:scale-105 ${
            isActive ? "text-white dark:text-[#09090b]" : ""
          }`}
          style={{ fontVariationSettings: isActive ? '"FILL" 1' : '"FILL" 0' }}
        >
          {n.icon}
        </span>

        {/* Label */}
        <span
          className={`whitespace-nowrap text-[13px] font-semibold tracking-tight flex-1 overflow-hidden`}
          style={{
            transition: isOpen
              ? "opacity 280ms ease 180ms, transform 280ms ease 180ms, max-width 500ms cubic-bezier(0.4,0,0.2,1)"
              : "opacity 120ms ease, transform 120ms ease, max-width 500ms cubic-bezier(0.4,0,0.2,1)",
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateX(0)" : "translateX(-8px)",
            maxWidth: isOpen ? "160px" : "0px",
            pointerEvents: isOpen ? "auto" : "none",
          }}
        >
          {n.label}
        </span>

        {/* Badge */}
        {n.badge && (
          <span
            className={`shrink-0 text-[10px] font-black w-4.5 h-4.5 min-w-[18px] min-h-[18px] flex items-center justify-center rounded-full ${
              isActive ? "bg-white/25 dark:bg-black/20 text-white dark:text-[#09090b]" : "bg-red-500 text-white"
            }`}
            style={{
              transition: "opacity 180ms ease, transform 180ms ease",
              transitionDelay: isOpen ? "230ms" : "0ms",
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "scale(1)" : "scale(0)",
            }}
          >
            {n.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[45] md:hidden transition-opacity duration-300"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-[64px] left-0 h-[calc(100vh-64px)] z-50 flex flex-col
          bg-white/90 dark:bg-[#0a0a0a]/95 backdrop-blur-xl
          border-r border-[#e4e4e7] dark:border-[#1a1a1a]
          shadow-[2px_0_16px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.3)]
          overflow-hidden
          ${sidebarMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
          ${sidebarExpanded ? "md:w-64" : "md:w-[72px]"}
        `}
        style={{
          transition: "width 500ms cubic-bezier(0.4, 0, 0.2, 1), transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Mobile Close Button */}
        <div className="md:hidden flex items-center justify-end p-4 border-b border-[#e4e4e7] dark:border-[#1a1a1a]">
           <button onClick={() => setSidebarMobileOpen(false)} className="w-9 h-9 rounded-full bg-[#f4f4f5] dark:bg-[#1a1a1a] text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white flex items-center justify-center transition-all duration-200">
             <span className="material-symbols-outlined text-[20px]">close</span>
           </button>
        </div>

        {/* Navigation Content */}
        <nav className="w-64 flex-1 flex flex-col gap-0 p-3 pt-8 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {/* MAIN segment */}
          <div className="mb-1.5 px-3 h-5 overflow-hidden">
             <span
               className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#a1a1aa] dark:text-[#52525b] block"
               style={{
                 transition: "opacity 220ms ease, transform 220ms ease",
                 transitionDelay: isOpen ? "160ms" : "0ms",
                 opacity: isOpen ? 1 : 0,
                 transform: isOpen ? "translateX(0)" : "translateX(-10px)",
               }}
             >
               Main
             </span>
          </div>
          <div className="flex flex-col gap-1 mb-8">
            {mainNav.map(renderNavItem)}
          </div>

          {/* MANAGEMENT segment */}
          <div className="mb-1.5 px-3 h-5 overflow-hidden">
             <span
               className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#a1a1aa] dark:text-[#52525b] block"
               style={{
                 transition: "opacity 220ms ease, transform 220ms ease",
                 transitionDelay: isOpen ? "200ms" : "0ms",
                 opacity: isOpen ? 1 : 0,
                 transform: isOpen ? "translateX(0)" : "translateX(-10px)",
               }}
             >
               Management
             </span>
          </div>
          <div className="flex flex-col gap-1">
            {managementNav.map(renderNavItem)}
          </div>
        </nav>

        {/* Quick Insights / Status Region */}
        <div
          className="mt-auto p-3 border-t border-[#e4e4e7] dark:border-[#1a1a1a]"
          style={{
            transition: "opacity 280ms ease, transform 280ms ease",
            transitionDelay: isOpen ? "260ms" : "0ms",
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateY(0)" : "translateY(12px)",
          }}
        >
            <div className="p-3 rounded-xl bg-[#f4f4f5] dark:bg-[#1a1a1a] border border-[#e4e4e7] dark:border-[#27272a]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[11px] font-semibold text-[#09090b] dark:text-white">System</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">92% Up</span>
                </div>
                <div className="w-full h-1 bg-[#e4e4e7] dark:bg-[#27272a] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 rounded-full" style={{ width: '92%' }} />
                </div>
            </div>
            
            {alertCount > 0 && (
              <div className="mt-2 p-2.5 flex items-center gap-2.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-[18px] animate-bounce">notifications_active</span>
                <span className="text-[11px] font-bold uppercase tracking-wide">{alertCount} Alert{alertCount > 1 ? "s" : ""}</span>
              </div>
            )}
        </div>
      </aside>

      <div
        className={`hidden md:block shrink-0 ${
          sidebarExpanded ? "w-64" : "w-[72px]"
        }`}
        style={{
          transition: "width 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </>
  );
}
