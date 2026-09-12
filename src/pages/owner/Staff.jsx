import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Phone, Mail, Calendar, Search,
  Trash2, Edit3, ChevronRight, X, Check, Clock,
  Users, BadgeCheck, Gift, Scissors, CreditCard,
  Camera, MessageCircle, FileText, Filter,
  TrendingUp, TrendingDown, AlertCircle, Download,
  ShieldCheck, Eye, ChevronLeft, DollarSign, UserCheck,
  UserX, Briefcase, Award, CheckCircle2, ChevronDown
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
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
  "Reception / Front Desk", "Accounts & Billing",
  "Maintenance & Cleaning", "Security Guard", "Custom Role"
];

const STATUS_COLORS = {
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  onleave:  "bg-amber-50 text-amber-700 border-amber-200",
};

const ROLE_COLORS = {
  "Head Trainer": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Senior Trainer": "bg-teal-50 text-teal-700 border-teal-200",
  "Female Fitness Coach": "bg-pink-50 text-pink-700 border-pink-200",
  "Yoga / Zumba Instructor": "bg-purple-50 text-purple-700 border-purple-200",
  "Nutritionist": "bg-lime-50 text-lime-700 border-lime-200",
  "Reception / Front Desk": "bg-blue-50 text-blue-700 border-blue-200",
  "Accounts & Billing": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Maintenance & Cleaning": "bg-amber-50 text-amber-700 border-amber-200",
  "Security Guard": "bg-slate-100 text-slate-700 border-slate-200",
  "Custom Role": "bg-slate-50 text-slate-600 border-slate-200",
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

function nextMonthFirst(joinDate) {
  const d = new Date(joinDate || Date.now());
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split("T")[0];
}

function currentMonthKey() {
  return monthKey(new Date());
}

function StaffAvatar({ name, photo, size = "md" }) {
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-emerald-500", "bg-teal-500", "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-rose-500", "bg-amber-500"];
  const bg = colors[(name || " ").charCodeAt(0) % colors.length];
  
  if (photo) {
    return (
      <img 
        src={photo} 
        alt={name} 
        className={`${sz} rounded-2xl object-cover flex-shrink-0 border border-slate-200 shadow-sm`} 
      />
    );
  }
  return (
    <div className={`${sz} ${bg} rounded-2xl flex items-center justify-center text-white font-extrabold flex-shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

// --- Main Page Component -----------------------------------------
export default function Staff() {
  const { gymId } = useAuth();
  const GID = gymId || "univo_main";
  const { create: canCreate, edit: canEdit, delete: canDelete } = usePermissions("staff");

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("directory"); // "directory" | "payroll"
  
  // Search and filters for directory
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Salary tracker state
  const [salaryMonth, setSalaryMonth] = useState(currentMonthKey());
  const [salarySearch, setSalarySearch] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("all"); // all | paid | pending
  const [staffPayrollMap, setStaffPayrollMap] = useState({});

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [viewStaff, setViewStaff] = useState(null);
  const [payrollModal, setPayrollModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState("basic"); // "basic" | "salary" | "aadhaar"

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

  // Load payroll data whenever month or staff list changes
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
  }, [GID, staffList, salaryMonth]);

  // --- Month navigation helpers ---
  const handlePrevMonth = () => {
    const [y, m] = salaryMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setSalaryMonth(monthKey(d));
  };

  const handleNextMonth = () => {
    const [y, m] = salaryMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSalaryMonth(monthKey(d));
  };

  // --- Handlers --------------------------------------------------
  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Image must be smaller than 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, [field]: reader.result }));
      toast.success("Document attached");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.salary) {
      toast.error("Please fill Name, Phone, and Monthly Salary");
      return;
    }

    const payload = {
      ...form,
      role: form.role === "Custom Role" ? (form.customRole || "Custom Role") : form.role,
      salary: Number(form.salary),
    };

    try {
      if (editStaff) {
        await updateStaff(GID, editStaff.id, payload);
        toast.success("Staff details updated");
      } else {
        await addStaff(GID, payload);
        toast.success(`Staff registered! Salary expense starts ${nextMonthFirst(form.joinDate)}`);
      }
      setAddModal(false);
      setEditStaff(null);
      setForm(emptyForm);
      loadStaff();
    } catch {
      toast.error("Failed to save staff information");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteStaff(GID, deleteConfirm.id);
      toast.success("Staff profile deleted");
      setDeleteConfirm(null);
      loadStaff();
    } catch {
      toast.error("Failed to delete staff member");
    }
  };

  const handleAddPayroll = async (e) => {
    e.preventDefault();
    if (!payrollForm.amount || !payrollForm.reason.trim()) {
      toast.error("Please provide amount and reason");
      return;
    }
    try {
      await addPayrollEntry(GID, payrollModal.id, {
        month: salaryMonth,
        type: payrollForm.type,
        amount: Number(payrollForm.amount),
        reason: payrollForm.reason,
        date: payrollForm.date,
      });
      toast.success(`${payrollForm.type === "bonus" ? "Bonus" : "Deduction"} recorded`);
      setPayrollModal(null);
      setPayrollForm({ type: "bonus", amount: "", reason: "", date: todayStr() });
      loadStaff();
    } catch {
      toast.error("Failed to record payroll entry");
    }
  };

  const handleMarkPaid = async (staff) => {
    const pd = staffPayrollMap[staff.id] || {};
    const net = Number(staff.salary || 0) + (pd.bonuses || 0) - (pd.deductions || 0);

    try {
      await markSalaryPaid(GID, staff.id, salaryMonth, {
        staffName: staff.name,
        role: staff.role,
        baseSalary: Number(staff.salary || 0),
        bonuses: pd.bonuses || 0,
        deductions: pd.deductions || 0,
        netPay: net,
        paidDate: todayStr(),
      });

      await addExpense(GID, {
        title: `Staff Salary: ${staff.name} (${monthLabel(salaryMonth)})`,
        amount: net,
        category: "Staff Salary",
        date: todayStr(),
        type: "salary",
        isRecurring: false,
        notes: `Base: Rs. ${staff.salary} | Bonus: Rs. ${pd.bonuses || 0} | Deductions: Rs. ${pd.deductions || 0}`,
      });

      toast.success(`Salary marked paid and logged in Expenses!`);
      loadStaff();
    } catch {
      toast.error("Failed to record salary payment");
    }
  };

  // --- Filtering ---------------------------------------------------
  const uniqueRoles = Array.from(new Set(staffList.map(s => s.role).filter(Boolean)));

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const q = search.toLowerCase();
      const matchQ = (s.name || "").toLowerCase().includes(q)
        || (s.role || "").toLowerCase().includes(q)
        || (s.phone || "").includes(q);
      const matchR = filterRole === "all" || s.role === filterRole;
      const matchS = filterStatus === "all" || (s.status || "active") === filterStatus;
      return matchQ && matchR && matchS;
    });
  }, [staffList, search, filterRole, filterStatus]);

  // Salary Table rows
  const salaryRows = useMemo(() => {
    return staffList.filter(s => {
      const q = salarySearch.toLowerCase();
      const matchQ = (s.name || "").toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q);
      const pd = staffPayrollMap[s.id] || {};
      const matchF = salaryFilter === "all"
        ? true
        : salaryFilter === "paid" ? pd.paid : !pd.paid;
      
      const joinMK = monthKey(s.joinDate || Date.now());
      const joinedBeforeOrDuring = joinMK <= salaryMonth;
      return matchQ && matchF && joinedBeforeOrDuring;
    });
  }, [staffList, salarySearch, staffPayrollMap, salaryFilter, salaryMonth]);

  const totalPayroll = salaryRows.reduce((a, s) => {
    const pd = staffPayrollMap[s.id] || {};
    return a + Number(s.salary || 0) + (pd.bonuses || 0) - (pd.deductions || 0);
  }, 0);

  const paidCount = salaryRows.filter(s => staffPayrollMap[s.id]?.paid).length;
  const pendingCount = salaryRows.length - paidCount;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">

      {/* ============================================================
          TOP HERO & METRICS SECTION
      ============================================================ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Human Resources & Payroll
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Staff & Payroll Hub
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Maintain coach profiles, staff identity documents, track salary disbursements, and auto-sync payroll with daily gym expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {canCreate && (
              <button 
                onClick={() => { 
                  setForm(emptyForm); 
                  setEditStaff(null); 
                  setActiveModalTab("basic");
                  setAddModal(true); 
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Staff Member
              </button>
            )}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Staff Members</p>
            <p className="text-2xl font-black text-white mt-1">{staffList.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Active On-Duty</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {staffList.filter(s => (s.status || "active") === "active").length}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Monthly Payroll</p>
            <p className="text-2xl font-black text-teal-300 mt-1">
              {fmtCurrency(staffList.reduce((a, s) => a + Number(s.salary || 0), 0))}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Pending Salary</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingCount} Staff</p>
          </div>
        </div>
      </div>

      {/* ============================================================
          VIEW SELECTOR TABS
      ============================================================ */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              activeTab === "directory"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" /> Staff Directory ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              activeTab === "payroll"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Monthly Payroll Tracker
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* ============================================================
          TAB 1: STAFF DIRECTORY
      ============================================================ */}
      {activeTab === "directory" && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff by name, role, phone..."
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition" 
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select 
                value={filterRole} 
                onChange={e => setFilterRole(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:border-emerald-500 outline-none"
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:border-emerald-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="onleave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading staff directory...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Staff Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                {search || filterRole !== "all" || filterStatus !== "all"
                  ? "No staff matched your active filters." 
                  : "Start by registering your trainers, front desk and support staff."}
              </p>
              {canCreate && (
                <button 
                  onClick={() => { setForm(emptyForm); setAddModal(true); }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition"
                >
                  + Add First Staff Member
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredStaff.map(s => {
                const st = s.status || "active";
                const roleBadgeClass = ROLE_COLORS[s.role] || "bg-slate-100 text-slate-700 border-slate-200";
                const hasAadhaar = Boolean(s.aadhaarNo || s.aadhaarFront || s.aadhaarBack);

                return (
                  <div 
                    key={s.id} 
                    onClick={() => setViewStaff(s)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition cursor-pointer flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-4 space-y-3.5">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <StaffAvatar name={s.name} photo={s.photoUrl} size="md" />
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-600 transition">
                              {s.name}
                            </h3>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-0.5 truncate ${roleBadgeClass}`}>
                              {s.role}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 capitalize ${STATUS_COLORS[st]}`}>
                          {st === "onleave" ? "Leave" : st}
                        </span>
                      </div>

                      {/* Contact & Verification Info */}
                      <div className="space-y-1.5 pt-1 text-xs text-slate-500">
                        {s.phone && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {s.phone}
                            </span>
                            <a 
                              href={`https://wa.me/91${s.phone.replace(/\D/g, "")}`} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                        {s.email && (
                          <p className="flex items-center gap-1.5 truncate text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {s.email}
                          </p>
                        )}
                      </div>

                      {/* Identity & Aadhaar Badge */}
                      <div className="flex items-center justify-between pt-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          hasAadhaar ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          {hasAadhaar ? "Aadhaar Linked" : "Aadhaar Pending"}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          Joined {s.joinDate || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Footer with Salary & Actions */}
                    <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Monthly Base</p>
                        <p className="text-sm font-extrabold text-emerald-700">{fmtCurrency(s.salary)}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button 
                            onClick={e => { 
                              e.stopPropagation(); 
                              setForm({ ...emptyForm, ...s, customRole: "" }); 
                              setEditStaff(s); 
                              setActiveModalTab("basic");
                              setAddModal(true); 
                            }}
                            className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-emerald-600 transition" 
                            title="Edit Staff"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(s); }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition" 
                            title="Delete Staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: MONTHLY SALARY TRACKER
      ============================================================ */}
      {activeTab === "payroll" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          {/* Header controls */}
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Monthly Payroll Tracker</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Disburse salaries, record bonuses or penalties, and automatically post payment to Expenses.
                </p>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                <button 
                  onClick={handlePrevMonth} 
                  className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition shadow-sm"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  {monthLabel(salaryMonth)}
                </div>
                <button 
                  onClick={handleNextMonth} 
                  className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition shadow-sm"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search in salary sheet..."
                  value={salarySearch} 
                  onChange={e => setSalarySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 outline-none" 
                />
              </div>

              <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-bold w-full sm:w-auto">
                {[["all", "All Staff"], ["pending", `Pending (${pendingCount})`], ["paid", `Paid (${paidCount})`]].map(([val, label]) => (
                  <button 
                    key={val} 
                    onClick={() => setSalaryFilter(val)}
                    className={`px-4 py-2 transition flex-1 sm:flex-none ${
                      salaryFilter === val ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Member</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Base Salary</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Bonus</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Deductions</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Payable</th>
                  <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      No payroll records found for {monthLabel(salaryMonth)} matching your filters.
                    </td>
                  </tr>
                ) : salaryRows.map(s => {
                  const pd = staffPayrollMap[s.id] || { bonuses: 0, deductions: 0, paid: false };
                  const net = Number(s.salary || 0) + (pd.bonuses || 0) - (pd.deductions || 0);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      {/* Staff Identity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <StaffAvatar name={s.name} photo={s.photoUrl} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{s.name}</p>
                            <p className="text-[10px] text-slate-400">Joined {s.joinDate || "N/A"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {s.role}
                        </span>
                      </td>

                      {/* Base Salary */}
                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-700">
                        {fmtCurrency(s.salary)}
                      </td>

                      {/* Bonus */}
                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        {pd.bonuses > 0 ? (
                          <span className="text-xs font-bold text-emerald-600">+{fmtCurrency(pd.bonuses)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Deduction */}
                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        {pd.deductions > 0 ? (
                          <span className="text-xs font-bold text-rose-600">-{fmtCurrency(pd.deductions)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Net Pay */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                          {fmtCurrency(net)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {pd.paid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {!pd.paid && (
                            <button 
                              onClick={() => handleMarkPaid(s)}
                              className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm whitespace-nowrap active:scale-95"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button 
                            onClick={() => { 
                              setPayrollModal(s); 
                              setPayrollForm({ type: "bonus", amount: "", reason: "", date: todayStr() }); 
                            }}
                            className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition" 
                            title="Add Bonus"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => { 
                              setPayrollModal(s); 
                              setPayrollForm({ type: "deduction", amount: "", reason: "", date: todayStr() }); 
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition" 
                            title="Add Penalty / Deduction"
                          >
                            <TrendingDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Footer */}
              {salaryRows.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-5 py-3.5 text-xs font-bold text-slate-700">
                      Total Disbursable ({salaryRows.length} Staff) - {monthLabel(salaryMonth)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-black text-slate-900">
                      {fmtCurrency(totalPayroll)}
                    </td>
                    <td colSpan={2} className="px-4 py-3.5 text-center text-xs font-bold text-slate-600">
                      {paidCount} Paid / {pendingCount} Pending
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 1: ADD / EDIT STAFF
      ============================================================ */}
      <Modal 
        isOpen={addModal} 
        onClose={() => { setAddModal(false); setEditStaff(null); setForm(emptyForm); }}
        title={editStaff ? `Edit Profile - ${editStaff.name}` : "Add New Staff Member"} 
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          
          {/* Section Navigation Tabs */}
          <div className="flex border-b border-slate-200">
            {[
              { id: "basic", label: "1. Basic Profile" },
              { id: "salary", label: "2. Salary & Joining" },
              { id: "aadhaar", label: "3. Identity (Aadhaar)" },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveModalTab(t.id)}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                  activeModalTab === t.id 
                    ? "border-emerald-600 text-emerald-700" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: BASIC PROFILE */}
          {activeModalTab === "basic" && (
            <div className="space-y-4">
              {/* Photo Upload */}
              <PhotoCaptureInput
                value={form.photoUrl}
                onChange={(url) => setForm(prev => ({ ...prev, photoUrl: url }))}
                label="Profile Photo"
                subLabel="Upload a clean face photo or take a live camera snapshot"
                shape="circle"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Coach Vikram Singh" 
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="inp-modern" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Designation / Role *</label>
                  <select 
                    value={form.role} 
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="inp-modern"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {form.role === "Custom Role" && (
                  <div>
                    <label className="text-xs font-bold text-slate-700">Custom Role Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Floor Supervisor" 
                      value={form.customRole}
                      onChange={e => setForm({ ...form, customRole: e.target.value })}
                      className="inp-modern" 
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700">Contact Phone *</label>
                  <input 
                    required 
                    type="tel" 
                    placeholder="9876543210" 
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="inp-modern" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Email Address (optional)</label>
                  <input 
                    type="email" 
                    placeholder="staff@gym.com" 
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="inp-modern" 
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("salary")}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center justify-center gap-1 text-center"
                >
                  Next: Salary Details <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SALARY & JOINING */}
          {activeModalTab === "salary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Monthly Salary (Rs.) *</label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    placeholder="e.g. 25000" 
                    value={form.salary}
                    onChange={e => setForm({ ...form, salary: e.target.value })}
                    className="inp-modern font-bold text-emerald-800" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Joining Date</label>
                  <input 
                    type="date" 
                    value={form.joinDate}
                    onChange={e => setForm({ ...form, joinDate: e.target.value })}
                    className="inp-modern font-semibold" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Duty Status</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({ ...form, status: e.target.value })} 
                    className="inp-modern"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="onleave">On Leave</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Internal Notes (optional)</label>
                  <input 
                    type="text" 
                    placeholder="Shift time, locker no, etc." 
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="inp-modern" 
                  />
                </div>
              </div>

              {/* Informational banner about expenses auto-posting */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-emerald-900 text-xs">
                <AlertCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Joining on <strong>{form.joinDate || "today"}</strong>. As per system rules, this salary of <strong>{fmtCurrency(form.salary)}</strong> will be automatically scheduled and posted into your <strong>Expenses</strong> tracker starting from <strong>{nextMonthFirst(form.joinDate)}</strong>.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("basic")}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition text-center"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("aadhaar")}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center justify-center gap-1 text-center"
                >
                  Next: Aadhaar Verification <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AADHAAR IDENTITY */}
          {activeModalTab === "aadhaar" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Aadhaar Card Number</label>
                <input 
                  type="text" 
                  placeholder="XXXX XXXX XXXX" 
                  maxLength={14} 
                  value={form.aadhaarNo}
                  onChange={e => setForm({ ...form, aadhaarNo: e.target.value.replace(/[^0-9 ]/g, "") })}
                  className="inp-modern font-mono" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Aadhaar Front */}
                <div>
                  <PhotoCaptureInput
                    value={form.aadhaarFront}
                    onChange={(url) => setForm(prev => ({ ...prev, aadhaarFront: url }))}
                    label="Aadhaar Front Document"
                    subLabel="Upload document file or snap photo with camera"
                    shape="rounded"
                    aspectRatio="wide"
                  />
                </div>

                {/* Aadhaar Back */}
                <div>
                  <PhotoCaptureInput
                    value={form.aadhaarBack}
                    onChange={(url) => setForm(prev => ({ ...prev, aadhaarBack: url }))}
                    label="Aadhaar Back Document"
                    subLabel="Upload document file or snap photo with camera"
                    shape="rounded"
                    aspectRatio="wide"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("salary")}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition text-center"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow hover:opacity-90 transition text-center"
                >
                  {editStaff ? "Save Staff Changes" : "Confirm & Add Staff"}
                </button>
              </div>
            </div>
          )}

        </form>
      </Modal>

      {/* ============================================================
          MODAL 2: VIEW FULL STAFF PROFILE
      ============================================================ */}
      <Modal 
        isOpen={!!viewStaff} 
        onClose={() => setViewStaff(null)} 
        title="Staff Profile Details" 
        maxWidth="max-w-lg"
      >
        {viewStaff && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <StaffAvatar name={viewStaff.name} photo={viewStaff.photoUrl} size="lg" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">{viewStaff.name}</h2>
                <p className="text-xs font-semibold text-emerald-700">{viewStaff.role}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 capitalize ${STATUS_COLORS[viewStaff.status || "active"]}`}>
                  {viewStaff.status || "active"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                { label: "Contact Phone", value: viewStaff.phone || "-" },
                { label: "Email Address", value: viewStaff.email || "-" },
                { label: "Monthly Base Salary", value: fmtCurrency(viewStaff.salary) },
                { label: "Joined Date", value: viewStaff.joinDate || "-" },
                { label: "Expense Cycle From", value: nextMonthFirst(viewStaff.joinDate) },
                { label: "Aadhaar Card No", value: viewStaff.aadhaarNo || "Not provided" },
              ].map((r, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{r.label}</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Aadhaar Images */}
            {(viewStaff.aadhaarFront || viewStaff.aadhaarBack) && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">Identity Documents (Aadhaar)</p>
                <div className="grid grid-cols-2 gap-3">
                  {viewStaff.aadhaarFront && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-1">Front</p>
                      <img src={viewStaff.aadhaarFront} alt="Aadhaar Front" className="w-full h-24 object-cover" />
                    </div>
                  )}
                  {viewStaff.aadhaarBack && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-1">Back</p>
                      <img src={viewStaff.aadhaarBack} alt="Aadhaar Back" className="w-full h-24 object-cover" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewStaff.notes && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Notes</p>
                <p className="text-xs text-slate-700">{viewStaff.notes}</p>
              </div>
            )}

            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              <button 
                onClick={() => { 
                  setForm({ ...emptyForm, ...viewStaff, customRole: "" }); 
                  setEditStaff(viewStaff); 
                  setActiveModalTab("basic");
                  setAddModal(true); 
                  setViewStaff(null); 
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>

              {viewStaff.phone && (
                <a 
                  href={`https://wa.me/91${viewStaff.phone.replace(/\D/g, "")}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition border border-emerald-200 flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                </a>
              )}

              <button 
                onClick={() => { setDeleteConfirm(viewStaff); setViewStaff(null); }}
                className="p-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition border border-rose-200"
                title="Delete Staff"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================
          MODAL 3: BONUS / DEDUCTION MODAL
      ============================================================ */}
      <Modal 
        isOpen={!!payrollModal} 
        onClose={() => setPayrollModal(null)}
        title={payrollForm.type === "bonus" ? `Grant Bonus - ${payrollModal?.name}` : `Record Penalty / Deduction - ${payrollModal?.name}`}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleAddPayroll} className="space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <button 
              type="button" 
              onClick={() => setPayrollForm(p => ({ ...p, type: "bonus" }))}
              className={`flex-1 py-2.5 text-xs font-bold transition ${
                payrollForm.type === "bonus" ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-600"
              }`}
            >
              Bonus (+)
            </button>
            <button 
              type="button" 
              onClick={() => setPayrollForm(p => ({ ...p, type: "deduction" }))}
              className={`flex-1 py-2.5 text-xs font-bold transition ${
                payrollForm.type === "deduction" ? "bg-rose-600 text-white" : "bg-slate-50 text-slate-600"
              }`}
            >
              Deduction (-)
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Amount (Rs.) *</label>
            <input 
              required 
              type="number" 
              min="1" 
              placeholder="e.g. 1500" 
              value={payrollForm.amount}
              onChange={e => setPayrollForm(p => ({ ...p, amount: e.target.value }))}
              className="inp-modern" 
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Reason / Description *</label>
            <input 
              required 
              type="text"
              placeholder={payrollForm.type === "bonus" ? "e.g. Festival bonus, Overtime" : "e.g. Uninformed leave, Advance settlement"}
              value={payrollForm.reason}
              onChange={e => setPayrollForm(p => ({ ...p, reason: e.target.value }))}
              className="inp-modern" 
            />
          </div>

          <button 
            type="submit"
            className={`w-full py-3 rounded-2xl text-white font-bold text-xs transition ${
              payrollForm.type === "bonus" ? "bg-violet-600 hover:bg-violet-700 shadow" : "bg-rose-600 hover:bg-rose-700 shadow"
            }`}
          >
            Confirm {payrollForm.type === "bonus" ? "Bonus" : "Deduction"} for {monthLabel(salaryMonth)}
          </button>
        </form>
      </Modal>

      {/* ============================================================
          MODAL 4: DELETE CONFIRMATION
      ============================================================ */}
      <Modal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        title="Confirm Staff Removal" 
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-700 text-sm font-semibold">
              Are you sure you want to remove <strong>{deleteConfirm?.name}</strong> from gym staff records?
            </p>
            <p className="text-xs text-slate-400 mt-1">This action cannot be undone.</p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
            <button 
              onClick={() => setDeleteConfirm(null)} 
              className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition text-center"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete} 
              className="w-full sm:flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow text-center"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Custom Styles */}
      <style>{`
        .inp-modern {
          width: 100%;
          margin-top: 4px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 9px 14px;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          transition: all 0.15s ease;
        }
        .inp-modern:focus {
          background: #ffffff;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
      `}</style>
    </div>
  );
}

// --- Fallback Dummy Data ---
const DUMMY_STAFF = [
  { id: "st1", name: "Coach Amit Kumar",  role: "Head Trainer",          phone: "9876500111", email: "amit@gym.com",   salary: "35000", joinDate: "2026-08-01", status: "active" },
  { id: "st2", name: "Coach Sneha Rao",   role: "Female Fitness Coach",  phone: "9811200222", email: "sneha@gym.com",  salary: "30000", joinDate: "2026-08-01", status: "active" },
  { id: "st3", name: "Coach Rohan Joshi", role: "Senior Trainer",        phone: "9988700333", email: "rohan@gym.com",  salary: "28000", joinDate: "2026-08-15", status: "active" },
  { id: "st4", name: "Kunal Sharma",      role: "Reception / Front Desk",phone: "9711000444", email: "kunal@gym.com",  salary: "18000", joinDate: "2026-08-01", status: "active" },
  { id: "st5", name: "Ravi Cleaning",     role: "Maintenance & Cleaning",phone: "9900112233", email: "",               salary: "12000", joinDate: "2026-08-01", status: "active" },
];
