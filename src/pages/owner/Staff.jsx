import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Phone, Mail, Calendar, IndianRupee, Search,
  Trash2, Edit3, ChevronRight, X, Check, Clock,
  Users, BadgeCheck, Gift, Scissors, CreditCard,
  Camera, MessageCircle, FileText, Filter,
  TrendingUp, TrendingDown, AlertCircle, Download
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  getStaff, addStaff, updateStaff, deleteStaff,
  getPayrollEntries, addPayrollEntry, deletePayrollEntry,
  markSalaryPaid, getSalaryHistory
} from "../../firebase/staff";
import { addExpense } from "../../firebase/expenses";
import toast from "react-hot-toast";

// --- Constants ---------------------------------------------------
const ROLES = [
  "Head Trainer", "Senior Trainer", "Female Fitness Coach",
  "Yoga / Zumba Instructor", "Nutritionist",
  "Reception / Front Desk", "Accounts",
  "Maintenance & Cleaning", "Security Guard", "Custom Role"
];

const STATUS_COLORS = {
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  onleave:  "bg-amber-50 text-amber-700 border-amber-200",
};

function fmtCurrency(n) {
  return "Rs. " + Number(n || 0).toLocaleString("en-IN");
}
function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function monthKey(date) {
  const d = new Date(date || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  return new Date(y, m - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
// Next month's 1st date (salary due date)
function nextMonthFirst(joinDate) {
  const d = new Date(joinDate || Date.now());
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0];
}
// Current month key
function currentMonthKey() {
  return monthKey(new Date());
}

function Avatar({ name, photo, size = "md" }) {
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-emerald-500", "bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-orange-500"];
  const bg = colors[(name || " ").charCodeAt(0) % colors.length];
  if (photo) return <img src={photo} alt={name} className={`${sz} rounded-xl object-cover flex-shrink-0 border border-slate-200`} />;
  return <div className={`${sz} ${bg} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}>{initials}</div>;
}

import { usePermissions } from "../../hooks/usePermissions";

// --- Main Page ---------------------------------------------------
export default function Staff() {
  const { gymId } = useAuth();
  const GID = gymId || "univo_main";
  const { create: canCreate, edit: canEdit, delete: canDelete } = usePermissions("staff");

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Salary table state
  const [salaryMonth, setSalaryMonth] = useState(currentMonthKey());
  const [salarySearch, setSalarySearch] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("all"); // all | paid | pending
  const [staffPayrollMap, setStaffPayrollMap] = useState({}); // staffId -> {bonuses, deductions, paid}

  // Modals
  const [addModal, setAddModal]     = useState(false);
  const [editStaff, setEditStaff]   = useState(null);
  const [viewStaff, setViewStaff]   = useState(null);
  const [payrollModal, setPayrollModal] = useState(null); // { staff, type }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Forms
  const emptyForm = {
    name: "", role: "Senior Trainer", customRole: "",
    phone: "", email: "",
    salary: "", joinDate: todayStr(),
    aadhaarNo: "", aadhaarFront: "", aadhaarBack: "",
    photoUrl: "", status: "active", notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [payrollForm, setPayrollForm] = useState({ type: "bonus", amount: "", reason: "", date: todayStr() });

  // --- Load staff ------------------------------------------------
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

  // Load payroll data for salary table whenever month changes
  useEffect(() => {
    async function loadPayrolls() {
      const map = {};
      await Promise.all(staffList.map(async (s) => {
        try {
          const [entries, history] = await Promise.all([
            getPayrollEntries(GID, s.id),
            getSalaryHistory(GID, s.id),
          ]);
          const monthEntries = entries.filter(e => e.month === salaryMonth);
          const bonuses    = monthEntries.filter(e => e.type === "bonus").reduce((a, b) => a + b.amount, 0);
          const deductions = monthEntries.filter(e => e.type === "deduction").reduce((a, b) => a + b.amount, 0);
          const paid       = history.find(h => h.id === salaryMonth && h.status === "paid");
          map[s.id] = { bonuses, deductions, paid: !!paid, paidData: paid };
        } catch {
          map[s.id] = { bonuses: 0, deductions: 0, paid: false };
        }
      }));
      setStaffPayrollMap(map);
    }
    if (staffList.length > 0) loadPayrolls();
  }, [staffList, salaryMonth, GID]);

  // --- Staff CRUD -------------------------------------------------
  const handleSave = async (e) => {
    e.preventDefault();
    const finalRole = form.role === "Custom Role" ? (form.customRole || "Custom") : form.role;
    const data = { ...form, role: finalRole };
    delete data.customRole;
    if (!data.name || !data.phone || !data.salary) {
      toast.error("Name, Phone, and Salary are required");
      return;
    }
    try {
      if (editStaff) {
        await updateStaff(GID, editStaff.id, data);
        setStaffList(prev => prev.map(s => s.id === editStaff.id ? { ...s, ...data } : s));
        toast.success("Staff updated!");
        setEditStaff(null);
      } else {
        const id = await addStaff(GID, data);
        const newStaff = { ...data, id };
        setStaffList(prev => [newStaff, ...prev]);

        // Auto-add salary expense for next month
        const dueDate = nextMonthFirst(data.joinDate);
        try {
          await addExpense(GID, {
            title: `Salary - ${data.name} (${finalRole})`,
            category: "Staff Salary",
            type: "monthly",
            amount: Number(data.salary),
            date: dueDate,
            staffId: id,
            isAutoSalary: true,
          });
          toast.success(`Staff added! Salary Rs.${Number(data.salary).toLocaleString()} scheduled in expenses from ${dueDate}`);
        } catch {
          toast.success("Staff added! (Expense auto-add skipped)");
        }

        setAddModal(false);
        setForm(emptyForm);
      }
    } catch (err) {
      toast.error(err.message || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStaff(GID, deleteConfirm.id);
      setStaffList(prev => prev.filter(s => s.id !== deleteConfirm.id));
      toast.success("Staff removed.");
    } catch { toast.error("Delete failed"); }
    setDeleteConfirm(null);
  };

  // --- Mark Salary Paid --------------------------------------------
  const handleMarkPaid = async (s) => {
    const pd = staffPayrollMap[s.id] || {};
    const net = Number(s.salary || 0) + (pd.bonuses || 0) - (pd.deductions || 0);
    try {
      await markSalaryPaid(GID, s.id, salaryMonth, {
        base: Number(s.salary), bonuses: pd.bonuses || 0,
        deductions: pd.deductions || 0, net, month: salaryMonth,
      });
      setStaffPayrollMap(prev => ({
        ...prev, [s.id]: { ...prev[s.id], paid: true },
      }));
      toast.success(`${s.name} - ${fmtCurrency(net)} marked PAID for ${monthLabel(salaryMonth)}`);
    } catch (err) { toast.error(err.message); }
  };

  // --- Payroll entry --------------------------------------------
  const handleAddPayroll = async (e) => {
    e.preventDefault();
    if (!payrollForm.amount || Number(payrollForm.amount) <= 0) { toast.error("Enter valid amount"); return; }
    try {
      await addPayrollEntry(GID, payrollModal.id, {
        ...payrollForm, month: salaryMonth,
        amount: Number(payrollForm.amount),
      });
      // refresh map
      setStaffPayrollMap(prev => {
        const cur = prev[payrollModal.id] || { bonuses: 0, deductions: 0 };
        const amt = Number(payrollForm.amount);
        return {
          ...prev,
          [payrollModal.id]: {
            ...cur,
            bonuses: payrollForm.type === "bonus" ? cur.bonuses + amt : cur.bonuses,
            deductions: payrollForm.type === "deduction" ? cur.deductions + amt : cur.deductions,
          }
        };
      });
      toast.success(`${payrollForm.type === "bonus" ? "Bonus" : "Deduction"} added!`);
      setPayrollModal(null);
      setPayrollForm({ type: "bonus", amount: "", reason: "", date: todayStr() });
    } catch (err) { toast.error(err.message); }
  };

  // --- Photo / Aadhaar upload --------------------------------------
  const handleFileUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1000 * 1024) { toast.error("File must be under 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  // --- Computed ----------------------------------------------------
  const uniqueRoles = [...new Set(staffList.map(s => s.role).filter(Boolean))];

  const filteredStaff = staffList.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || (s.name || "").toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q) || (s.phone || "").includes(q);
    const matchR = filterRole === "all" || s.role === filterRole;
    return matchQ && matchR;
  });

  // Salary table rows
  const salaryRows = staffList.filter(s => {
    const q = salarySearch.toLowerCase();
    const matchQ = !q || (s.name || "").toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q);
    const pd = staffPayrollMap[s.id];
    const matchF = salaryFilter === "all" || (salaryFilter === "paid" && pd?.paid) || (salaryFilter === "pending" && !pd?.paid);
    // Only show staff who joined on or before this salary month
    const joinMK = monthKey(s.joinDate);
    const joinedBeforeOrDuring = joinMK <= salaryMonth;
    return matchQ && matchF && joinedBeforeOrDuring;
  });

  const totalPayroll = salaryRows.reduce((a, s) => {
    const pd = staffPayrollMap[s.id] || {};
    return a + Number(s.salary || 0) + (pd.bonuses || 0) - (pd.deductions || 0);
  }, 0);

  const paidCount = salaryRows.filter(s => staffPayrollMap[s.id]?.paid).length;
  const pendingCount = salaryRows.length - paidCount;

  // --- Render ------------------------------------------------------
  return (
    <div className="space-y-6">

      {/* --- Header --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 text-xs mt-1">Add staff - salary auto-appears in Expenses next month</p>
        </div>
        {canCreate && (
          <button onClick={() => { setForm(emptyForm); setAddModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Add Staff Member
          </button>
        )}
      </div>

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Staff", value: staffList.length, icon: <Users className="w-5 h-5" />, color: "text-blue-600 bg-blue-50" },
          { label: "Active", value: staffList.filter(s => (s.status || "active") === "active").length, icon: <BadgeCheck className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-50" },
          { label: "Pending Salary", value: pendingCount, icon: <Clock className="w-5 h-5" />, color: "text-amber-600 bg-amber-50" },
          { label: "Total Payroll", value: fmtCurrency(staffList.reduce((a, s) => a + Number(s.salary || 0), 0)), icon: <IndianRupee className="w-5 h-5" />, color: "text-violet-600 bg-violet-50" },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>{c.icon}</div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{c.label}</p>
              <p className="text-lg font-extrabold text-slate-900 truncate">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- Search / Filter --- */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search staff by name, role, phone..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 focus:border-emerald-500 outline-none shadow-sm" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 focus:border-emerald-500 outline-none shadow-sm">
          <option value="all">All Roles</option>
          {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* --- Staff Cards Grid --- */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading staff...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold">No staff found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStaff.map(s => {
            const st = s.status || "active";
            return (
              <div key={s.id} onClick={() => setViewStaff(s)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition cursor-pointer">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={s.name} photo={s.photoUrl} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{s.role}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 capitalize ${STATUS_COLORS[st]}`}>
                      {st === "onleave" ? "Leave" : st}
                    </span>
                  </div>

                  {s.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {s.phone}
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400">Monthly Salary</p>
                      <p className="text-sm font-extrabold text-emerald-700">{fmtCurrency(s.salary)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setForm({ ...emptyForm, ...s, customRole: "" }); setEditStaff(s); setAddModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(s); }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          SALARY TABLE
      ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Salary Tracker</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {paidCount} Paid - {pendingCount} Pending - Total {fmtCurrency(totalPayroll)}
              </p>
            </div>
            {/* Month selector */}
            <input type="month" value={salaryMonth}
              onChange={e => setSalaryMonth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-emerald-500 outline-none" />
          </div>

          {/* Table filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Search in salary table..."
                value={salarySearch} onChange={e => setSalarySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-emerald-500 outline-none" />
            </div>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-bold">
              {[["all", "All"], ["pending", "Pending"], ["paid", "Paid"]].map(([val, label]) => (
                <button key={val} onClick={() => setSalaryFilter(val)}
                  className={`px-4 py-2 transition ${salaryFilter === val ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Staff</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Role</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Base</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Bonus</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Deduction</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Net Pay</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salaryRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    No staff found for {monthLabel(salaryMonth)}
                  </td>
                </tr>
              ) : salaryRows.map(s => {
                const pd = staffPayrollMap[s.id] || { bonuses: 0, deductions: 0, paid: false };
                const net = Number(s.salary || 0) + (pd.bonuses || 0) - (pd.deductions || 0);
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    {/* Staff */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} photo={s.photoUrl} size="sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-400">Joined {s.joinDate}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">{s.role}</span>
                    </td>
                    {/* Base */}
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{fmtCurrency(s.salary)}</td>
                    {/* Bonus */}
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {pd.bonuses > 0
                        ? <span className="text-xs font-bold text-emerald-600">+{fmtCurrency(pd.bonuses)}</span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                    {/* Deduction */}
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {pd.deductions > 0
                        ? <span className="text-xs font-bold text-rose-600">-{fmtCurrency(pd.deductions)}</span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                    {/* Net Pay */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-extrabold text-slate-900">{fmtCurrency(net)}</span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {pd.paid
                        ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {!pd.paid && (
                          <button onClick={() => handleMarkPaid(s)}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition whitespace-nowrap">
                            Mark Paid
                          </button>
                        )}
                        <button onClick={() => { setPayrollModal(s); setPayrollForm({ type: "bonus", amount: "", reason: "", date: todayStr() }); }}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition" title="Add Bonus">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setPayrollModal(s); setPayrollForm({ type: "deduction", amount: "", reason: "", date: todayStr() }); }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition" title="Add Deduction">
                          <TrendingDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total Row */}
            {salaryRows.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold text-slate-700">
                    Total ({salaryRows.length} staff) - {monthLabel(salaryMonth)}
                  </td>
                  <td className="px-4 py-3 text-right text-base font-extrabold text-slate-900">{fmtCurrency(totalPayroll)}</td>
                  <td colSpan={2} className="px-4 py-3 text-center text-xs text-slate-500">
                    {paidCount}/{salaryRows.length} Paid
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* == ADD / EDIT STAFF MODAL == */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); setEditStaff(null); setForm(emptyForm); }}
        title={editStaff ? `Edit - ${editStaff.name}` : "Add New Staff Member"} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">

          {/* Photo upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {form.photoUrl
                ? <img src={form.photoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-300 shadow" />
                : <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center"><Camera className="w-7 h-7 text-slate-400" /></div>
              }
              <label className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer shadow hover:bg-emerald-600 transition">
                <Camera className="w-3.5 h-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "photoUrl")} />
              </label>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Profile Photo</p>
              <p className="text-[11px] text-slate-400">JPG/PNG (max 1MB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input required type="text" placeholder="e.g. Coach Amit Kumar" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="inp" />
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-bold text-slate-700">Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="inp">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {form.role === "Custom Role" && (
              <div>
                <label className="text-xs font-bold text-slate-700">Custom Role Name</label>
                <input type="text" placeholder="e.g. Floor Manager" value={form.customRole}
                  onChange={e => setForm({ ...form, customRole: e.target.value })}
                  className="inp" />
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-slate-700">Phone Number *</label>
              <input required type="tel" placeholder="9876543210" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="inp" />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-700">Email (optional)</label>
              <input type="email" placeholder="staff@email.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="inp" />
            </div>

            {/* Salary */}
            <div>
              <label className="text-xs font-bold text-slate-700">Monthly Salary (Rs.) *</label>
              <input required type="number" min="0" placeholder="e.g. 25000" value={form.salary}
                onChange={e => setForm({ ...form, salary: e.target.value })}
                className="inp" />
            </div>

            {/* Join Date */}
            <div>
              <label className="text-xs font-bold text-slate-700">Join Date</label>
              <input type="date" value={form.joinDate}
                onChange={e => setForm({ ...form, joinDate: e.target.value })}
                className="inp" />
              {form.joinDate && (
                <p className="text-[11px] text-emerald-600 mt-1">
                  Salary in expenses from: <strong>{nextMonthFirst(form.joinDate)}</strong>
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-bold text-slate-700">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="inp">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="onleave">On Leave</option>
              </select>
            </div>

            {/* Aadhaar Number */}
            <div>
              <label className="text-xs font-bold text-slate-700">Aadhaar Card Number</label>
              <input type="text" placeholder="XXXX XXXX XXXX" maxLength={14} value={form.aadhaarNo}
                onChange={e => setForm({ ...form, aadhaarNo: e.target.value.replace(/[^0-9 ]/g, "") })}
                className="inp" />
            </div>

            {/* Aadhaar Front */}
            <div>
              <label className="text-xs font-bold text-slate-700">Aadhaar Card - Front</label>
              <div className="mt-1">
                {form.aadhaarFront
                  ? <div className="relative">
                      <img src={form.aadhaarFront} alt="Aadhaar Front" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, aadhaarFront: "" }))}
                        className="absolute top-1 right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  : <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 transition">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Upload front photo/scan</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e, "aadhaarFront")} />
                    </label>
                }
              </div>
            </div>

            {/* Aadhaar Back */}
            <div>
              <label className="text-xs font-bold text-slate-700">Aadhaar Card - Back</label>
              <div className="mt-1">
                {form.aadhaarBack
                  ? <div className="relative">
                      <img src={form.aadhaarBack} alt="Aadhaar Back" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, aadhaarBack: "" }))}
                        className="absolute top-1 right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  : <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 transition">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Upload back photo/scan</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e, "aadhaarBack")} />
                    </label>
                }
              </div>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Notes (optional)</label>
              <textarea rows={2} placeholder="Any additional info..." value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white outline-none focus:border-emerald-500 resize-none" />
            </div>
          </div>

          {/* Info box */}
          {!editStaff && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2 text-emerald-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Staff added on <strong>{form.joinDate}</strong> - salary of <strong>{fmtCurrency(form.salary)}</strong> will automatically appear in <strong>Expenses</strong> from <strong>{nextMonthFirst(form.joinDate)}</strong> onwards.
              </span>
            </div>
          )}

          <button type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow hover:opacity-90 transition">
            {editStaff ? "Save Changes" : "Add Staff & Schedule Salary"}
          </button>
        </form>
      </Modal>

      {/* == VIEW STAFF DETAIL == */}
      <Modal isOpen={!!viewStaff} onClose={() => setViewStaff(null)} title="" maxWidth="max-w-lg">
        {viewStaff && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={viewStaff.name} photo={viewStaff.photoUrl} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">{viewStaff.name}</h2>
                <p className="text-sm text-slate-500">{viewStaff.role}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 capitalize ${STATUS_COLORS[viewStaff.status || "active"]}`}>
                  {viewStaff.status || "active"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Phone", value: viewStaff.phone },
                { label: "Email", value: viewStaff.email || "-" },
                { label: "Monthly Salary", value: fmtCurrency(viewStaff.salary) },
                { label: "Join Date", value: viewStaff.joinDate },
                { label: "Salary From", value: nextMonthFirst(viewStaff.joinDate) },
                { label: "Aadhaar No.", value: viewStaff.aadhaarNo || "-" },
              ].map((r, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{r.label}</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Aadhaar Images */}
            {(viewStaff.aadhaarFront || viewStaff.aadhaarBack) && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Aadhaar Card</p>
                <div className="grid grid-cols-2 gap-3">
                  {viewStaff.aadhaarFront && (
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Front</p>
                      <img src={viewStaff.aadhaarFront} alt="Aadhaar Front" className="w-full rounded-xl border border-slate-200 object-cover h-24" />
                    </div>
                  )}
                  {viewStaff.aadhaarBack && (
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Back</p>
                      <img src={viewStaff.aadhaarBack} alt="Aadhaar Back" className="w-full rounded-xl border border-slate-200 object-cover h-24" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewStaff.notes && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Notes</p>
                <p className="text-sm text-slate-700">{viewStaff.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setForm({ ...emptyForm, ...viewStaff, customRole: "" }); setEditStaff(viewStaff); setAddModal(true); setViewStaff(null); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
              {viewStaff.phone && (
                <a href={`https://wa.me/91${viewStaff.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-green-50 text-green-700 font-bold text-sm hover:bg-green-100 transition border border-green-200 flex items-center justify-center gap-1.5">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
              <button onClick={() => { setDeleteConfirm(viewStaff); setViewStaff(null); }}
                className="flex-1 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-sm hover:bg-rose-100 transition border border-rose-200 flex items-center justify-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* == BONUS / DEDUCTION MODAL == */}
      <Modal isOpen={!!payrollModal} onClose={() => setPayrollModal(null)}
        title={payrollForm.type === "bonus" ? `Add Bonus - ${payrollModal?.name}` : `Add Deduction - ${payrollModal?.name}`}
        maxWidth="max-w-sm">
        <form onSubmit={handleAddPayroll} className="space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <button type="button" onClick={() => setPayrollForm(p => ({ ...p, type: "bonus" }))}
              className={`flex-1 py-2.5 text-sm font-bold transition ${payrollForm.type === "bonus" ? "bg-violet-500 text-white" : "bg-slate-50 text-slate-600"}`}>
              Bonus
            </button>
            <button type="button" onClick={() => setPayrollForm(p => ({ ...p, type: "deduction" }))}
              className={`flex-1 py-2.5 text-sm font-bold transition ${payrollForm.type === "deduction" ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-600"}`}>
              Deduction
            </button>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Amount (Rs.) *</label>
            <input required type="number" min="1" placeholder="e.g. 1500" value={payrollForm.amount}
              onChange={e => setPayrollForm(p => ({ ...p, amount: e.target.value }))}
              className="inp" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Reason *</label>
            <input required type="text"
              placeholder={payrollForm.type === "bonus" ? "e.g. Performance, Festival" : "e.g. Late fine, Advance deducted"}
              value={payrollForm.reason}
              onChange={e => setPayrollForm(p => ({ ...p, reason: e.target.value }))}
              className="inp" />
          </div>
          <button type="submit"
            className={`w-full py-3 rounded-2xl text-white font-bold text-sm transition ${payrollForm.type === "bonus" ? "bg-violet-500 hover:bg-violet-600" : "bg-rose-500 hover:bg-rose-600"}`}>
            Add {payrollForm.type === "bonus" ? "Bonus" : "Deduction"} for {monthLabel(salaryMonth)}
          </button>
        </form>
      </Modal>

      {/* == DELETE CONFIRM == */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" maxWidth="max-w-sm">
        <div className="space-y-4 text-center">
          <p className="text-slate-600 text-sm">Remove <strong>{deleteConfirm?.name}</strong> from staff? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition">Yes, Delete</button>
          </div>
        </div>
      </Modal>

      {/* Inline class helper */}
      <style>{`.inp { width: 100%; margin-top: 4px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px 16px; font-size: 14px; color: #0f172a; outline: none; } .inp:focus { background: white; border-color: #10b981; }`}</style>
    </div>
  );
}

// --- Dummy Data ----------------------------------------------------
const DUMMY_STAFF = [
  { id: "st1", name: "Coach Amit Kumar",  role: "Head Trainer",          phone: "9876500111", email: "amit@gym.com",   salary: "35000", joinDate: "2026-08-01", status: "active" },
  { id: "st2", name: "Coach Sneha Rao",   role: "Female Fitness Coach",  phone: "9811200222", email: "sneha@gym.com",  salary: "30000", joinDate: "2026-08-01", status: "active" },
  { id: "st3", name: "Coach Rohan Joshi", role: "Senior Trainer",        phone: "9988700333", email: "rohan@gym.com",  salary: "28000", joinDate: "2026-08-15", status: "active" },
  { id: "st4", name: "Kunal Sharma",      role: "Reception / Front Desk",phone: "9711000444", email: "kunal@gym.com",  salary: "18000", joinDate: "2026-08-01", status: "active" },
  { id: "st5", name: "Ravi Cleaning",     role: "Maintenance & Cleaning",phone: "9900112233", email: "",               salary: "12000", joinDate: "2026-08-01", status: "active" },
];
