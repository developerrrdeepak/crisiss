"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";

function StarField() {
  const [stars, setStars] = useState<{ id: number, top: string, left: string, size: number, duration: number, delay: number }[]>([]);
  const [hasMounted, setHasMounted] = useState(false); // State to track client-side mount

  useEffect(() => {
    setHasMounted(true); // This runs only on the client
    const generated = Array.from({ length: 70 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 3
    }));
    setStars(generated);
  }, []);

  if (!hasMounted) {
    return null; // Render nothing on the server and during initial client render
  }

  return (
    <div className="hidden dark:block absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star bg-white rounded-full absolute"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${star.duration}s infinite ease-in-out`,
            animationDelay: `${star.delay}s`,
            opacity: 0.15
          }}
        />
      ))}
    </div>
  );
}

export default function AboutPage() {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
  };

  return (
    <div className="bg-[#f7f9ff] dark:bg-[#0a0a0a] text-[#081d2c] dark:text-[#e5e2e1] min-h-screen flex flex-col font-['Outfit'] transition-colors relative overflow-hidden">

      {/* Background FX */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <StarField />
        {/* Soft Ambient Blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#175ead]/5 dark:bg-[#175ead]/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#bc000a]/5 dark:bg-[#e2241f]/10 rounded-full blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <header className="relative z-50 flex items-center justify-between p-6 lg:px-12 backdrop-blur-md border-b border-[#c1c6d5]/30 dark:border-white/5 top-0 w-full bg-white/50 dark:bg-[#131313]/50">
        <div className="flex items-center gap-3 z-10">
          <span className="material-symbols-outlined text-4xl text-[#bc000a] dark:text-[#ffb4aa]">shield</span>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter uppercase font-['Space_Grotesk'] leading-none">Aegis Smart</span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#717785] leading-none mt-1">Hospitality</span>
          </div>
        </div>

        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-6 font-bold uppercase tracking-widest text-[10px] text-[#414753] dark:text-[#c1c6d5]">
          <Link href="/" className="hover:text-[#bc000a] dark:hover:text-[#ffb4aa] transition-colors">Home</Link>
          <Link href="/#features" className="hover:text-[#bc000a] dark:hover:text-[#ffb4aa] transition-colors">Features</Link>
          <Link href="/contact" className="hover:text-[#bc000a] dark:hover:text-[#ffb4aa] transition-colors">Contact</Link>
          <Link href="/about" className="hover:text-[#bc000a] dark:hover:text-[#ffb4aa] transition-colors">About</Link>
        </nav>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-xs sm:text-sm z-10">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a onClick={handleLoginClick} href="#" className="hidden sm:inline-flex bg-gradient-to-r from-[#081d2c] to-[#175ead] hover:from-[#175ead] hover:to-[#2a6db8] dark:from-white dark:to-[#e5e2e1] dark:hover:from-[#e2efff] dark:hover:to-white text-white dark:text-[#081d2c] font-black py-2.5 px-6 rounded-full tracking-[0.1em] uppercase transition-all shadow-md hover:shadow-lg active:scale-95 text-[10px]">
              Access Portals
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 lg:p-12 relative z-10 w-full max-w-6xl mx-auto pt-20">

        {/* About Hero */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">

          <div className="space-y-8">
            <div className="inline-block">
              <span className="border border-[#175ead]/20 dark:border-[#72aafe]/20 text-[#175ead] dark:text-[#72aafe] bg-[#e2efff]/50 dark:bg-[#175ead]/10 px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] font-black backdrop-blur-md shadow-sm">
                Our Story & Vision
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black font-['Space_Grotesk'] uppercase tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-br from-[#081d2c] to-[#175ead] dark:from-white dark:to-[#72aafe] drop-shadow-sm">
              Redefining <br /> <span className="text-[#bc000a] dark:text-[#ffb4aa]">Hospitality.</span>
            </h1>

            <p className="text-xl text-[#414753] dark:text-[#c1c6d5] leading-relaxed font-medium">
              Aegis Smart Hotel Operating System was born from a desire to eliminate friction in luxury stays. We believe the future of hospitality is not just about opulent rooms, but invisible, hyper-aware intelligence that anticipates needs before they are spoken.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-6">
              <div>
                <h3 className="text-3xl font-black font-['Space_Grotesk'] text-[#175ead] dark:text-[#72aafe]">99%</h3>
                <p className="text-xs font-bold text-[#717785] uppercase tracking-widest mt-1">Automation</p>
              </div>
              <div>
                <h3 className="text-3xl font-black font-['Space_Grotesk'] text-[#bc000a] dark:text-[#ffb4aa]">0s</h3>
                <p className="text-xs font-bold text-[#717785] uppercase tracking-widest mt-1">Wait Time</p>
              </div>
            </div>
          </div>

          {/* Conceptual Art/Graphic for About */}
          <div className="relative aspect-square w-full max-w-md mx-auto rounded-3xl p-1 shadow-[0_20px_60px_rgba(0,0,0,0.05)] dark:shadow-2xl">
            <div className="bg-gradient-to-br from-[#f7f9ff] to-[#e2efff] dark:from-[#131313] dark:to-[#1a1a1a] rounded-3xl p-8 flex flex-col justify-center items-center relative overflow-hidden h-full border border-white/40 dark:border-white/10">
              <div className="absolute w-64 h-64 bg-[#175ead]/10 dark:bg-[#72aafe]/10 blur-[50px] rounded-full animate-pulse-slow"></div>
              <div className="absolute w-40 h-40 bg-[#bc000a]/10 dark:bg-[#ffb4aa]/10 blur-[40px] rounded-full bottom-10 right-10 animate-pulse"></div>

              {/* Shield Core */}
              <div className="relative z-10 w-32 h-32 rounded-full border border-[#175ead]/20 dark:border-white/20 bg-white/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
                <span className="material-symbols-outlined text-[64px] text-[#175ead] dark:text-[#72aafe]">hotel_class</span>
              </div>

              {/* Orbiting Elements */}
              <div className="absolute inset-0 w-full h-full border border-dashed border-[#175ead]/20 dark:border-[#72aafe]/20 rounded-full max-w-[80%] max-h-[80%] m-auto animate-spin-slow pointer-events-none">
                <div className="absolute top-0 left-1/2 w-4 h-4 -ml-2 -mt-2 bg-[#bc000a] dark:bg-[#ffb4aa] rounded-full shadow-[0_0_10px_rgba(188,0,10,0.5)]"></div>
                <div className="absolute bottom-0 right-1/2 w-3 h-3 -mr-1.5 -mb-1.5 bg-[#d97706] dark:bg-[#fcd34d] rounded-full shadow-[0_0_10px_rgba(217,119,6,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="w-full mt-32 bg-white/50 dark:bg-[#131313]/50 backdrop-blur-xl border border-[#c1c6d5]/30 dark:border-white/5 rounded-3xl p-12 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-gradient-to-b from-[#175ead]/5 dark:from-[#72aafe]/5 to-transparent blur-3xl"></div>
          <span className="material-symbols-outlined text-5xl text-[#d97706] dark:text-[#fcd34d] mb-6 inline-block relative z-10 drop-shadow-md">military_tech</span>
          <h2 className="text-3xl font-black font-['Space_Grotesk'] text-[#081d2c] dark:text-white uppercase tracking-tighter mb-6 relative z-10">Built for the Modern Voyager</h2>
          <p className="text-lg text-[#414753] dark:text-[#c1c6d5] leading-relaxed max-w-3xl mx-auto font-medium relative z-10">
            Our team comprises visionary technologists, veteran hoteliers, and obsessive experience designers. Together, we crafted Aegis to bridge the gap between human warmth and digital precision. Whether you are a guest seeking tranquility or an admin striving for operational perfection, Aegis is your invisible concierge.
          </p>
        </div>

      </main>

      {/* Futuristic Footer */}
      <footer className="w-full p-8 md:p-12 border-t border-[#c1c6d5]/30 dark:border-white/5 mt-32 relative z-10 bg-white/50 dark:bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-[#bc000a] dark:text-[#ffb4aa]">shield</span>
              <span className="text-xl font-black tracking-tighter uppercase font-['Space_Grotesk'] leading-none">Aegis Smart Hotel</span>
            </div>
            <p className="text-xs text-[#717785] font-bold max-w-xs leading-relaxed">The pinnacle of automated luxury operations. Next generation hospitality begins here.</p>
          </div>

          <div className="flex gap-12 font-black tracking-widest text-[10px] uppercase text-[#414753] dark:text-[#717785]">
            <div className="flex flex-col gap-4">
              <span className="text-[#081d2c] dark:text-white">Portals</span>
              <Link href="/guest-dashboard" className="hover:text-[#175ead] transition-colors">Guest Web</Link>
              <Link href="/staff-dashboard" className="hover:text-[#175ead] transition-colors">Staff Ops</Link>
              <Link href="/admin" className="hover:text-[#175ead] transition-colors">Admin Hub</Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-[#081d2c] dark:text-white">Corporate</span>
              <Link href="/about" className="hover:text-[#175ead] transition-colors">About Aegis</Link>
              <Link href="/contact" className="hover:text-[#175ead] transition-colors">Enterprise Sales</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Universal Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-[#081d2c]/80 dark:bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white/90 dark:bg-[#131313]/90 backdrop-blur-3xl border border-white/50 dark:border-white/10 w-full max-w-md rounded-3xl p-8 relative shadow-[0_30px_100px_rgba(0,0,0,0.5)] transform scale-100 transition-transform">

            {/* Magical Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#175ead]/10 via-transparent to-[#bc000a]/10 rounded-3xl pointer-events-none"></div>

            <button
              onClick={closeLoginModal}
              className="absolute top-6 right-6 text-[#717785] hover:text-[#bc000a] transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="font-['Space_Grotesk'] font-black text-2xl uppercase tracking-tighter text-[#081d2c] dark:text-white mb-2 pr-8">
              Select User Portal
            </h2>
            <p className="text-xs font-bold text-[#414753] dark:text-[#717785] mb-8 font-['Outfit'] pr-8">Authenticate into the Aegis Smart Hotel secure network.</p>

            <div className="space-y-4 font-['Space_Grotesk']">
              <Link href="/guest-dashboard" className="flex items-center gap-4 bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 border border-[#c1c6d5]/50 dark:border-white/5 p-5 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all group w-full">
                <div className="bg-[#e2efff] dark:bg-[#1a1a1a] p-3 rounded-xl border border-white/10">
                  <span className="material-symbols-outlined text-[#175ead] dark:text-[#72aafe]">hotel</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-sm text-[#081d2c] dark:text-white uppercase tracking-widest">Guest Network</p>
                  <p className="text-[10px] text-[#717785] font-bold mt-1 uppercase tracking-widest">Connect & Request</p>
                </div>
                <span className="material-symbols-outlined text-[#175ead] dark:text-[#72aafe] opacity-50 group-hover:translate-x-2 group-hover:opacity-100 transition-all">arrow_forward</span>
              </Link>

              <Link href="/staff-dashboard" className="flex items-center gap-4 bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 border border-[#c1c6d5]/50 dark:border-white/5 p-5 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all group w-full">
                <div className="bg-[#fff0c8] dark:bg-[#1a1a1a] p-3 rounded-xl border border-white/10">
                  <span className="material-symbols-outlined text-[#d97706] dark:text-[#fcd34d]">badge</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-sm text-[#081d2c] dark:text-white uppercase tracking-widest">Staff Operations</p>
                  <p className="text-[10px] text-[#717785] font-bold mt-1 uppercase tracking-widest">Manage Workflow</p>
                </div>
                <span className="material-symbols-outlined text-[#d97706] dark:text-[#fcd34d] opacity-50 group-hover:translate-x-2 group-hover:opacity-100 transition-all">arrow_forward</span>
              </Link>

              <Link href="/admin" className="flex items-center gap-4 bg-[#f7f9ff]/50 dark:bg-[#1a1a1a]/50 border border-[#c1c6d5]/50 dark:border-white/5 p-5 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all group w-full">
                <div className="bg-[#ffdad6] dark:bg-[#1a1a1a] p-3 rounded-xl border border-white/10">
                  <span className="material-symbols-outlined text-[#bc000a] dark:text-[#ffb4aa]">admin_panel_settings</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-sm text-[#081d2c] dark:text-white uppercase tracking-widest">Admin Dashboard</p>
                  <p className="text-[10px] text-[#717785] font-bold mt-1 uppercase tracking-widest">System Control</p>
                </div>
                <span className="material-symbols-outlined text-[#bc000a] dark:text-[#ffb4aa] opacity-50 group-hover:translate-x-2 group-hover:opacity-100 transition-all">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
