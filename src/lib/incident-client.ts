"use client";

export interface PersistentIncidentInput {
  id: string;
  title: string;
  description?: string | null;
  severity: string;
  roomId?: string | null;
  status?: string;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return fallback;
}

export async function persistIncident(input: PersistentIncidentInput) {
  const response = await fetch("/api/admin/incidents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      severity: input.severity,
      roomId: input.roomId ?? null,
      status: input.status ?? "Active",
    }),
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to create incident record."));
  }

  return payload;
}

export async function updateIncidentStatus(id: string, status: string) {
  const response = await fetch("/api/admin/incidents", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      status,
    }),
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to update incident status."));
  }

  return payload;
}
