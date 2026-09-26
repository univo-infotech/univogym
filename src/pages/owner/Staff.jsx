import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Phone, Mail, Calendar, Search,
  Trash2, Edit3, ChevronRight, X, Check, Clock,
  Users, BadgeCheck, Gift, Scissors, CreditCard,
  Camera, MessageCircle, FileText, Filter,
  TrendingUp, TrendingDown, AlertCircle, Download,
  ShieldCheck, Eye, ChevronLeft, DollarSign, UserCheck,
  UserX, Briefcase, Award, CheckCircle2, ChevronDown, Dumbbell,
  Send, Share2, CalendarCheck, Percent, Info, CheckCircle
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getStaff, addStaff, updateStaff, deleteStaff,
  getPayrollEntries, addPayrollEntry, deletePayrollEntry,
  markSalaryPaid, getSalaryHistory,
  markTrainerSalaryPaid, getTrainerSalaryHistory,
  setEmployeeMonthlyLeaves, getEmployeeMonthlyLeaves
} from "../../firebase/staff";
import { getTrainers } from "../../firebase/trainers";
import { addExpense } from "../../firebase/expenses";
import toast from "react-hot-toast";

// --- Constants ---------------------------------------------------
const ROLES = [
  "Reception / Front Desk",
  "Manager / Floor Supervisor",
  "Accounts & Billing",
  "Housekeeping & Cleaning",
  "Security Guard",
  "Dietitian / Nutritionist",
  "Custom Role"
];

const STATUS_COLORS = {
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  onleave:  "bg-amber-50 text-amber-700 border-amber-200",
};

const ROLE_COLORS = {
  "Reception / Front Desk": "bg-blue-50 text-blue-700 border-blue-200",
  "Manager / Floor Supervisor": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Accounts & Billing": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Housekeeping & Cleaning": "bg-amber-50 text-amber-700 border-amber-200",
  "Maintenance & Cleaning": "bg-amber-50 text-amber-700 border-amber-200",
  "Security Guard": "bg-slate-100 text-slate-700 border-slate-200",
  "Dietitian / Nutritionist": "bg-lime-50 text-lime-700 border-lime-200",
  "Nutritionist": "bg-lime-50 text-lime-700 border-lime-200",
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

function getFirstSalaryDueDate(joinDate) {
  if (!joinDate) return "";
  const d = new Date(joinDate);
  if (isNaN(d.getTime())) return "";
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return nextMonth.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function calculateSalaryDueInfo(joinDate, targetMonthKey) {
  if (!joinDate) return { dueStr: "", formattedDue: "N/A", diffDays: null, statusText: "Pending", badgeColor: "bg-slate-100 text-slate-700" };
  const join = new Date(joinDate);
  if (isNaN(join.getTime())) return { dueStr: "", formattedDue: "N/A", diffDays: null, statusText: "Pending", badgeColor: "bg-slate-100 text-slate-700" };
  const joinDay = join.getDate() || 1;
  const [y, m] = (targetMonthKey || currentMonthKey()).split("-").map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const day = Math.min(joinDay, maxDay);
  const dueDate = new Date(y, m - 1, day);
  const dueStr = dueDate.toISOString().split("T")[0];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let statusText = "";
  let badgeColor = "";

  if (diffDays === 0) {
    statusText = "Due Today";
    badgeColor = "bg-amber-100 text-amber-900 border-amber-300 font-black";
  } else if (diffDays > 0) {
    statusText = `Due in ${diffDays}d`;
    badgeColor = "bg-sky-50 text-sky-700 border-sky-200 font-semibold";
  } else {
    statusText = `Overdue ${Math.abs(diffDays)}d`;
    badgeColor = "bg-rose-50 text-rose-700 border-rose-200 font-bold";
  }

  return {
    dueStr,
    formattedDue: dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    diffDays,
    statusText,
    badgeColor,
  };
}

function sendSalarySlipWhatsApp(emp, paidData, gymName = "UNIVO GYM MANAGEMENT") {
  const phone = (emp.phone || "").replace(/\D/g, "");
  if (!phone) {
    toast.error("Employee phone number not available for WhatsApp");
    return;
  }
  const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
  const msg = encodeURIComponent(
`💼 *SALARY PAYMENT SLIP - ${gymName}*

Hi *${emp.name}*,
Aapki salary mahine *${monthLabel(paidData.monthKey || currentMonthKey())}* ke liye process ho gayi hai:

💵 *Base Salary:* Rs. ${Number(paidData.baseSalary || 0).toLocaleString("en-IN")}
🗓️ *Joining Date:* ${emp.joinDate || "N/A"}
✂️ *Leave Deduction:* -Rs. ${Number(paidData.leaveDeduction || 0).toLocaleString("en-IN")} (${paidData.unpaidLeaves || 0} unpaid leaves)
🎁 *Bonus / Incentives:* +Rs. ${Number(paidData.bonuses || 0).toLocaleString("en-IN")}
📉 *Other Deductions:* -Rs. ${Number(paidData.otherDeductions || 0).toLocaleString("en-IN")}
────────────────────────
💰 *NET SALARY PAID:* Rs. ${Number(paidData.netPay || 0).toLocaleString("en-IN")}
💳 *Payment Mode:* ${(paidData.paymentMode || "Cash").toUpperCase()}
📅 *Payment Date:* ${paidData.paidDate || todayStr()}
${paidData.txnRef ? `🔖 *Txn Ref / UPI:* ${paidData.txnRef}\n` : ""}
Thank you for your dedicated service and commitment! 💪🔥`
  );
  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
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
  const [trainersList, setTrainersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("directory"); // "directory" | "payroll"
  const [employeeScope, setEmployeeScope] = useState("all"); // "all" | "staff" | "trainers"
  
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

  // Pay Salary Modal
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({
    paymentMode: "cash",
    paidDate: todayStr(),
    txnRef: "",
    notes: "",
    autoAddExpense: true,
  });

  // Leave Management Modal
  const [leaveModal, setLeaveModal] = useState(null);
  const [leaveForm, setLeaveForm] = useState({
    leavesTaken: 0,
    notes: "",
  });

  // Forms
  const emptyForm = {
    name: "", role: "Reception / Front Desk", customRole: "",
    phone: "", email: "",
    salary: "", joinDate: todayStr(),
    weeklyOffDays: 1,
    allowedLeaves: 4,
    attendanceMode: "manual",
    aadhaarNo: "", aadhaarFront: "", aadhaarBack: "",
    photoUrl: "", status: "active", notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [payrollForm, setPayrollForm] = useState({ type: "bonus", amount: "", reason: "", date: todayStr() });

  // --- Load staff & trainers -------------------------------------
  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, trainersData] = await Promise.all([
        getStaff(GID),
        getTrainers(GID).catch(() => []),
      ]);
      setStaffList(staffData || []);
      setTrainersList((trainersData || []).map(t => ({
        ...t,
        isTrainer: true,
        role: t.specialty || t.role || "Personal Trainer",
        salary: Number(t.salary || 0),
        allowedLeaves: Number(t.allowedLeaves ?? 4),
        joinDate: t.joinDate || (t.createdAt?.toDate ? t.createdAt.toDate().toISOString().split("T")[0] : todayStr()),
      })));
    } catch {
      setStaffList([]);
      setTrainersList([]);
    } finally {
      setLoading(false);
    }
  }, [GID]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // Load payroll data whenever month or staff list changes
  useEffect(() => {
    async function loadPayrolls() {
      const map = {};
      const allEmployees = [
        ...staffList.map(s => ({ ...s, isTrainer: false })),
        ...trainersList.filter(t => Number(t.salary || 0) > 0).map(t => ({ ...t, isTrainer: true })),
      ];

      await Promise.all(allEmployees.map(async (emp) => {
        try {
          const isT = !!emp.isTrainer;
          const [entries, history, monthlyLeaves] = await Promise.all([
            isT ? Promise.resolve([]) : getPayrollEntries(GID, emp.id),
            isT ? getTrainerSalaryHistory(GID, emp.id) : getSalaryHistory(GID, emp.id),
            getEmployeeMonthlyLeaves(GID, emp.id, salaryMonth, isT),
          ]);

          const monthEntries = (entries || []).filter(e => e.month === salaryMonth);
          const bonuses = monthEntries.filter(e => e.type === "bonus").reduce((a, b) => a + b.amount, 0);
          const otherDeductions = monthEntries.filter(e => e.type === "deduction").reduce((a, b) => a + b.amount, 0);
          const paidEntry = (history || []).find(h => h.id === salaryMonth && h.status === "paid");

          const allowedLeaves = Number(emp.allowedLeaves ?? 4);
          const leavesTaken = Number(monthlyLeaves?.leavesTaken ?? 0);
          const unpaidLeaves = Math.max(0, leavesTaken - allowedLeaves);
          const perDaySalary = Math.round(Number(emp.salary || 0) / 30);
          const autoLeaveDeduction = unpaidLeaves * perDaySalary;

          map[emp.id] = {
            bonuses,
            otherDeductions,
            allowedLeaves,
            leavesTaken,
            unpaidLeaves,
            autoLeaveDeduction,
            paid: !!paidEntry,
            paidData: paidEntry,
          };
        } catch {
          map[emp.id] = {
            bonuses: 0,
            otherDeductions: 0,
            allowedLeaves: Number(emp.allowedLeaves ?? 4),
            leavesTaken: 0,
            unpaidLeaves: 0,
            autoLeaveDeduction: 0,
            paid: false,
            paidData: null,
          };
        }
      }));
      setStaffPayrollMap(map);
    }
    if (staffList.length > 0 || trainersList.length > 0) {
      loadPayrolls();
    }
  }, [GID, staffList, trainersList, salaryMonth]);

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
      weeklyOffDays: Number(form.weeklyOffDays ?? 1),
      allowedLeaves: Number(form.allowedLeaves ?? 4),
      attendanceMode: form.attendanceMode || "manual",
    };

    try {
      if (editStaff) {
        await updateStaff(GID, editStaff.id, payload);
        toast.success("Staff details updated");
      } else {
        await addStaff(GID, payload);
        toast.success(`Staff registered! First salary cycle due: ${getFirstSalaryDueDate(form.joinDate)}`);
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

  const handleToggleStatus = async (staffMember) => {
    const currentStatus = staffMember.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateStaff(GID, staffMember.id, { status: newStatus });
      toast.success(`${staffMember.name} is now ${newStatus === "active" ? "Active" : "Inactive"}`);
      setStaffList(prev => prev.map(s => s.id === staffMember.id ? { ...s, status: newStatus } : s));
      if (viewStaff?.id === staffMember.id) {
        setViewStaff(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update staff status");
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

  // --- Pay Salary Confirmation Handler ---
  const handleOpenPayModal = (emp) => {
    setPayModal(emp);
    setPayForm({
      paymentMode: "cash",
      paidDate: todayStr(),
      txnRef: "",
      notes: "",
      autoAddExpense: true,
    });
  };

  const handleConfirmPaySalary = async (e) => {
    e.preventDefault();
    if (!payModal) return;
    const emp = payModal;
    const isT = !!emp.isTrainer;
    const pd = staffPayrollMap[emp.id] || {};
    const base = Number(emp.salary || 0);
    const leaveDed = Number(pd.autoLeaveDeduction || 0);
    const otherDed = Number(pd.otherDeductions || 0);
    const bonuses = Number(pd.bonuses || 0);
    const net = Math.max(0, base - leaveDed - otherDed + bonuses);

    const paidPayload = {
      staffName: emp.name,
      role: emp.role,
      isTrainer: isT,
      monthKey: salaryMonth,
      baseSalary: base,
      allowedLeaves: pd.allowedLeaves ?? 4,
      leavesTaken: pd.leavesTaken || 0,
      unpaidLeaves: pd.unpaidLeaves || 0,
      leaveDeduction: leaveDed,
      bonuses: bonuses,
      otherDeductions: otherDed,
      netPay: net,
      paymentMode: payForm.paymentMode,
      txnRef: payForm.txnRef || "",
      paidDate: payForm.paidDate || todayStr(),
      notes: payForm.notes || "",
    };

    try {
      if (isT) {
        await markTrainerSalaryPaid(GID, emp.id, salaryMonth, paidPayload);
      } else {
        await markSalaryPaid(GID, emp.id, salaryMonth, paidPayload);
      }

      if (payForm.autoAddExpense) {
        await addExpense(GID, {
          title: `${isT ? "Trainer" : "Staff"} Salary: ${emp.name} (${monthLabel(salaryMonth)})`,
          amount: net,
          category: isT ? "Trainer Salary" : "Staff Salary",
          date: payForm.paidDate || todayStr(),
          type: "salary",
          isSalary: true,
          isTrainerSalary: isT,
          paymentMode: payForm.paymentMode,
          notes: `Base: Rs. ${base} | Leave Ded: -Rs. ${leaveDed} (${pd.unpaidLeaves || 0} unpaid leaves) | Bonus: +Rs. ${bonuses} | Mode: ${payForm.paymentMode.toUpperCase()}${payForm.txnRef ? ` | Ref: ${payForm.txnRef}` : ""}`,
        });
      }

      toast.success(`Salary of ${fmtCurrency(net)} marked paid & added to Expenses!`);
      
      setStaffPayrollMap(prev => ({
        ...prev,
        [emp.id]: {
          ...prev[emp.id],
          paid: true,
          paidData: paidPayload,
        }
      }));

      setPayModal(null);
      if (emp.phone) {
        sendSalarySlipWhatsApp(emp, paidPayload);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to record salary payment");
    }
  };

  // --- Leaves & Attendance Modal Handler ---
  const handleOpenLeaveModal = (emp) => {
    const pd = staffPayrollMap[emp.id] || {};
    setLeaveModal(emp);
    setLeaveForm({
      leavesTaken: pd.leavesTaken || 0,
      notes: "",
    });
  };

  const handleSaveLeaves = async (e) => {
    e.preventDefault();
    if (!leaveModal) return;
    const emp = leaveModal;
    const isT = !!emp.isTrainer;
    const leavesTaken = Math.max(0, Number(leaveForm.leavesTaken || 0));
    const allowed = Number(emp.allowedLeaves ?? 4);
    const unpaid = Math.max(0, leavesTaken - allowed);
    const perDay = Math.round(Number(emp.salary || 0) / 30);
    const leaveDed = unpaid * perDay;

    try {
      await setEmployeeMonthlyLeaves(GID, emp.id, salaryMonth, {
        leavesTaken,
        notes: leaveForm.notes || "",
      }, isT);

      setStaffPayrollMap(prev => ({
        ...prev,
        [emp.id]: {
          ...prev[emp.id],
          leavesTaken,
          unpaidLeaves: unpaid,
          autoLeaveDeduction: leaveDed,
        }
      }));

      toast.success(`Leaves updated: ${leavesTaken} days taken (${unpaid} unpaid, -Rs. ${leaveDed})`);
      setLeaveModal(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save leaves");
    }
  };

  // --- Filtering (Trainers are managed under dedicated Trainers section) ---
  const nonTrainerStaff = useMemo(() => {
    return (staffList || []).filter((s) => {
      const r = (s.role || "").toLowerCase();
      return !r.includes("trainer") && !r.includes("coach") && !r.includes("instructor");
    });
  }, [staffList]);

  const uniqueRoles = Array.from(new Set(nonTrainerStaff.map(s => s.role).filter(Boolean)));

  const filteredStaff = useMemo(() => {
    return nonTrainerStaff.filter(s => {
      const q = search.toLowerCase();
      const matchQ = (s.name || "").toLowerCase().includes(q)
        || (s.role || "").toLowerCase().includes(q)
        || (s.phone || "").includes(q);
      const matchR = filterRole === "all" || s.role === filterRole;
      const matchS = filterStatus === "all" || (s.status || "active") === filterStatus;
      return matchQ && matchR && matchS;
    });
  }, [nonTrainerStaff, search, filterRole, filterStatus]);

  // Unified Payable Employees (Staff + Trainers)
  const allPayableEmployees = useMemo(() => {
    const list = [];
    if (employeeScope === "all" || employeeScope === "staff") {
      list.push(...nonTrainerStaff.map(s => ({ ...s, isTrainer: false })));
    }
    if (employeeScope === "all" || employeeScope === "trainers") {
      list.push(...trainersList.filter(t => Number(t.salary || 0) > 0).map(t => ({ ...t, isTrainer: true })));
    }
    return list;
  }, [nonTrainerStaff, trainersList, employeeScope]);

  // Salary Table rows
  const salaryRows = useMemo(() => {
    return allPayableEmployees.filter(emp => {
      const q = salarySearch.toLowerCase();
      const matchQ = (emp.name || "").toLowerCase().includes(q) || (emp.role || "").toLowerCase().includes(q);
      const pd = staffPayrollMap[emp.id] || {};
      const matchF = salaryFilter === "all"
        ? true
        : salaryFilter === "paid" ? pd.paid : !pd.paid;
      
      const joinMK = monthKey(emp.joinDate || Date.now());
      const joinedBeforeOrDuring = joinMK <= salaryMonth;
      return matchQ && matchF && joinedBeforeOrDuring;
    });
  }, [allPayableEmployees, salarySearch, staffPayrollMap, salaryFilter, salaryMonth]);

  const totalPayroll = salaryRows.reduce((a, emp) => {
    const pd = staffPayrollMap[emp.id] || {};
    const base = Number(emp.salary || 0);
    const leaveDed = Number(pd.autoLeaveDeduction || 0);
    const otherDed = Number(pd.otherDeductions || 0);
    const bonuses = Number(pd.bonuses || 0);
    return a + Math.max(0, base - leaveDed - otherDed + bonuses);
  }, 0);

  const paidCount = salaryRows.filter(emp => staffPayrollMap[emp.id]?.paid).length;
  const pendingCount = salaryRows.length - paidCount;

  const totalPaidAmount = salaryRows
    .filter(emp => staffPayrollMap[emp.id]?.paid)
    .reduce((a, emp) => {
      const pd = staffPayrollMap[emp.id] || {};
      return a + Number(pd.paidData?.netPay ?? (Number(emp.salary || 0) - Number(pd.autoLeaveDeduction || 0) - Number(pd.otherDeductions || 0) + Number(pd.bonuses || 0)));
    }, 0);

  const totalPendingAmount = Math.max(0, totalPayroll - totalPaidAmount);

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
          {/* Notice: Trainers managed separately */}
          <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-700">
                <span className="font-bold text-teal-950">Looking for Gym Trainers & Coaches?</span> Trainers ko manage karne ke liye alag se dedicated <strong>"Trainers"</strong> menu hai jaha unki Monthly Salary, Joining Date, PT Deals aur Auto-Expenses manage hote hain.
              </p>
            </div>
            <a
              href="/owner/trainers"
              className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold whitespace-nowrap transition shrink-0"
            >
              Go to Trainers →
            </a>
          </div>

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
                      </div>

                      {/* Contact & Verification Info */}
                      <div className="space-y-1.5 pt-1 text-xs text-slate-500">
                        {s.phone && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {s.phone}
                          </p>
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
                    <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Monthly Base</p>
                        <p className="text-sm font-extrabold text-emerald-700">{fmtCurrency(s.salary)}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Active / Inactive Toggle Switch Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(s);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer shadow-2xs ${
                            st === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                          }`}
                          title={st === "active" ? "Staff is Active. Click to mark Inactive" : "Staff is Inactive. Click to mark Active"}
                        >
                          <span className={`w-6 h-3.5 flex items-center rounded-full p-0.5 transition duration-200 ${st === "active" ? "bg-emerald-600" : "bg-slate-400"}`}>
                            <span className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transform transition duration-200 ${st === "active" ? "translate-x-2.5" : "translate-x-0"}`} />
                          </span>
                          <span className="text-[11px] font-black">{st === "active" ? "Active" : "Inactive"}</span>
                        </button>

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
          
          {/* Top KPI Cards for Payroll */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 pb-0">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total Net Disbursable</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{fmtCurrency(totalPayroll)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{salaryRows.length} Employees in this view</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
                <span>Paid So Far</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{fmtCurrency(totalPaidAmount)}</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{paidCount} Paid Employees</p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
                <span>Pending Payout</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{fmtCurrency(totalPendingAmount)}</p>
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">{pendingCount} Pending Payouts</p>
            </div>

            <div className="bg-teal-50/60 border border-teal-200/70 rounded-2xl p-4">
              <div className="flex items-center justify-between text-teal-800 text-xs font-semibold">
                <span>Active Workforce</span>
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-teal-900 mt-1">{allPayableEmployees.length}</p>
              <p className="text-[10px] text-teal-700 font-medium mt-0.5">
                {nonTrainerStaff.length} Staff • {trainersList.filter(t => t.salary > 0).length} Fixed Trainers
              </p>
            </div>
          </div>

          {/* Header controls & Filters */}
          <div className="px-5 pt-2 pb-4 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Monthly Payroll & Salary Tracker</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Joining date anniversary cycles, automatic leave deductions, and single-click expense posting.
                </p>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
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

            {/* Scope Tabs & Status Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              
              {/* Employee Scope Switcher: All | Staff | Trainers */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold w-full sm:w-auto">
                {[
                  ["all", `All (${allPayableEmployees.length})`],
                  ["staff", `Staff (${nonTrainerStaff.length})`],
                  ["trainers", `Trainers (${trainersList.filter(t => t.salary > 0).length})`]
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setEmployeeScope(val)}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition ${
                      employeeScope === val
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Search & Status Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search name or role..."
                    value={salarySearch} 
                    onChange={e => setSalarySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 outline-none" 
                  />
                </div>

                <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-bold w-full sm:w-auto">
                  {[["all", "All"], ["pending", `Pending (${pendingCount})`], ["paid", `Paid (${paidCount})`]].map(([val, label]) => (
                    <button 
                      key={val} 
                      onClick={() => setSalaryFilter(val)}
                      className={`px-3 py-1.5 transition flex-1 sm:flex-none ${
                        salaryFilter === val ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-3 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Salary Cycle & Due</th>
                  <th className="text-right px-3 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Base Salary</th>
                  <th className="text-center px-3 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Leaves (Taken / Allow)</th>
                  <th className="text-right px-3 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Leave Deduction</th>
                  <th className="text-right px-3 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Bonus</th>
                  <th className="text-right px-3 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Deductions</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Payable</th>
                  <th className="text-center px-3 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 text-xs">
                      No payroll records found for {monthLabel(salaryMonth)} matching your filters.
                    </td>
                  </tr>
                ) : salaryRows.map(emp => {
                  const pd = staffPayrollMap[emp.id] || { bonuses: 0, otherDeductions: 0, autoLeaveDeduction: 0, allowedLeaves: 4, leavesTaken: 0, unpaidLeaves: 0, paid: false };
                  const base = Number(emp.salary || 0);
                  const leaveDed = Number(pd.autoLeaveDeduction || 0);
                  const otherDed = Number(pd.otherDeductions || 0);
                  const bonuses = Number(pd.bonuses || 0);
                  const net = Math.max(0, base - leaveDed - otherDed + bonuses);
                  const dueInfo = calculateSalaryDueInfo(emp.joinDate, salaryMonth);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                      {/* Employee Identity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <StaffAvatar name={emp.name} photo={emp.photoUrl} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 truncate">{emp.name}</p>
                              {emp.isTrainer ? (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-teal-50 text-teal-700 border border-teal-200 rounded">
                                  Trainer
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                  Staff
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {emp.role} • Joined {emp.joinDate || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Salary Cycle & Due Date */}
                      <td className="px-3 py-3.5">
                        <div className="text-xs">
                          {pd.paid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Paid {pd.paidData?.paidDate ? `(${pd.paidData.paidDate.slice(5)})` : ""}
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 text-[11px]">Due: {dueInfo.formattedDue}</p>
                              <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full border ${dueInfo.badgeColor}`}>
                                {dueInfo.statusText}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="px-3 py-3.5 text-right text-xs font-semibold text-slate-700">
                        {fmtCurrency(emp.salary)}
                      </td>

                      {/* Leaves (Taken / Allowed) */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenLeaveModal(emp)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer hover:shadow-2xs ${
                            pd.unpaidLeaves > 0
                              ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                          title="Click to view or adjust monthly leaves"
                        >
                          <CalendarCheck className="w-3 h-3 text-slate-400" />
                          <span>{pd.leavesTaken || 0} / {pd.allowedLeaves ?? 4}d</span>
                          {pd.unpaidLeaves > 0 && (
                            <span className="text-[10px] font-black text-rose-600">
                              ({pd.unpaidLeaves} unpaid)
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Leave Deduction */}
                      <td className="px-3 py-3.5 text-right">
                        {leaveDed > 0 ? (
                          <span className="text-xs font-bold text-rose-600">-{fmtCurrency(leaveDed)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Bonus */}
                      <td className="px-3 py-3.5 text-right hidden md:table-cell">
                        {bonuses > 0 ? (
                          <span className="text-xs font-bold text-emerald-600">+{fmtCurrency(bonuses)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Other Deductions */}
                      <td className="px-3 py-3.5 text-right hidden md:table-cell">
                        {otherDed > 0 ? (
                          <span className="text-xs font-bold text-rose-600">-{fmtCurrency(otherDed)}</span>
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
                      <td className="px-3 py-3.5 text-center">
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
                          {!pd.paid ? (
                            <button 
                              onClick={() => handleOpenPayModal(emp)}
                              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm whitespace-nowrap active:scale-95 flex items-center gap-1 cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" /> Pay Salary
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => sendSalarySlipWhatsApp(emp, pd.paidData || { baseSalary: emp.salary, netPay: net, monthKey: salaryMonth })}
                              className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shadow-2xs whitespace-nowrap flex items-center gap-1 cursor-pointer"
                              title="Share Salary Slip on WhatsApp"
                            >
                              <Share2 className="w-3 h-3 text-emerald-600" /> Slip
                            </button>
                          )}

                          <button 
                            onClick={() => handleOpenLeaveModal(emp)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition" 
                            title="Manage Monthly Leaves & Absents"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={() => { 
                              setPayrollModal(emp); 
                              setPayrollForm({ type: "bonus", amount: "", reason: "", date: todayStr() }); 
                            }}
                            className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition" 
                            title="Add Bonus / Incentive"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={() => { 
                              setPayrollModal(emp); 
                              setPayrollForm({ type: "deduction", amount: "", reason: "", date: todayStr() }); 
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition" 
                            title="Add Other Penalty / Settlement"
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
                    <td colSpan={4} className="px-5 py-3.5 text-xs font-bold text-slate-700">
                      Total Disbursable ({salaryRows.length} Employees) - {monthLabel(salaryMonth)}
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs font-black text-rose-600">
                      -{fmtCurrency(salaryRows.reduce((a, emp) => a + Number(staffPayrollMap[emp.id]?.autoLeaveDeduction || 0), 0))}
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs font-bold text-emerald-600 hidden md:table-cell">
                      +{fmtCurrency(salaryRows.reduce((a, emp) => a + Number(staffPayrollMap[emp.id]?.bonuses || 0), 0))}
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs font-bold text-rose-600 hidden md:table-cell">
                      -{fmtCurrency(salaryRows.reduce((a, emp) => a + Number(staffPayrollMap[emp.id]?.otherDeductions || 0), 0))}
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
                  <label className="text-xs font-bold text-slate-700">Joining Date *</label>
                  <input 
                    required
                    type="date" 
                    value={form.joinDate}
                    onChange={e => setForm({ ...form, joinDate: e.target.value })}
                    className="inp-modern font-semibold" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Weekly Offs per Week</label>
                  <select
                    value={form.weeklyOffDays ?? 1}
                    onChange={e => setForm({ ...form, weeklyOffDays: Number(e.target.value) })}
                    className="inp-modern"
                  >
                    <option value={1}>1 Day / Week (e.g. Sunday)</option>
                    <option value={2}>2 Days / Week (Weekend)</option>
                    <option value={0}>No Weekly Off (All 7 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Allowed Paid Leaves / Month</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="31" 
                    placeholder="4" 
                    value={form.allowedLeaves ?? 4}
                    onChange={e => setForm({ ...form, allowedLeaves: Number(e.target.value) })}
                    className="inp-modern font-bold" 
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Allowed leaves ke baad extra chutti par per-day salary deduct hogi.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Attendance Mode</label>
                  <select
                    value={form.attendanceMode || "manual"}
                    onChange={e => setForm({ ...form, attendanceMode: e.target.value })}
                    className="inp-modern"
                  >
                    <option value="manual">Manual Record (Owner/Manager logs leaves)</option>
                    <option value="biometric">Biometric Device Ready (Cloud punch sync)</option>
                  </select>
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

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Internal Notes (optional)</label>
                  <input 
                    type="text" 
                    placeholder="Shift time, locker no, special instructions, etc." 
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="inp-modern" 
                  />
                </div>
              </div>

              {/* Salary Cycle & Expense Schedule Preview */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-2 text-emerald-950 text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Salary Cycle & Expense Schedule</span>
                </div>
                <p className="text-emerald-800 leading-relaxed text-[11px]">
                  Joining Date: <strong>{form.joinDate || todayStr()}</strong>. Uski first salary theek 1 mahine baad <strong>{getFirstSalaryDueDate(form.joinDate || todayStr())}</strong> ko due hogi aur pay karne par Gym Expenses & Reports me auto-add hogi.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-emerald-700 font-semibold border-t border-emerald-200/60 mt-1">
                  <span>🗓️ Cycle Day: Har mahine ki {new Date(form.joinDate || todayStr()).getDate()} tareekh</span>
                  <span>•</span>
                  <span>✂️ Leave Deduction: {form.allowedLeaves ?? 4} leaves allowed (Extra = -Rs. {Math.round(Number(form.salary || 0) / 30)}/day)</span>
                </div>
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
                <button
                  type="button"
                  onClick={() => handleToggleStatus(viewStaff)}
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border mt-1 capitalize transition cursor-pointer ${
                    (viewStaff.status || "active") === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : (viewStaff.status || "active") === "onleave"
                      ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                  title="Click to toggle status"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${(viewStaff.status || "active") === "active" ? "bg-emerald-500 animate-pulse" : (viewStaff.status || "active") === "onleave" ? "bg-amber-500" : "bg-slate-400"}`} />
                  {(viewStaff.status || "active") === "onleave" ? "Leave" : (viewStaff.status || "active") === "active" ? "Active" : "Inactive"}
                </button>
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
          MODAL 5: DISBURSE SALARY CONFIRMATION
      ============================================================ */}
      <Modal
        isOpen={!!payModal}
        onClose={() => setPayModal(null)}
        title={`Disburse Salary - ${payModal?.name}`}
        maxWidth="max-w-lg"
      >
        {payModal && (() => {
          const emp = payModal;
          const isT = !!emp.isTrainer;
          const pd = staffPayrollMap[emp.id] || {};
          const base = Number(emp.salary || 0);
          const leaveDed = Number(pd.autoLeaveDeduction || 0);
          const otherDed = Number(pd.otherDeductions || 0);
          const bonuses = Number(pd.bonuses || 0);
          const net = Math.max(0, base - leaveDed - otherDed + bonuses);
          const dueInfo = calculateSalaryDueInfo(emp.joinDate, salaryMonth);

          return (
            <form onSubmit={handleConfirmPaySalary} className="space-y-4">
              {/* Employee Summary Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StaffAvatar name={emp.name} photo={emp.photoUrl} size="md" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{emp.name}</h3>
                    <p className="text-xs text-slate-500">
                      {emp.role} • {isT ? "Trainer" : "Staff"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Joining: {emp.joinDate || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${dueInfo.badgeColor}`}>
                    {dueInfo.statusText}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Due: {dueInfo.formattedDue}</p>
                </div>
              </div>

              {/* Salary Breakdown Table */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Monthly Base Salary</span>
                  <span className="font-bold text-slate-900">{fmtCurrency(base)}</span>
                </div>

                {leaveDed > 0 && (
                  <div className="flex items-center justify-between text-rose-700 bg-rose-50/80 px-2 py-1 rounded-lg">
                    <span>
                      Leave Deduction ({pd.unpaidLeaves} unpaid @ {fmtCurrency(Math.round(base / 30))}/d)
                    </span>
                    <span className="font-bold">-{fmtCurrency(leaveDed)}</span>
                  </div>
                )}

                {bonuses > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/80 px-2 py-1 rounded-lg">
                    <span>Bonus & Incentives</span>
                    <span className="font-bold">+{fmtCurrency(bonuses)}</span>
                  </div>
                )}

                {otherDed > 0 && (
                  <div className="flex items-center justify-between text-rose-700 bg-rose-50/80 px-2 py-1 rounded-lg">
                    <span>Other Penalties / Deductions</span>
                    <span className="font-bold">-{fmtCurrency(otherDed)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-black text-sm text-slate-900">
                  <span>Total Net Payable</span>
                  <span className="text-emerald-700 text-base">{fmtCurrency(net)}</span>
                </div>
              </div>

              {/* Payment Mode & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Payment Mode *</label>
                  <select
                    value={payForm.paymentMode}
                    onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })}
                    className="inp-modern font-semibold"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">Online / UPI</option>
                    <option value="bank">Bank Transfer (NEFT/IMPS)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Payment Date</label>
                  <input
                    type="date"
                    value={payForm.paidDate}
                    onChange={e => setPayForm({ ...payForm, paidDate: e.target.value })}
                    className="inp-modern font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Reference / UPI Transaction ID (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Bank UTR / Cheque No."
                    value={payForm.txnRef}
                    onChange={e => setPayForm({ ...payForm, txnRef: e.target.value })}
                    className="inp-modern"
                  />
                </div>
              </div>

              {/* Auto Expense Posting Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 cursor-pointer text-xs text-emerald-950">
                <input
                  type="checkbox"
                  checked={payForm.autoAddExpense}
                  onChange={e => setPayForm({ ...payForm, autoAddExpense: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <p className="font-bold">Auto-record in Gym Expenses & Reports</p>
                  <p className="text-[11px] text-emerald-700">
                    Category: <strong>{isT ? "Trainer Salary" : "Staff Salary"}</strong> ({monthLabel(salaryMonth)})
                  </p>
                </div>
              </label>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModal(null)}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow flex items-center justify-center gap-1.5 text-center cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Confirm & Pay {fmtCurrency(net)}
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* ============================================================
          MODAL 6: LEAVES & ATTENDANCE ADJUSTMENT
      ============================================================ */}
      <Modal
        isOpen={!!leaveModal}
        onClose={() => setLeaveModal(null)}
        title={`Monthly Leaves & Attendance - ${leaveModal?.name}`}
        maxWidth="max-w-md"
      >
        {leaveModal && (() => {
          const emp = leaveModal;
          const allowed = Number(emp.allowedLeaves ?? 4);
          const taken = Math.max(0, Number(leaveForm.leavesTaken || 0));
          const unpaid = Math.max(0, taken - allowed);
          const perDay = Math.round(Number(emp.salary || 0) / 30);
          const totalDeduction = unpaid * perDay;

          return (
            <form onSubmit={handleSaveLeaves} className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{emp.name}</p>
                  <p className="text-[11px] text-slate-500">{emp.role} • Base: {fmtCurrency(emp.salary)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {allowed} Paid Leaves Allowed
                  </span>
                </div>
              </div>

              {/* Numeric Leaves Control */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Total Leaves / Absent Days in {monthLabel(salaryMonth)} *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLeaveForm(f => ({ ...f, leavesTaken: Math.max(0, Number(f.leavesTaken || 0) - 1) }))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-base text-slate-700 flex items-center justify-center transition cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={leaveForm.leavesTaken}
                    onChange={e => setLeaveForm({ ...leaveForm, leavesTaken: e.target.value })}
                    className="flex-1 text-center font-black text-lg py-2 rounded-xl border border-slate-300 bg-white outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setLeaveForm(f => ({ ...f, leavesTaken: Number(f.leavesTaken || 0) + 1 }))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-base text-slate-700 flex items-center justify-center transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Deduction Calculation Breakdown Box */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Paid Leaves (Covered):</span>
                  <span className="font-bold text-emerald-700">{Math.min(taken, allowed)} days</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Extra Unpaid Leaves:</span>
                  <span className={`font-bold ${unpaid > 0 ? "text-rose-600" : "text-slate-700"}`}>{unpaid} days</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Per-Day Deduction Rate:</span>
                  <span className="font-semibold text-slate-800">{fmtCurrency(perDay)}/day</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between font-black text-sm">
                  <span>Auto Salary Deduction:</span>
                  <span className={totalDeduction > 0 ? "text-rose-600" : "text-slate-500"}>
                    {totalDeduction > 0 ? `-${fmtCurrency(totalDeduction)}` : "Rs. 0"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Remarks / Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2 days medical leave, 1 day uninformed"
                  value={leaveForm.notes}
                  onChange={e => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                  className="inp-modern"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveModal(null)}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition text-center shadow cursor-pointer"
                >
                  Save Leave Record
                </button>
              </div>
            </form>
          );
        })()}
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
