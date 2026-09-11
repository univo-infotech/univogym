import React from "react";
import { DollarSign, Download, CheckCircle } from "lucide-react";
import { generatePaymentReceipt } from "../../utils/pdf";

export default function MemberPayments() {
  const history = [
    { id: "p1", memberName: "Ajay Prajapati", planName: "3-Month Pro", paidAmount: 6500, amount: 6500, dueAmount: 0, paymentMode: "online", date: "2026-09-10" },
    { id: "p0", memberName: "Ajay Prajapati", planName: "1-Month Basic", paidAmount: 2500, amount: 2500, dueAmount: 0, paymentMode: "cash", date: "2026-08-10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Fee & Payment Invoices</h1>
        <p className="text-slate-500 text-xs mt-1">View transaction history and download official fee receipts</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Invoice Date</th>
              <th className="px-5 py-3.5">Plan</th>
              <th className="px-5 py-3.5">Payment Mode</th>
              <th className="px-5 py-3.5">Amount Paid</th>
              <th className="px-5 py-3.5">Balance Due</th>
              <th className="px-5 py-3.5 text-right">Official Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 font-medium text-slate-500">{p.date}</td>
                <td className="px-5 py-3.5 font-bold text-slate-900">{p.planName}</td>
                <td className="px-5 py-3.5 uppercase font-semibold text-slate-700">{p.paymentMode}</td>
                <td className="px-5 py-3.5 font-extrabold text-emerald-600 text-sm">₹{p.paidAmount}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-500">₹{p.dueAmount}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => generatePaymentReceipt(p)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" /> Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}