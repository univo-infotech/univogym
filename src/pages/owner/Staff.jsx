import React, { useState, useEffect, useCallback } from "react";
import {
  UserCheck, Plus, Phone, Mail, Calendar, IndianRupee, Search,
  MoreVertical, Trash2, Edit3, ChevronRight, X, Check, Clock,
  TrendingUp, TrendingDown, ShieldCheck, Wallet, Users,
  AlertCircle, ChevronDown, ChevronUp, BadgeCheck, Ban,
  Gift, Scissors, FileText, CreditCard, Star, Briefcase,
  Camera, MessageCircle
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  getStaff, addStaff, updateStaff, deleteStaff,
  addLeave, getLeaves, updateLeave, deleteLeave,
  getPayrollEntries, addPayrollEntry, deletePayrollEntry,
  markSalaryPaid, getSalaryHistory
} from "../../firebase/staff";
import toast from "react-hot-toast";

// ─── Constants ───────────────────────────────────────────────────
const ROLES = [
  "Head Trainer", "Senior Trainer", "Female Fitness Coach",
  "Strength & Conditioning Coach", "Yoga / Zumba Instructor",
  "Nutritionist", "Reception & Operations", "Accounts",
  "Maintenance & Cleaning", "Security", "Custom…"
];

const DEPARTMENTS = ["Training", "Operations", "Nutrition", "Maintenance", "Admin"];

const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Earned Leave", "Holiday", "Unpaid Leave", "Emergency Leave"];

const ROLE_PERMISSIONS = {
  "Head Trainer":           { viewMembers: true,  addMembers: true,  editMembers: true,  viewPayments: false, viewReports: false, manageStaff: false, viewAttendance: true  },
  "Senior Trainer":         { viewMembers: true,  addMembers: false, editMembers: false, viewPayments: false, viewReports: false, manageStaff: false, viewAttendance: true  },
  "Female Fitness Coach":   { viewMembers: true,  addMembers: false, editMembers: false, viewPayments: false, viewReports: false, manageStaff: false, viewAttendance: true  },
  "Reception & Operations": { viewMembers: true,  addMembers: true,  editMembers: true,  viewPayments: true,  viewReports: false, manageStaff: false, viewAttendance: true  },
  "Accounts":               { viewMembers: false, addMembers: false, editMembers: false, viewPayments: true,  viewReports: true,  manageStaff: false, viewAttendance: false },
  "Nutritionist":           { viewMembers: true,  addMembers: false, editMembers: false, viewPayments: false, viewReports: false, manageStaff: false, viewAttendance: false },
};

const PERM_LABELS = {
  viewMembers: "View Members", addMembers: "Add Members", editMembers: "Edit Members",
  viewPayments: "View Payments", viewReports: "View Reports",
  manageStaff: "Manage Staff", viewAttendance: "Mark Attendance",
};

const STATUS_COLORS = {
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  onleave:  "bg-amber-50 text-amber-700 border-amber-200",
};

function formatCurrency(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(y, m - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ─── Avatar Component ─────────────────────────────────────────────
function Avatar({ name, photo, size = "md" }) {
  const sz = size === "lg" ? "w-16 h-16 text-xl" : size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-emerald-500", "bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-orange-500"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  if (photo) return <img src={photo} alt={name} className={`${sz} rounded-2xl object-cover flex-shrink-0 border-2 border-white shadow`} />;
  return <div className={`${sz} ${color} rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0`}>{initials}</div>;
}

// ─── Main Component ───────────────────────────────────────────────
export default function Staff() {
  const { gymId } = useAuth();
  const GID = gymId || "univo_main";

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);        // staff obj
  const [detailPanel, setDetailPanel] = useState(null);    // staff obj
  const [leaveModal, setLeaveModal] = useState(null);      // staff obj
  const [payrollModal, setPayrollModal] = useState(null);  // staff obj
  const [salaryModal, setSalaryModal] = useState(null);    // staff obj
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Sub-data for selected staff
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [salHistory, setSalHistory] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  const [detailTab, setDetailTab] = useState("overview"); // overview | leaves | payroll | permissions

  // Forms
  const emptyForm = {
    name: "", role: "Senior Trainer", customRole: "", department: "Training",
    phone: "", email: "", salary: "25000", joinDate: today(),
    address: "", emergencyContact: "", emergencyPhone: "", bio: "",
    photoUrl: "", status: "active",
  };
  const [form, setForm] = useState(emptyForm);

  const [leaveForm, setLeaveForm] = useState({ type: "Sick Leave", fromDate: today(), toDate: today(), reason: "", paid: true });
  const [payrollForm, setPayrollForm] = useState({ type: "bonus", amount: "", reason: "", date: today() });

  // ─── Load staff ────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStaff(GID);
      setStaffList(data.length ? data : DUMMY_STAFF);
    } catch {
      setStaffList(DUMMY_STAFF);
    } finally {
      setLoading(false);
    }
  }, [GID]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // ─── Load sub-data when detail panel opens ──────────────────────
  useEffect(() => {
    if (!detailPanel) { setLeaves([]); setPayroll([]); setSalHistory([]); return; }
    setSubLoading(true);
    Promise.all([
      getLeaves(GID, detailPanel.id),
      getPayrollEntries(GID, detailPanel.id),
      getSalaryHistory(GID, detailPanel.id),
    ]).then(([l, p, s]) => {
      setLeaves(l);
      setPayroll(p);
      setSalHistory(s);
    }).finally(() => setSubLoading(false));
  }, [detailPanel, GID]);

  // ─── Staff actions ──────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    const finalRole = form.role === "Custom…" ? form.customRole : form.role;
    const data = { ...form, role: finalRole };
    delete data.customRole;
    try {
      const id = await addStaff(GID, data);
      setStaffList(prev => [{ ...data, id }, ...prev]);
      toast.success("Staff member added!");
      setAddModal(false);
      setForm(emptyForm);
    } catch (err) {
      toast.error("Failed to add staff: " + err.message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const finalRole = form.role === "Custom…" ? form.customRole : form.role;
    const data = { ...form, role: finalRole };
    delete data.customRole;
    try {
      await updateStaff(GID, editModal.id, data);
      setStaffList(prev => prev.map(s => s.id === editModal.id ? { ...s, ...data } : s));
      if (detailPanel?.id === editModal.id) setDetailPanel(prev => ({ ...prev, ...data }));
      toast.success("Staff updated!");
      setEditModal(null);
    } catch (err) {
      toast.error("Failed: " + err.message);
    }
  };

  const openEdit = (s) => {
    setForm({ ...emptyForm, ...s, customRole: "" });
    setEditModal(s);
  };

  const handleDelete = async () => {
    try {
      await deleteStaff(GID, deleteConfirm.id);
      setStaffList(prev => prev.filter(s => s.id !== deleteConfirm.id));
      if (detailPanel?.id === deleteConfirm.id) setDetailPanel(null);
      toast.success("Staff removed.");
    } catch { toast.error("Delete failed"); }
    setDeleteConfirm(null);
  };

  const toggleStatus = async (s, newStatus) => {
    try {
      await updateStaff(GID, s.id, { status: newStatus });
      setStaffList(prev => prev.map(x => x.id === s.id ? { ...x, status: newStatus } : x));
      if (detailPanel?.id === s.id) setDetailPanel(prev => ({ ...prev, status: newStatus }));
    } catch { toast.error("Update failed"); }
  };

  // ─── Leave actions ──────────────────────────────────────────────
  const handleAddLeave = async (e) => {
    e.preventDefault();
    const from = new Date(leaveForm.fromDate);
    const to = new Date(leaveForm.toDate);
    const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
    try {
      const id = await addLeave(GID, leaveModal.id, {
        ...leaveForm, days,
        staffName: leaveModal.name,
        paid: leaveForm.type !== "Unpaid Leave",
      });
      const newLeave = { id, ...leaveForm, days, staffName: leaveModal.name, paid: leaveForm.type !== "Unpaid Leave", status: "approved" };
      setLeaves(prev => [newLeave, ...prev]);
      toast.success(`Leave recorded — ${days} day${days > 1 ? "s" : ""}`);
      setLeaveModal(null);
      setLeaveForm({ type: "Sick Leave", fromDate: today(), toDate: today(), reason: "", paid: true });
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!detailPanel) return;
    try {
      await deleteLeave(GID, detailPanel.id, leaveId);
      setLeaves(prev => prev.filter(l => l.id !== leaveId));
      toast.success("Leave removed.");
    } catch { toast.error("Failed"); }
  };

  // ─── Payroll actions ────────────────────────────────────────────
  const handleAddPayroll = async (e) => {
    e.preventDefault();
    if (!payrollForm.amount || Number(payrollForm.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      const id = await addPayrollEntry(GID, payrollModal.id, {
        ...payrollForm,
        month: getCurrentMonthKey(),
        staffName: payrollModal.name,
        amount: Number(payrollForm.amount),
      });
      setPayroll(prev => [{ id, ...payrollForm, amount: Number(payrollForm.amount), month: getCurrentMonthKey() }, ...prev]);
      toast.success(`${payrollForm.type === "bonus" ? "Bonus" : "Deduction"} added!`);
      setPayrollModal(null);
      setPayrollForm({ type: "bonus", amount: "", reason: "", date: today() });
    } catch (err) { toast.error(err.message); }
  };

  const handleDeletePayroll = async (entryId) => {
    if (!detailPanel) return;
    try {
      await deletePayrollEntry(GID, detailPanel.id, entryId);
      setPayroll(prev => prev.filter(p => p.id !== entryId));
      toast.success("Entry removed.");
    } catch { toast.error("Failed"); }
  };

  const handleMarkPaid = async (s) => {
    const monthKey = getCurrentMonthKey();
    const bonuses = payroll.filter(p => p.type === "bonus" && p.month === monthKey).reduce((a, b) => a + b.amount, 0);
    const deductions = payroll.filter(p => p.type === "deduction" && p.month === monthKey).reduce((a, b) => a + b.amount, 0);
    const net = Number(s.salary || 0) + bonuses - deductions;
    try {
      await markSalaryPaid(GID, s.id, monthKey, { base: Number(s.salary), bonuses, deductions, net, month: monthKey });
      setSalHistory(prev => [{ id: monthKey, base: Number(s.salary), bonuses, deductions, net, month: monthKey, status: "paid" }, ...prev.filter(h => h.id !== monthKey)]);
      toast.success(`Salary of ${formatCurrency(net)} marked as PAID for ${monthLabel(monthKey)}`);
    } catch (err) { toast.error(err.message); }
  };

  // ─── Computed values ────────────────────────────────────────────
  const totalSalary = staffList.reduce((a, s) => a + Number(s.salary || 0), 0);
  const activeCount = staffList.filter(s => (s.status || "active") === "active").length;
  const onLeaveCount = staffList.filter(s => s.status === "onleave").length;

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthBonuses = payroll.filter(p => p.type === "bonus" && p.month === currentMonthKey).reduce((a, b) => a + b.amount, 0);
  const currentMonthDeductions = payroll.filter(p => p.type === "deduction" && p.month === currentMonthKey).reduce((a, b) => a + b.amount, 0);
  const netPay = detailPanel ? (Number(detailPanel.salary || 0) + currentMonthBonuses - currentMonthDeductions) : 0;
  const approvedLeaves = leaves.filter(l => l.status === "approved").reduce((a, b) => a + (b.days || 1), 0);

  const paidThisMonth = salHistory.find(h => h.id === currentMonthKey && h.status === "paid");

  const filtered = staffList.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || (s.name || "").toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q) || (s.phone || "").includes(q);
    const matchStatus = filterStatus === "all" || (s.status || "active") === filterStatus;
    const matchDept = filterDept === "all" || (s.department || "") === filterDept;
    return matchSearch && matchStatus && matchDept;
  });

  const permissions = ROLE_PERMISSIONS[detailPanel?.role] || {};

  // ─── Photo upload ───────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) { toast.error("Photo must be under 800KB"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, photoUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 text-xs mt-1">Payroll • Leaves • Bonuses • Deductions • Permissions</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setAddModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: staffList.length, icon: <Users className="w-5 h-5" />, color: "text-blue-600 bg-blue-50" },
          { label: "Active", value: activeCount, icon: <BadgeCheck className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-50" },
          { label: "On Leave", value: onLeaveCount, icon: <Clock className="w-5 h-5" />, color: "text-amber-600 bg-amber-50" },
          { label: "Monthly Payroll", value: formatCurrency(totalSalary), icon: <IndianRupee className="w-5 h-5" />, color: "text-violet-600 bg-violet-50", wide: true },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>{c.icon}</div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-extrabold text-slate-900 leading-tight">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search by name, role, phone…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 focus:border-emerald-500 outline-none shadow-sm"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 focus:border-emerald-500 outline-none shadow-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="onleave">On Leave</option>
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 focus:border-emerald-500 outline-none shadow-sm">
          <option value="all">All Depts</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* ── Staff Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading staff…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold">No staff found</p>
          <p className="text-xs mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(s => {
            const st = s.status || "active";
            return (
              <div key={s.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition cursor-pointer group"
                onClick={() => { setDetailPanel(s); setDetailTab("overview"); }}
              >
                <div className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} photo={s.photoUrl} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{s.role}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[st]} flex-shrink-0 capitalize`}>
                      {st === "onleave" ? "Leave" : st}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-xs text-slate-500">
                    {s.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{s.phone}</p>}
                    {s.department && <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-slate-400" />{s.department}</p>}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400">Monthly Salary</p>
                      <p className="text-sm font-extrabold text-slate-800">{formatCurrency(s.salary)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); openEdit(s); }}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDetailPanel(s); setDetailTab("overview"); }}
                        className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          DETAIL PANEL (Right Slide-over style — rendered as Modal)
      ══════════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!detailPanel} onClose={() => setDetailPanel(null)} title="" maxWidth="max-w-3xl">
        {detailPanel && (
          <div className="space-y-0">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <Avatar name={detailPanel.name} photo={detailPanel.photoUrl} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white">{detailPanel.name}</h2>
                <p className="text-sm text-slate-300">{detailPanel.role}</p>
                {detailPanel.department && <p className="text-xs text-slate-400 mt-0.5">{detailPanel.department}</p>}
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[detailPanel.status || "active"]} bg-white/10 text-white border-white/20`}>
                  {(detailPanel.status || "active").toUpperCase()}
                </span>
                <div className="flex gap-2">
                  {detailPanel.status !== "active" && (
                    <button onClick={() => toggleStatus(detailPanel, "active")}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition">
                      Activate
                    </button>
                  )}
                  {detailPanel.status !== "onleave" && (
                    <button onClick={() => toggleStatus(detailPanel, "onleave")}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition">
                      Mark Leave
                    </button>
                  )}
                  {detailPanel.status !== "inactive" && (
                    <button onClick={() => toggleStatus(detailPanel, "inactive")}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-600 text-white hover:bg-slate-700 transition">
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-4 overflow-x-auto">
              {[
                { key: "overview", label: "Overview", icon: <UserCheck className="w-4 h-4" /> },
                { key: "payroll", label: "Payroll", icon: <IndianRupee className="w-4 h-4" /> },
                { key: "leaves", label: "Leaves", icon: <Calendar className="w-4 h-4" /> },
                { key: "permissions", label: "Permissions", icon: <ShieldCheck className="w-4 h-4" /> },
              ].map(t => (
                <button key={t.key} onClick={() => setDetailTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex-1 justify-center ${detailTab === t.key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {detailTab === "overview" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Contact Info</p>
                  {[
                    { icon: <Phone className="w-4 h-4 text-slate-400" />, label: detailPanel.phone || "—" },
                    { icon: <Mail className="w-4 h-4 text-slate-400" />, label: detailPanel.email || "—" },
                    { icon: <Calendar className="w-4 h-4 text-slate-400" />, label: `Joined: ${detailPanel.joinDate || "—"}` },
                    { icon: <FileText className="w-4 h-4 text-slate-400" />, label: detailPanel.address || "No address" },
                  ].map((row, i) => (
                    <p key={i} className="flex items-center gap-2 text-sm text-slate-700">{row.icon} {row.label}</p>
                  ))}
                  {detailPanel.emergencyContact && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-500 mb-1">Emergency Contact</p>
                      <p className="text-sm text-slate-700">{detailPanel.emergencyContact}</p>
                      <p className="text-sm text-slate-700">{detailPanel.emergencyPhone}</p>
                    </div>
                  )}
                </div>

                {/* Salary Snapshot */}
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                    <p className="text-xs font-semibold opacity-80">Base Monthly Salary</p>
                    <p className="text-3xl font-black mt-1">{formatCurrency(detailPanel.salary)}</p>
                    {subLoading ? <p className="text-xs opacity-70 mt-2">Loading payroll…</p> : (
                      <div className="flex gap-4 mt-2">
                        <div><p className="text-[10px] opacity-70">Bonus</p><p className="text-sm font-bold">+{formatCurrency(currentMonthBonuses)}</p></div>
                        <div><p className="text-[10px] opacity-70">Deduction</p><p className="text-sm font-bold">-{formatCurrency(currentMonthDeductions)}</p></div>
                        <div><p className="text-[10px] opacity-70">Net Pay</p><p className="text-sm font-bold">{formatCurrency(netPay)}</p></div>
                      </div>
                    )}
                  </div>

                  {paidThisMonth ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2 text-emerald-700 text-sm font-bold">
                      <Check className="w-4 h-4" /> Salary Paid — {monthLabel(currentMonthKey)}
                    </div>
                  ) : (
                    <button onClick={() => handleMarkPaid(detailPanel)}
                      className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                      <CreditCard className="w-4 h-4" /> Mark Salary Paid — {monthLabel(currentMonthKey)}
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => { setPayrollModal(detailPanel); setPayrollForm({ type: "bonus", amount: "", reason: "", date: today() }); }}
                      className="flex-1 py-2.5 rounded-xl bg-violet-50 text-violet-700 font-bold text-xs hover:bg-violet-100 transition flex items-center justify-center gap-1.5 border border-violet-200">
                      <Gift className="w-4 h-4" /> Add Bonus
                    </button>
                    <button onClick={() => { setPayrollModal(detailPanel); setPayrollForm({ type: "deduction", amount: "", reason: "", date: today() }); }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition flex items-center justify-center gap-1.5 border border-rose-200">
                      <Scissors className="w-4 h-4" /> Add Deduction
                    </button>
                  </div>
                </div>

                {/* Bio */}
                {detailPanel.bio && (
                  <div className="sm:col-span-2 bg-slate-50 rounded-2xl border border-slate-200 p-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Bio / Notes</p>
                    <p className="text-sm text-slate-700">{detailPanel.bio}</p>
                  </div>
                )}

                {/* Salary History */}
                {salHistory.length > 0 && (
                  <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">Salary History</p>
                    <div className="space-y-2">
                      {salHistory.slice(0, 5).map(h => (
                        <div key={h.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 font-medium">{monthLabel(h.month || h.id)}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">Net: {formatCurrency(h.net)}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">PAID</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <button onClick={() => openEdit(detailPanel)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                  <button onClick={() => { setLeaveModal(detailPanel); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs hover:bg-amber-100 transition border border-amber-200">
                    <Calendar className="w-3.5 h-3.5" /> Add Leave
                  </button>
                  {detailPanel.phone && (
                    <a href={`https://wa.me/91${detailPanel.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-700 font-bold text-xs hover:bg-green-100 transition border border-green-200">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                  <button onClick={() => setDeleteConfirm(detailPanel)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition border border-rose-200 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Payroll */}
            {detailTab === "payroll" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Base Salary", value: formatCurrency(detailPanel.salary), color: "text-slate-900" },
                    { label: "Total Bonus", value: `+${formatCurrency(currentMonthBonuses)}`, color: "text-emerald-600" },
                    { label: "Total Deductions", value: `-${formatCurrency(currentMonthDeductions)}`, color: "text-rose-600" },
                  ].map((c, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                      <p className="text-[10px] text-slate-500 font-semibold">{c.label}</p>
                      <p className={`text-lg font-extrabold ${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs opacity-70">Net Pay — {monthLabel(currentMonthKey)}</p>
                    <p className="text-2xl font-black">{formatCurrency(netPay)}</p>
                  </div>
                  {paidThisMonth ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold text-sm"><Check className="w-4 h-4" /> PAID</span>
                  ) : (
                    <button onClick={() => handleMarkPaid(detailPanel)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition">
                      Mark Paid
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setPayrollModal(detailPanel); setPayrollForm({ type: "bonus", amount: "", reason: "", date: today() }); }}
                    className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white font-bold text-sm hover:bg-violet-600 transition flex items-center justify-center gap-2">
                    <Gift className="w-4 h-4" /> Add Bonus
                  </button>
                  <button onClick={() => { setPayrollModal(detailPanel); setPayrollForm({ type: "deduction", amount: "", reason: "", date: today() }); }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition flex items-center justify-center gap-2">
                    <Scissors className="w-4 h-4" /> Add Deduction
                  </button>
                </div>

                {subLoading ? <p className="text-center text-slate-400 text-sm py-4">Loading…</p> :
                  payroll.length === 0 ? <p className="text-center text-slate-400 text-sm py-6">No payroll entries yet</p> : (
                    <div className="space-y-2">
                      {payroll.map(p => (
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.type === "bonus" ? "bg-violet-50 border-violet-200" : "bg-rose-50 border-rose-200"}`}>
                          <div>
                            <div className="flex items-center gap-2">
                              {p.type === "bonus" ? <TrendingUp className="w-3.5 h-3.5 text-violet-600" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
                              <p className={`text-sm font-bold ${p.type === "bonus" ? "text-violet-700" : "text-rose-700"}`}>
                                {p.type === "bonus" ? "+" : "-"}{formatCurrency(p.amount)}
                              </p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.type === "bonus" ? "bg-violet-100 text-violet-700" : "bg-rose-100 text-rose-700"}`}>
                                {p.type === "bonus" ? "BONUS" : "DEDUCTION"}
                              </span>
                            </div>
                            {p.reason && <p className="text-xs text-slate-500 ml-5 mt-0.5">{p.reason}</p>}
                            <p className="text-[10px] text-slate-400 ml-5">{p.date}</p>
                          </div>
                          <button onClick={() => handleDeletePayroll(p.id)}
                            className="p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-rose-600 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Tab: Leaves */}
            {detailTab === "leaves" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Days Taken (This Year)", value: approvedLeaves, color: "text-amber-600" },
                    { label: "Sick Leave Balance", value: Math.max(0, 12 - leaves.filter(l => l.type === "Sick Leave" && l.status === "approved").reduce((a,b) => a+(b.days||1), 0)), color: "text-blue-600" },
                    { label: "Casual Leave Balance", value: Math.max(0, 12 - leaves.filter(l => l.type === "Casual Leave" && l.status === "approved").reduce((a,b) => a+(b.days||1), 0)), color: "text-emerald-600" },
                  ].map((c, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                      <p className="text-[10px] text-slate-500 font-semibold">{c.label}</p>
                      <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>

                <button onClick={() => setLeaveModal(detailPanel)}
                  className="w-full py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" /> Add Leave Entry
                </button>

                {subLoading ? <p className="text-center text-slate-400 text-sm py-4">Loading…</p> :
                  leaves.length === 0 ? <p className="text-center text-slate-400 text-sm py-6">No leaves recorded</p> : (
                    <div className="space-y-2">
                      {leaves.map(l => (
                        <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.type === "Unpaid Leave" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                {l.type}
                              </span>
                              <span className="text-xs font-bold text-slate-700">{l.days} day{l.days > 1 ? "s" : ""}</span>
                              {l.paid === false && <span className="text-[10px] text-rose-600 font-bold">(Unpaid)</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{l.fromDate} → {l.toDate}</p>
                            {l.reason && <p className="text-[11px] text-slate-400">{l.reason}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                              {(l.status || "approved").toUpperCase()}
                            </span>
                            <button onClick={() => handleDeleteLeave(l.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Tab: Permissions */}
            {detailTab === "permissions" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2 text-blue-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Permissions are based on role. To change, edit the staff member's role.</span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">
                    Access Rights for "{detailPanel.role}"
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(PERM_LABELS).map(([key, label]) => {
                      const has = permissions[key] ?? false;
                      return (
                        <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${has ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${has ? "bg-emerald-500" : "bg-slate-300"}`}>
                            {has ? <Check className="w-3.5 h-3.5 text-white" /> : <X className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className={`text-sm font-semibold ${has ? "text-emerald-800" : "text-slate-500"}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(permissions).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No predefined permissions for this role. All access controlled by owner.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ══ ADD / EDIT MODAL ══ */}
      <Modal isOpen={addModal || !!editModal} onClose={() => { setAddModal(false); setEditModal(null); }}
        title={editModal ? `Edit — ${editModal.name}` : "👤 Add New Staff Member"} maxWidth="max-w-2xl">
        <form onSubmit={editModal ? handleEdit : handleAdd} className="space-y-5 text-slate-800">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-300 shadow" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer shadow hover:bg-emerald-600 transition">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">Upload profile photo</p>
              <p className="text-[11px] text-slate-400">Max 800KB · JPG, PNG</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input required type="text" placeholder="e.g. Coach Amit Kumar" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            {form.role === "Custom…" && (
              <div>
                <label className="text-xs font-bold text-slate-700">Custom Role Name *</label>
                <input type="text" placeholder="Enter role" value={form.customRole}
                  onChange={e => setForm({ ...form, customRole: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700">Department</label>
              <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500">
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Phone *</label>
              <input required type="tel" placeholder="9876543210" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Email</label>
              <input type="email" placeholder="staff@example.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Monthly Salary (₹) *</label>
              <input required type="number" min="0" value={form.salary}
                onChange={e => setForm({ ...form, salary: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Join Date</label>
              <input type="date" value={form.joinDate}
                onChange={e => setForm({ ...form, joinDate: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="onleave">On Leave</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Address</label>
              <input type="text" placeholder="Full address" value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Emergency Contact Name</label>
              <input type="text" placeholder="Guardian / Spouse" value={form.emergencyContact}
                onChange={e => setForm({ ...form, emergencyContact: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Emergency Phone</label>
              <input type="tel" placeholder="9999000000" value={form.emergencyPhone}
                onChange={e => setForm({ ...form, emergencyPhone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Bio / Notes</label>
              <textarea rows={3} placeholder="Experience, specialization, notes…" value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500 resize-none" />
            </div>
          </div>

          <button type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow hover:opacity-90 transition">
            {editModal ? "Save Changes" : "Add Staff Member"}
          </button>
        </form>
      </Modal>

      {/* ══ ADD LEAVE MODAL ══ */}
      <Modal isOpen={!!leaveModal} onClose={() => setLeaveModal(null)} title={`📅 Add Leave — ${leaveModal?.name}`} maxWidth="max-w-md">
        <form onSubmit={handleAddLeave} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Leave Type *</label>
            <select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500">
              {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">From Date *</label>
              <input required type="date" value={leaveForm.fromDate}
                onChange={e => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">To Date *</label>
              <input required type="date" value={leaveForm.toDate} min={leaveForm.fromDate}
                onChange={e => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Reason</label>
            <textarea rows={2} placeholder="Brief reason…" value={leaveForm.reason}
              onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-emerald-500" />
          </div>
          {leaveForm.fromDate && leaveForm.toDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-sm font-semibold">
              {Math.max(1, Math.round((new Date(leaveForm.toDate) - new Date(leaveForm.fromDate)) / 86400000) + 1)} day(s) of leave
              {leaveForm.type === "Unpaid Leave" && " (will be deducted from salary)"}
            </div>
          )}
          <button type="submit" className="w-full py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition">
            Record Leave
          </button>
        </form>
      </Modal>

      {/* ══ BONUS / DEDUCTION MODAL ══ */}
      <Modal isOpen={!!payrollModal} onClose={() => setPayrollModal(null)}
        title={payrollForm.type === "bonus" ? `🎁 Add Bonus — ${payrollModal?.name}` : `✂️ Add Deduction — ${payrollModal?.name}`}
        maxWidth="max-w-md">
        <form onSubmit={handleAddPayroll} className="space-y-4 text-slate-800">
          <div className="flex rounded-xl overflow-hidden border border-slate-300">
            <button type="button" onClick={() => setPayrollForm({ ...payrollForm, type: "bonus" })}
              className={`flex-1 py-2.5 text-sm font-bold transition ${payrollForm.type === "bonus" ? "bg-violet-500 text-white" : "bg-slate-50 text-slate-600"}`}>
              Bonus
            </button>
            <button type="button" onClick={() => setPayrollForm({ ...payrollForm, type: "deduction" })}
              className={`flex-1 py-2.5 text-sm font-bold transition ${payrollForm.type === "deduction" ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-600"}`}>
              Deduction
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Amount (₹) *</label>
            <input required type="number" min="1" placeholder="e.g. 2000" value={payrollForm.amount}
              onChange={e => setPayrollForm({ ...payrollForm, amount: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Reason *</label>
            <input required type="text"
              placeholder={payrollForm.type === "bonus" ? "e.g. Performance bonus, Festival" : "e.g. Late fine, Advance deduction"}
              value={payrollForm.reason}
              onChange={e => setPayrollForm({ ...payrollForm, reason: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Date</label>
            <input type="date" value={payrollForm.date}
              onChange={e => setPayrollForm({ ...payrollForm, date: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <button type="submit"
            className={`w-full py-3 rounded-2xl text-white font-bold text-sm transition ${payrollForm.type === "bonus" ? "bg-violet-500 hover:bg-violet-600" : "bg-rose-500 hover:bg-rose-600"}`}>
            Add {payrollForm.type === "bonus" ? "Bonus" : "Deduction"}
          </button>
        </form>
      </Modal>

      {/* ══ DELETE CONFIRM ══ */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="⚠️ Confirm Delete" maxWidth="max-w-sm">
        <div className="space-y-4 text-center">
          <p className="text-slate-600 text-sm">Are you sure you want to remove <strong>{deleteConfirm?.name}</strong> from staff? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Dummy Data ────────────────────────────────────────────────────
const DUMMY_STAFF = [
  { id: "st1", name: "Coach Amit Kumar", role: "Head Trainer", department: "Training", phone: "9876500111", email: "amit@univogym.com", salary: "35000", joinDate: "2025-01-15", status: "active", bio: "8 years experience in strength training." },
  { id: "st2", name: "Coach Sneha Rao", role: "Female Fitness Coach", department: "Training", phone: "9811200222", email: "sneha@univogym.com", salary: "30000", joinDate: "2025-03-01", status: "active" },
  { id: "st3", name: "Coach Rohan Joshi", role: "Strength & Conditioning Coach", department: "Training", phone: "9988700333", email: "rohan@univogym.com", salary: "28000", joinDate: "2025-06-10", status: "onleave" },
  { id: "st4", name: "Kunal Sharma", role: "Reception & Operations", department: "Operations", phone: "9711000444", email: "kunal@univogym.com", salary: "18000", joinDate: "2025-08-01", status: "active" },
];
