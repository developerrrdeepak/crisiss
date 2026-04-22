"use client";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function FeaturesPage() {
  return (
    <div className="bg-[#f7f9ff] dark:bg-[#131313] text-[#081d2c] dark:text-[#e5e2e1] min-h-screen font-['Outfit'] transition-colors flex flex-col">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/70 dark:bg-[#1c1b1b]/80 backdrop-blur-md border-b border-[#c1c6d5]/50 dark:border-[#5d3f3b]/30 transition-colors">
        <Link href="/" className="flex items-center gap-2 text-xl font-['Space_Grotesk'] font-black text-[#bc000a] dark:text-[#ffb4aa] tracking-tighter hover:scale-105 transition-transform cursor-pointer">
          <span className="material-symbols-outlined text-2xl">security</span>
          <span>AEGIS SMART HOTEL</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 font-['Space_Grotesk']">
          {[
            { name: "Home", href: "/" },
            { name: "Features", href: "/features" },
            { name: "About", href: "/about" },
            { name: "Contact", href: "/contact" }
          ].map((item, i) => (
            <Link
              key={item.name}
              href={item.href}
              className={`font-bold tracking-tight uppercase text-sm transition-all hover:-translate-y-0.5 ${
                i === 1
                  ? "text-[#bc000a] dark:text-[#ffb4aa] border-b-2 border-[#bc000a] dark:border-[#ffb4aa] pb-1"
                  : "text-[#414753] dark:text-[#e5e2e1] hover:text-[#bc000a] dark:hover:text-[#ffb4aa]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden md:flex" />
          <Link
            href="/"
            className="hidden md:flex bg-[#081d2c] dark:bg-white hover:bg-[#175ead] dark:hover:bg-[#ffb4aa] text-white dark:text-[#081d2c] font-['Space_Grotesk'] font-bold uppercase text-xs px-6 py-2.5 rounded hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-xl"
          >
            Access Portal
          </Link>
          <button className="md:hidden text-[#bc000a] dark:text-[#ffb4aa] p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-20 container mx-auto px-6 max-w-6xl relative z-10 flex-grow">
        <div className="text-center mb-16">
           <h1 className="text-4xl md:text-5xl font-black font-['Space_Grotesk'] uppercase tracking-tight mb-4 text-[#081d2c] dark:text-white">Platform <span className="text-[#175ead] dark:text-[#72aafe]">Features</span></h1>
           <p className="text-lg text-[#414753] dark:text-[#c1c6d5] max-w-2xl mx-auto font-medium">Explore the comprehensive toolkit driving the smartest properties on Earth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] dark:shadow-2xl border border-[#c1c6d5]/50 dark:border-[#5d3f3b]/20 hover:-translate-y-1 transition-transform group">
               <span className="material-symbols-outlined text-[#bc000a] dark:text-[#ffb4aa] text-5xl mb-6 group-hover:scale-110 transition-transform bg-[#f7f9ff] dark:bg-[#131313] p-4 rounded-xl border border-[#c1c6d5]/30">sensors</span>
               <h3 className="font-['Space_Grotesk'] tracking-widest uppercase font-black text-xl text-[#081d2c] dark:text-white mb-3">Predictive Sensory Fusion</h3>
               <p className="text-base leading-relaxed text-[#414753] dark:text-[#c1c6d5] font-medium">
                  By ingesting terabytes of thermal, acoustic, and environmental data, Aegis detects anomalies such as latent electrical fires or unauthorized personnel intrusion before any alarms trigger.
               </p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] dark:shadow-2xl border border-[#c1c6d5]/50 dark:border-[#5d3f3b]/20 hover:-translate-y-1 transition-transform group">
               <span className="material-symbols-outlined text-[#175ead] dark:text-[#72aafe] text-5xl mb-6 group-hover:scale-110 transition-transform bg-[#e2efff] dark:bg-[#131313] p-4 rounded-xl border border-[#c1c6d5]/30">radar</span>
               <h3 className="font-['Space_Grotesk'] tracking-widest uppercase font-black text-xl text-[#081d2c] dark:text-white mb-3">Live Tactical Mapping</h3>
               <p className="text-base leading-relaxed text-[#414753] dark:text-[#c1c6d5] font-medium">
                  Command supervisors get a full 3D and 2D overview of the entire hospitality infrastructure. Identify active operations, guest locations, and critical hazard zones intuitively.
               </p>
            </div>

            <div className="md:col-span-2 bg-gradient-to-r from-[#bc000a]/5 to-[#175ead]/5 dark:from-[#1e1e1e] dark:to-[#1a1a1a] p-8 md:p-12 rounded-3xl shadow-lg border border-[#c1c6d5]/50 dark:border-[#5d3f3b]/20 flex flex-col md:flex-row items-center gap-8">
               <div className="flex-1">
                 <h3 className="font-['Space_Grotesk'] tracking-widest uppercase font-black text-2xl text-[#081d2c] dark:text-white mb-4">Guest Protection Suite</h3>
                 <p className="text-base leading-relaxed text-[#414753] dark:text-[#c1c6d5] font-medium mb-6">
                    Guests receive tailored interfaces alerting them exclusively to immediate room-vicinity threats, complete with a one-touch SOS feature and safe routing over secure Wi-Fi access.
                 </p>
                 <Link href="/" className="inline-block text-[#bc000a] dark:text-[#ffb4aa] font-black uppercase font-['Space_Grotesk'] tracking-widest text-sm hover:underline">Experience Guest Mode</Link>
               </div>
               <div className="w-full md:w-1/3 bg-[#f7f9ff] dark:bg-[#131313] p-6 rounded-2xl shadow-inner border border-[#c1c6d5]/30 flex justify-center transform rotate-2">
                 <div className="w-24 h-24 rounded-full bg-[#175ead] flex items-center justify-center animate-pulse">
                   <div className="w-8 h-8 rounded-full bg-white ring-8 ring-white/20" />
                 </div>
               </div>
            </div>

        </div>
      </main>

      {/* Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-20 w-[600px] h-[600px] bg-[#175ead]/5 rounded-full filter blur-[120px] animate-blob dark:hidden" />
        <div className="absolute bottom-10 -left-10 w-[500px] h-[500px] bg-[#bc000a]/5 rounded-full filter blur-[100px] animate-blob animation-delay-2000 dark:hidden" />
      </div>

       {/* Footer */}
       <footer className="relative z-50 py-8 flex flex-col md:flex-row items-center justify-between px-8 lg:px-16 bg-white dark:bg-[#0e0e0e] border-t border-[#c1c6d5]/50 dark:border-[#5d3f3b]/20 mt-auto">
        <div className="flex items-center gap-8 mb-6 md:mb-0">
          <div className="flex items-center gap-2 text-sm font-['Space_Grotesk'] font-black text-[#081d2c] dark:text-white tracking-tighter">
            <span className="material-symbols-outlined">security</span>
            <span>AEGIS SMART HOTEL</span>
          </div>
          <div className="hidden md:flex gap-6">
            {["Privacy Policy", "Terms of Service", "Enterprise API"].map((link) => (
              <a key={link} href="#" className="text-xs font-bold text-[#414753] dark:text-[#717785] hover:text-[#bc000a] dark:hover:text-[#ffecc0] transition-colors tracking-wide">
                {link}
              </a>
            ))}
          </div>
        </div>
        <div className="text-xs font-bold text-[#414753] dark:text-[#717785] tracking-widest font-['Space_Grotesk']">
          © {new Date().getFullYear()} AEGIS
        </div>
      </footer>
    </div>
  );
}
