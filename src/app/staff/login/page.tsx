"use client";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
} from "firebase/auth";
import { ensureFirebaseConfigured, getAuthInstance, getGoogleProvider } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner } from "@yudiel/react-qr-scanner";

interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface StaffAccessPayload {
  type: "aegis-staff-access";
  employeeId?: string;
  loginId?: string;
  password?: string;
}

function StaffLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const saveUserToDatabase = useCallback(async (user: FirebaseUser) => {
    const userName =
      user.displayName || user.email?.split("@")[0]?.replace(/[._]/g, " ") || "Staff";

    try {
      await fetch("/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          name: userName,
          email: user.email,
          role: "staff",
        }),
      });
    } catch (err) {
      console.error("Error saving staff to database:", err);
    }
  }, []);

  const requiresStrongPassword = (value: string) => {
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
  };

  const checkResetRequirement = useCallback(async (uid: string) => {
    const res = await fetch(`/api/auth/password-reset?uid=${encodeURIComponent(uid)}`, {
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to verify password reset status.");
    }

    return Boolean(data.requiresPasswordReset);
  }, []);

  const finishStaffSignIn = useCallback(async (user: FirebaseUser) => {
    await saveUserToDatabase(user);

    const shouldReset = await checkResetRequirement(user.uid);
    if (shouldReset) {
      setPendingUid(user.uid);
      setShowResetPrompt(true);
      return;
    }

    router.push("/staff-dashboard");
  }, [checkResetRequirement, router, saveUserToDatabase]);

  const completeStaffSignIn = useCallback(async (nextEmail: string, nextPassword: string) => {
    const configured = await ensureFirebaseConfigured();
    if (!configured) {
      throw new Error("Firebase login is not configured on the website.");
    }
    const auth = getAuthInstance();
    const credential = await signInWithEmailAndPassword(auth, nextEmail, nextPassword);
    await finishStaffSignIn(credential.user);
  }, [finishStaffSignIn]);

  const handleQrEmployeeLogin = useCallback(async (employeeId: string) => {
    try {
      setError(null);
      setIsSigningIn(true);

      const res = await fetch(
        `/api/staff/qr-login?employeeId=${encodeURIComponent(employeeId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok || !data.success || !data.credentials?.loginId || !data.credentials?.password) {
        throw new Error(data.error || "Invalid staff QR access.");
      }

      setEmail(data.credentials.loginId);
      setPassword(data.credentials.password);
      await completeStaffSignIn(data.credentials.loginId, data.credentials.password);
    } catch (err) {
      console.error("Staff QR login failed:", err);
      setError(err instanceof Error ? err.message : "QR login failed.");
    } finally {
      setIsSigningIn(false);
    }
  }, [completeStaffSignIn]);

  useEffect(() => {
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return;
    }

    void handleQrEmployeeLogin(employeeId);
  }, [handleQrEmployeeLogin, searchParams]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setError(null);
      setIsSigningIn(true);
      await completeStaffSignIn(email, password);
    } catch (err: unknown) {
      const loginError = err as { code?: string; message?: string };
      setError(
        loginError.code === "auth/invalid-credential"
          ? "Invalid credentials. Contact your administrator."
          : loginError.message || "Sign-in failed."
      );
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
      await finishStaffSignIn(cred.user);
    } catch (err: unknown) {
      const loginError = err as { message?: string };
      setError(loginError.message || "Google sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleQrScanValue = async (rawValue: string) => {
    try {
      const parsedUrl = new URL(rawValue);
      const employeeId = parsedUrl.searchParams.get("employeeId");

      if (employeeId) {
        setShowScanner(false);
        await handleQrEmployeeLogin(employeeId);
        return;
      }
    } catch {
      // QR can be a JSON payload; fall through.
    }

    try {
      const payload = JSON.parse(rawValue) as StaffAccessPayload;

      if (payload.type === "aegis-staff-access" && payload.employeeId) {
        setShowScanner(false);
        await handleQrEmployeeLogin(payload.employeeId);
        return;
      }

      if (payload.loginId && payload.password) {
        setShowScanner(false);
        setEmail(payload.loginId);
        setPassword(payload.password);
        await completeStaffSignIn(payload.loginId, payload.password);
        return;
      }
    } catch {
      // ignore parse failure
    }

    setError("Invalid staff QR code.");
    setShowScanner(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingUid) {
      setResetError("No signed-in staff session found.");
      return;
    }

    if (!requiresStrongPassword(newPassword)) {
      setResetError("Use at least 8 characters with letters and numbers.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("New password and confirm password do not match.");
      return;
    }

    try {
      setResetError(null);
      setIsResettingPassword(true);
      const auth = getAuthInstance();

      if (!auth.currentUser) {
        throw new Error("Your session expired. Please sign in again.");
      }

      await updatePassword(auth.currentUser, newPassword);

      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: pendingUid, role: "staff" }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to finish password reset.");
      }

      setShowResetPrompt(false);
      setPendingUid(null);
      setNewPassword("");
      setConfirmPassword("");
      router.push("/staff-dashboard");
    } catch (err) {
      console.error("Staff password reset failed:", err);
      setResetError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <>
      <style>{`* { font-family: 'Inter', sans-serif !important; }`}</style>
      <div
        className="theme-transition min-h-screen flex items-center justify-center relative p-4 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black"
        style={{ background: "var(--bg-primary)" }}
      >
        {/* Background Effects */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.15) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)" }}
        />

        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold z-50 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Home
        </Link>

        <motion.div
          className="p-8 md:p-10 rounded-[2rem] max-w-sm w-full relative z-10 text-center"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(24px)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-lg)",
          }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
            style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}
            whileHover={{ scale: 1.05 }}
          >
            <span className="material-symbols-outlined text-3xl">badge</span>
          </motion.div>

          <h1 className="text-2xl font-black mb-1 tracking-tight uppercase" style={{ color: "var(--text-primary)" }}>
            Staff Portal
          </h1>
          <p className="text-xs mb-6 font-medium" style={{ color: "var(--text-muted)" }}>
            Aegis Operations - Scan your ID QR or sign in with your staff email and password.
          </p>

          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-4 px-4 font-bold text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:scale-95 transition-all rounded-xl mb-4"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            Scan Staff ID QR
          </button>

          {error && (
            <motion.div
              className="mb-4 p-3 rounded-xl text-[11px] text-left font-medium animate-in fade-in"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3 mb-4">
            <input
              type="email"
              placeholder="Generated Staff Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                border: "1px solid transparent",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "transparent";
              }}
              required
            />
            <input
              type="password"
              placeholder="Generated Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                border: "1px solid transparent",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "transparent";
              }}
              required
            />
            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full py-3 px-4 mt-1 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 duration-200 disabled:opacity-50 transition-all rounded-xl"
              style={{ background: "linear-gradient(135deg, #175ead 0%, #0f4a8a 100%)" }}
            >
              {isSigningIn && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Sign In to Staff Portal
            </button>
          </form>

          <div className="relative py-2 mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full" style={{ borderTop: "1px solid var(--border-color)" }} />
            </div>
            <div className="relative flex justify-center text-[10px] tracking-wider uppercase">
              <span className="px-2 font-medium" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                Or
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full py-3 px-4 font-bold text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:scale-95 duration-200 disabled:opacity-50 transition-all rounded-xl group"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <Image
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              width={18}
              height={18}
              className="group-hover:scale-110 transition-transform"
            />
            Sign in with Google
          </button>

          <p className="text-[10px] mt-6" style={{ color: "var(--text-muted)" }}>
            Admin access?{" "}
            <Link href="/admin/login" className="font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
              Admin Login →
            </Link>
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Guest?{" "}
            <Link href="/guest-login" className="font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
              Guest Portal →
            </Link>
          </p>
        </motion.div>

        <AnimatePresence>
          {showResetPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 12 }}
                className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0f1720] p-6 text-left shadow-2xl"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#72aafe]">
                  First Login Security
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                  Reset your staff password
                </h3>
                <p className="mt-2 text-sm font-medium text-slate-300">
                  The generated password on your staff ID card was temporary. Set a new password
                  before opening the dashboard.
                </p>

                {resetError && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] font-medium text-red-400">
                    {resetError}
                  </div>
                )}

                <form onSubmit={handlePasswordReset} className="mt-5 space-y-3">
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#175ead] to-[#0f4a8a] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {isResettingPassword && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    Save New Password
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {showScanner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              onClick={() => setShowScanner(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md bg-[#0f0f0f] rounded-3xl overflow-hidden border border-white/20 shadow-2xl"
              >
                <div className="p-5 border-b border-white/10 text-center flex justify-between items-center">
                  <h3 className="font-bold text-white tracking-wide">Scan Staff ID QR</h3>
                  <button
                    onClick={() => setShowScanner(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="aspect-square bg-black relative">
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        void handleQrScanValue(result[0].rawValue);
                      }
                    }}
                    onError={(err) => console.error(err)}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function StaffLogin() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
          <div className="w-12 h-12 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StaffLoginContent />
    </Suspense>
  );
}
