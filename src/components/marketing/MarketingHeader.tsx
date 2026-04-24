"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MarketingHeaderProps {
  activePath: string;
  onOpenPortals?: () => void;
}

const links = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader({ activePath, onOpenPortals }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <div className="aegis-shell flex min-h-[72px] items-center justify-between gap-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] shadow-[var(--shadow-sm)]">
            <span className="material-symbols-outlined text-[22px] text-[var(--accent)]">
              shield
            </span>
          </div>
          <div className="leading-none">
            <p className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.18em] text-[var(--text-primary)]">
              Aegis
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Hospitality
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active = activePath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  active
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button type="button" onClick={onOpenPortals} className="aegis-button-primary px-4 py-3">
            Portals
          </button>
        </div>
      </div>
    </header>
  );
}
