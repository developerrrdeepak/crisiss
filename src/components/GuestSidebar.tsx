"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ManualInstallButton } from "@/components/ManualInstallButton";

interface GuestSidebarProps {
  sidebarExpanded: boolean;
  setSidebarExpanded: (value: boolean) => void;
  sidebarMobileOpen: boolean;
  setSidebarMobileOpen: (value: boolean) => void;
}

export function GuestSidebar({
  sidebarExpanded,
  setSidebarExpanded,
  sidebarMobileOpen,
  setSidebarMobileOpen,
}: GuestSidebarProps) {
  const pathname = usePathname() || "/guest-dashboard";
  const isOpen = sidebarExpanded || sidebarMobileOpen;

  const mainNav = [{ icon: "dashboard", label: "Home", href: "/guest-dashboard" }];
  const stayNav = [
    { icon: "chat", label: "Messages", href: "/guest-messages" },
    { icon: "map", label: "Map", href: "/guest-map" },
    { icon: "campaign", label: "Report", href: "/rapid-reporting" },
    { icon: "report_problem", label: "Complaints", href: "/guest-complaints" },
  ];

  const renderNavItem = (item: { icon: string; label: string; href: string }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        key={item.href}
        className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
          isActive
            ? "bg-[var(--primary)] text-white shadow-lg shadow-sky-500/15"
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
              Stay
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
              Tools
            </span>
          </div>
          <div className="flex flex-col gap-1">{stayNav.map(renderNavItem)}</div>
        </nav>

        <div
          className="border-t border-[var(--border-color)] p-3"
          style={{
            transition: "opacity 220ms ease, transform 220ms ease",
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <div className="space-y-3 rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <ManualInstallButton />
            <Link
              href="/guest-sos"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-danger)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white"
            >
              <span className="material-symbols-outlined text-[18px]">emergency_share</span>
              SOS
            </Link>
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
