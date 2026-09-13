import React, { useState, useEffect } from "react";
import { Receipt, Plus, Trash2, TrendingDown } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getExpenses, addExpense, deleteExpense } from "../../firebase/expenses";
import { useAuth } from "../../contexts/AuthContext";

export default function Expenses() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";

  const [expenses, setExpenses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Electricity",
    type: "monthly",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const dummyExpenses = [
    { id: "e1", title: "Gym Floor Rent", category: "Rent", type: "monthly", amount: 45000, date: "2026-09-01" },
    { id: "e2", title: "Commercial Electricity Bill", category: "Electricity", type: "monthly", amount: 18500, date: "2026-09-05" },
    { id: "e3", title: "Water Dispensers & Mineral Water Cans", category: "Water", type: "monthly", amount: 3200, date: "2026-09-04" },
    { id: "e4", title: "AC Servicing & Filter Replacement", category: "Maintenance", type: "onetime", amount: 4800, date: "2026-09-08" },
    { id: "e5", title: "Gym Sanitization & Cleaning Supplies", category: "Supplies", type: "monthly", amount: 2500, date: "2026-09-10" },
  ];

  useEffect(() => {
    async function load() {
      try {
        const exp = await getExpenses(gymId);
        setExpenses(exp || []);
      } catch (err) {
        console.warn("Could not load expenses:", err);
        setExpenses([]);
      }
    }
    load();
  }, [gymId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const newE = { ...form, id: "e_" + Date.now() };
    try {
      await addExpense(gymId, newE);
    } catch (e) {
      console.warn("Simulated expense add:", e);
    }
    setExpenses([newE, ...expenses]);
    setModalOpen(false);
    setForm({ title: "", category: "Electricity", type: "monthly", amount: "", date: new Date().toISOString().split("T")[0] });
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpense(gymId, id);
    } catch (e) {
      console.warn("Simulated expense delete:", e);
    }
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses Tracker</h1>
          <p className="text-slate-500 text-xs mt-1">
            Track rent, electricity bills, machine repairs & operational overheads
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Add Expense
        </Button>
      </div>

      {/* Overview Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Total Operational Expenses (Month)
          </span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">₹{totalExpense.toLocaleString()}</div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Receipt className="w-6 h-6" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Expense Title</th>
              <th className="px-5 py-3.5">Category</th>
              <th className="px-5 py-3.5">Frequency</th>
              <th className="px-5 py-3.5">Amount</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 text-slate-500">{exp.date}</td>
                <td className="px-5 py-3.5 font-bold text-slate-900">{exp.title}</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    {exp.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 capitalize font-medium text-slate-500">{exp.type}</td>
                <td className="px-5 py-3.5 font-extrabold text-rose-600 text-sm">₹{Number(exp.amount).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="🧾 Add Gym Expense">
        <form onSubmit={handleAdd} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Expense Title *</label>
            <input
              required
              type="text"
              placeholder="e.g. Commercial Electricity Bill"
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
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option>Rent</option>
                <option>Electricity</option>
                <option>Water</option>
                <option>Maintenance</option>
                <option>Supplements</option>
                <option>Marketing</option>
                <option>Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Amount (₹) *</label>
              <input
                required
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Frequency</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option value="monthly">Monthly Recurring</option>
                <option value="onetime">One-time Cost</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Expense
          </button>
        </form>
      </Modal>
    </div>
  );
}