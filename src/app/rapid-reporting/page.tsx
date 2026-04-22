"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GuestSidebar } from "@/components/GuestSidebar";
import { useAuthSync } from "@/hooks/useAuthSync";

const categoryOptions = [
  {
    id: "urgent",
    icon: "local_fire_department",
    label: "Urgent",
    activeColor:
      "bg-[#ffdad6] dark:bg-[#ba1a1a]/30 border-[#bc000a] text-[#bc000a] dark:text-[#ffb4aa] shadow-[0_0_20px_rgba(188,0,10,0.2)]",
  },
  {
    id: "medical",
    icon: "medical_services",
    label: "Medical",
    activeColor:
      "bg-[#e2efff] dark:bg-[#175ead]/30 border-[#175ead] text-[#175ead] dark:text-[#72aafe] shadow-[0_0_20px_rgba(23,94,173,0.2)]",
  },
  {
    id: "security",
    icon: "security",
    label: "Security",
    activeColor:
      "bg-[#fff0c8] dark:bg-[#f59e0b]/30 border-[#d97706] text-[#d97706] dark:text-[#fcd34d] shadow-[0_0_20px_rgba(217,119,6,0.2)]",
  },
  {
    id: "service",
    icon: "cleaning_services",
    label: "Service",
    activeColor:
      "bg-[#e7ebee] dark:bg-[#414753]/50 border-[#414753] text-[#081d2c] dark:text-white shadow-[0_0_20px_rgba(65,71,83,0.2)]",
  },
] as const;

export default function RapidReporting() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priority, setPriority] = useState<string>("Standard");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { dbUser } = useAuthSync("guest");
  const router = useRouter();
  const roomNumber = dbUser?.roomNumber || dbUser?.room || "Pending";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCategory) {
      setSubmitError("Select a request category before submitting.");
      return;
    }

    if (!subject.trim()) {
      setSubmitError("Add a short subject so the team knows what to handle.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    const category = categoryOptions.find((option) => option.id === selectedCategory);
    const severity =
      priority === "Critical" ? "Critical" : priority === "High" ? "High" : category?.label || "Standard";

    try {
      const response = await fetch("/api/guest/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: subject.trim(),
          description: details.trim() || subject.trim(),
          severity,
          roomId: roomNumber === "Pending" ? null : roomNumber,
          status: "Active",
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubject("");
      setDetails("");
      setSelectedCategory(null);
      setPriority("Standard");
      router.push("/guest-complaints");
    } catch (error) {
      console.error("Failed to submit guest request:", error);
      setSubmitError("Unable to submit your request right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f7f9ff] dark:bg-[#0a0a0a] text-[#081d2c] dark:text-[#e5e2e1] min-h-screen font-['Outfit'] transition-colors flex flex-col">
      <DashboardHeader
        title="Rapid Incident Report"
        subtitle="Sector 7 / Hotel Alpha"
        userName={dbUser?.name || "Guest"}
        role={`Room ${roomNumber}`}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative pt-16">
        <GuestSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 p-4 lg:p-8 w-full mx-auto overflow-y-auto mb-16 max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#175ead]/5 dark:bg-[#175ead]/10 rounded-full blur-[100px] animate-blob" />
          </div>

          <div className="mb-6 flex items-center justify-between bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-[#c1c6d5]/50 dark:border-white/5 px-5 py-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] w-full">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-[#081d2c] dark:text-white font-black text-xs uppercase tracking-[0.2em] font-['Space_Grotesk']">
                Secure Connection Active
              </span>
            </div>
            <span className="text-[10px] bg-[#f7f9ff] dark:bg-[#1a1a1a] text-[#717785] px-3 py-1 font-black rounded-lg tracking-widest uppercase border border-[#c1c6d5]/50 dark:border-white/5">
              Session Verified
            </span>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/50 dark:border-white/5 p-6 lg:p-10 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl space-y-10 font-['Space_Grotesk'] w-full relative overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#c1c6d5]/30 dark:border-white/5 pb-3">
                <div className="bg-[#e2efff] dark:bg-[#1e1e1e] p-2 rounded-xl text-[#175ead] dark:text-[#72aafe]">
                  <span className="material-symbols-outlined text-sm block">person</span>
                </div>
                <h2 className="font-black text-xs text-[#081d2c] dark:text-[#e5e2e1] uppercase tracking-[0.2em]">
                  Guest Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 border border-[#c1c6d5]/30 dark:border-white/5 p-5 rounded-2xl flex justify-between items-center group hover:bg-[#e2efff]/30 dark:hover:bg-[#1e1e1e]/50 transition-colors">
                  <div>
                    <p className="text-[10px] text-[#717785] font-black uppercase tracking-[0.2em] mb-1">
                      Your Location
                    </p>
                    <p className="font-black text-lg text-[#081d2c] dark:text-[#e5e2e1] tracking-tight">
                      Room {roomNumber}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[#175ead] dark:text-[#72aafe] opacity-50 group-hover:opacity-100 transition-opacity">
                    pin_drop
                  </span>
                </div>
                <div className="bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 border border-[#c1c6d5]/30 dark:border-white/5 p-5 rounded-2xl flex justify-between items-center group hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                  <div>
                    <p className="text-[10px] text-[#717785] font-black uppercase tracking-[0.2em] mb-1">
                      Status
                    </p>
                    <p className="font-black text-lg text-green-600 dark:text-green-400 tracking-tight">
                      Verified Guest
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 opacity-50 group-hover:opacity-100 transition-opacity">
                    verified_user
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 border-b border-[#c1c6d5]/30 dark:border-white/5 pb-3 mb-6">
                <div className="bg-[#ffdad6] dark:bg-[#ba1a1a]/20 p-2 rounded-xl text-[#bc000a] dark:text-[#ffb4aa]">
                  <span className="material-symbols-outlined text-sm block">category</span>
                </div>
                <h2 className="font-black text-xs text-[#081d2c] dark:text-[#e5e2e1] uppercase tracking-[0.2em]">
                  Request Category
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {categoryOptions.map((type) => {
                  const isSelected = selectedCategory === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedCategory(type.id)}
                      aria-pressed={isSelected}
                      aria-label={`${type.label} category`}
                      className={`relative overflow-hidden p-6 flex flex-col items-center gap-4 transition-all duration-300 rounded-3xl group ${
                        isSelected
                          ? `${type.activeColor} border-2 scale-105`
                          : "bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 border border-[#c1c6d5]/50 dark:border-white/5 text-[#081d2c] dark:text-white hover:border-[#175ead]/50 dark:hover:border-[#72aafe]/50 hover:-translate-y-1 hover:shadow-lg"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-3xl transition-transform duration-300 ${
                          isSelected ? "scale-110" : "opacity-60 group-hover:opacity-100 group-hover:scale-110"
                        }`}
                      >
                        {type.icon}
                      </span>
                      <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase">
                        {type.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <span className="material-symbols-outlined text-sm font-bold">
                            check_circle
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 border-b border-[#c1c6d5]/30 dark:border-white/5 pb-3 mb-6 mt-8">
                <div className="bg-[#fff0c8] dark:bg-[#f59e0b]/20 p-2 rounded-xl text-[#d97706] dark:text-[#fcd34d]">
                  <span className="material-symbols-outlined text-sm block">speed</span>
                </div>
                <h2 className="font-black text-xs text-[#081d2c] dark:text-[#e5e2e1] uppercase tracking-[0.2em]">
                  Priority Level
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                {["Standard", "High", "Critical"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriority(level)}
                    aria-pressed={priority === level}
                    aria-label={`${level} priority level`}
                    className={`px-6 py-3 rounded-full text-xs font-black tracking-widest uppercase transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#175ead] dark:focus:ring-offset-black ${
                      priority === level
                        ? level === "Critical"
                          ? "bg-[#bc000a] text-white border-[#bc000a] shadow-[0_5px_15px_rgba(188,0,10,0.4)]"
                          : level === "High"
                            ? "bg-[#d97706] text-white border-[#d97706] shadow-[0_5px_15px_rgba(217,119,6,0.4)]"
                            : "bg-[#175ead] text-white border-[#175ead] shadow-[0_5px_15px_rgba(23,94,173,0.4)]"
                        : "bg-[#f7f9ff] dark:bg-[#1a1a1a] border-[#c1c6d5]/50 dark:border-white/10 text-[#414753] dark:text-[#717785] hover:border-[#175ead] dark:hover:border-[#72aafe] hover:text-[#081d2c] dark:hover:text-white"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 border-b border-[#c1c6d5]/30 dark:border-white/5 pb-3 mb-6 mt-8">
                <div className="bg-[#e7ebee] dark:bg-[#353534] p-2 rounded-xl text-[#081d2c] dark:text-white">
                  <span className="material-symbols-outlined text-sm block">notes</span>
                </div>
                <h2 className="font-black text-xs text-[#081d2c] dark:text-[#e5e2e1] uppercase tracking-[0.2em]">
                  Details
                </h2>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Subject / Short Description"
                  aria-label="Subject / Short Description"
                  className="w-full bg-[#f7f9ff] dark:bg-[#1a1a1a] border border-[#c1c6d5]/50 dark:border-white/5 text-[#081d2c] dark:text-white text-sm p-4 rounded-xl focus:outline-none focus:border-[#175ead] dark:focus:border-[#72aafe] focus:ring-1 focus:ring-[#175ead] dark:focus:ring-[#72aafe] font-['Outfit'] font-bold placeholder:text-[#414753]/60 dark:placeholder:text-[#717785]/60 transition-colors shadow-inner"
                />

                <textarea
                  id="details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  aria-label="Details description"
                  className="w-full bg-[#f7f9ff] dark:bg-[#1a1a1a] border border-[#c1c6d5]/50 dark:border-white/5 text-[#081d2c] dark:text-white text-sm p-4 rounded-xl focus:outline-none focus:border-[#175ead] dark:focus:border-[#72aafe] focus:ring-1 focus:ring-[#175ead] dark:focus:ring-[#72aafe] h-40 resize-none font-['Outfit'] font-medium placeholder:text-[#414753]/60 dark:placeholder:text-[#717785]/60 transition-colors shadow-inner"
                  placeholder="Please describe exactly what you need so our team can assist you immediately..."
                />

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="bg-[#f7f9ff]/80 dark:bg-[#1a1a1a]/80 border border-dashed border-[#c1c6d5] dark:border-[#5d3f3b] text-[#175ead] dark:text-[#72aafe] hover:bg-[#e2efff] dark:hover:bg-[#1e1e1e] font-bold text-xs px-6 py-4 rounded-xl flex items-center gap-2 transition-colors uppercase tracking-widest w-full justify-center"
                  >
                    <span className="material-symbols-outlined">add_a_photo</span>
                    Attach Media
                  </button>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
                {submitError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-8 mt-4 border-t border-[#c1c6d5]/30 dark:border-white/5">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-[#175ead] to-[#081d2c] text-white hover:from-[#2a6db8] hover:to-[#175ead] font-black py-5 rounded-2xl tracking-[0.2em] uppercase transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(23,94,173,0.3)] hover:shadow-[0_15px_30px_rgba(23,94,173,0.4)] border border-[#175ead] hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  send
                </span>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
              <Link
                href="/guest-dashboard"
                className="px-10 bg-[#f7f9ff] dark:bg-[#1a1a1a] hover:bg-[#e2efff] dark:hover:bg-[#1e1e1e] border border-[#c1c6d5]/50 dark:border-white/5 text-[#414753] dark:text-[#c1c6d5] hover:text-[#081d2c] dark:hover:text-white font-black py-5 rounded-2xl tracking-[0.2em] uppercase transition-colors flex items-center justify-center text-xs shadow-sm hover:shadow-md hover:-translate-y-1"
              >
                Cancel
              </Link>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
