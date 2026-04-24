"use client";

import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";

type RoomState = "vacant" | "occupied" | "cleaning" | "maintenance";

type Room = {
  id: string;
  num: string;
  state: RoomState;
  guestName?: string;
  guestId?: string;
  floor: number;
  type: string;
};

type BookingForm = {
  guestName: string;
  email: string;
  idNumber: string;
  contactNumber: string;
  address: string;
  nights: string;
};

type BookingResult = {
  id: string;
  name: string;
  roomNumber: string;
  loginToken: string;
  loginId: string;
  password: string;
  email: string;
  qrPayload: string;
  idNumber: string | null;
  contact: string | null;
  address: string | null;
  checkOut: string | null;
};

const DEFAULT_FORM: BookingForm = {
  guestName: "",
  email: "",
  idNumber: "",
  contactNumber: "",
  address: "",
  nights: "1",
};

function getStatusColor(state: RoomState) {
  switch (state) {
    case "vacant":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "occupied":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "cleaning":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "maintenance":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  }
}

export default function AdminRooms() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>(DEFAULT_FORM);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const floors = useMemo(
    () => [...new Set(rooms.map((room) => room.floor))].sort((left, right) => left - right),
    [rooms]
  );
  const floorRooms = rooms.filter((room) => room.floor === selectedFloor);
  const vacantCount = floorRooms.filter((room) => room.state === "vacant").length;
  const occupiedCount = floorRooms.filter((room) => room.state === "occupied").length;

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch("/api/admin/rooms", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setRooms([]);
        setErrorMessage(data.error || "Failed to load room allocation.");
        return;
      }

      const nextRooms = (data.rooms || []) as Room[];
      setRooms(nextRooms);

      if (nextRooms.length > 0) {
        const nextFloors = [...new Set(nextRooms.map((room) => room.floor))].sort(
          (left, right) => left - right
        );
        setSelectedFloor((currentFloor) =>
          nextFloors.includes(currentFloor) ? currentFloor : nextFloors[0]
        );

        if (selectedRoom) {
          const latestSelection =
            nextRooms.find((room) => room.id === selectedRoom.id) ?? null;
          setSelectedRoom(latestSelection);
        }
      } else {
        setSelectedRoom(null);
      }
    } catch (error) {
      console.error("Failed to load rooms:", error);
      setRooms([]);
      setErrorMessage("Failed to load room allocation.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRooms();
  }, []);

  const resetBookingForm = () => {
    setBookingForm(DEFAULT_FORM);
    setIsAssigning(false);
  };

  const updateRoomStatus = async (roomId: string, status: RoomState) => {
    try {
      setBusyRoomId(roomId);
      setFeedback(null);
      setErrorMessage(null);

      const res = await fetch("/api/admin/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStatus",
          roomId,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to update room status.");
        return;
      }

      setFeedback("Room status updated.");
      await fetchRooms();
    } catch (error) {
      console.error("Failed to update room status:", error);
      setErrorMessage("Failed to update room status.");
    } finally {
      setBusyRoomId(null);
    }
  };

  const assignGuest = async () => {
    if (!selectedRoom) return;

    try {
      setIsAssigning(true);
      setErrorMessage(null);
      setFeedback(null);

      const res = await fetch("/api/admin/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          roomNumber: selectedRoom.num,
          guestName: bookingForm.guestName,
          email: bookingForm.email,
          idNumber: bookingForm.idNumber,
          contactNumber: bookingForm.contactNumber,
          address: bookingForm.address,
          nights: bookingForm.nights,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.details || data.error || "Failed to create booking.");
        return;
      }

      const nextBooking = data.booking as BookingResult;
      const qrValue = nextBooking.qrPayload || JSON.stringify({
        type: "aegis-guest-access",
        token: nextBooking.loginToken,
        loginId: nextBooking.loginId,
        password: nextBooking.password,
        email: nextBooking.email,
        guestName: nextBooking.name,
        roomNumber: nextBooking.roomNumber,
        idNumber: nextBooking.idNumber,
        contact: nextBooking.contact,
        address: nextBooking.address,
      });
      const qrDataUrl = await QRCode.toDataURL(qrValue, {
        errorCorrectionLevel: "H",
        margin: 1,
        color: { dark: "#0A1020", light: "#FFFFFF" },
        width: 240,
      });

      setQrCodeUrl(qrDataUrl);
      setBookingResult(nextBooking);
      setShowAssignModal(false);
      setShowSuccessModal(true);
      resetBookingForm();
      setFeedback("Guest allocated and credentials generated.");
      await fetchRooms();
    } catch (error) {
      console.error("Failed to assign guest:", error);
      setErrorMessage("Failed to assign guest.");
    } finally {
      setIsAssigning(false);
    }
  };

  const printGuestPass = () => {
    if (!bookingResult || !qrCodeUrl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guest Access - ${bookingResult.name}</title>
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
          <div class="meta">Room ${bookingResult.roomNumber} | Booking ${bookingResult.id}</div>
          <div class="qr-wrapper">
            <img src="${qrCodeUrl}" alt="Guest QR Code" width="220" height="220" />
          </div>
          <div class="card">
            <div class="row"><div class="label">Guest Name</div><div class="value">${bookingResult.name}</div></div>
            <div class="row"><div class="label">Guest Email / Login ID</div><div class="value">${bookingResult.loginId}</div></div>
            <div class="row"><div class="label">Guest Password</div><div class="value">${bookingResult.password}</div></div>
            <div class="row"><div class="label">ID Number</div><div class="value">${bookingResult.idNumber ?? "-"}</div></div>
            <div class="row"><div class="label">Contact</div><div class="value">${bookingResult.contact ?? "-"}</div></div>
            <div class="row"><div class="label">Address</div><div class="value">${bookingResult.address ?? "-"}</div></div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 min-h-screen flex flex-col font-['Sora']">
      <DashboardHeader
        title="Room Allocation"
        userName="Administrator"
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Room Allocation</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  Assign guests with real DB-backed credentials, QR access, and saved personal details.
                </p>
              </div>
              <Link
                href="/admin/manage-rooms"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-[#f4f4f5] dark:hover:bg-[#18181b] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">settings</span>
                Manage Rooms
              </Link>
            </div>

            {feedback && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300">
                {feedback}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Rooms</p>
                <p className="text-2xl font-semibold mt-2">{rooms.length}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Vacant</p>
                <p className="text-2xl font-semibold mt-2 text-green-600 dark:text-green-400">{vacantCount}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Occupied</p>
                <p className="text-2xl font-semibold mt-2 text-red-600 dark:text-red-400">{occupiedCount}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Current Floor</p>
                <p className="text-2xl font-semibold mt-2">{selectedFloor}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-4">Floors</h3>
                <div className="space-y-2">
                  {floors.map((floor) => (
                    <button
                      key={floor}
                      onClick={() => setSelectedFloor(floor)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedFloor === floor ? "bg-[#175ead] text-white" : "hover:bg-[#f4f4f5] dark:hover:bg-[#18181b]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Floor {floor}</span>
                        <span className="text-xs opacity-75">
                          {rooms.filter((room) => room.floor === floor).length}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Floor {selectedFloor} Rooms</h3>
                  <button
                    onClick={() => void fetchRooms()}
                    className="rounded-lg border border-slate-200 dark:border-zinc-800/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {isLoading ? (
                  <div className="text-center py-12 text-slate-500 dark:text-zinc-400">Loading...</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {floorRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedRoom?.id === room.id
                            ? "border-[#175ead] bg-[#175ead]/5"
                            : `border-transparent ${getStatusColor(room.state)}`
                        }`}
                      >
                        <div className="text-2xl font-bold mb-1">{room.num}</div>
                        <div className="text-xs uppercase tracking-wider opacity-75">{room.state}</div>
                        {room.guestName && (
                          <div className="text-xs mt-2 truncate font-medium">{room.guestName}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-xl p-4">
                {selectedRoom ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Room {selectedRoom.num}</h3>
                      <p className="text-sm text-slate-500 dark:text-zinc-400">{selectedRoom.type}</p>
                    </div>
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor(selectedRoom.state)}`}>
                      {selectedRoom.state.toUpperCase()}
                    </div>
                    {selectedRoom.guestName && (
                      <div className="p-3 bg-[#f4f4f5] dark:bg-[#18181b] rounded-lg">
                        <p className="text-xs text-slate-500 dark:text-zinc-400">Guest</p>
                        <p className="font-medium mt-1">{selectedRoom.guestName}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Actions</p>
                      {selectedRoom.state === "vacant" && (
                        <button
                          onClick={() => {
                            resetBookingForm();
                            setShowAssignModal(true);
                          }}
                          className="w-full px-4 py-2 bg-[#175ead] text-white rounded-lg text-sm font-medium hover:bg-[#175ead]/90 transition-colors"
                        >
                          Allocate Guest
                        </button>
                      )}
                      {selectedRoom.state === "occupied" && (
                        <button
                          onClick={() => void updateRoomStatus(selectedRoom.id, "cleaning")}
                          disabled={busyRoomId === selectedRoom.id}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                          Check Out
                        </button>
                      )}
                      {selectedRoom.state === "cleaning" && (
                        <button
                          onClick={() => void updateRoomStatus(selectedRoom.id, "vacant")}
                          disabled={busyRoomId === selectedRoom.id}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                        >
                          Mark Clean
                        </button>
                      )}
                      {selectedRoom.state !== "maintenance" && (
                        <button
                          onClick={() => void updateRoomStatus(selectedRoom.id, "maintenance")}
                          disabled={busyRoomId === selectedRoom.id}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-zinc-800/80 rounded-lg text-sm font-medium hover:bg-[#f4f4f5] dark:hover:bg-[#18181b] transition-colors disabled:opacity-60"
                        >
                          Maintenance
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-zinc-400 text-sm">
                    Select a room to allocate a guest or manage room state.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showAssignModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-1">Allocate Guest to Room {selectedRoom.num}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-5">
                          Fill the guest profile. Login credentials and QR access will be generated automatically and saved in Firebase Data Connect.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Guest Name</label>
                <input
                  value={bookingForm.guestName}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-[#18181b] border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                  placeholder="Guest full name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Email</label>
                <input
                  type="email"
                  value={bookingForm.email}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-[#18181b] border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                  placeholder="guest@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">ID Number</label>
                <input
                  value={bookingForm.idNumber}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, idNumber: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-[#18181b] border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                  placeholder="Passport / Aadhaar / ID"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Contact Number</label>
                <input
                  value={bookingForm.contactNumber}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, contactNumber: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-[#18181b] border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Address</label>
                <textarea
                  value={bookingForm.address}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, address: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-[#18181b] border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors min-h-[96px]"
                  placeholder="Guest address"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Stay Duration (nights)</label>
                <input
                  type="number"
                  min="1"
                  value={bookingForm.nights}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, nights: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-[#18181b] border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => void assignGuest()}
                disabled={isAssigning}
                className="flex-1 px-4 py-3 bg-[#175ead] text-white rounded-lg text-sm font-medium hover:bg-[#175ead]/90 transition-colors disabled:opacity-60"
              >
                {isAssigning ? "Allocating..." : "Save Booking & Generate QR"}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  resetBookingForm();
                }}
                className="px-4 py-3 border border-slate-200 dark:border-zinc-800/80 rounded-lg text-sm font-medium hover:bg-[#f4f4f5] dark:hover:bg-[#18181b] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && bookingResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0a1628] to-[#050d1a] rounded-2xl max-w-md w-full p-8 border border-green-500/20">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 rounded-full bg-green-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center text-white mb-2">Guest Access Ready</h3>
            <p className="text-center text-green-400 text-sm mb-6">
              Room {bookingResult.roomNumber} | Booking {bookingResult.id}
            </p>
            <div className="bg-white rounded-xl p-4 mb-6 flex justify-center">
              {qrCodeUrl && (
                <Image
                  src={qrCodeUrl}
                  alt="Guest QR Code"
                  width={240}
                  height={240}
                  className="rounded-lg"
                />
              )}
            </div>
            <div className="space-y-3 mb-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Guest Name</p>
                <p className="text-white font-semibold">{bookingResult.name}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Guest Email / Login ID</p>
                <p className="text-white font-semibold text-sm break-all">{bookingResult.loginId}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Guest Password</p>
                <p className="text-white font-semibold">{bookingResult.password}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">Stored Personal Details</p>
                <p className="text-white text-sm leading-6">
                  Email: {bookingResult.email}<br />
                  ID: {bookingResult.idNumber ?? "-"}<br />
                  Contact: {bookingResult.contact ?? "-"}<br />
                  Address: {bookingResult.address ?? "-"}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={printGuestPass}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">print</span>
                Print Guest Pass
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(bookingResult.qrPayload)}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 border border-white/20"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                Copy QR Payload
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Return to Command Center
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
