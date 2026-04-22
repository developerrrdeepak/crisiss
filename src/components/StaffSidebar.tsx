"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface StaffSidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: (v: boolean) => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (v: boolean) => void;
  pendingTasks?: number;
  guestRequestsCount?: number;
}

export function StaffSidebar({
  sidebarExpanded,
  setSidebarExpanded,
  sidebarMobileOpen,
  setSidebarMobileOpen,
  pendingTasks = 0,
  guestRequestsCount = 0,
}: StaffSidebarProps) {
  const pathname = usePathname() || "/staff-dashboard";
  const isOpen = sidebarExpanded || sidebarMobileOpen;

  const mainNav = [
    { icon: "dashboard", label: "Dashboard", href: "/staff-dashboard" },
    { icon: "chat", label: "Messages", href: "/staff-messages" },
  ];

  const opsNav = [
    { icon: "checklist", label: "Daily Tasks", href: "/staff-assignments", badge: pendingTasks > 0 ? pendingTasks.toString() : null },
    { icon: "report_problem", label: "Guest Requests", href: "/guest-complaints", badge: guestRequestsCount > 0 ? guestRequestsCount.toString() : null },
    { icon: "map", label: "Property Map", href: "/guest-map" },
    { icon: "emergency_share", label: "Emergency SOS", href: "/staff-sos" },
  ];

  const renderNavItem = (n: { icon: string; label: string; href: string; badge?: string | null }) => {
    const isActive = pathname === n.href;
    return (
      <Link
        href={n.href}
        key={n.label}
        className={`relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
          isActive
            ? "bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/20"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e2235] hover:text-[#4F46E5] dark:hover:text-white"
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-[20%] bottom-[20%] w-1 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        )}
        
        <span
          className={`material-symbols-outlined shrink-0 text-[24px] transition-transform duration-300 group-hover:scale-110 ${
            isActive ? "text-white" : ""
          }`}
          style={{ fontVariationSettings: isActive ? '"FILL" 1' : '"FILL" 0' }}
        >
          {n.icon}
        </span>

        <span
          className={`whitespace-nowrap text-[14.5px] font-bold tracking-tight transition-all duration-500 ease-out flex-1 ${
            isOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 pointer-events-none invisible"
          }`}
          style={{ transitionDelay: isOpen ? '0.2s' : '0s' }}
        >
          {n.label}
        </span>

        {n.badge && (
          <span
            className={`shrink-0 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full transition-all duration-500 ${
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-0"
            } ${isActive ? "bg-white/30 text-white" : "bg-amber-500 text-white shadow-sm"}`}
          >
            {n.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[45] md:hidden transition-opacity duration-300"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-[64px] left-0 h-[calc(100vh-64px)] z-50 flex flex-col
          bg-white/70 dark:bg-[#13152b]/80 backdrop-blur-lg
          border-r border-slate-100/50 dark:border-[#232845]/40
          shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[8px_0_40px_rgba(0,0,0,0.25)]
          transition-all duration-700 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
          overflow-hidden
          ${sidebarMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
          ${sidebarExpanded ? "md:w-64" : "md:w-[88px]"}
        `}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="md:hidden flex items-center justify-end p-4 border-b border-slate-50 dark:border-[#232845]">
           <button onClick={() => setSidebarMobileOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1e2235] text-slate-500 dark:text-slate-400 flex items-center justify-center">
             <span className="material-symbols-outlined">close</span>
           </button>
        </div>

        <nav className="w-64 flex-1 flex flex-col gap-0 p-4 pt-10 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="mb-2 px-4 h-6">
             <span className={`text-[10.5px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 transition-all duration-500 ${isOpen ? "opacity-100 translate-x-0 cursor-default visibility-visible" : "opacity-0 -translate-x-8 cursor-none visibility-hidden pointer-events-none"}`} style={{ transitionDelay: isOpen ? '0.15s' : '0s' }}>
               Main
             </span>
          </div>
          <div className="flex flex-col gap-1.5 mb-10">
            {mainNav.map(renderNavItem)}
          </div>

          <div className="mb-2 px-4 h-6">
             <span className={`text-[10.5px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 transition-all duration-500 ${isOpen ? "opacity-100 translate-x-0 cursor-default visibility-visible" : "opacity-0 -translate-x-8 cursor-none visibility-hidden pointer-events-none"}`} style={{ transitionDelay: isOpen ? '0.2s' : '0s' }}>
               Operations
             </span>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            {opsNav.map(renderNavItem)}
          </div>
        </nav>

        <div className={`mt-auto p-4 transition-all duration-700 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] border-t border-slate-50 dark:border-[#232845]/40 ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`} style={{ transitionDelay: isOpen ? '0.3s' : '0s' }}>
            <div className="p-4 rounded-[20px] bg-slate-50/50 dark:bg-[#1e2235]/50 border border-slate-100 dark:border-[#2d3255] backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" />
                    <span className="text-[12px] font-bold text-slate-900 dark:text-white">Active Shift</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400">On Duty</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-[#2d3255] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: '65%' }} />
                </div>
            </div>
        </div>
      </aside>

      <div
        className={`hidden md:block shrink-0 transition-all duration-700 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
          sidebarExpanded ? "w-64" : "w-[88px]"
        }`}
      />
    </>
  );
}
