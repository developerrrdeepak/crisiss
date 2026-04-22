import { randomBytes } from "crypto";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateStaffPassword() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join("");
}

export function generateStaffEmployeeId() {
  const numericPart = (randomBytes(2).readUInt16BE(0) % 9000) + 1000;
  return `AEGIS-${numericPart}`;
}
