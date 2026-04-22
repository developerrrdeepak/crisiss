"use client";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StaffSidebar } from "@/components/StaffSidebar";
import { useState } from "react";

export default function StaffAssignments() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const tasks = [
    { id: "LOG-492", title: "Investigate Perimeter Notification", loc: "Sector 7, North Gate", time: "14:15", status: "En Route", priority: "Rush" },
    { id: "LOG-488", title: "Guest Escort Request", loc: "VIP Suite 501", time: "13:30", status: "Completed", priority: "Standard" },
    { id: "LOG-490", title: "Keycard Terminal Reset", loc: "Lobby Station 2", time: "14:00", status: "Pending", priority: "Low" },
  ];

  return (
    <div className="bg-[#f5f6fa] dark:bg-[#151824] text-[#081d2c] dark:text-[#e5e2e1] min-h-screen flex flex-col font-['Outfit'] transition-colors relative overflow-hidden">
      
      {/* Background Ambient Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-[#175ead]/5 dark:bg-[#175ead]/10 rounded-full blur-[100px] animate-blob" />
      </div>

      <DashboardHeader 
        title="Daily Tasks" 
        subtitle="Staff Dashboard" 
        userName="Elias Thorne" 
        role="Housekeeping Supervisor"
        search={true}
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 h-[calc(100vh-64px)] pt-16">
        <StaffSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 overflow-auto p-4 lg:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top Info Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/50 dark:border-white/5 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl w-full font-['Space_Grotesk'] group">
            <div>
              <h1 className="font-black text-3xl tracking-tighter text-[#081d2c] dark:text-white uppercase mb-1">Active Staff Operations</h1>
              <p className="text-[#414753] dark:text-[#c1c6d5] text-sm mt-1 font-['Outfit'] font-bold">You have 3 active tasks assigned today.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-[#f7f9ff]/50 dark:bg-[#1e1e1e]/50 border border-[#c1c6d5]/30 dark:border-white/5 px-6 py-3 rounded-2xl text-center shadow-sm">
                <p className="text-[10px] text-[#717785] uppercase tracking-widest font-black mb-1">Tasks Remaining</p>
                <p className="font-black text-2xl text-[#081d2c] dark:text-white">02</p>
              </div>
              <div className="bg-[#f7f9ff]/50 dark:bg-[#1e1e1e]/50 border border-[#c1c6d5]/30 dark:border-white/5 px-6 py-3 rounded-2xl text-center shadow-sm">
                <p className="text-[10px] text-[#717785] uppercase tracking-widest font-black mb-1">Staff Access Level</p>
                <p className="font-black text-2xl text-[#175ead] dark:text-[#72aafe]">L-4</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-['Space_Grotesk']">
            {/* Task List */}
            <div className="lg:col-span-8 bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="p-6 border-b border-[#c1c6d5]/30 dark:border-white/5 bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 flex justify-between items-center">
                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-[#081d2c] dark:text-[#e5e2e1]">
                   <span className="w-1.5 h-4 bg-[#175ead]" /> Service Log
                </h3>
               </div>
              <div className="divide-y divide-[#c1c6d5]/30 dark:divide-white/5 font-['Outfit']">
                {tasks.map((task) => (
                  <div key={task.id} className="p-6 hover:bg-[#f7f9ff] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer group flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black text-[#717785] group-hover:text-[#175ead] dark:group-hover:text-[#72aafe] transition-colors font-mono tracking-widest">{task.id}</span>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border border-transparent ${
                          task.priority === "Rush" ? "bg-[#ffdad6] dark:bg-[#ba1a1a]/30 text-[#93000a] dark:text-[#ffb4aa] border-[#bc000a]/30" :
                          task.priority === "Standard" ? "bg-[#fff0c8] dark:bg-[#f59e0b]/20 text-[#92400e] dark:text-[#fcd34d] border-[#d97706]/30" :
                          "bg-[#e2efff] dark:bg-[#175ead]/20 text-[#003d79] dark:text-[#72aafe] border-[#175ead]/20"
                        }`}>{task.priority} Priority</span>
                      </div>
                      <h3 className="font-black text-xl text-[#081d2c] dark:text-white leading-tight">{task.title}</h3>
                      <p className="text-xs text-[#414753] dark:text-[#c1c6d5] mt-2 flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {task.loc}
                      </p>
                    </div>
                    
                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0 gap-3">
                       <span className="text-[10px] font-bold text-[#717785] bg-[#f7f9ff]/50 dark:bg-[#1e1e1e] px-3 py-1.5 rounded-lg border border-[#c1c6d5]/30 dark:border-white/5 font-mono">{task.time}</span>
                       <span className={`text-[10px] font-black px-4 py-2 rounded-lg flex items-center gap-2 tracking-widest uppercase shadow-sm border ${
                          task.status === "Completed" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-400/20" :
                          task.status === "En Route" ? "bg-[#e2efff] dark:bg-[#175ead]/30 text-[#003d79] dark:text-[#72aafe] border-[#175ead]/20 dark:border-[#72aafe]/20" :
                          "bg-white dark:bg-[#131313] text-[#414753] dark:text-[#e5e2e1] border-[#c1c6d5]/50 dark:border-white/10"
                       }`}>
                         {task.status === "En Route" && <span className="w-2 h-2 bg-current rounded-full animate-pulse shadow-sm" />}
                         {task.status}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="lg:col-span-4 space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl overflow-hidden">
                 <div className="p-6 border-b border-[#c1c6d5]/30 dark:border-white/5 bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50">
                  <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-[#081d2c] dark:text-[#e5e2e1]">
                     <span className="w-1.5 h-4 bg-[#175ead]" /> Hotel Amenities Status
                  </h3>
                 </div>
                 <div className="p-6 space-y-4 font-['Outfit']">
                    {[
                      { l: "Staff Comms", v: "Connected", c: "text-green-600 dark:text-green-400" },
                      { l: "Maintenance Carts", v: "Available", c: "text-[#175ead] dark:text-[#72aafe]" },
                      { l: "Elevator Banks", v: "Operational", c: "text-green-600 dark:text-green-400" },
                      { l: "Wifi Network", v: "Optimal", c: "text-[#081d2c] dark:text-[#e5e2e1]" },
                    ].map(eq => (
                       <div key={eq.l} className="flex justify-between items-center border-b border-[#c1c6d5]/30 dark:border-white/5 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
                         <span className="font-bold text-[#414753] dark:text-[#c1c6d5] text-xs uppercase tracking-widest font-['Space_Grotesk']">{eq.l}</span>
                         <span className={`font-black text-sm ${eq.c} flex items-center gap-2`}>
                            {eq.v === "Connected" && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm" />}
                            {eq.v}
                         </span>
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
