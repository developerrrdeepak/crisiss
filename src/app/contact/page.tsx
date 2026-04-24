"use client";

import { useState } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PortalPicker } from "@/components/marketing/PortalPicker";

const contacts = [
  {
    label: "Sales",
    value: "enterprise@aegis-smart.hotel",
    icon: "rocket_launch",
  },
  {
    label: "Support",
    value: "support@aegis-smart.hotel",
    icon: "headset_mic",
  },
];

export default function ContactPage() {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <div className="aegis-page">
      <MarketingHeader activePath="/contact" onOpenPortals={() => setPortalOpen(true)} />

      <main className="aegis-shell py-10 md:py-14">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <span className="aegis-chip">Contact</span>
            <h1 className="font-['Space_Grotesk'] text-4xl font-bold tracking-[-0.05em] text-[var(--text-primary)] md:text-6xl">
              Need a direct line?
            </h1>
            <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
              Use the shortest path.
            </p>
          </div>

          <div className="grid gap-4">
            {contacts.map((item) => (
              <a
                key={item.label}
                href={`mailto:${item.value}`}
                className="aegis-card flex items-center justify-between p-6 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
                    <span className="material-symbols-outlined text-[22px] text-[var(--primary)]">
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)] md:text-base">
                      {item.value}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
                  arrow_forward
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
      <PortalPicker open={portalOpen} onClose={() => setPortalOpen(false)} />
    </div>
  );
}
