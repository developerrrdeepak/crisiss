"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  formatStaffDisplayDate,
  getStaffInitials,
  StaffIdCard,
} from "@/components/StaffIdCard";
import { buildStaffLoginPath } from "@/lib/staff-qr";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  department: string;
  phone: string;
  emergencyContact: string;
  bloodGroup: string;
  joiningDate: string;
  validTill: string;
  photoUrl: string;
  sector: string;
  shift: string;
  st: string;
}

interface StaffRegistrationForm {
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  emergencyContact: string;
  bloodGroup: string;
  joiningDate: string;
  validTill: string;
  photoUrl: string;
}

interface StaffEditorForm extends StaffRegistrationForm {
  id: string;
  employeeId: string;
  status: string;
}

interface CreatedStaffAccess {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  emergencyContact: string;
  bloodGroup: string;
  joiningDate: string;
  validTill: string | null;
  photoUrl: string;
  status: string;
  loginId: string;
  password: string;
}

function formatInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function createDefaultForm(): StaffRegistrationForm {
  const today = new Date();
  const validTill = new Date(today);
  validTill.setFullYear(validTill.getFullYear() + 2);

  return {
    name: "",
    email: "",
    role: "Front Desk Executive",
    department: "Guest Services",
    phone: "",
    emergencyContact: "",
    bloodGroup: "B+",
    joiningDate: formatInputDate(today),
    validTill: formatInputDate(validTill),
    photoUrl: "",
  };
}

async function fetchStaffRoster() {
  const res = await fetch("/api/admin/staff", { cache: "no-store" });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to load staff roster.");
  }

  return (data.staff || []) as StaffMember[];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createEditorForm(member: StaffMember): StaffEditorForm {
  return {
    id: member.id,
    employeeId: member.employeeId,
    name: member.name,
    email: member.email,
    role: member.role,
    department: member.department,
    phone: member.phone,
    emergencyContact: member.emergencyContact,
    bloodGroup: member.bloodGroup,
    joiningDate: member.joiningDate ? member.joiningDate.slice(0, 10) : "",
    validTill: member.validTill ? member.validTill.slice(0, 10) : "",
    photoUrl: member.photoUrl,
    status: member.st || "Active",
  };
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function StaffRow({ member, onEdit }: { member: StaffMember; onEdit: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? "rgba(59,130,246,0.07)" : "transparent",
        borderLeft: hovered ? "3px solid #2563eb" : "3px solid transparent",
        transition: "background-color 0.15s ease, border-color 0.15s ease",
        cursor: "pointer",
      }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            style={{
              transform: hovered ? "scale(1.12)" : "scale(1)",
              boxShadow: hovered ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              ...(member.photoUrl ? { backgroundImage: `url(${member.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-200 dark:border-blue-800 text-sm font-bold text-blue-700 dark:text-blue-300"
          >
            {!member.photoUrl && getStaffInitials(member.name)}
          </div>
          <div>
            <p style={{ color: hovered ? "#2563eb" : undefined }} className="font-semibold text-[#09090b] dark:text-white transition-colors duration-150">{member.name}</p>
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">Joined {formatStaffDisplayDate(member.joiningDate)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 font-mono text-xs font-semibold text-[#71717a] dark:text-[#a1a1aa]">{member.employeeId || "-"}</td>
      <td className="px-4 py-4 text-[#09090b] dark:text-white">{member.role}</td>
      <td className="px-4 py-4 text-[#71717a] dark:text-[#a1a1aa]">{member.department || member.sector || "-"}</td>
      <td className="px-4 py-4 text-xs text-[#71717a] dark:text-[#a1a1aa]">{member.email || "-"}</td>
      <td className="px-4 py-4">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] border ${
          member.st.toLowerCase() === "active"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            : member.st.toLowerCase() === "inactive"
            ? "bg-slate-100 dark:bg-[#27272a] text-slate-500 dark:text-slate-400 border-transparent"
            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
        }`}>
          {member.st}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <button
          onClick={onEdit}
          style={{
            backgroundColor: hovered ? "rgba(59,130,246,0.08)" : "transparent",
            borderColor: hovered ? "#2563eb" : undefined,
            color: hovered ? "#2563eb" : undefined,
            transition: "all 0.15s ease",
          }}
          className="rounded-xl border border-[#e4e4e7] dark:border-[#27272a] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

export default function AdminStaff() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationForm, setRegistrationForm] = useState<StaffRegistrationForm>(() =>
    createDefaultForm()
  );
  const [editingStaff, setEditingStaff] = useState<StaffEditorForm | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [createdStaff, setCreatedStaff] = useState<CreatedStaffAccess | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const nextStaff = await fetchStaffRoster();
        if (!active) return;
        setStaff(nextStaff);
        setErrorMessage(null);
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to load staff roster.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const activeStaffCount = useMemo(
    () => staff.filter((member) => member.st.toLowerCase() !== "inactive").length,
    [staff]
  );
  const departmentCount = useMemo(
    () => new Set(staff.map((member) => member.department).filter(Boolean)).size,
    [staff]
  );

  const resetRegistrationForm = () => {
    setRegistrationForm(createDefaultForm());
    setIsSubmitting(false);
  };

  const resetEditForm = () => {
    setEditingStaff(null);
    setIsUpdating(false);
  };

  const refreshStaff = async () => {
    const nextStaff = await fetchStaffRoster();
    setStaff(nextStaff);
  };

  const handleRegisterStaff = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setFeedback(null);

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.staff) {
        setErrorMessage(data.error || "Failed to register staff.");
        return;
      }

      setCreatedStaff(data.staff as CreatedStaffAccess);
      setShowRegisterModal(false);
      setShowCardModal(true);
      resetRegistrationForm();
      setFeedback("Staff profile created, credentials generated, and digital ID prepared.");
      await refreshStaff();
    } catch (error) {
      console.error("Failed to register staff:", error);
      setErrorMessage("Failed to register staff.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRegistrationField = <K extends keyof StaffRegistrationForm>(
    key: K,
    value: StaffRegistrationForm[K]
  ) => {
    setRegistrationForm((current) => ({ ...current, [key]: value }));
  };

  const updateEditField = <K extends keyof StaffEditorForm>(key: K, value: StaffEditorForm[K]) => {
    setEditingStaff((current) => (current ? { ...current, [key]: value } : current));
  };

  const handlePhotoUpload = async (
    file: File | null,
    target: "register" | "edit"
  ) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage("Image must be smaller than 3 MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setErrorMessage(null);

      if (target === "register") {
        updateRegistrationField("photoUrl", dataUrl);
        return;
      }

      updateEditField("photoUrl", dataUrl);
    } catch (error) {
      console.error("Failed to load image:", error);
      setErrorMessage("Failed to load the selected image.");
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;

    try {
      setIsUpdating(true);
      setErrorMessage(null);
      setFeedback(null);

      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStaff),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.staff) {
        setErrorMessage(data.error || "Failed to update staff profile.");
        return;
      }

      setFeedback("Staff details updated successfully.");
      resetEditForm();
      await refreshStaff();
    } catch (error) {
      console.error("Failed to update staff:", error);
      setErrorMessage("Failed to update staff profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const copyCredentials = async () => {
    if (!createdStaff) return;

    await navigator.clipboard.writeText(
      `Staff Email: ${createdStaff.loginId}\nPassword: ${createdStaff.password}\nEmployee ID: ${createdStaff.employeeId}\nQR Login: ${window.location.origin}${buildStaffLoginPath(createdStaff.employeeId)}`
    );
  };

  const printStaffPacket = async () => {
    if (!createdStaff) return;

    let qrCodeMarkup = "";
    try {
      const loginUrl = `${window.location.origin}${buildStaffLoginPath(createdStaff.employeeId)}`;
      const qrCodeDataUrl = await QRCode.toDataURL(loginUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: "#111111",
          light: "#f8ebc9",
        },
      });
      qrCodeMarkup = `
        <div class="qr-box">
          <div class="qr-copy">
            <div class="qr-label">Staff QR Access</div>
            <div class="qr-caption">Scan to open staff login</div>
            <div class="qr-employee">Employee ID: ${escapeHtml(createdStaff.employeeId)}</div>
          </div>
          <img src="${qrCodeDataUrl}" alt="Staff Login QR" class="qr-image" />
        </div>
      `;
    } catch (error) {
      console.error("Failed to generate printable staff QR:", error);
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const safeName = escapeHtml(createdStaff.name);
    const safeEmployeeId = escapeHtml(createdStaff.employeeId);
    const safeRole = escapeHtml(createdStaff.role);
    const safeDepartment = escapeHtml(createdStaff.department);
    const safePhone = escapeHtml(createdStaff.phone || "-");
    const safeEmergencyContact = escapeHtml(createdStaff.emergencyContact || "-");
    const safeBloodGroup = escapeHtml(createdStaff.bloodGroup || "-");
    const safeJoiningDate = escapeHtml(formatStaffDisplayDate(createdStaff.joiningDate));
    const safeValidTill = escapeHtml(formatStaffDisplayDate(createdStaff.validTill));
    const safeLoginId = escapeHtml(createdStaff.loginId);
    const safePassword = escapeHtml(createdStaff.password);
    const safePhotoMarkup = createdStaff.photoUrl
      ? `<div class="photo" style="background-image:url('${escapeHtml(createdStaff.photoUrl)}')"></div>`
      : `<div class="photo fallback">${escapeHtml(getStaffInitials(createdStaff.name))}</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Staff Access Packet - ${safeName}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #111827; background: #f5f5f5; }
            .sheet { max-width: 1120px; margin: 0 auto; }
            .title { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
            .meta { color: #6b7280; margin-bottom: 24px; }
            .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-bottom: 24px; }
            .card { min-height: 620px; padding: 24px; border-radius: 28px; background: linear-gradient(145deg, #1f1a12 0%, #090909 48%, #151515 100%); color: #f3d18a; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28); position: relative; overflow: hidden; border: 1px solid rgba(216, 177, 95, 0.4); }
            .card::before { content: ""; position: absolute; inset: 0; opacity: 0.16; background-image: radial-gradient(circle at 1px 1px, rgba(255,215,140,0.12) 1px, transparent 0); background-size: 10px 10px; }
            .inner { position: relative; z-index: 1; }
            .slot { width: 112px; height: 16px; margin: 0 auto 24px; border-radius: 999px; background: rgba(255,255,255,0.96); box-shadow: 0 0 20px rgba(255,255,255,0.45); }
            .divider { border-top: 1px solid rgba(216, 177, 95, 0.6); margin: 16px 0 20px; }
            .logo { width: 56px; height: 56px; margin: 0 auto 10px; border-radius: 18px; border: 1px solid rgba(216, 177, 95, 0.7); display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 900; }
            .brand { text-align: center; }
            .brand h1 { margin: 0; font-size: 40px; letter-spacing: 0.2em; }
            .brand p { margin: 8px 0 0; font-size: 16px; font-style: italic; color: #f5dfab; }
            .identity { display: grid; grid-template-columns: 164px 1fr; gap: 18px; align-items: start; }
            .photo { height: 210px; border-radius: 20px; border: 1px solid rgba(216, 177, 95, 0.7); background: #f8ebc9 center / cover no-repeat; }
            .fallback { display: flex; align-items: center; justify-content: center; color: #1b1712; font-size: 54px; font-weight: 900; }
            .identity h2 { margin: 0 0 12px; font-size: 34px; line-height: 1.1; }
            .info { border-top: 1px solid rgba(216, 177, 95, 0.35); padding-top: 12px; font-size: 17px; line-height: 1.8; color: #f5dfab; }
            .info strong { color: #f3d18a; }
            .hotel { text-align: center; margin-top: 22px; }
            .hotel h3 { margin: 0; font-size: 32px; font-style: italic; }
            .hotel p { margin: 12px 0 0; font-size: 18px; }
            .back-block { text-align: center; font-size: 28px; line-height: 1.8; padding-top: 18px; }
            .back-block .line { border-bottom: 1px solid rgba(216, 177, 95, 0.4); padding-bottom: 12px; margin-bottom: 14px; }
            .qr-box { margin-top: 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 16px; border-radius: 24px; border: 1px solid rgba(216, 177, 95, 0.25); background: rgba(248, 235, 201, 0.06); }
            .qr-copy { flex: 1; }
            .qr-label { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(243, 209, 138, 0.8); }
            .qr-caption { margin-top: 8px; font-size: 15px; font-weight: 700; color: #f8ebc9; }
            .qr-employee { margin-top: 4px; font-size: 12px; color: rgba(245, 223, 171, 0.82); }
            .qr-image { width: 86px; height: 86px; border-radius: 18px; background: #f8ebc9; padding: 5px; }
            .note { margin-top: 32px; border-top: 1px solid rgba(216, 177, 95, 0.4); padding-top: 34px; text-align: center; font-size: 22px; line-height: 1.7; font-style: italic; color: #f5dfab; }
            .credentials { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08); }
            .credentials h4 { margin: 0 0 14px; font-size: 22px; }
            .row { margin-bottom: 12px; }
            .label { font-size: 12px; text-transform: uppercase; color: #6b7280; }
            .value { margin-top: 4px; font-size: 18px; font-weight: 700; word-break: break-word; }
            @media print { body { background: white; padding: 0; } .sheet { max-width: none; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="title">Staff Access Packet</div>
            <div class="meta">Generated for ${safeName} | Employee ${safeEmployeeId}</div>
            <div class="cards">
              <div class="card">
                <div class="inner">
                  <div class="slot"></div>
                  <div class="divider"></div>
                  <div class="brand"><div class="logo">A</div><h1>AEGIS</h1><p>Excellence in Hospitality</p></div>
                  <div class="divider"></div>
                  <div class="identity">
                    ${safePhotoMarkup}
                    <div>
                      <h2>${safeName}</h2>
                      <div class="info">
                        <div><strong>Employee ID:</strong> ${safeEmployeeId}</div>
                        <div><strong>Designation:</strong> ${safeRole}</div>
                        <div><strong>Department:</strong> ${safeDepartment}</div>
                        <div><strong>Date of Joining:</strong> ${safeJoiningDate}</div>
                      </div>
                    </div>
                  </div>
                  <div class="divider"></div>
                  <div class="hotel"><h3>Aegis Grand Hotel</h3><p>Contact: ${safePhone}</p></div>
                </div>
              </div>
              <div class="card">
                <div class="inner">
                  <div class="slot"></div>
                  <div class="divider"></div>
                  <div class="back-block">
                    <div class="line">Emergency Contact: ${safeEmergencyContact}</div>
                    <div class="line">Blood Group: ${safeBloodGroup}</div>
                    <div class="line">Valid Till: ${safeValidTill}</div>
                  </div>
                  ${qrCodeMarkup}
                  <div class="note"><div>"This card is property of Aegis."</div><div>If found, please return to reception.</div></div>
                </div>
              </div>
            </div>
            <div class="credentials">
              <h4>Staff Login Credentials</h4>
              <div class="row"><div class="label">Staff Email / Login ID</div><div class="value">${safeLoginId}</div></div>
              <div class="row"><div class="label">Generated Password</div><div class="value">${safePassword}</div></div>
              <div class="row"><div class="label">QR Login Link</div><div class="value">${escapeHtml(`${window.location.origin}${buildStaffLoginPath(createdStaff.employeeId)}`)}</div></div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="bg-[#fafafa] dark:bg-[#0a0a0a] text-[#09090b] dark:text-[#e5e2e1] min-h-screen flex flex-col font-['Sora'] relative overflow-hidden">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/6 via-indigo-500/4 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-emerald-500/5 via-teal-500/3 to-transparent blur-3xl" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(150,150,150,0.07) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      <DashboardHeader
        title="Staff Operations"
        userName="Administrator"
        role="Director of Operations"
        onMenuClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative z-10 h-[calc(100vh-64px)] pt-16">
        <AdminSidebar
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
          sidebarMobileOpen={sidebarMobileOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
        />

        <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Staff Registration Command</h1>
                <p className="mt-2 text-sm text-[#71717a] dark:text-[#a1a1aa]">
                  Register new team members, generate staff credentials, and prepare printable digital ID cards.
                </p>
              </div>
              <button
                onClick={() => {
                  resetRegistrationForm();
                  setShowRegisterModal(true);
                }}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#175ead] to-[#1a6fc4] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-lg transition-transform duration-200 group-hover:scale-110">badge</span>
                Register Staff & Generate ID
              </button>
            </div>

            {feedback && (
              <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300">
                {feedback}
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="mb-8 grid gap-4 md:grid-cols-4">
              {[
                { label: "Total Staff", val: staff.length, color: "text-[#09090b] dark:text-white", gradient: "from-slate-500/8 to-gray-500/4", icon: "groups" },
                { label: "Active", val: activeStaffCount, color: "text-emerald-600 dark:text-emerald-400", gradient: "from-emerald-500/10 to-green-500/5", icon: "check_circle" },
                { label: "Departments", val: departmentCount, color: "text-[#09090b] dark:text-white", gradient: "from-blue-500/8 to-sky-500/4", icon: "corporate_fare" },
                { label: "Access Ready", val: staff.filter((member) => Boolean(member.email)).length, color: "text-[#175ead]", gradient: "from-indigo-500/10 to-blue-500/5", icon: "key" },
              ].map(s => (
                <div key={s.label} className={`group relative rounded-2xl border border-[#e4e4e7] dark:border-[#27272a] bg-gradient-to-br ${s.gradient} bg-white dark:bg-[#0f0f0f] p-5 overflow-hidden hover:border-[#d4d4d8] dark:hover:border-[#3f3f46] hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-200 cursor-default`}>
                  <div className="absolute top-3 right-3 opacity-15 group-hover:opacity-35 transition-opacity duration-200">
                    <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                  </div>
                  <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-[#a1a1aa]">{s.label}</p>
                  <p className={`mt-3 text-3xl font-light tracking-tight ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-[#e4e4e7] bg-white shadow-sm dark:border-[#27272a] dark:bg-[#0f0f0f] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e4e4e7] px-6 py-5 dark:border-[#27272a] bg-gradient-to-r from-white to-[#fafafa] dark:from-[#0f0f0f] dark:to-[#111111]">
                <div>
                  <h2 className="text-lg font-semibold">Staff Registry</h2>
                  <p className="mt-1 text-sm text-[#71717a] dark:text-[#a1a1aa]">
                    Stored staff profiles with generated identity details and login email.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    setErrorMessage(null);
                    void refreshStaff()
                      .catch((error) => {
                        setErrorMessage(
                          error instanceof Error ? error.message : "Failed to refresh staff roster."
                        );
                      })
                      .finally(() => setLoading(false));
                  }}
                  className="rounded-xl border border-[#e4e4e7] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors hover:bg-[#fafafa] dark:border-[#27272a] dark:hover:bg-[#18181b]"
                >
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e4e4e7] text-[11px] uppercase tracking-[0.2em] text-[#71717a] dark:border-[#27272a] dark:text-[#a1a1aa] bg-[#fafafa]/50 dark:bg-[#111111]/50">
                      <th className="px-6 py-3 font-semibold">Staff Member</th>
                      <th className="px-4 py-3 font-semibold">Employee ID</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold">Login Email</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f4f4f5] dark:divide-[#1a1a1a]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#71717a] dark:text-[#a1a1aa]">
                          Loading staff roster...
                        </td>
                      </tr>
                    ) : staff.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#71717a] dark:text-[#a1a1aa]">
                          No staff records found.
                        </td>
                      </tr>
                    ) : (
                      staff.map((member) => (
                        <StaffRow key={member.id} member={member} onEdit={() => setEditingStaff(createEditorForm(member))} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[28px] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] dark:bg-[#0f0f0f]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Register New Staff Member</h3>
                <p className="mt-1 text-sm text-[#71717a] dark:text-[#a1a1aa]">
                  Admin will create the staff profile, assign role details, and generate login credentials with a printable digital ID card.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  resetRegistrationForm();
                }}
                className="rounded-full border border-[#e4e4e7] p-2 text-[#71717a] transition-colors hover:bg-[#fafafa] dark:border-[#27272a] dark:hover:bg-[#18181b]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Full Name</label>
                <input
                  value={registrationForm.name}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  placeholder="Deepak Sharma"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Email</label>
                <input
                  type="email"
                  value={registrationForm.email}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  placeholder="staff@aegis.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Role / Designation</label>
                <input
                  value={registrationForm.role}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, role: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  placeholder="Front Desk Executive"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Department</label>
                <input
                  value={registrationForm.department}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, department: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  placeholder="Guest Services"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Contact Number</label>
                <input
                  value={registrationForm.phone}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  placeholder="+91-9876543201"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Emergency Contact</label>
                <input
                  value={registrationForm.emergencyContact}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, emergencyContact: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  placeholder="+91-9876543210"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Blood Group</label>
                <input
                  value={registrationForm.bloodGroup}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, bloodGroup: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm uppercase outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  placeholder="B+"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Joining Date</label>
                <input
                  type="date"
                  value={registrationForm.joiningDate}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, joiningDate: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Valid Till</label>
                <input
                  type="date"
                  value={registrationForm.validTill}
                  onChange={(event) =>
                    setRegistrationForm((current) => ({ ...current, validTill: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em]">Upload Staff Photo (optional)</label>
                <div className="mt-2 rounded-[24px] border border-dashed border-[#d4d4d8] bg-[#fafafa] p-4 dark:border-[#27272a] dark:bg-[#18181b]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111827] text-lg font-bold text-white"
                        style={
                          registrationForm.photoUrl
                            ? {
                                backgroundImage: `url(${registrationForm.photoUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      >
                        {!registrationForm.photoUrl && getStaffInitials(registrationForm.name || "Staff")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {registrationForm.photoUrl ? "Photo selected" : "Choose an image"}
                        </p>
                        <p className="mt-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                          JPG, PNG, or WEBP up to 3 MB. The photo is stored with the staff profile.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="cursor-pointer rounded-2xl bg-[#175ead] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#134f92]">
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) =>
                            void handlePhotoUpload(event.target.files?.[0] ?? null, "register")
                          }
                        />
                      </label>
                      {registrationForm.photoUrl && (
                        <button
                          type="button"
                          onClick={() => updateRegistrationField("photoUrl", "")}
                          className="rounded-2xl border border-[#e4e4e7] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white dark:border-[#27272a] dark:hover:bg-[#101012]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => void handleRegisterStaff()}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-[#175ead] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#134f92] disabled:opacity-60"
              >
                {isSubmitting ? "Generating Staff Access..." : "Create Staff & Generate ID"}
              </button>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  resetRegistrationForm();
                }}
                className="rounded-2xl border border-[#e4e4e7] px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#fafafa] dark:border-[#27272a] dark:hover:bg-[#18181b]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[28px] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] dark:bg-[#0f0f0f]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Edit Staff Member</h3>
                <p className="mt-1 text-sm text-[#71717a] dark:text-[#a1a1aa]">
                  Update profile details, refresh the ID card photo, and correct staff records without regenerating login credentials.
                </p>
              </div>
              <button
                onClick={resetEditForm}
                className="rounded-full border border-[#e4e4e7] p-2 text-[#71717a] transition-colors hover:bg-[#fafafa] dark:border-[#27272a] dark:hover:bg-[#18181b]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_360px]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Full Name</label>
                  <input
                    value={editingStaff.name}
                    onChange={(event) => updateEditField("name", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Login Email</label>
                  <input
                    value={editingStaff.email}
                    readOnly
                    className="mt-2 w-full rounded-2xl border border-[#e4e4e7] bg-[#f4f4f5] px-4 py-3 text-sm text-[#71717a] outline-none dark:border-[#27272a] dark:bg-[#141416] dark:text-[#a1a1aa]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Employee ID</label>
                  <input
                    value={editingStaff.employeeId}
                    readOnly
                    className="mt-2 w-full rounded-2xl border border-[#e4e4e7] bg-[#f4f4f5] px-4 py-3 text-sm font-mono text-[#71717a] outline-none dark:border-[#27272a] dark:bg-[#141416] dark:text-[#a1a1aa]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Status</label>
                  <select
                    value={editingStaff.status}
                    onChange={(event) => updateEditField("status", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Role / Designation</label>
                  <input
                    value={editingStaff.role}
                    onChange={(event) => updateEditField("role", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Department</label>
                  <input
                    value={editingStaff.department}
                    onChange={(event) => updateEditField("department", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Contact Number</label>
                  <input
                    value={editingStaff.phone}
                    onChange={(event) => updateEditField("phone", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Emergency Contact</label>
                  <input
                    value={editingStaff.emergencyContact}
                    onChange={(event) => updateEditField("emergencyContact", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Blood Group</label>
                  <input
                    value={editingStaff.bloodGroup}
                    onChange={(event) => updateEditField("bloodGroup", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm uppercase outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Joining Date</label>
                  <input
                    type="date"
                    value={editingStaff.joiningDate}
                    onChange={(event) => updateEditField("joiningDate", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Valid Till</label>
                  <input
                    type="date"
                    value={editingStaff.validTill}
                    onChange={(event) => updateEditField("validTill", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-transparent bg-[#fafafa] px-4 py-3 text-sm outline-none transition-colors focus:border-[#175ead] dark:bg-[#18181b]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em]">Staff Photo</label>
                  <div className="mt-2 rounded-[24px] border border-dashed border-[#d4d4d8] bg-[#fafafa] p-4 dark:border-[#27272a] dark:bg-[#18181b]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#111827] text-lg font-bold text-white"
                          style={
                            editingStaff.photoUrl
                              ? {
                                  backgroundImage: `url(${editingStaff.photoUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                        >
                          {!editingStaff.photoUrl && getStaffInitials(editingStaff.name || "Staff")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {editingStaff.photoUrl ? "Current photo ready" : "No photo on profile"}
                          </p>
                          <p className="mt-1 text-xs text-[#71717a] dark:text-[#a1a1aa]">
                            Upload a new image to update the staff ID card.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <label className="cursor-pointer rounded-2xl bg-[#175ead] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#134f92]">
                          Replace Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              void handlePhotoUpload(event.target.files?.[0] ?? null, "edit")
                            }
                          />
                        </label>
                        {editingStaff.photoUrl && (
                          <button
                            type="button"
                            onClick={() => updateEditField("photoUrl", "")}
                            className="rounded-2xl border border-[#e4e4e7] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white dark:border-[#27272a] dark:hover:bg-[#101012]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#71717a] dark:text-[#a1a1aa]">
                  Live ID Card Preview
                </p>
                <StaffIdCard staff={editingStaff} className="min-h-[520px]" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => void handleUpdateStaff()}
                disabled={isUpdating}
                className="flex-1 rounded-2xl bg-[#175ead] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#134f92] disabled:opacity-60"
              >
                {isUpdating ? "Saving Changes..." : "Save Staff Changes"}
              </button>
              <button
                onClick={resetEditForm}
                className="rounded-2xl border border-[#e4e4e7] px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#fafafa] dark:border-[#27272a] dark:hover:bg-[#18181b]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCardModal && createdStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-auto rounded-[32px] border border-white/10 bg-[#08101b] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-2xl font-bold">Staff Access Ready</h3>
                <p className="mt-2 text-sm text-white/65">
                  {createdStaff.name} is now registered. Generated credentials, printable ID card,
                  and staff login QR are ready for issue.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={copyCredentials}
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/15"
                >
                  Copy Credentials
                </button>
                <button
                  onClick={printStaffPacket}
                  className="rounded-2xl bg-[#d8b15f] px-4 py-3 text-sm font-semibold text-[#1a140b] transition-colors hover:bg-[#e5c67a]"
                >
                  Print ID Packet
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Generated Staff Credentials</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-white/45">Staff Email / Login ID</p>
                    <p className="mt-2 break-all text-sm font-semibold">{createdStaff.loginId}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-white/45">Generated Password</p>
                    <p className="mt-2 text-lg font-semibold tracking-[0.15em]">{createdStaff.password}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-white/45">QR Staff Login</p>
                    <p className="mt-2 text-sm leading-6 text-white/85">
                      The ID card now includes a small QR code. Staff can scan it and open the
                      staff login page directly.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-white/45">Stored Details</p>
                    <p className="mt-2 text-sm leading-7 text-white/85">
                      Employee ID: {createdStaff.employeeId}<br />
                      Role: {createdStaff.role}<br />
                      Department: {createdStaff.department}<br />
                      Blood Group: {createdStaff.bloodGroup}<br />
                      Emergency: {createdStaff.emergencyContact}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <StaffIdCard staff={createdStaff} />
                <StaffIdCard staff={createdStaff} back />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowCardModal(false)}
                className="w-full rounded-2xl bg-[#175ead] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#134f92]"
              >
                Return to Staff Registry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
