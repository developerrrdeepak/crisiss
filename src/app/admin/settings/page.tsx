"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { motion } from "framer-motion";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAuthSync } from "@/hooks/useAuthSync";
import { getAuthInstance } from "@/lib/firebase";

const SETTINGS_STORAGE_KEY = "aegis-admin-settings";
const DEFAULT_TIMEZONE =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    : "UTC";

type ActiveTab = "general" | "notifications" | "security" | "danger";
type BusyDangerAction = "delete" | "reset" | null;

type LocalSettings = {
  timezone: string;
  emailAlerts: boolean;
  pushNotifications: boolean;
  twoFactorEnabled: boolean;
};

const DEFAULT_SETTINGS: LocalSettings = {
  timezone: DEFAULT_TIMEZONE,
  emailAlerts: true,
  pushNotifications: true,
  twoFactorEnabled: false,
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readStoredSettings(): LocalSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(rawValue) as Partial<LocalSettings>;
    return {
      timezone:
        typeof parsed.timezone === "string" && parsed.timezone.trim()
          ? parsed.timezone
          : DEFAULT_SETTINGS.timezone,
      emailAlerts:
        typeof parsed.emailAlerts === "boolean"
          ? parsed.emailAlerts
          : DEFAULT_SETTINGS.emailAlerts,
      pushNotifications:
        typeof parsed.pushNotifications === "boolean"
          ? parsed.pushNotifications
          : DEFAULT_SETTINGS.pushNotifications,
      twoFactorEnabled:
        typeof parsed.twoFactorEnabled === "boolean"
          ? parsed.twoFactorEnabled
          : DEFAULT_SETTINGS.twoFactorEnabled,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStoredSettings(settings: LocalSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function getErrorMessage(error: unknown, fallback: string) {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : "";

  if (code === "auth/requires-recent-login") {
    return "Please sign in again and retry this action.";
  }

  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Current password is incorrect.";
  }

  if (code === "auth/email-already-in-use") {
    return "That email address is already in use.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/weak-password") {
    return "Use a stronger password with at least 8 characters.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

async function clearClientState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.clear();
  window.sessionStorage.clear();

  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

export default function AdminSettings() {
  const router = useRouter();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const { dbUser, firebaseUser } = useAuthSync("admin");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_SETTINGS.timezone);
  const [emailAlerts, setEmailAlerts] = useState(DEFAULT_SETTINGS.emailAlerts);
  const [pushNotifications, setPushNotifications] = useState(DEFAULT_SETTINGS.pushNotifications);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(DEFAULT_SETTINGS.twoFactorEnabled);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [dangerBusyAction, setDangerBusyAction] = useState<BusyDangerAction>(null);

  useEffect(() => {
    const storedSettings = readStoredSettings();
    setTimezone(storedSettings.timezone);
    setEmailAlerts(storedSettings.emailAlerts);
    setPushNotifications(storedSettings.pushNotifications);
    setTwoFactorEnabled(storedSettings.twoFactorEnabled);
  }, []);

  useEffect(() => {
    setFullName(dbUser?.name || firebaseUser?.displayName || "");
    setEmail(dbUser?.email || firebaseUser?.email || "");
  }, [dbUser?.email, dbUser?.name, firebaseUser?.displayName, firebaseUser?.email]);

  const persistLocalSettings = (nextSettings: Partial<LocalSettings>) => {
    const mergedSettings: LocalSettings = {
      timezone,
      emailAlerts,
      pushNotifications,
      twoFactorEnabled,
      ...nextSettings,
    };

    writeStoredSettings(mergedSettings);
  };

  const handlePreferenceChange = (
    key: "emailAlerts" | "pushNotifications" | "twoFactorEnabled",
    value: boolean
  ) => {
    setError(null);
    setFeedback("Preference updated.");

    if (key === "emailAlerts") {
      setEmailAlerts(value);
    }

    if (key === "pushNotifications") {
      setPushNotifications(value);
    }

    if (key === "twoFactorEnabled") {
      setTwoFactorEnabled(value);
    }

    persistLocalSettings({ [key]: value });
  };

  const handleSaveChanges = async () => {
    if (!firebaseUser) {
      setError("Admin account is not available right now.");
      setFeedback(null);
      return;
    }

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setError("Full name is required.");
      setFeedback(null);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      setFeedback(null);
      return;
    }

    setProfileSaving(true);
    setError(null);
    setFeedback(null);

    try {
      if (normalizedName !== (firebaseUser.displayName || "")) {
        await updateProfile(firebaseUser, { displayName: normalizedName });
      }

      if (normalizedEmail !== (firebaseUser.email || "").toLowerCase()) {
        await updateEmail(firebaseUser, normalizedEmail);
      }

      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: normalizedEmail,
          displayName: normalizedName,
          role: "admin",
        }),
      });

      const syncPayload = (await syncResponse.json()) as { success?: boolean; error?: string };
      if (!syncResponse.ok || !syncPayload.success) {
        throw new Error(syncPayload.error || "Failed to sync admin profile.");
      }

      persistLocalSettings({ timezone });
      setFeedback("Profile updated successfully.");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Failed to update profile."));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!firebaseUser?.email) {
      setError("Password updates require an email/password admin account.");
      setFeedback(null);
      return;
    }

    if (!currentPassword) {
      setError("Enter your current password.");
      setFeedback(null);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setFeedback(null);
      return;
    }

    setSecuritySaving(true);
    setError(null);
    setFeedback(null);

    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setFeedback("Password updated successfully.");
    } catch (passwordError) {
      setError(getErrorMessage(passwordError, "Failed to update password."));
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleResetCache = async () => {
    setDangerBusyAction("reset");
    setError(null);
    setFeedback(null);

    try {
      await clearClientState();
      await signOut(getAuthInstance());
      router.push("/admin/login");
    } catch (resetError) {
      setError(getErrorMessage(resetError, "Failed to reset client cache."));
    } finally {
      setDangerBusyAction(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!firebaseUser) {
      setError("Admin account is not available right now.");
      setFeedback(null);
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm("Are you absolute sure you wish to delete your account? This action is irreversible.")
    ) {
      return;
    }

    setDangerBusyAction("delete");
    setError(null);
    setFeedback(null);

    try {
      await deleteUser(firebaseUser);
      await clearClientState();
      router.push("/admin/login");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Failed to delete account."));
    } finally {
      setDangerBusyAction(null);
    }
  };

  const timezoneOptions = Array.from(
    new Set([
      timezone,
      DEFAULT_SETTINGS.timezone,
      "UTC",
      "America/New_York",
      "America/Los_Angeles",
    ])
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#f5f6fa] dark:bg-[#0f1117] text-[#232D42] dark:text-[#f0f2ff] h-screen overflow-hidden flex flex-col transition-colors relative"
      style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
    >
      <DashboardHeader
        title={
          <span className="text-[#4F46E5] dark:text-[#818CF8] uppercase tracking-[0.2em] font-black text-sm">
            SETTINGS
          </span>
        }
        userName={dbUser?.name || firebaseUser?.displayName || "Operations Lead"}
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
          alertCount={0}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 w-full max-w-[1200px] mx-auto scroll-smooth">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                System Settings
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-[#8892b0]">
                Manage your account preferences and security configurations.
              </p>
            </div>
          </div>

          {(feedback || error) && (
            <div
              className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                error
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
              }`}
            >
              {error || feedback}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible shrink-0 pb-4 lg:pb-0 scrollbar-hide">
              {[
                { id: "general", label: "General", icon: "tune" },
                { id: "notifications", label: "Notifications", icon: "notifications" },
                { id: "security", label: "Security & Login", icon: "security" },
                { id: "danger", label: "Danger Zone", icon: "warning" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold whitespace-nowrap text-sm ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-[#1a1d2e] text-[#4F46E5] dark:text-[#818CF8] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-[#1a1d2e]/50 dark:hover:text-white transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 w-full flex flex-col gap-6">
              {activeTab === "general" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]"
                >
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-[#2d3255]/50">
                    Profile Information
                  </h3>

                  <div className="flex flex-col gap-5 max-w-xl">
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">
                        Timezone
                      </label>
                      <select
                        value={timezone}
                        onChange={(event) => {
                          const nextTimezone = event.target.value;
                          setTimezone(nextTimezone);
                          persistLocalSettings({ timezone: nextTimezone });
                        }}
                        className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors appearance-none cursor-pointer"
                      >
                        {timezoneOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSaveChanges()}
                      disabled={profileSaving}
                      className="mt-4 w-fit px-6 py-3 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#4F46E5]/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "security" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]"
                >
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-[#2d3255]/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4F46E5] dark:text-[#818CF8]">
                      lock
                    </span>
                    Security Protocol
                  </h3>

                  <div className="flex flex-col gap-5 max-w-xl">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-[#2d3255] bg-slate-50 dark:bg-[#13152b]">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Two-Factor Authentication (2FA)
                        </span>
                        <span className="text-[12px] text-slate-500 dark:text-[#8892b0]">
                          Require a secondary security code when logging in.
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-pressed={twoFactorEnabled}
                        onClick={() =>
                          handlePreferenceChange("twoFactorEnabled", !twoFactorEnabled)
                        }
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${
                          twoFactorEnabled
                            ? "bg-[#4F46E5] dark:bg-[#818CF8]"
                            : "bg-slate-200 dark:bg-[#2d3255]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform duration-300 ${
                            twoFactorEnabled ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                      <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[12px] font-bold text-slate-500 dark:text-[#8892b0] uppercase tracking-widest">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Enter new password"
                        className="w-full bg-slate-50 dark:bg-[#13152b] border border-slate-200 dark:border-[#2d3255] rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-colors"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleUpdatePassword()}
                      disabled={securitySaving}
                      className="mt-4 w-fit px-6 py-3 bg-[#4F46E5] hover:bg-[#4338ca] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#4F46E5]/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {securitySaving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === "danger" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-red-100 dark:border-red-900/30 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 dark:bg-red-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-red-500/10 dark:group-hover:bg-red-500/20 transition-all duration-700" />

                  <h3 className="text-xl font-black text-red-600 dark:text-red-500 mb-6 pb-4 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
                    <span className="material-symbols-outlined">warning</span>
                    Danger Zone
                  </h3>

                  <div className="flex flex-col gap-6 max-w-2xl relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-sm text-red-900 dark:text-red-200 uppercase tracking-widest">
                          Delete Account
                        </span>
                        <span className="text-[13px] font-medium text-red-700 dark:text-red-400">
                          Permanently remove your account and all associated data. This action cannot be undone.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAccount()}
                        disabled={dangerBusyAction !== null}
                        className="shrink-0 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                        {dangerBusyAction === "delete" ? "Deleting..." : "Delete Account"}
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 mt-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-sm text-orange-900 dark:text-orange-200 uppercase tracking-widest">
                          System Reset
                        </span>
                        <span className="text-[13px] font-medium text-orange-700 dark:text-orange-400">
                          Clear all local cache, preferences, and session tokens.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleResetCache()}
                        disabled={dangerBusyAction !== null}
                        className="shrink-0 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                        {dangerBusyAction === "reset" ? "Resetting..." : "Reset Cache"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-[#1a1d2e] rounded-[24px] p-6 lg:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.02)]"
                >
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-[#2d3255]/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4F46E5] dark:text-[#818CF8]">
                      notifications
                    </span>
                    Notification Preferences
                  </h3>
                  <div className="flex flex-col gap-4 max-w-xl">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-[#2d3255] bg-slate-50 dark:bg-[#13152b]">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Email Alerts
                        </span>
                        <span className="text-[12px] text-slate-500 dark:text-[#8892b0]">
                          Receive high priority system alerts via email.
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-pressed={emailAlerts}
                        onClick={() => handlePreferenceChange("emailAlerts", !emailAlerts)}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${
                          emailAlerts
                            ? "bg-[#4F46E5] dark:bg-[#818CF8]"
                            : "bg-slate-200 dark:bg-[#2d3255]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform duration-300 ${
                            emailAlerts ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-[#2d3255] bg-slate-50 dark:bg-[#13152b]">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Push Notifications
                        </span>
                        <span className="text-[12px] text-slate-500 dark:text-[#8892b0]">
                          Receive browser notifications for incoming messages.
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-pressed={pushNotifications}
                        onClick={() =>
                          handlePreferenceChange("pushNotifications", !pushNotifications)
                        }
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${
                          pushNotifications
                            ? "bg-[#4F46E5] dark:bg-[#818CF8]"
                            : "bg-slate-200 dark:bg-[#2d3255]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform duration-300 ${
                            pushNotifications ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </main>
      </div>
    </motion.div>
  );
}
