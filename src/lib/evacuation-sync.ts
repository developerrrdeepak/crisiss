"use client";

import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { SimulationState } from "@/lib/evacuation";

const EVACUATION_SYNC_COLLECTION = "evacuation_control";
const EVACUATION_SYNC_DOCUMENT = "live_session";

function getSyncDocumentRef() {
  return doc(getDb(), EVACUATION_SYNC_COLLECTION, EVACUATION_SYNC_DOCUMENT);
}

function toSyncPayload(state: SimulationState) {
  return JSON.parse(JSON.stringify(state)) as SimulationState;
}

export function subscribeSharedSimulationState(options: {
  onData: (state: Partial<SimulationState> | null) => void;
  onError?: (error: Error) => void;
}) {
  if (!isFirebaseConfigured()) {
    options.onData(null);
    return () => undefined;
  }

  return onSnapshot(
    getSyncDocumentRef(),
    (snapshot) => {
      const payload = snapshot.data();
      if (!payload?.state || typeof payload.state !== "object") {
        options.onData(null);
        return;
      }
      options.onData(payload.state as Partial<SimulationState>);
    },
    (error) => {
      options.onError?.(error);
    }
  );
}

export async function saveSharedSimulationState(
  state: SimulationState,
  metadata?: { sourceRole?: "admin" | "staff" | "guest" | "system" }
) {
  if (!isFirebaseConfigured()) {
    return;
  }

  await setDoc(
    getSyncDocumentRef(),
    {
      state: toSyncPayload(state),
      updatedAt: serverTimestamp(),
      sourceRole: metadata?.sourceRole ?? "system",
    },
    { merge: true }
  );
}
