"use client";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ContactPage() {
  return (
    <div className="bg-[#f7f9ff] dark:bg-[#131313] text-[#081d2c] dark:text-[#e5e2e1] min-h-screen font-['Outfit'] transition-colors flex flex-col">
      <header className="fixed z-50 flex items-center justify-between p-6 lg:px-12 backdrop-blur-md border-b border-[#c1c6d5]/30 dark:border-white/5 top-0 w-full bg-white/50 dark:bg-[#131313]/50">
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
            <Link href="/" className="hidden sm:inline-flex bg-gradient-to-r from-[#081d2c] to-[#175ead] hover:from-[#175ead] hover:to-[#2a6db8] dark:from-white dark:to-[#e5e2e1] dark:hover:from-[#e2efff] dark:hover:to-white text-white dark:text-[#081d2c] font-black py-2.5 px-6 rounded-full tracking-[0.1em] uppercase transition-all shadow-md hover:shadow-lg active:scale-95 text-[10px]">
              Access Portals
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 container mx-auto px-6 max-w-7xl relative z-10 flex-grow">
        <div className="text-center mb-16">
           <h1 className="text-4xl md:text-5xl font-black font-['Space_Grotesk'] uppercase tracking-tight mb-4 text-[#081d2c] dark:text-white">Contact <span className="text-[#bc000a] dark:text-[#ffb4aa]">Command</span></h1>
           <p className="text-lg text-[#414753] dark:text-[#c1c6d5] max-w-2xl mx-auto font-medium">Reach out for enterprise deployment inquiries, support, and infrastructure demos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
           
           <div className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] dark:shadow-2xl border border-[#c1c6d5]/50 dark:border-[#5d3f3b]/30">
              <h2 className="font-black text-2xl font-['Space_Grotesk'] tracking-widest uppercase mb-8 text-[#081d2c] dark:text-white">Secure Transmission</h2>
              <form className="space-y-6">
                 <div>
                   <label className="text-[10px] uppercase tracking-[0.2em] font-black text-[#414753] dark:text-[#717785] block mb-2 font-['Space_Grotesk']">Identifier</label>
                   <input 
                     type="text" 
                     className="w-full bg-[#f7f9ff] dark:bg-[#131313] border border-[#c1c6d5]/50 dark:border-[#5d3f3b]/30 focus:border-[#bc000a] dark:focus:border-[#ffb4aa] focus:ring-1 focus:ring-[#bc000a] rounded-lg p-4 text-[#081d2c] dark:text-[#e5e2e1] outline-none transition-colors shadow-inner"
                     placeholder="John Doe / Operations Chief"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase tracking-[0.2em] font-black text-[#414753] dark:text-[#717785] block mb-2 font-['Space_Grotesk']">Comms Link (Email)</label>
                   <input 
                     type="email" 
                     className="w-full bg-[#f7f9ff] dark:bg-[#131313] border border-[#c1c6d5]/50 dark:border-[#5d3f3b]/30 focus:border-[#bc000a] dark:focus:border-[#ffb4aa] focus:ring-1 focus:ring-[#bc000a] rounded-lg p-4 text-[#081d2c] dark:text-[#e5e2e1] outline-none transition-colors shadow-inner"
                     placeholder="j.doe@hospitality.example.com"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase tracking-[0.2em] font-black text-[#414753] dark:text-[#717785] block mb-2 font-['Space_Grotesk']">Transmission Body</label>
                   <textarea 
                     className="w-full bg-[#f7f9ff] dark:bg-[#131313] border border-[#c1c6d5]/50 dark:border-[#5d3f3b]/30 focus:border-[#bc000a] dark:focus:border-[#ffb4aa] focus:ring-1 focus:ring-[#bc000a] rounded-lg p-4 text-[#081d2c] dark:text-[#e5e2e1] outline-none transition-colors shadow-inner h-32 resize-none"
                     placeholder="Requesting tactical demonstration..."
                   />
                 </div>
                 <button className="w-full bg-[#bc000a] hover:bg-[#e2241f] text-white font-black font-['Space_Grotesk'] py-5 rounded-xl uppercase tracking-[0.2em] flex justify-center items-center gap-3 transition-transform active:scale-95 shadow-[0_10px_20px_rgba(188,0,10,0.3)]">
                   <span className="material-symbols-outlined">send</span> Send Intel
                 </button>
              </form>
           </div>

           <div className="space-y-8 mt-4 lg:mt-0 font-['Space_Grotesk']">
              <div className="bg-gradient-to-tr from-[#175ead]/5 to-[#175ead]/20 dark:from-[#1e1e1e] dark:to-[#175ead]/10 p-8 rounded-2xl border border-[#c1c6d5]/30 dark:border-[#5d3f3b]/20 shadow-xl group hover:-translate-y-1 transition-transform">
                 <span className="material-symbols-outlined text-[#175ead] dark:text-[#72aafe] text-4xl mb-4 group-hover:animate-pulse">rocket_launch</span>
                 <h3 className="font-black text-xl uppercase tracking-widest text-[#081d2c] dark:text-white mb-2">Enterprise Deployment</h3>
                 <p className="text-[#414753] dark:text-[#c1c6d5] font-['Outfit'] font-medium mb-4">Roll out Aegis across your entire global property footprint with white-glove onboarding and continuous monitoring.</p>
                 <span className="font-black text-sm text-[#175ead] dark:text-[#72aafe] hover:underline cursor-pointer">enterprise@aegis-smart.hotel</span>
              </div>

              <div className="bg-[#f7f9ff] dark:bg-[#1a1a1a] p-8 rounded-2xl border border-[#c1c6d5]/30 dark:border-[#5d3f3b]/20 shadow-xl group hover:-translate-y-1 transition-transform">
                 <span className="material-symbols-outlined text-[#bc000a] dark:text-[#ffb4aa] text-4xl mb-4 group-hover:animate-pulse">headset_mic</span>
                 <h3 className="font-black text-xl uppercase tracking-widest text-[#081d2c] dark:text-white mb-2">Incident Command Support</h3>
                 <p className="text-[#414753] dark:text-[#c1c6d5] font-['Outfit'] font-medium mb-4">Immediate active directory and system routing assistance for ongoing hospitality operations.</p>
                 <span className="font-black text-sm text-[#bc000a] dark:text-[#ffb4aa] hover:underline cursor-pointer">support@aegis-smart.hotel</span>
              </div>
           </div>
        </div>
      </main>

      {/* Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-[#bc000a]/5 rounded-full filter blur-[100px] animate-blob dark:hidden" />
      </div>

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
    </div>
  );
}
