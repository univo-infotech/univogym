import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Plus,
  Trash2,
  TrendingDown,
  Repeat,
  Calendar,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Clock,
  Building,
  Zap,
  Droplets,
  Wrench,
  ShoppingBag,
  Megaphone,
  Layers,
  HelpCircle,
  Filter,
  ArrowUpRight,
  Info
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import {
  getExpenses,
  addExpense,
  deleteExpense,
  updateExpense,
  toggleRecurringExpense
} from "../../firebase/expenses";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const CATEGORIES = [
  { id: "Rent", name: "Gym Rent", icon: Building, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "Electricity", name: "Electricity Bill", icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "Water", name: "Water & Dispensers", icon: Droplets, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { id: "Maintenance", name: "Equipment Repair", icon: Wrench, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { id: "Staff Salary", name: "Staff Payroll", icon: Layers, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "Supplements", name: "Store Restock", icon: ShoppingBag, color: "text-rose-600 bg-rose-50 border-rose-200" },
  { id: "Marketing", name: "Marketing & Ads", icon: Megaphone, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { id: "Miscellaneous", name: "Other Expenses", icon: Receipt, color: "text-slate-600 bg-slate-100 border-slate-200" }
];

export default function Expenses() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "monthly_templates" | "onetime"
  const [selectedCategory, setSelectedCategory] = useState("all");

  const todayIso = new Date().toISOString().split("T")[0];
  const currentMonthKey = todayIso.slice(0, 7);

  const [form, setForm] = useState({
    title: "",
    category: "Electricity",
    type: "monthly", // "monthly" | "onetime"
    amount: "",
    date: todayIso,
    dayOfMonth: new Date().getDate(),
    notes: "",
    autoMonthlyRecur: true
  });

  // Load all expenses with automated recurring calculation
  async function loadExpensesData() {
    setLoading(true);
    try {
      const data = await getExpenses(gymId);
      setExpenses(data || []);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpensesData();
  }, [gymId]);

  // Create new expense
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) {
      toast.error("Please enter expense title and amount");
      return;
    }

    try {
      const isMonthly = form.type === "monthly";
      const isAuto = isMonthly && form.autoMonthlyRecur;

      const newExpense = {
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        type: form.type,
        date: form.date,
        notes: form.notes || "",
        isRecurringTemplate: isAuto,
        isActive: true,
        startDate: form.date,
        dayOfMonth: Number(form.dayOfMonth) || Number(form.date.split("-")[2]) || 1,
        status: isAuto ? "active_recurring" : "paid"
      };

      await addExpense(gymId, newExpense);
      toast.success(
        isAuto
          ? "Monthly recurring expense created! Automatic billing set up. ✨"
          : "Expense added successfully!"
      );
      setModalOpen(false);
      setForm({
        title: "",
        category: "Electricity",
        type: "monthly",
        amount: "",
        date: todayIso,
        dayOfMonth: new Date().getDate(),
        notes: "",
        autoMonthlyRecur: true
      });
      loadExpensesData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save expense");
    }
  };

  // Toggle pause/active on recurring expense
  const handleToggleRecurring = async (templateId, currentActive) => {
    try {
      const newStatus = !currentActive;
      await toggleRecurringExpense(gymId, templateId, newStatus);
      toast.success(newStatus ? "Recurring billing resumed ▶️" : "Recurring billing paused ⏸️");
      setExpenses((prev) =>
        prev.map((item) => (item.id === templateId ? { ...item, isActive: newStatus } : item))
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not update recurring state");
    }
  };

  // Delete expense
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove '${title}'?`)) return;
    try {
      await deleteExpense(gymId, id);
      toast.success("Expense removed");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete expense");
    }
  };

  // Filtered lists
  const recurringTemplates = useMemo(() => {
    return expenses.filter((e) => e.type === "monthly" && e.isRecurringTemplate === true);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Tab filter
      if (activeTab === "monthly_templates") {
        if (!e.isRecurringTemplate) return false;
      } else if (activeTab === "onetime") {
        if (e.type !== "onetime") return false;
      }

      // Category filter
      if (selectedCategory !== "all" && e.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [expenses, activeTab, selectedCategory]);

  // Current Month Financial Stats
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(
      (e) => (e.date || "").startsWith(currentMonthKey) && !e.isRecurringTemplate
    );
  }, [expenses, currentMonthKey]);

  const totalThisMonthAmount = useMemo(() => {
    return currentMonthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [currentMonthExpenses]);

  const recurringActiveMonthlyTotal = useMemo(() => {
    return recurringTemplates
      .filter((t) => t.isActive !== false)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [recurringTemplates]);

  const oneTimeThisMonthAmount = useMemo(() => {
    return currentMonthExpenses
      .filter((e) => e.type === "onetime")
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [currentMonthExpenses]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Expenses & Overhead Manager 🧾
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated monthly bills (Rent, Electricity) & one-time gym expenses tracking.
              </p>
            </div>
          </div>
        </div>

        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 px-5 py-3 rounded-2xl shrink-0"
        >
          Add Expense / Fixed Bill
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total This Month */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
              Current Month Incurred
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">
              ₹{totalThisMonthAmount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Billed for {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Fixed Recurring Budget */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 flex items-center gap-1 w-fit">
              <Repeat className="w-3 h-3" /> Auto-Billed Monthly
            </span>
            <div className="text-2xl font-black text-purple-700 mt-2">
              ₹{recurringActiveMonthlyTotal.toLocaleString("en-IN")}
              <span className="text-xs text-slate-400 font-normal">/mo</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {recurringTemplates.filter((t) => t.isActive !== false).length} Active Fixed Recurring Bill(s)
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Repeat className="w-6 h-6" />
          </div>
        </div>

        {/* One-time Overhead this month */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              One-Time Overhead
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">
              ₹{oneTimeThisMonthAmount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Repairs, supplies & non-recurring spends
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* RECURRING EXPENSES HIGHLIGHT CONTAINER (Auto-Pilot Bills) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white border border-emerald-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                Automated Monthly Fixed Bills (No Re-entry Required)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Auto-Pilot Active
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Ek baar rent, electricity bill ya fixed kharche add karo. Har naya month shuru hote hi system automatic record bana dega!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setForm((prev) => ({ ...prev, type: "monthly", autoMonthlyRecur: true }));
              setModalOpen(true);
            }}
            className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-3.5 py-2 rounded-xl border border-emerald-200 shadow-2xs self-start sm:self-auto transition"
          >
            <Plus className="w-3.5 h-3.5" /> Setup New Fixed Bill
          </button>
        </div>

        {recurringTemplates.length === 0 ? (
          <div className="p-6 text-center bg-white/70 rounded-2xl border border-dashed border-emerald-200 text-xs text-slate-500">
            <Repeat className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
            Abhi koi monthly fixed recurring expense set nahi hai. "Setup New Fixed Bill" par click karke Rent ya Bills add karein taaki har mahine automatic add ho sakein!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {recurringTemplates.map((t) => {
              const catObj = CATEGORIES.find((c) => c.id === t.category) || CATEGORIES[7];
              const IconComp = catObj.icon;
              const isActive = t.isActive !== false;

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl bg-white border transition shadow-2xs space-y-3 ${
                    isActive ? "border-emerald-200/90" : "border-slate-200 opacity-60 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl border ${catObj.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 truncate max-w-[150px]">{t.title}</h3>
                        <span className="text-[10px] text-slate-400 font-semibold">{t.category}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {isActive ? "Active Auto" : "Paused"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Fixed Amount</span>
                      <p className="text-base font-black text-rose-600">₹{Number(t.amount).toLocaleString("en-IN")}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Auto-Bill Date</span>
                      <p className="text-xs font-black text-slate-800">Day {t.dayOfMonth || 1} of Month</p>
                    </div>
                  </div>

                  {/* Actions (Pause/Resume & Delete) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleRecurring(t.id, isActive)}
                      className={`font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                        isActive
                          ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                          : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      }`}
                      title={isActive ? "Pause auto-monthly billing" : "Resume auto-monthly billing"}
                    >
                      {isActive ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" /> Pause
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" /> Resume
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(t.id, t.title)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Recurring Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FILTER & TAB CONTROLS */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition whitespace-nowrap ${
              activeTab === "all"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Ledger Entries ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab("monthly_templates")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "monthly_templates"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" /> Fixed Recurring Rules ({recurringTemplates.length})
          </button>
          <button
            onClick={() => setActiveTab("onetime")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition whitespace-nowrap ${
              activeTab === "onetime"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            One-Time Expenses Only
          </button>
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-bold text-slate-500">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-800 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DETAILED EXPENSES LEDGER TABLE */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Expenses Ledger History
          </h3>
          <span className="text-xs font-extrabold text-slate-500">
            Showing {filteredExpenses.length} record(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading expenses ledger...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No expenses found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Title / Notes</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Type & Automation</th>
                  <th className="px-5 py-3.5 text-right">Amount (₹)</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredExpenses.map((exp) => {
                  const cat = CATEGORIES.find((c) => c.id === exp.category) || CATEGORIES[7];
                  const IconComp = cat.icon;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {exp.date || "N/A"}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{exp.title}</p>
                        {exp.notes && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {exp.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${cat.color}`}>
                          <IconComp className="w-3 h-3" /> {exp.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {exp.isRecurringTemplate ? (
                          <span className="inline-flex items-center gap-1 text-purple-700 font-extrabold text-[11px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <Repeat className="w-3 h-3" /> Monthly Rule (Day {exp.dayOfMonth || 1})
                          </span>
                        ) : exp.isRecurringInstance ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Auto-Generated
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-medium capitalize">
                            {exp.type === "onetime" ? "One-time cost" : "Manual entry"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-black text-rose-600 text-sm text-right whitespace-nowrap">
                        ₹{Number(exp.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {exp.isRecurringTemplate ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              exp.isActive !== false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {exp.isActive !== false ? "Active" : "Paused"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(exp.id, exp.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="🧾 Add Expense or Fixed Bill">
        <form onSubmit={handleSaveExpense} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Expense Title / Payee *</label>
            <input
              required
              type="text"
              placeholder="e.g. Gym Floor Rent, Electricity Bill, AC Gas Refill"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Amount (₹) *</label>
              <input
                required
                type="number"
                placeholder="45000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-extrabold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Expense Nature (Monthly vs One-Time) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Expense Frequency & Automation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "monthly", autoMonthlyRecur: true })}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  form.type === "monthly"
                    ? "bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                    : "bg-slate-100/70 border-slate-200 text-slate-500 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Repeat className={`w-4 h-4 ${form.type === "monthly" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="text-xs font-black text-slate-900">Monthly Fixed</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Har mahine automatic add hoga (Rent, Bills)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, type: "onetime", autoMonthlyRecur: false })}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  form.type === "onetime"
                    ? "bg-white border-blue-500 shadow-xs ring-1 ring-blue-500"
                    : "bg-slate-100/70 border-slate-200 text-slate-500 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className={`w-4 h-4 ${form.type === "onetime" ? "text-blue-600" : "text-slate-400"}`} />
                  <span className="text-xs font-black text-slate-900">One-Time Cost</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sirf isi date par ek baar add hoga (Repairs, AC)
                </p>
              </button>
            </div>

            {form.type === "monthly" && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Billing Day of the Month:</span>
                  <select
                    value={form.dayOfMonth}
                    onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-extrabold text-slate-800"
                  >
                    {[1, 5, 10, 15, 20, 25, 28].map((day) => (
                      <option key={day} value={day}>
                        {day}st/th of each month
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Auto-Pilot on: Har mahine ki tarikh {form.dayOfMonth} ko ledger me automatic kharcha jud jayega jab tak aap ise pause ya delete nahi karte.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Effective Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Notes / Payee Ref</label>
              <input
                type="text"
                placeholder="e.g. Landlord UPI, Meter #42"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-md shadow-emerald-500/20 transition active:scale-98"
          >
            {form.type === "monthly" ? "Save & Activate Automated Monthly Bill ✨" : "Record One-Time Expense"}
          </button>
        </form>
      </Modal>
    </div>
  );
}