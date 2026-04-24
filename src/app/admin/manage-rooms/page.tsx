"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";

type RoomState = "vacant" | "occupied" | "cleaning" | "maintenance";

interface Room {
  id: string;
  num: string;
  floor: number;
  type: string;
  state: RoomState;
  guestName?: string;
  guestId?: string;
}

const ROOM_STATE_OPTIONS: RoomState[] = [
  "vacant",
  "occupied",
  "cleaning",
  "maintenance",
];

const DEFAULT_FORM = {
  number: "",
  floor: "1",
  type: "Deluxe King Suite",
};

function getStatusBadgeClass(state: RoomState) {
  switch (state) {
    case "occupied":
      return "bg-slate-900/10 text-slate-700 dark:bg-white/10 dark:text-white";
    case "cleaning":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "maintenance":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "bg-green-500/10 text-green-600 dark:text-green-400";
  }
}

export default function ManageRooms() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = editingRoomId !== null;
  const vacantRooms = rooms.filter((room) => room.state === "vacant").length;
  const occupiedRooms = rooms.filter((room) => room.state === "occupied").length;
  const serviceRooms = rooms.filter(
    (room) => room.state === "cleaning" || room.state === "maintenance"
  ).length;

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch("/api/admin/rooms", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setRooms([]);
        setErrorMessage(data.error || "Failed to fetch room inventory.");
        return;
      }

      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRooms([]);
      setErrorMessage("Failed to fetch room inventory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRooms();
  }, []);

  const resetForm = () => {
    setEditingRoomId(null);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        number: form.number.trim(),
        floor: form.floor,
        type: form.type.trim(),
      };

      const res = await fetch("/api/admin/rooms", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                action: "updateDetails",
                roomId: editingRoomId,
                ...payload,
              }
            : payload
        ),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to save room.");
        return;
      }

      setFeedback(isEditing ? "Room details updated." : "Room added to inventory.");
      resetForm();
      await fetchRooms();
    } catch (error) {
      console.error("Failed to save room:", error);
      setErrorMessage("Failed to save room.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (room: Room) => {
    setFeedback(null);
    setErrorMessage(null);
    setEditingRoomId(room.id);
    setForm({
      number: room.num,
      floor: String(room.floor),
      type: room.type,
    });
  };

  const handleStatusChange = async (roomId: string, nextState: RoomState) => {
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
          status: nextState,
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

  const handleDelete = async (room: Room) => {
    const confirmed = window.confirm(`Delete room ${room.num} from inventory?`);

    if (!confirmed) {
      return;
    }

    try {
      setBusyRoomId(room.id);
      setFeedback(null);
      setErrorMessage(null);

      const res = await fetch(`/api/admin/rooms?roomId=${encodeURIComponent(room.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to delete room.");
        return;
      }

      if (editingRoomId === room.id) {
        resetForm();
      }

      setFeedback(`Room ${room.num} removed from inventory.`);
      await fetchRooms();
    } catch (error) {
      console.error("Failed to delete room:", error);
      setErrorMessage("Failed to delete room.");
    } finally {
      setBusyRoomId(null);
    }
  };
  return (
    <div className="bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 min-h-screen flex flex-col font-['Sora'] relative">
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.08) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />
      <DashboardHeader
        title="Room Inventory"
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

        <main className="flex-1 overflow-auto p-4 md:p-10 w-full max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light tracking-tight">Manage Rooms</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
                Create rooms, update inventory details, and control operational status from one panel.
              </p>
            </div>
            <Link
              href="/admin/rooms"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-800/80 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-white hover:bg-white dark:hover:bg-[#121212] transition-colors"
            >
              <span className="material-symbols-outlined text-base">meeting_room</span>
              Open Allocation
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5">
              <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-zinc-400">Total Rooms</p>
              <p className="text-3xl font-light tracking-tight mt-3">{rooms.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5">
              <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-zinc-400">Vacant</p>
              <p className="text-3xl font-light tracking-tight mt-3">{vacantRooms}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5">
              <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-zinc-400">Occupied</p>
              <p className="text-3xl font-light tracking-tight mt-3">{occupiedRooms}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5">
              <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-zinc-400">Service States</p>
              <p className="text-3xl font-light tracking-tight mt-3">{serviceRooms}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_420px] gap-8">
            <section className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-zinc-800/80">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Property Room List</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Inventory edits update the allocation board automatically.
                  </p>
                </div>
                <button
                  onClick={() => void fetchRooms()}
                  className="rounded-lg border border-slate-200 dark:border-zinc-800/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors"
                >
                  Refresh
                </button>
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

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-800/80 text-zinc-400 text-[10px] uppercase tracking-[0.24em]">
                      <th className="font-medium pb-4 pl-4">Room</th>
                      <th className="font-medium pb-4">Floor</th>
                      <th className="font-medium pb-4">Type</th>
                      <th className="font-medium pb-4">Guest</th>
                      <th className="font-medium pb-4">Status</th>
                      <th className="font-medium pb-4 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f4f4f5] dark:divide-[#27272a]">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-slate-500">
                          Loading room inventory...
                        </td>
                      </tr>
                    ) : rooms.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                          No rooms in inventory yet. Add the first room from the panel on the right.
                        </td>
                      </tr>
                    ) : (
                      rooms.map((room) => {
                        const roomBusy = busyRoomId === room.id;

                        return (
                          <tr key={room.id}>
                            <td className="py-4 pl-4 font-semibold text-slate-900 dark:text-white">
                              {room.num}
                            </td>
                            <td className="py-4 text-slate-500 dark:text-zinc-400">{room.floor}</td>
                            <td className="py-4 text-slate-500 dark:text-zinc-400">{room.type}</td>
                            <td className="py-4">
                              {room.guestName ? (
                                <span className="font-medium text-slate-900 dark:text-white">{room.guestName}</span>
                              ) : (
                                <span className="text-slate-500 dark:text-zinc-400">Unassigned</span>
                              )}
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${getStatusBadgeClass(room.state)}`}
                                  >
                                    {room.state}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 tracking-wide">visible to guest</span>
                                </div>
                                <select
                                  value={room.state}
                                  disabled={roomBusy}
                                  onChange={(event) =>
                                    void handleStatusChange(room.id, event.target.value as RoomState)
                                  }
                                  className="rounded-lg border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#121212] px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none disabled:opacity-60"
                                >
                                  {ROOM_STATE_OPTIONS.map((state) => (
                                    <option
                                      key={state}
                                      value={state}
                                      disabled={state === "occupied" && !room.guestName && room.state !== "occupied"}
                                    >
                                      {state}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(room)}
                                  disabled={roomBusy}
                                  className="rounded-lg border border-slate-200 dark:border-zinc-800/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors disabled:opacity-60"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => void handleDelete(room)}
                                  disabled={roomBusy}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                                >
                                  {roomBusy ? "Working" : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm h-fit">
              <div className="mb-6 pb-4 border-b border-slate-200 dark:border-zinc-800/80">
                <h2 className="text-lg font-semibold tracking-tight">
                  {isEditing ? "Edit Room" : "Add New Room"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {isEditing
                    ? "Update the room metadata below. Status changes stay available in the inventory table."
                    : "New rooms enter the inventory as vacant and immediately appear in room allocation."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.24em]">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, number: event.target.value }))
                    }
                    required
                    placeholder="201"
                    className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.24em]">
                    Floor
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.floor}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, floor: event.target.value }))
                    }
                    required
                    className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.24em]">
                    Room Type
                  </label>
                  <input
                    type="text"
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, type: event.target.value }))
                    }
                    required
                    className="mt-2 w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-transparent focus:border-[#175ead] px-4 py-3 text-sm outline-none transition-colors"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-800/80 p-4 text-xs text-slate-500 dark:text-zinc-400 leading-6">
                  Use Room Allocation to assign guests. Inventory status changes here are best for vacant,
                  cleaning, and maintenance control.
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[#09090b] dark:bg-white text-white dark:text-slate-900 font-bold py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : isEditing
                        ? "Update Room"
                        : "Add to Inventory"}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-slate-200 dark:border-zinc-800/80 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
