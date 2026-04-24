"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

interface PortalPickerProps {
  open: boolean;
  onClose: () => void;
}

const portals = [
  {
    href: "/guest-login",
    label: "Guest",
    meta: "Stay",
    icon: "hotel",
    tone: "from-emerald-500/18 to-emerald-500/4 text-emerald-600 dark:text-emerald-300",
  },
  {
    href: "/staff/login",
    label: "Staff",
    meta: "Ops",
    icon: "badge",
    tone: "from-sky-500/18 to-sky-500/4 text-sky-600 dark:text-sky-300",
  },
  {
    href: "/admin/login",
    label: "Admin",
    meta: "Control",
    icon: "admin_panel_settings",
    tone: "from-rose-500/18 to-rose-500/4 text-rose-600 dark:text-rose-300",
  },
];

export function PortalPicker({ open, onClose }: PortalPickerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0f172a]/60 p-4 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="aegis-card w-full max-w-xl p-6 md:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Secure Access
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Choose portal
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Close portal picker"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {portals.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  onClick={onClose}
                  className="group flex items-center justify-between rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition-all hover:-translate-y-0.5 hover:border-[color:var(--primary)]"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${portal.tone}`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{portal.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {portal.label}
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {portal.meta}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
