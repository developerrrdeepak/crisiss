import { randomBytes } from "crypto";

export interface GuestAccessPayload {
  type: "aegis-guest-access";
  version: 1;
  bookingId: string;
  token: string;
  guestName: string;
  roomNumber: string;
  loginId: string;
  password: string;
  email: string | null;
  idNumber: string | null;
  contact: string | null;
  address: string | null;
}

export function generateGuestPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export function buildGuestAccessPayload(params: {
  bookingId: string;
  token: string;
  guestName: string;
  roomNumber: string;
  loginId: string;
  password: string;
  email?: string | null;
  idNumber?: string | null;
  contact?: string | null;
  address?: string | null;
}): GuestAccessPayload {
  return {
    type: "aegis-guest-access",
    version: 1,
    bookingId: params.bookingId,
    token: params.token,
    guestName: params.guestName,
    roomNumber: params.roomNumber,
    loginId: params.loginId,
    password: params.password,
    email: params.email ?? null,
    idNumber: params.idNumber ?? null,
    contact: params.contact ?? null,
    address: params.address ?? null,
  };
}

export function serializeGuestAccessPayload(payload: GuestAccessPayload) {
  return JSON.stringify(payload);
}
