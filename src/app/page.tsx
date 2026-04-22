"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollAnimation } from "@/components/ScrollAnimation";

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

export default function Home() {
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
    }
  };

  const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "50+", label: "Hotels" },
    { value: "24/7", label: "Support" },
    { value: "<2s", label: "Response" }
  ];

  return (
    <div className="theme-transition min-h-screen flex flex-col font-['Outfit'] relative overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Scroll Sequence Animation Background */}
      <ScrollAnimation />

      {/* Header */}
      <header
        className="relative z-50 flex items-center justify-between p-6 lg:px-12 backdrop-blur-xl border-b"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--glass-bg)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="flex items-center gap-3 z-10">
          <span className="material-symbols-outlined text-4xl bg-gradient-to-br from-[#dc2626] to-[#f43f5e] dark:from-[#ffb4aa] dark:to-[#fda4af] bg-clip-text text-transparent">shield</span>
          <div className="flex flex-col">
            <span
              className="text-xl font-black tracking-tighter uppercase font-['Space_Grotesk'] leading-none bg-clip-text text-transparent drop-shadow-xl"
              style={{ backgroundImage: 'var(--gradient-hero)' }}
            >Aegis Smart</span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold drop-shadow-md" style={{ color: 'var(--text-muted)' }}>Hospitality</span>
          </div>
        </div>
        <nav
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-8 font-semibold uppercase tracking-wider text-[11px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Link href="/" className="hover:text-[#dc2626] dark:hover:text-[#ffb4aa] transition-colors">Home</Link>
          <Link href="/#features" className="hover:text-[#dc2626] dark:hover:text-[#ffb4aa] transition-colors">Features</Link>
          <Link href="/contact" className="hover:text-[#dc2626] dark:hover:text-[#ffb4aa] transition-colors">Contact</Link>
          <Link href="/about" className="hover:text-[#dc2626] dark:hover:text-[#ffb4aa] transition-colors">About</Link>
        </nav>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-xs sm:text-sm z-10">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleLoginClick}
              className="hidden sm:inline-flex font-bold py-2.5 px-6 rounded-full tracking-[0.1em] uppercase transition-all shadow-lg hover:shadow-xl active:scale-95 text-[10px] text-white dark:text-slate-900"
              style={{
                background: 'var(--gradient-hero)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
              }}
            >
              Access Portals
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative z-10 w-full max-w-7xl mx-auto min-h-[85vh]">
        <motion.div
          className="text-center w-full max-w-4xl mx-auto space-y-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            className="text-5xl sm:text-7xl lg:text-8xl font-black font-['Space_Grotesk'] uppercase tracking-tighter leading-[0.9] bg-clip-text text-transparent drop-shadow-2xl"
            style={{ backgroundImage: 'var(--gradient-hero)' }}
            variants={itemVariants}
          >
            Intuitive <br /> <span className="bg-clip-text text-transparent drop-shadow-2xl" style={{ backgroundImage: 'var(--gradient-primary)' }}>Hospitality.</span>
          </motion.h1>

          <motion.p
            className="text-xl sm:text-2xl max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-xl"
            style={{ color: 'var(--text-secondary)' }}
            variants={itemVariants}
          >
            Where Security Meets Surety for Complete Safety
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-8"
            variants={itemVariants}
          >
            {/* Primary Button - Red/Pink Gradient */}
            <motion.button
              onClick={handleLoginClick}
              className="w-full sm:w-auto font-bold py-5 px-12 rounded-full tracking-[0.2em] uppercase transition-all shadow-lg text-white dark:text-slate-900"
              style={{
                background: 'var(--gradient-primary)',
                boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)'
              }}
              whileHover={{ scale: 1.05, y: -3, boxShadow: '0 15px 30px rgba(220, 38, 38, 0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              Select Portal
            </motion.button>

            {/* Secondary Button - Dark Grey */}
            <Link
              href="#features"
              className="w-full sm:w-auto font-bold py-5 px-12 rounded-full tracking-[0.2em] uppercase transition-all shadow-md text-slate-900 dark:text-white active:scale-95 text-xs"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              View Features
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="w-full max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center p-5 lg:p-6 rounded-2xl border backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--border-color)',
                boxShadow: 'var(--shadow-lg)'
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div
                className="text-3xl lg:text-4xl font-black font-['Space_Grotesk'] bg-clip-text text-transparent drop-shadow-xl"
                style={{ backgroundImage: 'var(--gradient-hero)' }}
              >
                {stat.value}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider mt-2 drop-shadow-md" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Stack */}
        <div id="features" className="w-full max-w-6xl mt-40 space-y-32">

          {/* Feature 1 */}
          <motion.div
            className="flex flex-col lg:flex-row items-center gap-16 group"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="w-full lg:w-1/2 aspect-square relative magic-border rounded-3xl p-1 shadow-xl hover:shadow-2xl transition-all duration-700 hover:scale-[1.02]"
              whileHover={{ scale: 1.02 }}
            >
              <div
                className="magic-border-content rounded-3xl p-8 flex flex-col justify-center items-center relative overflow-hidden"
                style={{ background: 'var(--bg-card)' }}
              >
                <div className="absolute w-72 h-72 bg-[#3b82f6]/10 dark:bg-[#72aafe]/10 blur-[60px] rounded-full animate-pulse-slow"></div>
                <motion.span
                  className="material-symbols-outlined text-[100px] bg-clip-text text-transparent mb-8 drop-shadow-lg"
                  style={{ backgroundImage: 'var(--gradient-hero)' }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >nest_thermostat</motion.span>
                <div className="w-3/4 h-2 rounded-full mb-4" style={{ background: 'linear-gradient(to right, transparent, var(--secondary), transparent)' }}></div>
                <div className="w-1/2 h-2 rounded-full" style={{ background: 'linear-gradient(to right, transparent, var(--secondary), transparent)' }}></div>
              </div>
            </motion.div>
            <div className="w-full lg:w-1/2 space-y-6 p-8 rounded-3xl backdrop-blur-md bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-lg">
              <h2 className="text-4xl lg:text-5xl font-black font-['Space_Grotesk'] leading-tight uppercase tracking-tighter drop-shadow-xl">
                Intelligent Room Automation
              </h2>
              <p className="text-lg font-medium leading-relaxed drop-shadow-md" style={{ color: 'var(--text-secondary)' }}>
                Rooms automatically adjust temperature, lighting, and ambiance identical to a guest preference profile the moment they step off the elevator.
              </p>
              <motion.button
                onClick={handleLoginClick}
                className="flex items-center gap-3 text-xs font-bold tracking-widest uppercase group hover:gap-5 transition-all pt-4 text-blue-600 dark:text-sky-400"
                whileHover={{ x: 4 }}
              >
                Explore Automation <span className="material-symbols-outlined">arrow_forward</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            className="flex flex-col lg:flex-row-reverse items-center gap-16 group"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="w-full lg:w-1/2 aspect-square relative magic-border rounded-3xl p-1 shadow-xl hover:shadow-2xl transition-all duration-700 hover:scale-[1.02]"
              whileHover={{ scale: 1.02 }}
            >
              <div
                className="magic-border-content rounded-3xl p-8 flex flex-col justify-center items-center relative overflow-hidden w-full h-full"
                style={{ background: 'var(--bg-card)' }}
              >
                <div className="absolute w-72 h-72 bg-[#f59e0b]/15 dark:bg-[#fcd34d]/10 blur-[60px] rounded-full animate-pulse-slow"></div>
                <motion.span
                  className="material-symbols-outlined text-[100px] bg-clip-text text-transparent mb-8 drop-shadow-lg"
                  style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >psychology</motion.span>
                <div className="grid grid-cols-3 gap-4 w-3/4">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="h-16 rounded-xl flex items-center justify-center border shadow-sm"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-color)'
                      }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                    >
                      <span className="w-4 h-4 rounded-full bg-[#f59e0b] dark:bg-[#fcd34d]/50 animate-pulse"></span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
            <div className="w-full lg:w-1/2 space-y-6 p-8 rounded-3xl backdrop-blur-md bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-lg">
              <h2 className="text-4xl lg:text-5xl font-black font-['Space_Grotesk'] leading-tight uppercase tracking-tighter drop-shadow-xl">
                Quantum VIP Recognition
              </h2>
              <p className="text-lg font-medium leading-relaxed drop-shadow-md" style={{ color: 'var(--text-secondary)' }}>
                Leverage biometric tokenization to predict guest needs before they ask. The system alerts concierges when VIPs enter the lobby.
              </p>
              <motion.button
                onClick={handleLoginClick}
                className="flex items-center gap-3 text-xs font-bold tracking-widest uppercase group hover:gap-5 transition-all pt-4 text-amber-600 dark:text-amber-400"
                whileHover={{ x: 4 }}
              >
                View Analytics <span className="material-symbols-outlined">arrow_forward</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            className="flex flex-col lg:flex-row items-center gap-16 group"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="w-full lg:w-1/2 aspect-square relative magic-border rounded-3xl p-1 shadow-xl hover:shadow-2xl transition-all duration-700 hover:scale-[1.02]"
              whileHover={{ scale: 1.02 }}
            >
              <div
                className="magic-border-content rounded-3xl p-8 flex flex-col justify-center items-center relative overflow-hidden w-full h-full"
                style={{ background: 'var(--bg-card)' }}
              >
                <div className="absolute w-72 h-72 bg-[#f43f5e]/10 dark:bg-[#ffb4aa]/10 blur-[60px] rounded-full animate-pulse-slow"></div>
                <motion.span
                  className="material-symbols-outlined text-[100px] bg-clip-text text-transparent mb-8 drop-shadow-lg"
                  style={{ backgroundImage: 'var(--gradient-primary)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >all_inclusive</motion.span>
                <div className="w-3/4 rounded-2xl p-4 border shadow-lg" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                  <motion.div
                    className="flex items-center gap-3 mb-2"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: '#f43f5e' }}></span>
                    <div className="h-2 w-full rounded-full" style={{ background: 'rgba(244, 63, 94, 0.2)' }}></div>
                  </motion.div>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <div className="h-2 w-3/4 rounded-full bg-emerald-500/30"></div>
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="w-full lg:w-1/2 space-y-6 p-8 rounded-3xl backdrop-blur-md bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-lg">
              <h2 className="text-4xl lg:text-5xl font-black font-['Space_Grotesk'] leading-tight uppercase tracking-tighter drop-shadow-xl">
                Predictive Staff Logistics
              </h2>
              <p className="text-lg font-medium leading-relaxed drop-shadow-md" style={{ color: 'var(--text-secondary)' }}>
                Never send housekeeping to an occupied room again. Aegis calculates optimized cleaning routes in real-time based on checkout telemetry.
              </p>
              <motion.button
                onClick={handleLoginClick}
                className="flex items-center gap-3 text-xs font-bold tracking-widest uppercase group hover:gap-5 transition-all pt-4 text-red-600 dark:text-red-400"
                whileHover={{ x: 4 }}
              >
                See Operations <span className="material-symbols-outlined">arrow_forward</span>
              </motion.button>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer
        className="w-full p-8 md:p-12 border-t mt-32 relative z-10 backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--glass-bg)',
          boxShadow: '0 -10px 40px var(--glass-shadow)'
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl bg-clip-text text-transparent drop-shadow-lg" style={{ backgroundImage: 'var(--gradient-primary)' }}>shield</span>
              <span
                className="text-xl font-black tracking-tighter uppercase font-['Space_Grotesk'] leading-none bg-clip-text text-transparent drop-shadow-xl"
                style={{ backgroundImage: 'var(--gradient-hero)' }}
              >Aegis Smart Hotel</span>
            </div>
            <p className="text-sm max-w-xs leading-relaxed drop-shadow-md" style={{ color: 'var(--text-muted)' }}>
              The pinnacle of automated luxury operations. Next generation hospitality begins here.
            </p>
          </div>

          <div className="flex gap-12 font-semibold tracking-wider text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>
            <div className="flex flex-col gap-4">
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Portals</span>
              <Link href="/guest-login" className="hover:text-[#3b82f6] dark:hover:text-[#72aafe] transition-colors">Guest Web</Link>
              <Link href="/staff/login" className="hover:text-[#3b82f6] dark:hover:text-[#72aafe] transition-colors">Staff Ops</Link>
              <Link href="/admin/login" className="hover:text-[#3b82f6] dark:hover:text-[#72aafe] transition-colors">Admin Hub</Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Corporate</span>
              <Link href="/about" className="hover:text-[#3b82f6] dark:hover:text-[#72aafe] transition-colors">About Aegis</Link>
              <Link href="/contact" className="hover:text-[#3b82f6] dark:hover:text-[#72aafe] transition-colors">Enterprise Sales</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div
            className="fixed inset-0 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLoginModal}
          >
            <motion.div
              className="rounded-3xl p-8 relative shadow-2xl w-full max-w-md"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)'
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                onClick={closeLoginModal}
                className="absolute top-6 right-6 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <span className="material-symbols-outlined">close</span>
              </motion.button>

              <h2 className="font-['Space_Grotesk'] font-black text-2xl uppercase tracking-tighter mb-2 pr-8">
                Select User Portal
              </h2>
              <p className="text-sm mb-8 font-['Outfit'] pr-8" style={{ color: 'var(--text-muted)' }}>
                Authenticate into the Aegis Smart Hotel secure network.
              </p>

              <motion.div
                className="space-y-4 font-['Space_Grotesk']"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                  <Link href="/guest-login" className="flex items-center gap-4 p-5 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all group w-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>hotel</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm uppercase tracking-wider">Guest Network</p>
                      <p className="text-[10px] font-medium mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Connect & Request</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>arrow_forward</span>
                  </Link>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                  <Link href="/staff/login" className="flex items-center gap-4 p-5 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all group w-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>badge</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm uppercase tracking-wider">Staff Operations</p>
                      <p className="text-[10px] font-medium mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Manage Workflow</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>arrow_forward</span>
                  </Link>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                  <Link href="/admin/login" className="flex items-center gap-4 p-5 rounded-2xl hover:-translate-y-1 hover:shadow-lg transition-all group w-full" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>admin_panel_settings</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm uppercase tracking-wider">Admin Dashboard</p>
                      <p className="text-[10px] font-medium mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>System Control</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>arrow_forward</span>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
