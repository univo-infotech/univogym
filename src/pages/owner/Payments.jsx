import React, { useState, useEffect } from "react";
import { DollarSign, Plus, Download, CreditCard, Banknote } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getAllPayments, addPayment } from "../../firebase/payments";
import { generatePaymentReceipt } from "../../utils/pdf";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    memberName: "",
    planName: "3-Month Pro",
    amount: "",
    paidAmount: "",
    dueAmount: "0",
    paymentMode: "cash",
    cashAmount: "",
    onlineAmount: "",
    date: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    async function load() {
      const p = await getAllPayments("univo_main");
      setPayments(p || []);
    }
    load();
  }, []);

  const handleRecord = async (e) => {
    e.preventDefault();
    await addPayment("univo_main", {
      ...form,
      status: Number(form.dueAmount) > 0 ? "partial" : "paid"
    });
    setModalOpen(false);
    const p = await getAllPayments("univo_main");
    setPayments(p || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Billing & Payments</h2>
          <p className="text-slate-400 text-xs mt-1">Handle Cash, Online UPI, Bank transfer, and Mixed payments (half cash / half online)</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Record Payment
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Member Name</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Mode</th>
              <th className="px-6 py-4">Paid</th>
              <th className="px-6 py-4">Due</th>
              <th className="px-6 py-4 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/40">
                <td className="px-6 py-4">{p.date || "Today"}</td>
                <td className="px-6 py-4 font-semibold text-white">{p.memberName}</td>
                <td className="px-6 py-4">{p.planName}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.paymentMode === "cash" ? "bg-green-500/20 text-green-400" :
                    p.paymentMode === "online" ? "bg-blue-500/20 text-blue-400" :
                    p.paymentMode === "mixed" ? "bg-amber-500/20 text-amber-400" : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {p.paymentMode?.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-green-400">₹{p.paidAmount || p.amount}</td>
                <td className="px-6 py-4 text-rose-400 font-semibold">₹{p.dueAmount || 0}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => generatePaymentReceipt(p)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Member Payment">
        <form onSubmit={handleRecord} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300">Member Name</label>
            <input required type="text" placeholder="Rahul Sharma" value={form.memberName} onChange={e => setForm({...form, memberName: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Total Amount (₹)</label>
              <input required type="number" placeholder="5000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value, paidAmount: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Payment Mode</label>
              <select value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white">
                <option value="cash">Cash</option>
                <option value="online">Online (UPI / QR / GPay)</option>
                <option value="bank">Bank Transfer / IMPS</option>
                <option value="mixed">Mixed (Split Cash + Online)</option>
              </select>
            </div>
          </div>

          {form.paymentMode === "mixed" && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-amber-500/30 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-amber-300">Cash Portion (₹)</label>
                <input type="number" placeholder="e.g. 2000" value={form.cashAmount} onChange={e => setForm({...form, cashAmount: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-amber-300">Online Portion (₹)</label>
                <input type="number" placeholder="e.g. 3000" value={form.onlineAmount} onChange={e => setForm({...form, onlineAmount: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Paid Now (₹)</label>
              <input required type="number" value={form.paidAmount} onChange={e => setForm({...form, paidAmount: e.target.value, dueAmount: (Number(form.amount) - Number(e.target.value)).toString()})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Balance / Due (₹)</label>
              <input type="number" value={form.dueAmount} onChange={e => setForm({...form, dueAmount: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-rose-400 font-bold" />
            </div>
          </div>

          <Button fullWidth type="submit">Save Payment & Issue Receipt</Button>
        </form>
      </Modal>
    </div>
  );
}
