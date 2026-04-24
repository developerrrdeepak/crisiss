import Link from "next/link";

const footerLinks = [
  { href: "/guest-login", label: "Guest" },
  { href: "/staff/login", label: "Staff" },
  { href: "/admin/login", label: "Admin" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <div className="aegis-shell flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.18em] text-[var(--text-primary)]">
            Aegis
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Calm operations. Clear response.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="aegis-chip">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
