"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PortalPicker } from "@/components/marketing/PortalPicker";

const features = [
  { icon: "sensors", title: "Signals", detail: "Room, staff, incident data." },
  { icon: "chat", title: "Messaging", detail: "Live channels with context." },
  { icon: "map", title: "Route Map", detail: "Exit paths and floor logic." },
  { icon: "campaign", title: "Broadcast", detail: "Guests and teams in sync." },
  { icon: "warning", title: "SOS", detail: "Persistent incident logs." },
  { icon: "settings", title: "Control", detail: "Settings, rooms, shifts." },
];

export default function FeaturesPage() {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <div className="aegis-page">
      <MarketingHeader activePath="/features" onOpenPortals={() => setPortalOpen(true)} />

      <main className="aegis-shell py-10 md:py-14">
        <section className="space-y-5">
          <span className="aegis-chip">Features</span>
          <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.05em] text-[var(--text-primary)] md:text-6xl">
            Less noise. More control.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
            Core tools for admin, staff, and guests.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="aegis-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                <span className="material-symbols-outlined text-[22px] text-[var(--primary)]">
                  {feature.icon}
                </span>
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {feature.title}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                {feature.detail}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="aegis-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Access
              </p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Jump into the right portal.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setPortalOpen(true)} className="aegis-button-primary">
                Open Portals
              </button>
              <Link href="/contact" className="aegis-button-secondary">
                Contact
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <PortalPicker open={portalOpen} onClose={() => setPortalOpen(false)} />
    </div>
  );
}
