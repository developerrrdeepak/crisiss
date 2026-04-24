"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PortalPicker } from "@/components/marketing/PortalPicker";

const highlights = [
  { label: "Uptime", value: "99.9%" },
  { label: "Response", value: "<2s" },
  { label: "Coverage", value: "24/7" },
];

const roles = [
  {
    href: "/admin/login",
    icon: "dashboard",
    label: "Admin",
    meta: "Control",
    accent: "text-rose-600 dark:text-rose-300",
  },
  {
    href: "/staff/login",
    icon: "badge",
    label: "Staff",
    meta: "Ops",
    accent: "text-sky-600 dark:text-sky-300",
  },
  {
    href: "/guest-login",
    icon: "hotel",
    label: "Guest",
    meta: "Stay",
    accent: "text-emerald-600 dark:text-emerald-300",
  },
];

const pillars = [
  {
    title: "Command",
    detail: "Rooms, incidents, teams.",
  },
  {
    title: "Messaging",
    detail: "One thread per action.",
  },
  {
    title: "Routing",
    detail: "Live map, clear exits.",
  },
];

export default function Home() {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <div className="aegis-page">
      <MarketingHeader activePath="/" onOpenPortals={() => setPortalOpen(true)} />

      <main className="aegis-shell py-10 md:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <span className="aegis-chip">Hotel Safety OS</span>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-['Space_Grotesk'] text-5xl font-bold tracking-[-0.06em] text-[var(--text-primary)] md:text-7xl">
                Clear calm across every stay.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
                One system for guests, staff, and control.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setPortalOpen(true)} className="aegis-button-primary">
                Open Portals
              </button>
              <Link href="/features" className="aegis-button-secondary">
                View System
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {highlights.map((item) => (
                <div key={item.label} className="aegis-card-muted min-w-[132px] px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="aegis-card p-5 md:p-6"
          >
            <div className="grid gap-4">
              {roles.map((role) => (
                <Link
                  key={role.href}
                  href={role.href}
                  className="flex items-center justify-between rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-[color:var(--primary)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                      <span className={`material-symbols-outlined text-[22px] ${role.accent}`}>
                        {role.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {role.label}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {role.meta}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.18 + index * 0.08 }}
              className="aegis-card p-6"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {pillar.title}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                {pillar.detail}
              </p>
            </motion.div>
          ))}
        </section>
      </main>

      <MarketingFooter />
      <PortalPicker open={portalOpen} onClose={() => setPortalOpen(false)} />
    </div>
  );
}
