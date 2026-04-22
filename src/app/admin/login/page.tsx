"use client";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { ensureFirebaseConfigured, getAuthInstance, getGoogleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const saveUserToDatabase = async (user: { uid: string; email: string | null; displayName?: string | null }) => {
    if (!user.email) {
      return;
    }

    const userName = user.displayName || user.email.split("@")[0]?.replace(/[._]/g, " ") || "Admin";

    try {
      await fetch("/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          name: userName,
          email: user.email,
          role: "admin",
        }),
      });
    } catch (err) {
      console.error("Error saving admin to database:", err);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    try {
      setError(null);
      setIsSigningIn(true);
      const configured = await ensureFirebaseConfigured();
      if (!configured) {
        throw new Error("Firebase login is not configured on the website.");
      }
      const auth = getAuthInstance();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToDatabase(cred.user);
      router.push("/admin");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Invalid email or password.";
      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setIsSigningIn(true);
      const configured = await ensureFirebaseConfigured();
      if (!configured) {
        throw new Error("Firebase login is not configured on the website.");
      }
      const auth = getAuthInstance();
      const googleProvider = getGoogleProvider();
      const cred = await signInWithPopup(auth, googleProvider);
      await saveUserToDatabase(cred.user);
      router.push("/admin");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Authentication failed. You must have correct permissions.";
      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <style>{`* { font-family: 'Inter', sans-serif !important; }`}</style>
      <div 
        className="theme-transition min-h-screen flex items-center justify-center relative selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black p-4"
        style={{ background: 'var(--bg-primary)' }}
      >
      {/* Background Effects */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(150,150,150,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, transparent 70%)' }}
      />

      {/* Back to Home */}
      <Link 
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold z-50 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Home
      </Link>

      <motion.div 
        className="p-8 md:p-10 rounded-[2rem] max-w-sm w-full relative z-10 text-center"
        style={{ 
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <motion.div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
          style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}
          whileHover={{ scale: 1.05 }}
        >
          <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
        </motion.div>

        <h1 className="text-2xl font-black mb-2 tracking-tight uppercase" style={{ color: 'var(--text-primary)' }}>
          Admin Login
        </h1>
        <p className="text-xs mb-6 font-medium" style={{ color: 'var(--text-muted)' }}>
          Secure access to the Aegis Command Center
        </p>
        
        {error && (
          <motion.div 
            className="mb-6 p-3 rounded-xl text-[11px] text-left font-medium animate-in fade-in slide-in-from-top-2"
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444' 
            }}
          >
            {error}
          </motion.div>
        )}

        <div className="flex flex-col gap-4">
          <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3">
            <div className="text-left">
              <input 
                type="email" 
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid transparent'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--secondary)'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                required
              />
            </div>
            <div className="text-left">
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid transparent'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--secondary)'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                required
              />
            </div>
            <button 
              type="submit"
              disabled={isSigningIn}
              className="w-full py-3 px-4 mt-2 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 duration-200 disabled:opacity-50 transition-all rounded-xl"
              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
            >
              {isSigningIn && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Sign in securely
            </button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full" style={{ borderTop: '1px solid var(--border-color)' }} />
            </div>
            <div className="relative flex justify-center text-[10px] tracking-wider uppercase">
              <span className="px-2 font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>Or</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            type="button"
            disabled={isSigningIn}
            className="w-full py-3 px-4 font-bold text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:scale-95 duration-200 disabled:opacity-50 disabled:pointer-events-none transition-all rounded-xl group"
            style={{ 
              background: 'var(--bg-card)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} className="group-hover:scale-110 transition-transform"/>
            Sign in with Google
          </button>
        </div>

        <p className="text-[10px] mt-6" style={{ color: 'var(--text-muted)' }}>
          Staff? <Link href="/staff/login" className="font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>Staff Login →</Link>
        </p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Guest? <Link href="/guest-login" className="font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>Guest Portal →</Link>
        </p>
      </motion.div>
    </div>
    </>
  );
}
