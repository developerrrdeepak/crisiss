"use client";

import { useMemo, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StaffSidebar } from "@/components/StaffSidebar";
import {
  formatStaffDisplayDate,
  getStaffInitials,
  StaffIdCard,
} from "@/components/StaffIdCard";
import { useAuthSync } from "@/hooks/useAuthSync";
import { deriveStaffSector, deriveStaffShift } from "@/lib/admin-data";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

function getAccessTone(status?: string | null) {
  const normalizedStatus = status?.toLowerCase() || "";

  if (normalizedStatus.includes("inactive")) {
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20";
  }

  if (normalizedStatus.includes("leave")) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20";
}

function deriveClearance(role: string, department: string) {
  const text = `${role} ${department}`.toLowerCase();

  if (text.includes("security") || text.includes("command")) return "Level 4";
  if (text.includes("maintenance") || text.includes("engineering")) return "Level 3";
  if (text.includes("front desk") || text.includes("guest")) return "Level 2";

  return "Level 1";
}

export default function StaffProfile() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { dbUser, loading } = useAuthSync("staff");

  const staffInfo = useMemo(() => {
    const name = dbUser?.name || "Staff Member";
    const role = dbUser?.staffRole || "Staff";
    const department = dbUser?.department || "General Operations";
    const sector = deriveStaffSector({ role, department });
    const shift = deriveStaffShift({ role });

    return {
      name,
      role,
      department,
      employeeId: dbUser?.employeeId || "Pending",
      email: dbUser?.email || "Not assigned",
      phone: dbUser?.phone || "Not recorded",
      emergencyContact: dbUser?.emergencyContact || "Not recorded",
      bloodGroup: dbUser?.bloodGroup || "Not recorded",
      joiningDate: dbUser?.joiningDate || null,
      validTill: dbUser?.validTill || null,
      photoUrl: dbUser?.photoUrl || "",
      status: dbUser?.status || "Active",
      shift,
      sector,
      clearance: deriveClearance(role, department),
      lastLogin: dbUser?.lastLogin || null,
    };
  }, [dbUser]);

  const recordCards = [
    { label: "Email Address", value: staffInfo.email, icon: "mail" },
    { label: "Contact Number", value: staffInfo.phone, icon: "phone" },
    { label: "Emergency Contact", value: staffInfo.emergencyContact, icon: "contact_phone" },
    { label: "Blood Group", value: staffInfo.bloodGroup, icon: "water_drop" },
    {
      label: "Date Joined",
      value: formatStaffDisplayDate(staffInfo.joiningDate),
      icon: "calendar_today",
    },
    {
      label: "Card Valid Till",
      value: formatStaffDisplayDate(staffInfo.validTill),
      icon: "badge",
    },
  ];

  const accessCards = [
    { label: "Shift Window", value: staffInfo.shift, icon: "schedule" },
    { label: "Primary Sector", value: staffInfo.sector, icon: "pin_drop" },
    { label: "Clearance", value: staffInfo.clearance, icon: "verified_user" },
    { label: "Access Status", value: staffInfo.status, icon: "shield" },
  ];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#fafafa] font-['Sora'] text-gray-900 transition-colors selection:bg-black selection:text-white dark:bg-[#050505] dark:text-white dark:selection:bg-white dark:selection:text-black">
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-100"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.15) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <DashboardHeader
        title={<span className="font-bold uppercase tracking-wide">Staff Profile</span>}
        userName={staffInfo.name}
        role={staffInfo.role}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden pt-16">
        <StaffSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="mx-auto flex w-full max-w-[1320px] flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex w-full flex-col gap-6"
          >
            <motion.div
              variants={itemVariants}
              className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-[#27272a] dark:bg-[#0a0a0a]"
            >
              <div className="flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8">
                <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
                  <div
                    className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 text-2xl font-bold text-gray-900 shadow-sm dark:border-[#27272a] dark:bg-[#121215] dark:text-white"
                    style={
                      staffInfo.photoUrl
                        ? {
                            backgroundImage: `url(${staffInfo.photoUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {!staffInfo.photoUrl && getStaffInitials(staffInfo.name)}
                    <div className="absolute bottom-0 left-0 h-1.5 w-full bg-[#175ead]" />
                  </div>

                  <div>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
                      <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
                        {staffInfo.name}
                      </h1>
                      <span className="rounded border border-gray-200 bg-gray-100 px-2.5 py-1 font-mono text-[10px] text-gray-600 dark:border-[#27272a] dark:bg-[#1a1a1a] dark:text-[#a1a1aa]">
                        ID: {staffInfo.employeeId}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a1a1aa]">
                      {staffInfo.role}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-[#71717a]">
                      {staffInfo.department}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 sm:items-end">
                  <p className="hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#71717a] sm:block">
                    Profile Status
                  </p>
                  <span
                    className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${getAccessTone(staffInfo.status)}`}
                  >
                    {staffInfo.status}
                  </span>
                  {staffInfo.lastLogin && (
                    <p className="text-xs text-gray-500 dark:text-[#71717a]">
                      Last sync {formatStaffDisplayDate(staffInfo.lastLogin)}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {loading && (
              <motion.div
                variants={itemVariants}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm dark:border-[#27272a] dark:bg-[#0a0a0a] dark:text-[#a1a1aa]"
              >
                Loading staff profile...
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                variants={itemVariants}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#27272a] dark:bg-[#0a0a0a]"
              >
                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-[#27272a]/50">
                  <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-[#52525b]">
                    assignment_ind
                  </span>
                  <h2 className="text-sm font-semibold">Personnel Records</h2>
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  {recordCards.map((field) => (
                    <div key={field.label} className="group">
                      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 transition-colors group-hover:text-gray-900 dark:text-[#71717a] dark:group-hover:text-gray-300">
                        <span className="material-symbols-outlined text-[14px]">{field.icon}</span>
                        {field.label}
                      </p>
                      <p className="px-0.5 text-sm font-medium text-gray-900 dark:text-white">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-gray-100 pt-6 dark:border-[#27272a]/50">
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#71717a]">
                    <span className="material-symbols-outlined text-[14px]">badge</span>
                    Access Snapshot
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {accessCards.map((field) => (
                      <div
                        key={field.label}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-[#27272a] dark:bg-[#121215]"
                      >
                        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#71717a]">
                          <span className="material-symbols-outlined text-[14px]">{field.icon}</span>
                          {field.label}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {field.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#27272a] dark:bg-[#0a0a0a]">
                  <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-[#27272a]/50">
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-[#52525b]">
                      badge
                    </span>
                    <h2 className="text-sm font-semibold">Issued ID Card</h2>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                    <StaffIdCard staff={staffInfo} />
                    <StaffIdCard staff={staffInfo} back />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
