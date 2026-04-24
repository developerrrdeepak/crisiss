"use client";

import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { ensureFirebaseConfigured, getAuthInstance } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner } from "@yudiel/react-qr-scanner";

interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface GuestAccessPayload {
  type: "aegis-guest-access";
  token?: string;
  loginId?: string;
  password?: string;
}

function GuestLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const saveUserToDatabase = useCallback(async (user: FirebaseUser, role = "guest") => {
    const userName =
      user.displayName || user.email?.split("@")[0]?.replace(/[._]/g, " ") || "Guest";

    try {
      const res = await fetch("/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, name: userName, email: user.email, role }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error("Failed to save user:", data.error);
      }
      return data;
    } catch (err) {
      console.error("Error saving user to database:", err);
      return null;
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

  const completeSignIn = useCallback(async (nextLoginId: string, nextPassword: string) => {
    const configured = await ensureFirebaseConfigured();
    if (!configured) {
      throw new Error("Firebase login is not configured on the website.");
    }
    const auth = getAuthInstance();
    const credential = await signInWithEmailAndPassword(auth, nextLoginId, nextPassword);
    await saveUserToDatabase(credential.user);

    const shouldReset = await checkResetRequirement(credential.user.uid);
    if (shouldReset) {
      setPendingUid(credential.user.uid);
      setShowResetPrompt(true);
      return;
    }

    router.push("/guest-dashboard");
  }, [checkResetRequirement, router, saveUserToDatabase]);

  const handleQrTokenLogin = useCallback(async (token: string) => {
    try {
      setError(null);
      setIsSigningIn(true);

      const res = await fetch(`/api/guest/qr-login?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.credentials?.loginId || !data.credentials?.password) {
        throw new Error(data.error || "Invalid guest QR access.");
      }

      setLoginId(data.credentials.loginId);
      setPassword(data.credentials.password);
      await completeSignIn(data.credentials.loginId, data.credentials.password);
    } catch (err) {
      console.error("QR login failed:", err);
      setError(err instanceof Error ? err.message : "QR login failed.");
    } finally {
      setIsSigningIn(false);
    }
  }, [completeSignIn]);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      return;
    }

    void handleQrTokenLogin(token);
  }, [handleQrTokenLogin, searchParams]);

  const handleManualSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("Please enter guest email and password.");
      return;
    }

    try {
      setError(null);
      setIsSigningIn(true);
      await completeSignIn(loginId, password);
    } catch (err: unknown) {
      console.error("Guest sign-in failed:", err);
      setError("Invalid guest credentials.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleQrScanValue = async (rawValue: string) => {
    try {
      const parsedUrl = new URL(rawValue);
      if (parsedUrl.searchParams.get("token")) {
        setShowScanner(false);
        await handleQrTokenLogin(parsedUrl.searchParams.get("token") || "");
        return;
      }
    } catch {
      // QR can be a JSON payload; fall through.
    }

    try {
      const payload = JSON.parse(rawValue) as GuestAccessPayload;

      if (payload.type === "aegis-guest-access" && payload.token) {
        setShowScanner(false);
        await handleQrTokenLogin(payload.token);
        return;
      }

      if (payload.loginId && payload.password) {
        setShowScanner(false);
        setLoginId(payload.loginId);
        setPassword(payload.password);
        await completeSignIn(payload.loginId, payload.password);
        return;
      }
    } catch {
      // ignore parse failure
    }

    setError("Invalid guest QR code.");
    setShowScanner(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingUid) {
      setResetError("No signed-in guest session found.");
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
        body: JSON.stringify({ uid: pendingUid, role: "guest" }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to finish password reset.");
      }

      setShowResetPrompt(false);
      setPendingUid(null);
      setNewPassword("");
      setConfirmPassword("");
      router.push("/guest-dashboard");
    } catch (err) {
      console.error("Guest password reset failed:", err);
      setResetError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <>
      <style>{`* { font-family: 'Inter', sans-serif !important; }`}</style>
      <div className="theme-transition min-h-screen flex items-center justify-center relative p-4 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black" style={{ background: 'var(--bg-primary)' }}>
      {/* Background FX */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(150,150,150,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)' }} />

      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold z-50 transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <span className="material-symbols-outlined">arrow_back</span> Back to Home
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
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
          style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}
        >
          <span className="material-symbols-outlined text-3xl">hotel</span>
        </div>
        <h1 className="text-2xl font-black mb-1 tracking-tight uppercase">Guest Portal</h1>
        <p className="text-xs mb-6 font-medium text-muted-foreground">
          Scan your room QR or sign in with your guest email and 8 character password.
        </p>

        <button
          onClick={() => setShowScanner(true)}
          className="w-full py-4 px-4 font-bold text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:scale-95 transition-all rounded-xl mb-4 bg-secondary border border-border"
        >
          <span className="material-symbols-outlined">qr_code_scanner</span> Scan Guest QR
        </button>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-[11px] text-left font-medium bg-red-500/10 border border-red-500/20 text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleManualSignIn} className="flex flex-col gap-3 mb-4">
          <input
            type="email"
            placeholder="Guest Email"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm bg-muted border-2 border-transparent focus:border-[#22c55e] outline-none"
          />
          <input
            type="password"
            placeholder="8 character password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm bg-muted border-2 border-transparent focus:border-[#22c55e] outline-none"
          />
          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full py-3 px-4 mt-1 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 transition-all rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a]"
          >
            {isSigningIn && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Sign In
          </button>
        </form>
        <p className="text-[10px] mt-6">
          Staff?{" "}
          <Link href="/staff/login" className="font-semibold hover:underline">
            Staff Login →
          </Link>
        </p>
      </motion.div>

      <AnimatePresence>
        {showResetPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0f1720] p-6 text-left shadow-2xl"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                First Login Security
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                Reset your guest password
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-300">
                The password provided in your QR code was temporary. Set a new password
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
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
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
              className="w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 text-center flex justify-between items-center">
                <h3 className="font-bold text-white tracking-wide">Scan Guest QR</h3>
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

export default function GuestLogin() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <GuestLoginContent />
    </Suspense>
  );
}
