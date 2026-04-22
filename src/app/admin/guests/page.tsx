"use client";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useState, useEffect, useMemo, useRef, FormEvent } from "react";
import QRCode from "qrcode";
import Image from "next/image";

interface Guest {
  id: string;
  name: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
  idNumber: string | null;
  contact: string | null;
  address: string | null;
  loginEmail: string | null;
  loginPassword: string | null;
  roomId: string | null;
}

interface Room {
  id: string;
  num: string;
  floor: number;
  type: string;
  state: "vacant" | "occupied" | "cleaning" | "maintenance";
  guestName?: string;
}

interface BookingResult {
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
}

const DEFAULT_FORM = {
  guestName: "", email: "", idNumber: "", contactNumber: "",
  address: "", age: "", nights: "1", roomId: "",
};

// ── Trie for O(prefix-length) search ──────────────────────────────────────────
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  guestIds: Set<string> = new Set();
}

class GuestTrie {
  private root = new TrieNode();

  insert(key: string, id: string) {
    const lower = key.toLowerCase();
    let node = this.root;
    for (const ch of lower) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch)!;
      node.guestIds.add(id);
    }
  }

  search(prefix: string): Set<string> {
    const lower = prefix.toLowerCase();
    let node = this.root;
    for (const ch of lower) {
      if (!node.children.has(ch)) return new Set();
      node = node.children.get(ch)!;
    }
    return node.guestIds;
  }
}

function buildTrie(guests: Guest[]): GuestTrie {
  const trie = new GuestTrie();
  for (const g of guests) {
    trie.insert(g.name, g.id);
    if (g.email) trie.insert(g.email, g.id);
    if (g.room) trie.insert(g.room, g.id);
    if (g.contact) trie.insert(g.contact, g.id);
    if (g.idNumber) trie.insert(g.idNumber, g.id);
  }
  return trie;
}
// ──────────────────────────────────────────────────────────────────────────────

function getRoomStatusBadge(state: string) {
  switch (state) {
    case "occupied": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "cleaning": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "maintenance": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    default: return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
}

function getGuestStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "in room" || s === "checked in") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
  if (s === "checked out") return "bg-slate-100 dark:bg-[#27272a] text-slate-500 dark:text-slate-400 border border-transparent";
  return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20";
}

function GuestRow({ g, onView }: { g: Guest; onView: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? "rgba(139,92,246,0.07)" : "transparent",
        borderLeft: hovered ? "3px solid #7c3aed" : "3px solid transparent",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
        cursor: "pointer",
      }}
    >
      <td className="py-4 pl-6">
        <div className="flex items-center gap-3">
          <div
            style={{
              transform: hovered ? "scale(1.12)" : "scale(1)",
              boxShadow: hovered ? "0 4px 12px rgba(139,92,246,0.3)" : "none",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-200 dark:border-violet-800 flex items-center justify-center font-bold text-xs text-violet-700 dark:text-violet-300"
          >
            {g.name ? g.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <p style={{ color: hovered ? "#7c3aed" : undefined }} className="font-semibold text-[#09090b] dark:text-white transition-colors duration-150">{g.name}</p>
            <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">{g.email || "—"}</p>
          </div>
        </div>
      </td>
      <td className="py-4 font-semibold text-[#09090b] dark:text-white">{g.room || "—"}</td>
      <td className="py-4 text-[#71717a] dark:text-[#a1a1aa] text-xs">{g.contact || "—"}</td>
      <td className="py-4 font-mono text-xs text-[#71717a] dark:text-[#a1a1aa]">{g.checkOut ? new Date(g.checkOut).toLocaleDateString() : "N/A"}</td>
      <td className="py-4">
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${getGuestStatusBadge(g.status)}`}>
          {g.status || "Booked"}
        </span>
      </td>
      <td className="py-4 pr-6 text-right">
        <button
          onClick={onView}
          style={{
            backgroundColor: hovered ? "rgba(139,92,246,0.08)" : "transparent",
            borderColor: hovered ? "#7c3aed" : undefined,
            color: hovered ? "#7c3aed" : undefined,
            transition: "all 0.15s ease",
          }}
          className="rounded-lg border border-[#e4e4e7] dark:border-[#27272a] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
        >
          View
        </button>
      </td>
    </tr>
  );
}

export default function AdminGuests() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [guestRes, roomRes] = await Promise.all([
        fetch("/api/admin/guests", { cache: "no-store" }),
        fetch("/api/admin/rooms", { cache: "no-store" }),
      ]);
      const [guestJson, roomJson] = await Promise.all([guestRes.json(), roomRes.json()]);
      if (guestJson.success) setGuests(guestJson.guests || []);
      if (roomJson.success) setRooms(roomJson.rooms || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  // Build trie whenever guests list changes — O(total chars across all fields)
  const trie = useMemo(() => buildTrie(guests), [guests]);

  // Filter using trie — O(query length) lookup
  const filteredGuests = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return guests;
    const matchIds = trie.search(q);
    return guests.filter(g => matchIds.has(g.id));
  }, [searchQuery, guests, trie]);

  const vacantRooms = rooms.filter((r) => r.state === "vacant");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const selectedRoom = rooms.find((r) => r.id === form.roomId);
      const res = await fetch("/api/admin/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: form.roomId, roomNumber: selectedRoom?.num ?? "",
          guestName: form.guestName, email: form.email,
          idNumber: form.idNumber, contactNumber: form.contactNumber,
          address: form.address, nights: form.nights,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setErrorMessage(data.details || data.error || "Failed to create guest."); return; }
      const result = data.booking as BookingResult;
      const qrValue = result.qrPayload || JSON.stringify({ loginId: result.loginId, password: result.password });
      const qrDataUrl = await QRCode.toDataURL(qrValue, { errorCorrectionLevel: "H", margin: 1, color: { dark: "#0A1020", light: "#FFFFFF" }, width: 240 });
      setQrCodeUrl(qrDataUrl);
      setBookingResult(result);
      setShowAddModal(false);
      setShowSuccessModal(true);
      setForm(DEFAULT_FORM);
      setFeedback("Guest added and credentials generated.");
      await fetchData();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to create guest.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = [
    { label: "Total Guests", val: guests.length, icon: "groups", gradient: "from-violet-500/10 to-purple-500/5" },
    { label: "In Room", val: guests.filter(g => g.status.toLowerCase() === "in room").length, icon: "meeting_room", gradient: "from-emerald-500/10 to-green-500/5" },
    { label: "Checked Out", val: guests.filter(g => g.status.toLowerCase() === "checked out").length, icon: "logout", gradient: "from-slate-500/10 to-gray-500/5" },
    { label: "Booked", val: guests.filter(g => g.status.toLowerCase() === "booked").length, icon: "bookmark", gradient: "from-blue-500/10 to-sky-500/5" },
  ];

  return (
    <div className="bg-[#fafafa] dark:bg-[#0a0a0a] text-[#09090b] dark:text-[#e5e2e1] min-h-screen flex flex-col font-['Sora'] relative overflow-hidden">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-500/6 via-purple-500/4 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-500/6 via-cyan-500/4 to-transparent blur-3xl" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.07) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      <DashboardHeader title="Guest Registry" userName="Administrator" role="Director of Operations" onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)} />

      <div className="flex flex-1 overflow-hidden relative z-10 h-[calc(100vh-64px)] pt-16">
        <AdminSidebar sidebarExpanded={sidebarExpanded} setSidebarExpanded={setSidebarExpanded} sidebarMobileOpen={sidebarMobileOpen} setSidebarMobileOpen={setSidebarMobileOpen} />

        <main className="flex-1 overflow-auto p-4 md:p-10 w-full max-w-[1600px] mx-auto">

          {/* Header row */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">Guest Details</h1>
              <p className="text-sm text-[#71717a] dark:text-[#a1a1aa] mt-2">Manage guest profiles, credentials, and room assignments.</p>
            </div>
            <button
              onClick={() => { setErrorMessage(null); setForm(DEFAULT_FORM); setShowAddModal(true); }}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#09090b] to-[#1a1a1a] dark:from-white dark:to-slate-100 text-white dark:text-[#09090b] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:scale-110">person_add</span>
              Add Guest
            </button>
          </div>

          {feedback && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-green-950/20 dark:text-emerald-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
              {feedback}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className={`group relative rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] bg-gradient-to-br ${s.gradient} bg-white dark:bg-[#0f0f0f] p-5 overflow-hidden hover:border-[#d4d4d8] dark:hover:border-[#3f3f46] hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-200 cursor-default`}>
                <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-40 transition-opacity duration-200">
                  <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                </div>
                <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-[#a1a1aa]">{s.label}</p>
                <p className="text-3xl font-light tracking-tight mt-3">{s.val}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="bg-white dark:bg-[#0f0f0f] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl shadow-sm overflow-hidden">
            {/* Table header with search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-[#e4e4e7] dark:border-[#27272a] bg-gradient-to-r from-white to-[#fafafa] dark:from-[#0f0f0f] dark:to-[#111111]">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Guest Registry</h2>
                <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                  {filteredGuests.length} of {guests.length} guests
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Search — trie-powered */}
                <div className={`relative flex items-center transition-all duration-300 ${searchFocused ? "w-72" : "w-52"}`}>
                  <span className={`absolute left-3 material-symbols-outlined text-[18px] transition-colors duration-200 ${searchFocused ? "text-[#09090b] dark:text-white" : "text-[#a1a1aa]"}`}>
                    search
                  </span>
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Search name, room, ID…"
                    className="w-full rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#1a1a1a] pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#09090b] dark:focus:border-white transition-all duration-200 placeholder:text-[#a1a1aa]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
                <button onClick={() => void fetchData()} className="rounded-xl border border-[#e4e4e7] dark:border-[#27272a] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#fafafa] dark:hover:bg-[#18181b] hover:border-[#d4d4d8] dark:hover:border-[#3f3f46] transition-all duration-200">
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#e4e4e7] dark:border-[#27272a] text-[#a1a1aa] text-[10px] uppercase tracking-[0.24em] bg-[#fafafa]/50 dark:bg-[#111111]/50">
                    <th className="font-medium pb-3 pt-3 pl-6">Guest</th>
                    <th className="font-medium pb-3 pt-3">Room</th>
                    <th className="font-medium pb-3 pt-3">Contact</th>
                    <th className="font-medium pb-3 pt-3">Check-Out</th>
                    <th className="font-medium pb-3 pt-3">Status</th>
                    <th className="font-medium pb-3 pt-3 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4f4f5] dark:divide-[#1a1a1a]">
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-xs text-[#71717a]">
                      <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-[#e4e4e7] border-t-[#09090b] dark:border-t-white rounded-full animate-spin" />Loading guests...</span>
                    </td></tr>
                  ) : filteredGuests.length === 0 ? (
                    <tr><td colSpan={6} className="py-14 text-center">
                      <span className="material-symbols-outlined text-4xl text-[#e4e4e7] dark:text-[#27272a] block mb-3">person_search</span>
                      <p className="text-sm text-[#71717a] dark:text-[#a1a1aa]">{searchQuery ? `No guests match "${searchQuery}"` : "No guests yet. Add the first guest above."}</p>
                    </td></tr>
                  ) : (
                    filteredGuests.map((g) => (
                      <GuestRow key={g.id} g={g} onView={() => { setSelectedGuest(g); setShowDetailModal(true); }} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ADD GUEST MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-auto rounded-2xl bg-white dark:bg-[#0f0f0f] border border-[#e4e4e7] dark:border-[#27272a] shadow-2xl">
            <div className="flex items-start justify-between p-6 border-b border-[#e4e4e7] dark:border-[#27272a] bg-gradient-to-r from-white to-[#fafafa] dark:from-[#0f0f0f] dark:to-[#111111]">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Add Guest</h3>
                <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1">Fill in guest details. Login credentials will be auto-generated.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-full border border-[#e4e4e7] dark:border-[#27272a] p-2 text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#1a1a1a] hover:text-[#09090b] dark:hover:text-white transition-all duration-200">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:from-red-950/20 dark:to-rose-950/20 dark:text-red-300">{errorMessage}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Full Name *", key: "guestName", placeholder: "Guest full name", type: "text", required: true },
                  { label: "Email *", key: "email", placeholder: "guest@example.com", type: "email", required: true },
                  { label: "Govt. ID Number *", key: "idNumber", placeholder: "Passport / Aadhaar / Driving License", type: "text", required: true },
                  { label: "Age", key: "age", placeholder: "Guest age", type: "number", required: false },
                  { label: "Phone Number", key: "contactNumber", placeholder: "+91 98765 43210", type: "text", required: false },
                  { label: "Stay Duration (nights) *", key: "nights", placeholder: "1", type: "number", required: true },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-[10px] font-bold text-[#a1a1aa] uppercase tracking-[0.24em]">{field.label}</label>
                    <input
                      required={field.required} type={field.type}
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      min={field.type === "number" ? "1" : undefined}
                      className="mt-2 w-full rounded-xl bg-[#fafafa] dark:bg-[#1a1a1a] border border-transparent focus:border-[#09090b] dark:focus:border-white px-4 py-3 text-sm outline-none transition-all duration-200 hover:bg-white dark:hover:bg-[#222]"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#a1a1aa] uppercase tracking-[0.24em]">Address</label>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Guest home address" rows={2}
                  className="mt-2 w-full rounded-xl bg-[#fafafa] dark:bg-[#1a1a1a] border border-transparent focus:border-[#09090b] dark:focus:border-white px-4 py-3 text-sm outline-none transition-all duration-200 resize-none hover:bg-white dark:hover:bg-[#222]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#a1a1aa] uppercase tracking-[0.24em]">Assign Room *</label>
                <select required value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
                  className="mt-2 w-full rounded-xl bg-[#fafafa] dark:bg-[#1a1a1a] border border-transparent focus:border-[#09090b] dark:focus:border-white px-4 py-3 text-sm outline-none transition-all duration-200">
                  <option value="">Select a vacant room</option>
                  {vacantRooms.map(r => <option key={r.id} value={r.id}>Room {r.num} — Floor {r.floor} — {r.type}</option>)}
                </select>
                {vacantRooms.length === 0 && <p className="mt-2 text-xs text-[#71717a] dark:text-[#a1a1aa]">No vacant rooms available. Update room status in Manage Rooms first.</p>}
              </div>
              <div className="rounded-xl border border-dashed border-[#e4e4e7] dark:border-[#27272a] bg-gradient-to-r from-[#fafafa] to-white dark:from-[#111111] dark:to-[#0f0f0f] p-4 text-xs text-[#71717a] dark:text-[#a1a1aa] flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] mt-0.5 text-[#a1a1aa]">info</span>
                A unique login ID and password will be auto-generated for the guest portal.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#09090b] to-[#1a1a1a] dark:from-white dark:to-slate-100 text-white dark:text-[#09090b] font-bold py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-60 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5 transition-all duration-200">
                  {isSubmitting ? "Creating..." : "Create Guest & Generate Credentials"}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[#e4e4e7] dark:border-[#27272a] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#fafafa] dark:hover:bg-[#18181b] transition-all duration-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && bookingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[92vh] overflow-auto rounded-2xl bg-white dark:bg-[#0f0f0f] border border-[#e4e4e7] dark:border-[#27272a] shadow-2xl p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl text-emerald-500" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Guest Access Ready</h3>
              <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1">Room {bookingResult.roomNumber}</p>
            </div>
            {qrCodeUrl && (
              <div className="flex justify-center mb-5">
                <div className="rounded-xl border border-[#e4e4e7] dark:border-[#27272a] p-3 bg-white shadow-sm">
                  <Image src={qrCodeUrl} alt="Guest QR Code" width={180} height={180} className="rounded-lg" />
                </div>
              </div>
            )}
            <div className="space-y-2 mb-5">
              {[
                { label: "Guest Name", val: bookingResult.name },
                { label: "Login ID (Email)", val: bookingResult.loginId },
                { label: "Password", val: bookingResult.password },
                { label: "ID Number", val: bookingResult.idNumber ?? "—" },
                { label: "Contact", val: bookingResult.contact ?? "—" },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-gradient-to-r from-[#fafafa] to-white dark:from-[#1a1a1a] dark:to-[#111111] border border-[#e4e4e7] dark:border-[#27272a] px-4 py-3 hover:border-[#d4d4d8] dark:hover:border-[#3f3f46] transition-colors duration-150">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa]">{item.label}</p>
                  <p className="text-sm font-semibold mt-1 break-all">{item.val}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigator.clipboard.writeText(`Login ID: ${bookingResult.loginId}\nPassword: ${bookingResult.password}`)}
                className="flex-1 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#fafafa] dark:hover:bg-[#18181b] transition-all duration-200 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">content_copy</span>Copy Credentials
              </button>
              <button onClick={() => setShowSuccessModal(false)}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#09090b] to-[#1a1a1a] dark:from-white dark:to-slate-100 text-white dark:text-[#09090b] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5 transition-all duration-200">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST DETAIL MODAL */}
      {showDetailModal && selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-auto rounded-2xl bg-white dark:bg-[#0f0f0f] border border-[#e4e4e7] dark:border-[#27272a] shadow-2xl">
            <div className="flex items-start justify-between p-6 border-b border-[#e4e4e7] dark:border-[#27272a] bg-gradient-to-r from-white to-[#fafafa] dark:from-[#0f0f0f] dark:to-[#111111]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-200/50 dark:border-violet-800/30 flex items-center justify-center font-bold text-sm text-violet-700 dark:text-violet-300">
                  {selectedGuest.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{selectedGuest.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${getGuestStatusBadge(selectedGuest.status)}`}>
                    {selectedGuest.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="rounded-full border border-[#e4e4e7] dark:border-[#27272a] p-2 text-[#71717a] hover:bg-[#f4f4f5] dark:hover:bg-[#1a1a1a] hover:text-[#09090b] dark:hover:text-white transition-all duration-200">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-6 space-y-2">
              {selectedGuest.room && (() => {
                const assignedRoom = rooms.find(r => r.num === selectedGuest.room);
                return assignedRoom ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-gradient-to-r from-[#fafafa] to-white dark:from-[#1a1a1a] dark:to-[#111111] px-4 py-3 hover:border-[#d4d4d8] dark:hover:border-[#3f3f46] transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#71717a]">meeting_room</span>
                      <span className="text-sm font-semibold">Room {assignedRoom.num}</span>
                      <span className="text-xs text-[#71717a] dark:text-[#a1a1aa]">— {assignedRoom.type}</span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-widest ${getRoomStatusBadge(assignedRoom.state)}`}>
                      {assignedRoom.state}
                    </span>
                  </div>
                ) : null;
              })()}
              {[
                { label: "Email", val: selectedGuest.email || "—", icon: "mail" },
                { label: "Phone", val: selectedGuest.contact || "—", icon: "call" },
                { label: "Govt. ID", val: selectedGuest.idNumber || "—", icon: "badge" },
                { label: "Address", val: selectedGuest.address || "—", icon: "home" },
                { label: "Check-In", val: selectedGuest.checkIn ? new Date(selectedGuest.checkIn).toLocaleDateString() : "—", icon: "login" },
                { label: "Check-Out", val: selectedGuest.checkOut ? new Date(selectedGuest.checkOut).toLocaleDateString() : "—", icon: "logout" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-[#fafafa] to-white dark:from-[#1a1a1a] dark:to-[#111111] border border-[#e4e4e7] dark:border-[#27272a] px-4 py-3 hover:border-[#d4d4d8] dark:hover:border-[#3f3f46] hover:shadow-sm transition-all duration-200">
                  <span className="material-symbols-outlined text-[18px] text-[#a1a1aa] mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa]">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5 break-all">{item.val}</p>
                  </div>
                </div>
              ))}
              {(selectedGuest.loginEmail || selectedGuest.loginPassword) && (
                <div className="rounded-xl border border-dashed border-violet-200 dark:border-violet-800/40 bg-gradient-to-r from-violet-50/50 to-purple-50/30 dark:from-violet-950/10 dark:to-purple-950/10 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-400 mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">key</span>Portal Credentials
                  </p>
                  {selectedGuest.loginEmail && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#71717a] dark:text-[#a1a1aa]">Login ID</span>
                      <span className="text-xs font-semibold font-mono">{selectedGuest.loginEmail}</span>
                    </div>
                  )}
                  {selectedGuest.loginPassword && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#71717a] dark:text-[#a1a1aa]">Password</span>
                      <span className="text-xs font-semibold font-mono tracking-widest">{selectedGuest.loginPassword}</span>
                    </div>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(`Login ID: ${selectedGuest.loginEmail}\nPassword: ${selectedGuest.loginPassword}`)}
                    className="mt-2 w-full rounded-lg border border-violet-200 dark:border-violet-800/40 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>Copy Credentials
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
