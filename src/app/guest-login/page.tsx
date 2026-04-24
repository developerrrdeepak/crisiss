"use client";

import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { ensureFirebaseConfigured, getAuthInstance } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner } from "@yudiel/react-qr-scanner";
import { PortalAuthFrame } from "@/components/PortalAuthFrame";

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
      const response = await fetch("/api/save-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, name: userName, email: user.email, role }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error("Failed to save user:", data.error);
      }
      return data;
    } catch (saveError) {
      console.error("Error saving user to database:", saveError);
      return null;
    }
  }, []);

  const requiresStrongPassword = (value: string) =>
    value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

  const checkResetRequirement = useCallback(async (uid: string) => {
    const response = await fetch(`/api/auth/password-reset?uid=${encodeURIComponent(uid)}`, {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to verify password reset status.");
    }

    return Boolean(data.requiresPasswordReset);
  }, []);

  const completeSignIn = useCallback(
    async (nextLoginId: string, nextPassword: string) => {
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
    },
    [checkResetRequirement, router, saveUserToDatabase]
  );

  const handleQrTokenLogin = useCallback(
    async (token: string) => {
      try {
        setError(null);
        setIsSigningIn(true);

        const response = await fetch(`/api/guest/qr-login?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data.success || !data.credentials?.loginId || !data.credentials?.password) {
          throw new Error(data.error || "Invalid guest QR access.");
        }

        setLoginId(data.credentials.loginId);
        setPassword(data.credentials.password);
        await completeSignIn(data.credentials.loginId, data.credentials.password);
      } catch (loginError) {
        console.error("QR login failed:", loginError);
        setError(loginError instanceof Error ? loginError.message : "QR login failed.");
      } finally {
        setIsSigningIn(false);
      }
    },
    [completeSignIn]
  );

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      return;
    }

    void handleQrTokenLogin(token);
  }, [handleQrTokenLogin, searchParams]);

  const handleManualSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!loginId || !password) {
      setError("Enter email and password.");
      return;
    }

    try {
      setError(null);
      setIsSigningIn(true);
      await completeSignIn(loginId, password);
    } catch (loginError: unknown) {
      console.error("Guest sign-in failed:", loginError);
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

  const handlePasswordReset = async (event: FormEvent) => {
    event.preventDefault();

    if (!pendingUid) {
      setResetError("No signed-in guest session found.");
      return;
    }

    if (!requiresStrongPassword(newPassword)) {
      setResetError("Use at least 8 characters with letters and numbers.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
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

      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: pendingUid, role: "guest" }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to finish password reset.");
      }

      setShowResetPrompt(false);
      setPendingUid(null);
      setNewPassword("");
      setConfirmPassword("");
      router.push("/guest-dashboard");
    } catch (resetFailure) {
      console.error("Guest password reset failed:", resetFailure);
      setResetError(resetFailure instanceof Error ? resetFailure.message : "Password reset failed.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <>
      <PortalAuthFrame
        icon="hotel"
        title="Guest"
        subtitle="QR or room credentials."
        iconToneClass="bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/18 dark:text-emerald-300"
        glowClass="bg-emerald-500/16 dark:bg-emerald-500/22"
        footerLinks={[
          { href: "/staff/login", label: "Staff" },
          { href: "/admin/login", label: "Admin" },
        ]}
      >
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-emerald-500"
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          Scan QR
        </button>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleManualSignIn} className="space-y-3">
          <input
            type="email"
            placeholder="Guest email"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            required
            className="aegis-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="aegis-input"
          />
          <button
            type="submit"
            disabled={isSigningIn}
            className="aegis-button-primary flex w-full justify-center rounded-2xl px-4 py-4 tracking-[0.16em] disabled:opacity-60"
          >
            {isSigningIn ? "Signing In" : "Sign In"}
          </button>
        </form>
      </PortalAuthFrame>

      <AnimatePresence>
        {showResetPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="aegis-card w-full max-w-md p-6"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                First Login
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Set a new password
              </h3>

              {resetError && (
                <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                  {resetError}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="mt-5 space-y-3">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="aegis-input"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="aegis-input"
                  required
                />
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="aegis-button-primary flex w-full justify-center rounded-2xl px-4 py-4 tracking-[0.16em] disabled:opacity-60"
                >
                  {isResettingPassword ? "Saving" : "Save Password"}
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setShowScanner(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(event) => event.stopPropagation()}
              className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0d121c] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <p className="text-sm font-semibold text-white">Guest QR</p>
                <button type="button" onClick={() => setShowScanner(false)} className="text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="aspect-square w-full max-w-md bg-black">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      void handleQrScanValue(result[0].rawValue);
                    }
                  }}
                  onError={(scannerError) => console.error(scannerError)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function GuestLogin() {
  return (
    <Suspense
      fallback={
        <div className="aegis-auth-page">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <GuestLoginContent />
    </Suspense>
  );
}
