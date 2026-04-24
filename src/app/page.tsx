"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { Shield, Settings, Workflow, BrainCircuit, ArrowRight, Building, Clock, ChevronRight, User, Briefcase, Key, X } from "lucide-react";

export default function Home() {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  const stats = [
    { value: "99.9%", label: "System Uptime" },
    { value: "50+", label: "Managed Properties" },
    { value: "24/7", label: "Active Monitoring" },
    { value: "<2s", label: "Response Latency" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 selection:bg-blue-500/30 font-sans transition-colors duration-300">
      <ScrollAnimation />

      {/* Navigation Header */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "border-b border-slate-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl shadow-sm"
            : "bg-transparent py-4"
        } px-6 lg:px-12 flex items-center justify-between h-20`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight font-['Space_Grotesk'] leading-none">AEGIS</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-500 dark:text-zinc-400">Tactical</span>
          </div>
        </div>

        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 rounded-full px-4 py-2 border border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
          {['Platform', 'Solutions', 'Customers', 'Resources'].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setLoginModalOpen(true)}
            className="hidden sm:flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-slate-800 dark:hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10 dark:shadow-white/10"
          >
            Access Portals
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl flex flex-col items-center">
          
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Aegis Smart Security v4.0 is live
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-[5.5rem] font-black font-['Space_Grotesk'] tracking-tighter leading-[0.95] text-slate-900 dark:text-white mb-6">
            The standard for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">smart hospitality.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mb-12 font-medium leading-relaxed">
            Automate operations, secure your premises, and elevate guest experiences with an intelligent, centralized tactical network. 
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => setLoginModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all hover:shadow-xl hover:shadow-blue-500/20 active:scale-95"
            >
              Sign In to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="#features"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
            >
              Explore Capabilities
            </Link>
          </motion.div>
        </motion.div>

        {/* Global Stats Dashboard Mock */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full mt-24 max-w-5xl rounded-3xl p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl shadow-slate-200/50 dark:shadow-black/50"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 dark:bg-zinc-800/50 rounded-2xl overflow-hidden">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 p-8 text-center flex flex-col items-center justify-center group hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors">
                <span className="text-3xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-white mb-1 group-hover:scale-105 transition-transform">{stat.value}</span>
                <span className="text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Feature Section */}
      <section id="features" className="py-32 px-6 lg:px-12 border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-3xl md:text-5xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-white tracking-tight mb-4">
              Everything you need to orchestrate perfection.
            </h2>
            <p className="text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
              We combined security protocols, concierge services, and staff logistics into one beautiful, blazingly fast interface.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <BrainCircuit className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                title: "Predictive Intelligence",
                desc: "Anticipate guest needs before they happen with continuous telemetry and historical data mapping."
              },
              {
                icon: <Workflow className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
                title: "Automated Logistics",
                desc: "Housekeeping and maintenance routes are algorithmically optimized in real-time, zero dead-ends."
              },
              {
                icon: <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
                title: "Central Command",
                desc: "A singular tactical map offering an omniscient view of every room, staff member, and asset."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-white dark:hover:bg-zinc-900 transition-colors shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/20">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex flex-col max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-slate-900 dark:text-white" />
              <span className="text-xl font-bold tracking-tight font-['Space_Grotesk'] text-slate-900 dark:text-white">AEGIS</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-500 leading-relaxed font-medium">
              The professional standard for luxury hospitality operations and tactical security management.
            </p>
          </div>
          
          <div className="flex gap-16 text-sm">
            <div className="flex flex-col gap-4">
              <span className="font-semibold text-slate-900 dark:text-white">Access Portals</span>
              <Link href="/guest-login" className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Guest Network</Link>
              <Link href="/staff/login" className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Staff Operations</Link>
              <Link href="/admin/login" className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Admin Hub</Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-semibold text-slate-900 dark:text-white">Company</span>
              <Link href="/about" className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">About Aegis</Link>
              <Link href="/contact" className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">Contact Sales</Link>
              <Link href="#" className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern High-End Authentication Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setLoginModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-[2rem] overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <button 
                  onClick={() => setLoginModalOpen(false)}
                  className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-white tracking-tight mb-2">
                    Secure Authentication
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                    Select your designated authorization portal beneath to continue.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { href: "/guest-login", icon: <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />, title: "Guest Network", desc: "Access room controls & requests" },
                    { href: "/staff/login", icon: <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />, title: "Staff Operations", desc: "Manage workflow & assignments" },
                    { href: "/admin/login", icon: <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />, title: "Administrator Hub", desc: "Complete system command" }
                  ].map((portal, i) => (
                    <Link key={i} href={portal.href} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-800 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all group shadow-sm hover:shadow-md cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        {portal.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{portal.title}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">{portal.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-zinc-600 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-950 px-8 py-5 text-center border-t border-slate-200 dark:border-zinc-800">
                <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-zinc-600">Encrypted End-To-End</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
