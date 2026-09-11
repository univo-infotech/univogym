import React, { useState, useEffect } from "react";
import { Receipt, Plus, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getExpenses, addExpense, deleteExpense } from "../../firebase/expenses";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "Electricity", type: "monthly", amount: "", date: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    async function load() {
      const exp = await getExpenses("univo_main");
      setExpenses(exp || []);
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await addExpense("univo_main", form);
    setModalOpen(false);
    const exp = await getExpenses("univo_main");
    setExpenses(exp || []);
  };

  const handleDelete = async (id) => {
    await deleteExpense("univo_main", id);
    const exp = await getExpenses("univo_main");
    setExpenses(exp || []);
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Expenses Tracker</h2>
          <p className="text-slate-400 text-xs mt-1">One-time and monthly recurring costs (Rent, electricity, repairs)</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Add Expense
        </Button>
      </div>

      <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Total Recorded Expenses</span>
          <div className="text-3xl font-extrabold text-white mt-1">₹{totalExpense.toLocaleString()}</div>
        </div>
        <Receipt className="w-10 h-10 text-rose-400/50" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-slate-800/40">
                <td className="px-6 py-4">{exp.date}</td>
                <td className="px-6 py-4 font-semibold text-white">{exp.title}</td>
                <td className="px-6 py-4">{exp.category}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${exp.type === "monthly" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-300"}`}>
                    {exp.type === "monthly" ? "Monthly Recurring" : "One-time"}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-rose-400">₹{exp.amount}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(exp.id)} className="p-1 rounded text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Gym Expense">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300">Expense Title</label>
            <input required type="text" placeholder="e.g. Electricity Bill - Aug" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white">
                <option>Gym Rent</option>
                <option>Electricity Bill</option>
                <option>Equipment Repair</option>
                <option>Staff Salary</option>
                <option>Supplements Restock</option>
                <option>Marketing / Social Media</option>
                <option>Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300">Amount (₹)</label>
              <input required type="number" placeholder="8500" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white">
                <option value="monthly">Monthly Recurring</option>
                <option value="onetime">One-time</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
          </div>
          <Button fullWidth type="submit">Save Expense</Button>
        </form>
      </Modal>
    </div>
  );
}
