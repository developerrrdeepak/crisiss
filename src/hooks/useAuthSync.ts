"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ensureFirebaseConfigured, getAuthInstance } from "@/lib/firebase";

export type UserRole = "admin" | "staff" | "guest";

export interface DbUser {
  id: string;
  loginId?: string | null;
  profileId?: string | null;
  email: string | null;
  name: string;
  displayName?: string | null;
  room?: string | null;
  roomNumber?: string | null;
  checkOut?: string | null;
  guestCreatedAt?: string | null;
  role: UserRole;
  staffRole?: string | null;
  department?: string | null;
  status?: string | null;
  profileType?: "guest" | "staff" | "login";
  employeeId?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  bloodGroup?: string | null;
  joiningDate?: string | null;
  validTill?: string | null;
  photoUrl?: string | null;
  lastLogin?: string;
  firebaseUid: string;
  createdAt?: string;
}

export interface AuthUser {
  firebaseUser: User | null;
  role: UserRole | null;
  loading: boolean;
  dbUser: DbUser | null;
}

async function fetchUserFromDatabase(uid: string): Promise<DbUser | null> {
  try {
    const res = await fetch(`/api/auth/sync?uid=${uid}`);
    const data = await res.json();
    if (data.success && data.user) {
      return normalizeDbUser(data.user, uid);
    }
  } catch (err) {
    console.error("Failed to fetch user from database:", err);
  }
  return null;
}

async function saveUserToDatabase(
  uid: string,
  email: string | null,
  displayName: string | null,
  role: UserRole = "guest"
): Promise<DbUser | null> {
  try {
    const userName = displayName || email?.split("@")[0]?.replace(/[._]/g, " ") || "Guest";
    
    const res = await fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firebaseUid: uid,
        displayName: userName,
        email,
        role,
      }),
    });

    const data = await res.json();
    if (data.success && data.user) {
      return normalizeDbUser(data.user, uid);
    }
  } catch (err) {
    console.error("Failed to save user to database:", err);
  }
  return null;
}

function normalizeDbUser(user: Record<string, unknown>, firebaseUid: string): DbUser {
  return {
    id: typeof user.id === "string" ? user.id : firebaseUid,
    loginId: typeof user.loginId === "string" ? user.loginId : typeof user.id === "string" ? user.id : firebaseUid,
    profileId:
      typeof user.profileId === "string"
        ? user.profileId
        : typeof user.id === "string"
          ? user.id
          : firebaseUid,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : "Guest",
    displayName: typeof user.displayName === "string" ? user.displayName : null,
    room:
      typeof user.room === "string"
        ? user.room
        : typeof user.roomNumber === "string"
          ? user.roomNumber
          : null,
    roomNumber: typeof user.roomNumber === "string" ? user.roomNumber : null,
    checkOut: typeof user.checkOut === "string" ? user.checkOut : null,
    guestCreatedAt: typeof user.guestCreatedAt === "string" ? user.guestCreatedAt : null,
    role: (typeof user.role === "string" ? user.role : "guest") as UserRole,
    staffRole: typeof user.staffRole === "string" ? user.staffRole : null,
    department: typeof user.department === "string" ? user.department : null,
    status: typeof user.status === "string" ? user.status : null,
    profileType:
      user.profileType === "guest" || user.profileType === "staff" || user.profileType === "login"
        ? user.profileType
        : undefined,
    employeeId: typeof user.employeeId === "string" ? user.employeeId : null,
    phone: typeof user.phone === "string" ? user.phone : null,
    emergencyContact: typeof user.emergencyContact === "string" ? user.emergencyContact : null,
    bloodGroup: typeof user.bloodGroup === "string" ? user.bloodGroup : null,
    joiningDate: typeof user.joiningDate === "string" ? user.joiningDate : null,
    validTill: typeof user.validTill === "string" ? user.validTill : null,
    photoUrl: typeof user.photoUrl === "string" ? user.photoUrl : null,
    lastLogin: typeof user.lastLogin === "string" ? user.lastLogin : undefined,
    firebaseUid,
    createdAt: typeof user.createdAt === "string" ? user.createdAt : undefined,
  };
}

export function useAuthSync(expectedRole?: UserRole): AuthUser {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const configured = await ensureFirebaseConfigured();
        if (!configured || cancelled) {
          throw new Error("Firebase auth unavailable.");
        }

        const auth = getAuthInstance();

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (cancelled) {
            return;
          }

          setFirebaseUser(user);

          if (user) {
            const roleToUse = expectedRole ?? "guest";
            
            let savedUser = await fetchUserFromDatabase(user.uid);
            
            if (!savedUser) {
              savedUser = await saveUserToDatabase(
                user.uid,
                user.email,
                user.displayName,
                roleToUse
              );
            }

            if (savedUser) {
              setDbUser(savedUser);
              setRole(savedUser.role as UserRole);
            } else {
              setDbUser({
                id: user.uid,
                loginId: user.uid,
                profileId: user.uid,
                email: user.email,
                name: user.displayName || user.email?.split("@")[0] || "Guest",
                role: roleToUse,
                firebaseUid: user.uid,
              });
              setRole(roleToUse);
            }
          } else {
            setDbUser(null);
            setRole(null);
          }

          setLoading(false);
        });
      } catch (error) {
        console.error("Firebase auth initialization failed:", error);
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [expectedRole]);

  return { firebaseUser, role, loading, dbUser };
}
