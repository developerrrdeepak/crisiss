"use client";
import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAuthSync } from "@/hooks/useAuthSync";
import { motion } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
};

export default function AdminProfile() {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
    const { dbUser } = useAuthSync("admin");

    // Admin operational data
    const adminInfo = {
        name: dbUser?.name || "Administrator",
        role: dbUser?.role || "Director of Operations",
        department: "System Administration",
        badgeId: "AEG-ADM-0001",
        joinedDate: "System Genesis",
        email: dbUser?.email || "admin@aegishotel.com",
        phone: "+91 99999 00000",
        clearance: "Omni-Level (L-7)",
    };

    return (
        <div className="bg-transparent text-gray-900 dark:text-[#e5e2e1] h-screen overflow-hidden flex flex-col font-['Sora'] transition-colors relative selection:bg-red-500 selection:text-white dark:selection:bg-[#ffb4aa] dark:selection:text-black">
            
            {/* Premium Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-red-500/5 dark:bg-[#dc2626]/10 pointer-events-none z-0" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] bg-blue-500/5 dark:bg-[#3b82f6]/10 pointer-events-none z-0" />
            
            {/* Subtle Dot Grid Overlay */}
            <div
                className="absolute inset-0 pointer-events-none z-0 opacity-40 dark:opacity-60"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(150,150,150,0.1) 1px, transparent 0)', backgroundSize: '32px 32px' }}
            />

            <DashboardHeader
                title={<span className="text-[#bc000a] dark:text-[#ffb4aa] uppercase tracking-[0.2em] font-black text-sm">ADMINISTRATOR</span>}
                userName={adminInfo.name}
                role={adminInfo.role}
                onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
            />

            <div className="flex flex-1 overflow-hidden relative z-10 pt-16">
                <AdminSidebar
                    sidebarExpanded={sidebarExpanded}
                    setSidebarExpanded={setSidebarExpanded}
                    sidebarMobileOpen={sidebarMobileOpen}
                    setSidebarMobileOpen={setSidebarMobileOpen}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 max-w-[1200px] mx-auto w-full">

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col gap-8"
                    >
                        {/* Hero Profile Card */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-200 dark:border-[#27272a] rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-black/50 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                            
                            <div className="px-6 md:px-8 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left w-full sm:w-auto">

                                    {/* Avatar */}
                                    <div className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-[#121215] border border-gray-200 dark:border-[#27272a] flex items-center justify-center shrink-0 relative overflow-hidden group shadow-inner">
                                        <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-[#52525b] group-hover:scale-110 group-hover:text-red-500 transition-all duration-300">admin_panel_settings</span>
                                        <div className={`absolute bottom-0 left-0 w-full h-1.5 transition-colors duration-500 bg-red-500 shadow-[0_-2px_10px_rgba(220,38,38,0.5)]`} />
                                    </div>

                                    <div className="pt-2 flex flex-col justify-center">
                                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 mb-1">
                                            <h1 className="text-3xl sm:text-4xl font-black font-['Space_Grotesk'] tracking-tighter text-gray-900 dark:text-white leading-none">{adminInfo.name}</h1>
                                            <span className="text-[10px] font-mono bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded border border-red-200/50 dark:border-red-900/30 sm:mb-1 font-bold">
                                                ID: {adminInfo.badgeId}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-500 dark:text-[#a1a1aa] uppercase tracking-wider mt-2 sm:mt-1">{adminInfo.role}</p>
                                        <p className="text-xs font-medium text-gray-400 dark:text-[#71717a] mt-1">{adminInfo.department}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 gap-8">
                            {/* Personnel Records */}
                            <motion.div variants={itemVariants} className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 lg:p-8 shadow-lg shadow-gray-200/50 dark:shadow-black/50">
                                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100 dark:border-[#27272a]/50">
                                    <span className="material-symbols-outlined text-[20px] text-gray-400 dark:text-[#52525b]">assignment_ind</span>
                                    <h2 className="font-bold text-lg text-gray-900 dark:text-white">Master Records</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                                    {[
                                        { label: "Email Address", value: adminInfo.email, icon: "mail" },
                                        { label: "Internal Contact", value: adminInfo.phone, icon: "phone" },
                                        { label: "Date Authorized", value: adminInfo.joinedDate, icon: "calendar_today" },
                                        { label: "Clearance Level", value: adminInfo.clearance, icon: "verified_user" },
                                    ].map(field => (
                                        <div key={field.label} className="group p-4 rounded-xl hover:bg-white dark:hover:bg-[#121215] border border-transparent hover:border-gray-100 dark:hover:border-[#27272a] transition-all">
                                            <p className="text-[11px] text-gray-500 dark:text-[#71717a] uppercase font-bold tracking-[0.15em] mb-2 flex items-center gap-2 group-hover:text-red-500 transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">{field.icon}</span>
                                                {field.label}
                                            </p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white px-1 tracking-tight">{field.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
