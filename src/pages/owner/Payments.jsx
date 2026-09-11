import React, { useState, useEffect } from "react";
import { DollarSign, Plus, Download, CreditCard, Banknote, Search, TrendingUp, CheckCircle, Clock } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getAllPayments, addPayment } from "../../firebase/payments";
import { generatePaymentReceipt } from "../../utils/pdf";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");

  const [form, setForm] = useState({
    memberName: "",
    planName: "3-Month Pro",
    amount: "6500",
    paidAmount: "6500",
    dueAmount: "0",
    paymentMode: "cash",
    cashAmount: "",
    onlineAmount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const dummyPayments = [
    { id: "p1", memberName: "Ajay Prajapati", planName: "3-Month Pro", paidAmount: 6500, amount: 6500, dueAmount: 0, paymentMode: "online", date: "2026-09-12", status: "paid" },
    { id: "p2", memberName: "Rahul Verma", planName: "Annual Elite", paidAmount: 18000, amount: 18000, dueAmount: 0, paymentMode: "cash", date: "2026-09-11", status: "paid" },
    { id: "p3", memberName: "Priya Sharma", planName: "6-Month Transformation", paidAmount: 8000, amount: 11000, dueAmount: 3000, paymentMode: "mixed", date: "2026-09-10", status: "partial" },
    { id: "p4", memberName: "Aman Gupta", planName: "1-Month Basic", paidAmount: 2500, amount: 2500, dueAmount: 0, paymentMode: "online", date: "2026-09-09", status: "paid" },
    { id: "p5", memberName: "Karan Johar", planName: "3-Month Pro", paidAmount: 6500, amount: 6500, dueAmount: 0, paymentMode: "bank", date: "2026-09-08", status: "paid" },
    { id: "p6", memberName: "Neha Rajput", planName: "Annual Elite", paidAmount: 12000, amount: 18000, dueAmount: 6000, paymentMode: "mixed", date: "2026-09-07", status: "partial" },
  ];

  useEffect(() => {
    async function load() {
      try {
        const p = await getAllPayments("univo_main");
        setPayments(p && p.length > 0 ? p : dummyPayments);
      } catch (err) {
        setPayments(dummyPayments);
      }
    }
    load();
  }, []);

  const handleRecord = async (e) => {
    e.preventDefault();
    const newPay = {
      ...form,
      id: "p_" + Date.now(),
      status: Number(form.dueAmount) > 0 ? "partial" : "paid"
    };
    try {
      await addPayment("univo_main", newPay);
    } catch (e) {
      console.warn("Simulated payment record:", e);
    }
    setPayments([newPay, ...payments]);
    setModalOpen(false);
    setForm({
      memberName: "",
      planName: "3-Month Pro",
      amount: "6500",
      paidAmount: "6500",
      dueAmount: "0",
      paymentMode: "cash",
      cashAmount: "",
      onlineAmount: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const totalCollected = payments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || Number(curr.amount) || 0), 0);
  const totalDue = payments.reduce((acc, curr) => acc + (Number(curr.dueAmount) || 0), 0);

  const filtered = payments.filter((p) => {
    const matchSearch = (p.memberName || "").toLowerCase().includes(search.toLowerCase()) ||
                        (p.planName || "").toLowerCase().includes(search.toLowerCase());
    const matchMode = modeFilter === "all" || p.paymentMode === modeFilter;
    return matchSearch && matchMode;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Payments</h1>
          <p className="text-slate-500 text-xs mt-1">
            Cash, Online UPI, Bank Transfer & Split/Mixed payments management
          </p>
        </div>
        <Button 
          icon={<Plus className="w-4 h-4" />} 
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Record New Payment
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Paid Collection</p>
            <h3 className="text-xl font-extrabold text-slate-900">₹{totalCollected.toLocaleString()}</h3>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pending Dues / Balance</p>
            <h3 className="text-xl font-extrabold text-rose-600">₹{totalDue.toLocaleString()}</h3>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Transactions Count</p>
            <h3 className="text-xl font-extrabold text-slate-900">{payments.length} Invoices</h3>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member name or plan..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "online", "cash", "mixed", "bank"].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                modeFilter === m
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {m === "all" ? "All Modes" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Member Name</th>
              <th className="px-5 py-3.5">Plan</th>
              <th className="px-5 py-3.5">Mode</th>
              <th className="px-5 py-3.5">Paid Amount</th>
              <th className="px-5 py-3.5">Due Balance</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 font-medium text-slate-500">{p.date || "Today"}</td>
                <td className="px-5 py-3.5 font-bold text-slate-900">{p.memberName}</td>
                <td className="px-5 py-3.5 text-slate-600">{p.planName}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase ${
                    p.paymentMode === "cash" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    p.paymentMode === "online" ? "bg-cyan-50 text-cyan-700 border border-cyan-200" :
                    p.paymentMode === "mixed" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}>
                    {p.paymentMode}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-extrabold text-emerald-600 text-sm">₹{p.paidAmount || p.amount}</td>
                <td className="px-5 py-3.5 font-semibold text-rose-500">₹{p.dueAmount || 0}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    Number(p.dueAmount) > 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    {Number(p.dueAmount) > 0 ? "PARTIAL" : "PAID"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => generatePaymentReceipt(p)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition shadow-sm"
                    title="Download Receipt PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="💳 Record Member Payment">
        <form onSubmit={handleRecord} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Member Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Ajay Prajapati"
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Membership Plan</label>
              <select
                value={form.planName}
                onChange={(e) => setForm({ ...form, planName: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option>1-Month Basic (₹2,500)</option>
                <option>3-Month Pro (₹6,500)</option>
                <option>6-Month Transformation (₹11,000)</option>
                <option>Annual Elite Plan (₹18,000)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Total Plan Fee (₹)</label>
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
              <label className="text-xs font-bold text-slate-700">Amount Paid Now (₹)</label>
              <input
                required
                type="number"
                value={form.paidAmount}
                onChange={(e) => {
                  const paid = e.target.value;
                  const due = Math.max(0, Number(form.amount) - Number(paid));
                  setForm({ ...form, paidAmount: paid, dueAmount: String(due) });
                }}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Remaining Due (₹)</label>
              <input
                readOnly
                type="number"
                value={form.dueAmount}
                className="w-full mt-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: "cash", label: "💵 Cash" },
                { key: "online", label: "📱 UPI / Online" },
                { key: "bank", label: "🏦 Bank" },
                { key: "mixed", label: "⚖️ Mixed" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setForm({ ...form, paymentMode: m.key })}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border text-center transition ${
                    form.paymentMode === m.key
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {form.paymentMode === "mixed" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-amber-900">Cash Part (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 3000"
                  value={form.cashAmount}
                  onChange={(e) => setForm({ ...form, cashAmount: e.target.value })}
                  className="w-full mt-1 bg-white border border-amber-300 rounded-lg p-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-amber-900">Online Part (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 3500"
                  value={form.onlineAmount}
                  onChange={(e) => setForm({ ...form, onlineAmount: e.target.value })}
                  className="w-full mt-1 bg-white border border-amber-300 rounded-lg p-1.5"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Payment & Issue Receipt
          </button>
        </form>
      </Modal>
    </div>
  );
}