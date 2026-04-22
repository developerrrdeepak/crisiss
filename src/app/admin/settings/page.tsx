"use client";
import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAuthSync } from "@/hooks/useAuthSync";
import { motion } from "framer-motion";

export default function AdminSettings() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { dbUser } = useAuthSync();

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.toggle("bg-[#4F46E5]");
    e.currentTarget.classList.toggle("bg-slate-200");
    e.currentTarget.classList.toggle("dark:bg-[#818CF8]");
    e.currentTarget.classList.toggle("dark:bg-[#2d3255]");
    const knob = e.currentTarget.querySelector("div");
    if (knob) {
      knob.classList.toggle("translate-x-5");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#f5f6fa] dark:bg-[#0f1117] text-[#232D42] dark:text-[#f0f2ff] h-screen overflow-hidden flex flex-col transition-colors relative" 
      style={{fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'}}
    >
      <DashboardHeader
        title={<span className="text-[#4F46E5] dark:text-[#818CF8] uppercase tracking-[0.2em] font-black text-sm">SETTINGS</span>}
        userName={dbUser?.name || "Operations Lead"}
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
          alertCount={0}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 w-full max-w-[1200px] mx-auto scroll-smooth">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                System Settings
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-[#8892b0]">
                Manage your account preferences and security configurations.
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Settings Tabs Navigation */}
            <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible shrink-0 pb-4 lg:pb-0 scrollbar-hide">
              {[
                { id: "general", label: "General", icon: "tune" },
                { id: "notifications", label: "Notifications", icon: "notifications" },
                { id: "security", label: "Security & Login", icon: "security" },
                { id: "danger", label: "Danger Zone", icon: "warning" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold whitespace-nowrap text-sm ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-[#1a1d2e] text-[#4F46E5] dark:text-[#818CF8] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-[#1a1d2e]/50 dark:hover:text-white transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full flex flex-col gap-6">
              
              {activeTab === "general" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-[#2d3255]/50">
                    Profile Information
                  </h3>
                  
                  <div className="flex flex-col gap-5 max-w-xl">
                    <div className="flex flex-col gap-2">
                       <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">Full Name</label>
                       <input type="text" defaultValue={dbUser?.name || "Elias Thorne"} className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">Email Address</label>
                       <input type="email" defaultValue={dbUser?.email || "elias.thorne@aegis.system"} className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">Timezone</label>
                       <select className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors appearance-none cursor-pointer">
                         <option value="est">Eastern Standard Time (EST)</option>
                         <option value="utc">Coordinated Universal Time (UTC)</option>
                         <option value="pst">Pacific Standard Time (PST)</option>
                       </select>
                    </div>

                    <button className="mt-4 w-fit px-6 py-3 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#4F46E5]/25 transition-all hover:scale-105 active:scale-95">
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-[#2d3255]/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4F46E5] dark:text-[#818CF8]">lock</span> Security Protocol
                  </h3>
                  
                  <div className="flex flex-col gap-5 max-w-xl">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-[#2d3255] bg-slate-50 dark:bg-[#13152b]">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</span>
                          <span className="text-[12px] text-slate-500 dark:text-[#8892b0]">Require a secondary security code when logging in.</span>
                       </div>
                       <button onClick={handleToggle} className="w-12 h-6 bg-slate-200 dark:bg-[#2d3255] rounded-full relative transition-colors duration-300">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform duration-300" />
                       </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-4">
                       <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">Current Password</label>
                       <input type="password" placeholder="••••••••" className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">New Password</label>
                       <input type="password" placeholder="Enter new password" className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors" />
                    </div>

                    <button className="mt-4 w-fit px-6 py-3 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#4F46E5]/25 transition-all hover:scale-105 active:scale-95">
                      Update Password
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "danger" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-red-100 dark:border-red-900/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 dark:bg-red-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-red-500/10 dark:group-hover:bg-red-500/20 transition-all duration-700" />
                  
                  <h3 className="text-xl font-black text-red-600 dark:text-red-500 mb-6 pb-4 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
                    <span className="material-symbols-outlined">warning</span> Danger Zone
                  </h3>
                  
                  <div className="flex flex-col gap-6 max-w-2xl relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-sm text-red-900 dark:text-red-200 uppercase tracking-widest">Delete Account</span>
                        <span className="text-[13px] font-medium text-red-700 dark:text-red-400">
                          Permanently remove your account and all associated data. This action cannot be undone.
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm("Are you absolute sure you wish to delete your account? This action is irreversible.")) {
                            alert("Account deletion sequence initiated.");
                          }
                        }}
                        className="shrink-0 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                        Delete Account
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 mt-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-sm text-orange-900 dark:text-orange-200 uppercase tracking-widest">System Reset</span>
                        <span className="text-[13px] font-medium text-orange-700 dark:text-orange-400">
                          Clear all local cache, preferences, and session tokens.
                        </span>
                      </div>
                      <button className="shrink-0 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                        Reset Cache
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Fallback for other tabs like notifications */}
              {activeTab === "notifications" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-[#2d3255]/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4F46E5] dark:text-[#818CF8]">notifications</span> Notification Preferences
                  </h3>
                  <div className="flex flex-col gap-4 max-w-xl">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-[#2d3255] bg-slate-50 dark:bg-[#13152b]">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">Email Alerts</span>
                          <span className="text-[12px] text-slate-500 dark:text-[#8892b0]">Receive high priority system alerts via email.</span>
                       </div>
                       <button onClick={handleToggle} className="w-12 h-6 bg-[#4F46E5] dark:bg-[#818CF8] rounded-full relative transition-colors duration-300">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 translate-x-5 transition-transform duration-300" />
                       </button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-[#2d3255] bg-slate-50 dark:bg-[#13152b]">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">Push Notifications</span>
                          <span className="text-[12px] text-slate-500 dark:text-[#8892b0]">Receive browser notifications for incoming messages.</span>
                       </div>
                       <button onClick={handleToggle} className="w-12 h-6 bg-[#4F46E5] dark:bg-[#818CF8] rounded-full relative transition-colors duration-300">
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 translate-x-5 transition-transform duration-300" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          </div>

        </main>
      </div>
    </motion.div>
  );
}
