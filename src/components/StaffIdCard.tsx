"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildStaffLoginPath } from "@/lib/staff-qr";

export interface StaffIdCardData {
  name: string;
  employeeId?: string | null;
  role: string;
  department?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  bloodGroup?: string | null;
  joiningDate?: string | Date | null;
  validTill?: string | Date | null;
  photoUrl?: string | null;
}

export function formatStaffDisplayDate(value?: string | Date | null) {
  if (!value) return "-";

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export function getStaffInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "AG"
  );
}

export function StaffIdCard({
  staff,
  back = false,
  className = "",
}: {
  staff: StaffIdCardData;
  back?: boolean;
  className?: string;
}) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (!staff.employeeId || typeof window === "undefined") {
      setQrCodeUrl("");
      return;
    }

    const loginUrl = `${window.location.origin}${buildStaffLoginPath(staff.employeeId)}`;

    void QRCode.toDataURL(loginUrl, {
      width: 96,
      margin: 1,
      color: {
        dark: "#0f0f0f",
        light: "#f8ebc9",
      },
    }).then(setQrCodeUrl).catch((error) => {
      console.error("Failed to generate staff QR code:", error);
      setQrCodeUrl("");
    });
  }, [staff.employeeId]);

  const avatarStyle = staff.photoUrl
    ? {
        backgroundImage: `url(${staff.photoUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[#d8b15f]/50 p-5 text-[#f3d18a] shadow-[0_18px_40px_rgba(0,0,0,0.35)] ${className}`}
      style={{
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 24%), linear-gradient(145deg, #1f1a12 0%, #090909 48%, #151515 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,215,140,0.12) 1px, transparent 0)",
          backgroundSize: "10px 10px",
        }}
      />
      <div className="relative z-10">
        <div className="mx-auto mb-5 h-4 w-28 rounded-full bg-white/95 shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
        <div className="mb-5 border-t border-[#d8b15f]/60 pt-5" />

        {!back ? (
          <>
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d8b15f]/70 bg-[#d8b15f]/10 text-4xl font-black">
                A
              </div>
              <p className="text-[40px] font-black tracking-[0.2em]">AEGIS</p>
              <p className="text-sm italic text-[#f5dfab]">Excellence in Hospitality</p>
            </div>

            <div className="my-5 border-t border-[#d8b15f]/60" />

            <div className="grid grid-cols-[108px_1fr] gap-4">
              <div
                className="flex h-[148px] items-center justify-center rounded-2xl border border-[#d8b15f]/70 bg-[#f8ebc9] text-3xl font-black text-[#1b1712]"
                style={avatarStyle}
              >
                {!staff.photoUrl && getStaffInitials(staff.name)}
              </div>
              <div className="space-y-2">
                <p className="text-[28px] font-bold leading-tight">{staff.name}</p>
                <div className="border-t border-[#d8b15f]/35 pt-2 text-sm leading-6 text-[#f5dfab]">
                  <p>
                    <span className="font-semibold text-[#f3d18a]">Employee ID:</span>{" "}
                    {staff.employeeId || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-[#f3d18a]">Designation:</span>{" "}
                    {staff.role}
                  </p>
                  <p>
                    <span className="font-semibold text-[#f3d18a]">Department:</span>{" "}
                    {staff.department || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-[#f3d18a]">Date of Joining:</span>{" "}
                    {formatStaffDisplayDate(staff.joiningDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="my-5 border-t border-[#d8b15f]/60" />

            <div className="text-center">
              <p className="text-2xl font-semibold italic">Aegis Grand Hotel</p>
              <p className="mt-2 text-sm text-[#f5dfab]">Operations Identity Card</p>
              <p className="mt-3 text-sm text-[#f3d18a]">Contact: {staff.phone || "-"}</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-5 pt-3 text-center">
              <div className="border-b border-[#d8b15f]/40 pb-4">
                <p className="text-lg font-semibold">
                  Emergency Contact: {staff.emergencyContact || "-"}
                </p>
              </div>
              <div className="border-b border-[#d8b15f]/40 pb-4">
                <p className="text-lg font-semibold">Blood Group: {staff.bloodGroup || "-"}</p>
              </div>
              <div className="border-b border-[#d8b15f]/40 pb-4">
                <p className="text-lg font-semibold">
                  Valid Till: {formatStaffDisplayDate(staff.validTill)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-3xl border border-[#d8b15f]/25 bg-[#f8ebc9]/[0.06] p-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#f3d18a]/80">
                  Staff QR Access
                </p>
                <p className="mt-2 text-sm font-semibold text-[#f8ebc9]">
                  Scan to open staff login
                </p>
                <p className="mt-1 text-xs text-[#f5dfab]/80">
                  Employee ID: {staff.employeeId || "-"}
                </p>
              </div>
              <div className="flex h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-2xl bg-[#f8ebc9] p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
                {qrCodeUrl ? (
                  <Image
                    src={qrCodeUrl}
                    alt={`Staff login QR for ${staff.employeeId || staff.name}`}
                    className="h-full w-full rounded-xl object-cover"
                    width={78}
                    height={78}
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full rounded-xl border border-dashed border-[#1b1712]/25" />
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-[#d8b15f]/40 pt-8 text-center text-xl italic leading-9 text-[#f5dfab]">
              <p>&quot;This card is property of Aegis.&quot;</p>
              <p>If found, please return to reception.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
