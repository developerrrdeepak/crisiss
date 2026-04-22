// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

declare global {
  interface Window {
    __AEGIS_PUBLIC_ENV__?: Record<string, string | undefined>;
  }
}

// Environment check helper - works on both server and client
function isServer(): boolean {
  return typeof window === 'undefined';
}

function getPublicEnv(key: keyof NonNullable<Window["__AEGIS_PUBLIC_ENV__"]>): string | undefined {
  const buildValue = process.env[key];
  if (buildValue?.trim()) {
    return buildValue;
  }

  if (typeof window !== "undefined") {
    return window.__AEGIS_PUBLIC_ENV__?.[key];
  }

  return undefined;
}

// Singleton storage
let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;
let isInitialized = false;
let publicEnvLoadPromise: Promise<boolean> | null = null;

// Get Firebase config from environment
function getFirebaseConfig() {
  const apiKey = getPublicEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const projectId = getPublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  
  return {
    apiKey,
    authDomain: getPublicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId,
    storageBucket: getPublicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getPublicEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getPublicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    measurementId: getPublicEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
    isConfigured: !!(apiKey && projectId),
  };
}

async function loadRuntimeFirebaseConfig(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (getFirebaseConfig().isConfigured) {
    return true;
  }

  if (!publicEnvLoadPromise) {
    publicEnvLoadPromise = fetch("/api/public-env", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return false;
        }

        const payload = (await response.json()) as { config?: Record<string, string | undefined> };
        if (!payload.config) {
          return false;
        }

        window.__AEGIS_PUBLIC_ENV__ = {
          ...window.__AEGIS_PUBLIC_ENV__,
          ...payload.config,
        };

        return getFirebaseConfig().isConfigured;
      })
      .catch((error) => {
        console.error("Failed to load runtime Firebase config:", error);
        return false;
      })
      .finally(() => {
        publicEnvLoadPromise = null;
      });
  }

  return publicEnvLoadPromise;
}

// Initialize Firebase
function initializeFirebase(): boolean {
  if (isInitialized) return authInstance !== null;

  // Don't initialize on server
  if (isServer()) {
    return false;
  }

  const config = getFirebaseConfig();

  if (!config.isConfigured) {
    // Only log in browser and if we haven't already logged
    if (typeof window !== 'undefined') {
      console.warn(
        'Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.\n' +
        'Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID'
      );
    }
    return false;
  }

  try {
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
      measurementId: config.measurementId,
    };

    appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    googleProviderInstance = new GoogleAuthProvider();

    // Initialize Analytics
    isSupported().then(supported => {
      if (supported && appInstance) {
        getAnalytics(appInstance);
      }
    });

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return false;
  }
}

// Safe getters
export function getFirebaseApp(): FirebaseApp {
  if (!appInstance && initializeFirebase()) {
    return appInstance!;
  }
  if (!appInstance) {
    throw new Error('Firebase app not initialized. Please ensure Firebase is configured and you are on the client side.');
  }
  return appInstance;
}

export function getDb(): Firestore {
  if (!dbInstance && initializeFirebase()) {
    return dbInstance!;
  }
  if (!dbInstance) {
    throw new Error('Firestore not initialized. Please ensure Firebase is configured and you are on the client side.');
  }
  return dbInstance;
}

export function getAuthInstance(): Auth {
  if (!authInstance && initializeFirebase()) {
    return authInstance!;
  }
  if (!authInstance) {
    throw new Error('Auth not initialized. Please ensure Firebase is configured and you are on the client side.');
  }
  return authInstance;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProviderInstance && initializeFirebase()) {
    return googleProviderInstance!;
  }
  if (!googleProviderInstance) {
    throw new Error('GoogleAuthProvider not initialized. Please ensure Firebase is configured and you are on the client side.');
  }
  return googleProviderInstance;
}

// Check if Firebase is ready
export function isFirebaseReady(): boolean {
  return authInstance !== null && !isServer();
}

// Check if configured
export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig().isConfigured;
}

export async function ensureFirebaseConfigured(): Promise<boolean> {
  if (getFirebaseConfig().isConfigured) {
    if (!authInstance) {
      initializeFirebase();
    }
    return true;
  }

  const loaded = await loadRuntimeFirebaseConfig();
  if (!loaded) {
    return false;
  }

  if (!authInstance) {
    initializeFirebase();
  }

  return getFirebaseConfig().isConfigured;
}
