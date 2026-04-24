"use client";

import Image from "next/image";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
} from "firebase/auth";
import { ensureFirebaseConfigured, getAuthInstance, getGoogleProvider } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scanner } from "@yudiel/react-qr-scanner";
import { PortalAuthFrame } from "@/components/PortalAuthFrame";

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
    } catch (saveError) {
      console.error("Error saving staff to database:", saveError);
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

  const finishStaffSignIn = useCallback(
    async (user: FirebaseUser) => {
      await saveUserToDatabase(user);

      const shouldReset = await checkResetRequirement(user.uid);
      if (shouldReset) {
        setPendingUid(user.uid);
        setShowResetPrompt(true);
        return;
      }

      router.push("/staff-dashboard");
    },
    [checkResetRequirement, router, saveUserToDatabase]
  );

  const completeStaffSignIn = useCallback(
    async (nextEmail: string, nextPassword: string) => {
      const configured = await ensureFirebaseConfigured();
      if (!configured) {
        throw new Error("Firebase login is not configured on the website.");
      }
      const auth = getAuthInstance();
      const credential = await signInWithEmailAndPassword(auth, nextEmail, nextPassword);
      await finishStaffSignIn(credential.user);
    },
    [finishStaffSignIn]
  );

  const handleQrEmployeeLogin = useCallback(
    async (employeeId: string) => {
      try {
        setError(null);
        setIsSigningIn(true);

        const response = await fetch(
          `/api/staff/qr-login?employeeId=${encodeURIComponent(employeeId)}`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok || !data.success || !data.credentials?.loginId || !data.credentials?.password) {
          throw new Error(data.error || "Invalid staff QR access.");
        }

        setEmail(data.credentials.loginId);
        setPassword(data.credentials.password);
        await completeStaffSignIn(data.credentials.loginId, data.credentials.password);
      } catch (loginError) {
        console.error("Staff QR login failed:", loginError);
        setError(loginError instanceof Error ? loginError.message : "QR login failed.");
      } finally {
        setIsSigningIn(false);
      }
    },
    [completeStaffSignIn]
  );

  useEffect(() => {
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return;
    }

    void handleQrEmployeeLogin(employeeId);
  }, [handleQrEmployeeLogin, searchParams]);

  const handleEmailSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }

    try {
      setError(null);
      setIsSigningIn(true);
      await completeStaffSignIn(email, password);
    } catch (loginError: unknown) {
      const authError = loginError as { code?: string; message?: string };
      setError(
        authError.code === "auth/invalid-credential"
          ? "Invalid credentials."
          : authError.message || "Sign-in failed."
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
      const credential = await signInWithPopup(auth, googleProvider);
      await finishStaffSignIn(credential.user);
    } catch (loginError: unknown) {
      const authError = loginError as { message?: string };
      setError(authError.message || "Google sign-in failed.");
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

  const handlePasswordReset = async (event: FormEvent) => {
    event.preventDefault();

    if (!pendingUid) {
      setResetError("No signed-in staff session found.");
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
        body: JSON.stringify({ uid: pendingUid, role: "staff" }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to finish password reset.");
      }

      setShowResetPrompt(false);
      setPendingUid(null);
      setNewPassword("");
      setConfirmPassword("");
      router.push("/staff-dashboard");
    } catch (resetFailure) {
      console.error("Staff password reset failed:", resetFailure);
      setResetError(resetFailure instanceof Error ? resetFailure.message : "Password reset failed.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <>
      <PortalAuthFrame
        icon="badge"
        title="Staff"
        subtitle="Shift access and QR sign-in."
        iconToneClass="bg-sky-500/12 text-sky-600 dark:bg-sky-500/18 dark:text-sky-300"
        glowClass="bg-sky-500/16 dark:bg-sky-500/22"
        footerLinks={[
          { href: "/admin/login", label: "Admin" },
          { href: "/guest-login", label: "Guest" },
        ]}
      >
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-sky-500"
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          Scan QR
        </button>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <input
            type="email"
            placeholder="Staff email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="aegis-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="aegis-input"
            required
          />
          <button
            type="submit"
            disabled={isSigningIn}
            className="aegis-button-primary flex w-full justify-center rounded-2xl px-4 py-4 tracking-[0.16em] disabled:opacity-60"
          >
            {isSigningIn ? "Signing In" : "Sign In"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border-color)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Or
          </span>
          <div className="h-px flex-1 bg-[var(--border-color)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[color:var(--primary)] disabled:opacity-60"
        >
          <Image
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            width={18}
            height={18}
          />
          Continue with Google
        </button>
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500">
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
                <p className="text-sm font-semibold text-white">Staff QR</p>
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

export default function StaffLogin() {
  return (
    <Suspense
      fallback={
        <div className="aegis-auth-page">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      }
    >
      <StaffLoginContent />
    </Suspense>
  );
}
