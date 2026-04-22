"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";

interface BookingGuestDetails {
  id: string;
  name: string;
  room: string;
  email: string;
  loginToken: string;
  loginEmail: string;
  loginPassword: string;
  idNumber: string | null;
  contact: string | null;
  address: string | null;
  qrPayload: string;
}

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default function BookingConfirmationPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.bookingId;

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [guest, setGuest] = useState<BookingGuestDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuestAndGenerateQR = async () => {
      try {
        setError(null);

        const res = await fetch(`/api/guest/details?id=${bookingId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.success || !data.guest) {
          throw new Error(data.error || "Failed to load booking details.");
        }

        const nextGuest = data.guest as BookingGuestDetails;
        const qrValue =
          nextGuest.qrPayload ||
          JSON.stringify({
            type: "aegis-guest-access",
            token: nextGuest.loginToken,
            loginId: nextGuest.loginEmail,
            password: nextGuest.loginPassword,
            email: nextGuest.email,
            guestName: nextGuest.name,
            roomNumber: nextGuest.room,
            idNumber: nextGuest.idNumber,
            contact: nextGuest.contact,
            address: nextGuest.address,
          });

        const dataUrl = await QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: "H",
          margin: 1,
          color: { dark: "#08111f", light: "#FFFFFF" },
          width: 240,
        });

        setGuest(nextGuest);
        setQrCodeUrl(dataUrl);
      } catch (nextError) {
        console.error("Failed to load booking confirmation:", nextError);
        setError(nextError instanceof Error ? nextError.message : "Failed to load booking details.");
      }
    };

    void fetchGuestAndGenerateQR();
  }, [bookingId]);

  const printGuestPass = () => {
    if (!guest || !qrCodeUrl) {
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guest Access - ${guest.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            .title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
            .meta { color: #16a34a; font-size: 14px; margin-bottom: 20px; }
            .qr-wrapper { text-align: center; margin: 24px 0; }
            .card { background: #f3f4f6; padding: 20px; border-radius: 12px; margin-top: 20px; }
            .row { margin-bottom: 12px; }
            .label { font-size: 11px; text-transform: uppercase; color: #6b7280; }
            .value { font-size: 15px; font-weight: 700; margin-top: 4px; word-break: break-word; }
          </style>
        </head>
        <body>
          <div class="title">Guest Access Provisioned</div>
          <div class="meta">Room ${guest.room} | Booking ${guest.id}</div>
          <div class="qr-wrapper">
            <img src="${qrCodeUrl}" alt="Guest QR Code" width="220" height="220" />
          </div>
          <div class="card">
            <div class="row"><div class="label">Guest Name</div><div class="value">${guest.name}</div></div>
            <div class="row"><div class="label">Guest Email / Login ID</div><div class="value">${guest.loginEmail || guest.email || "-"}</div></div>
            <div class="row"><div class="label">Guest Password</div><div class="value">${guest.loginPassword || "-"}</div></div>
            <div class="row"><div class="label">ID Number</div><div class="value">${guest.idNumber ?? "-"}</div></div>
            <div class="row"><div class="label">Contact</div><div class="value">${guest.contact ?? "-"}</div></div>
            <div class="row"><div class="label">Address</div><div class="value">${guest.address ?? "-"}</div></div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-[#0b0f19] text-white min-h-screen flex flex-col font-['Sora'] relative selection:bg-green-500/30">
      <div className="absolute inset-0 z-0 opacity-20 tactical-grid pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <DashboardHeader
        title="Booking Confirmation"
        userName="Administrator"
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden pt-16 relative z-10">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 flex items-center justify-center">
          <div className="w-full max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-green-400">verified</span>
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">
                    Guest Access Ready
                  </h1>
                  <p className="font-mono text-xs md:text-sm text-green-400/80 tracking-[0.2em] uppercase mt-1">
                    Reservation ID: BK-{bookingId.substring(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : guest ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Guest Name</p>
                    <p className="mt-2 text-lg font-semibold">{guest.name}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Room</p>
                    <p className="mt-2 text-lg font-semibold">{guest.room || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Guest Email / Login ID</p>
                    <p className="mt-2 text-sm font-semibold break-all">{guest.loginEmail || guest.email || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Guest Password</p>
                    <p className="mt-2 text-lg font-semibold">{guest.loginPassword || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">ID Number</p>
                    <p className="mt-2 text-sm font-semibold break-all">{guest.idNumber || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Contact</p>
                    <p className="mt-2 text-sm font-semibold break-all">{guest.contact || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Address</p>
                    <p className="mt-2 text-sm font-semibold break-words">{guest.address || "-"}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                  Loading booking details...
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={printGuestPass}
                  disabled={!guest || !qrCodeUrl}
                  className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#0b0f19] font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.2)] active:scale-95 text-xs uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined text-lg">print</span>
                  Print Guest Pass
                </button>
                <Link
                  href="/admin/rooms"
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  Command Center
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl flex flex-col items-center justify-center">
              <div className="bg-white p-4 rounded-[1.5rem]">
                {qrCodeUrl ? (
                  <Image
                    src={qrCodeUrl}
                    alt="Guest Login QR Code"
                    width={240}
                    height={240}
                    className="rounded-xl"
                  />
                ) : (
                  <div className="w-[240px] h-[240px] bg-gray-200 animate-pulse rounded-xl flex items-center justify-center text-black font-bold text-xs uppercase tracking-widest">
                    Generating QR...
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mt-5 text-center">
                QR contains guest access token, login credentials, and saved personal details
              </p>

              {guest?.qrPayload && (
                <button
                  onClick={() => navigator.clipboard.writeText(guest.qrPayload)}
                  className="mt-6 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-colors"
                >
                  Copy QR Payload
                </button>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
