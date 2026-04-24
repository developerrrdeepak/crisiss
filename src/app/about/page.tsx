"use client";

import { useState } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PortalPicker } from "@/components/marketing/PortalPicker";

const principles = [
  { title: "Quiet tech", detail: "Useful, not loud." },
  { title: "Fast response", detail: "Signal to action in seconds." },
  { title: "Shared view", detail: "Guest, staff, admin aligned." },
];

export default function AboutPage() {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <div className="aegis-page">
      <MarketingHeader activePath="/about" onOpenPortals={() => setPortalOpen(true)} />

      <main className="aegis-shell py-10 md:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5">
            <span className="aegis-chip">About</span>
            <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.05em] text-[var(--text-primary)] md:text-6xl">
              Hospitality, stripped to what matters.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
              Aegis is built for clear decisions, fast escalation, and quieter guest journeys.
            </p>
          </div>

          <div className="aegis-card p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              {principles.map((item) => (
                <div key={item.title} className="aegis-card-muted px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {item.title}
                  </p>
                  <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <PortalPicker open={portalOpen} onClose={() => setPortalOpen(false)} />
    </div>
  );
}
