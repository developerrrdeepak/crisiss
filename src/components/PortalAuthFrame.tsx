import Link from "next/link";
import type { ReactNode } from "react";

interface PortalAuthLink {
  href: string;
  label: string;
}

interface PortalAuthFrameProps {
  icon: string;
  title: string;
  subtitle: string;
  iconToneClass: string;
  glowClass: string;
  footerLinks?: PortalAuthLink[];
  children: ReactNode;
}

export function PortalAuthFrame({
  icon,
  title,
  subtitle,
  iconToneClass,
  glowClass,
  footerLinks = [],
  children,
}: PortalAuthFrameProps) {
  return (
    <div className="aegis-auth-page relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${glowClass}`} />
      </div>

      <Link
        href="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] md:left-8 md:top-8"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Home
      </Link>

      <div className="aegis-auth-card relative z-10">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] ${iconToneClass}`}>
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>

        <div className="mt-6 text-center">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>
        </div>

        <div className="mt-6">{children}</div>

        {footerLinks.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
