"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { PortalAuthFrame } from "@/components/PortalAuthFrame";
import { ensureFirebaseConfigured, getAuthInstance, getGoogleProvider } from "@/lib/firebase";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const saveUserToDatabase = async (user: {
    uid: string;
    email: string | null;
    displayName?: string | null;
  }) => {
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
    } catch (saveError) {
      console.error("Error saving admin to database:", saveError);
    }
  };

  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Enter email and password.");
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
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToDatabase(credential.user);
      router.push("/admin");
    } catch (signInError: unknown) {
      console.error(signInError);
      setError(signInError instanceof Error ? signInError.message : "Invalid credentials.");
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
      await saveUserToDatabase(credential.user);
      router.push("/admin");
    } catch (signInError: unknown) {
      console.error(signInError);
      setError(signInError instanceof Error ? signInError.message : "Authentication failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <PortalAuthFrame
      icon="admin_panel_settings"
      title="Admin"
      subtitle="Command center access."
      iconToneClass="bg-rose-500/12 text-rose-600 dark:bg-rose-500/18 dark:text-rose-300"
      glowClass="bg-rose-500/16 dark:bg-rose-500/22"
      footerLinks={[
        { href: "/staff/login", label: "Staff" },
        { href: "/guest-login", label: "Guest" },
      ]}
    >
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleEmailSignIn} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
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
  );
}
