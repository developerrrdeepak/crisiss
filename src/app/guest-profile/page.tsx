"use client";
import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GuestSidebar } from "@/components/GuestSidebar";
import { useAuthSync } from "@/hooks/useAuthSync";
import { motion } from "framer-motion";

export default function GuestProfile() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { dbUser } = useAuthSync();

  const guestInfo = {
    name: dbUser?.name || "Marcus Webb",
    room: dbUser?.room || "215",
    floor: "2nd Floor — East Wing",
    checkIn: "Apr 02, 2026",
    checkOut: "Apr 09, 2026",
    nights: 7,
    email: dbUser?.email || "marcus.webb@email.com",
    phone: "+91 98765 43210",
    nationality: "Indian",
    idType: "Passport",
    idNumber: "IND-XXXX-8921",
    tier: "Platinum",
    points: 14850,
    requests: 3,
    status: "Verified",
  };

  return (
    <div className="bg-[#fafafa] dark:bg-[#050505] text-gray-900 dark:text-white h-screen overflow-hidden flex flex-col font-['Sora'] transition-colors relative selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Subtle Dot Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-40 dark:opacity-100"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(150,150,150,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }}
      />

      <DashboardHeader
        title="GUEST PROFILE"
        userName={guestInfo.name}
        role={`Room ${guestInfo.room}`}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 pt-16">
        <GuestSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 max-w-[1200px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">

          {/* Hero Profile Card */}
          <div className="mb-8 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#27272a] rounded-3xl shadow-sm dark:shadow-none overflow-hidden relative">
            {/* Cover Banner */}
            <div className="h-32 bg-gray-100 dark:bg-[#121215] relative overflow-hidden border-b border-gray-200 dark:border-[#27272a]">
              <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(150,150,150,0.2) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              {/* Premium member badge removed */}
            </div>

            {/* Avatar + Info */}
            <div className="px-6 md:px-8 pb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
                <div className="w-24 h-24 rounded-2xl bg-white dark:bg-[#0a0a0a] border-4 border-[#fafafa] dark:border-[#050505] flex items-center justify-center shadow-md shrink-0 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gray-100 dark:bg-[#121215] flex items-center justify-center transition-colors group-hover:bg-gray-200 dark:group-hover:bg-[#1a1a1a]">
                    <span className="text-gray-900 dark:text-white font-bold text-3xl font-['Space_Grotesk'] tracking-tighter">
                      {guestInfo.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full w-4 h-4 border-2 border-[#fafafa] dark:border-[#050505]" />
                </div>
                <div className="pb-1">
                  <h1 className="text-3xl font-light tracking-tight text-gray-900 dark:text-white">{guestInfo.name}</h1>
                  <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mt-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                    Room {guestInfo.room} · {guestInfo.floor}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-1">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${editMode ? "bg-black text-white dark:bg-white dark:text-[#050505] border-black dark:border-white shadow-md" : "bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#121215]"}`}
                >
                  <span className="material-symbols-outlined text-sm">{editMode ? "check" : "edit"}</span>
                  {editMode ? "Save Changes" : "Edit Profile"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Personal & Stay Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-[#27272a]/50">
                  <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-[#52525b]">person</span>
                  <h2 className="font-semibold text-sm">Personal Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { label: "Full Name", value: guestInfo.name, icon: "badge" },
                    { label: "Email Address", value: guestInfo.email, icon: "mail" },
                    { label: "Phone Number", value: guestInfo.phone, icon: "phone" },
                    { label: "Nationality", value: guestInfo.nationality, icon: "public" },
                    { label: "ID Type", value: guestInfo.idType, icon: "id_card" },
                    { label: "ID Number", value: guestInfo.idNumber, icon: "pin" },
                  ].map(field => (
                    <div key={field.label} className="group">
                      <p className="text-[10px] text-gray-500 dark:text-[#71717a] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">{field.icon}</span>
                        {field.label}
                      </p>
                      {editMode ? (
                        <input
                          defaultValue={field.value}
                          className="w-full bg-gray-50 dark:bg-[#121215] border border-gray-200 dark:border-[#27272a] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-shadow"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-white px-1">{field.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stay Details */}
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-[#27272a]/50">
                  <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-[#52525b]">hotel</span>
                  <h2 className="font-semibold text-sm">Current Stay Overview</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-[#121215] rounded-xl p-5 border border-gray-200 dark:border-[#27272a]">
                    <p className="text-[10px] text-gray-500 dark:text-[#71717a] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">login</span> Check-In
                    </p>
                    <p className="text-lg font-light text-gray-900 dark:text-white">{guestInfo.checkIn}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#121215] rounded-xl p-5 border border-gray-200 dark:border-[#27272a]">
                    <p className="text-[10px] text-gray-500 dark:text-[#71717a] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">logout</span> Check-Out
                    </p>
                    <p className="text-lg font-light text-gray-900 dark:text-white">{guestInfo.checkOut}</p>
                  </div>
                  <div className="bg-[#0a0a0a] dark:bg-white rounded-xl p-5 border border-transparent shadow-md">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">bedtime</span> Duration
                    </p>
                    <p className="text-2xl font-light text-white dark:text-[#0a0a0a]">
                      {guestInfo.nights} <span className="text-sm font-medium text-gray-400 dark:text-gray-500">nights</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Stats & Loyalty */}
            <div className="space-y-6">
              {/* Loyalty Points removed */}

              {/* Activity Stats */}
              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-[#27272a]/50">
                  <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-[#52525b]">insights</span>
                  <h2 className="font-semibold text-sm">Stay Analytics</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Service Requests", value: guestInfo.requests, icon: "room_service" },
                    { label: "Concierge Chats", value: 7, icon: "chat" },
                    { label: "Amenities Used", value: 5, icon: "spa" },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#121215] rounded-xl border border-gray-200 dark:border-[#27272a] hover:border-gray-300 dark:hover:border-[#3f3f46] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px] text-gray-500 dark:text-[#71717a]">{stat.icon}</span>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{stat.label}</p>
                      </div>
                      <span className="text-lg font-light text-gray-900 dark:text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}