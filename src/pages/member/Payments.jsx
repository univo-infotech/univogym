import React, { useState, useEffect } from "react";
import { DollarSign, Download, CheckCircle, FileText } from "lucide-react";
import { generatePaymentReceipt } from "../../utils/pdf";
import { useAuth } from "../../contexts/AuthContext";
import { getMemberPayments } from "../../firebase/payments";

export default function MemberPayments() {
  const { gymId, profileId, user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      const GID = gymId || "univo_main";
      let mId = profileId;
      let mData = null;

      const saved = localStorage.getItem("univo_member_session");
      if (saved) {
        try {
          mData = JSON.parse(saved);
          if (!mId) mId = mData.id;
        } catch (e) {}
      }

      if (mId) {
        try {
          const list = await getMemberPayments(GID, mId);
          if (list && list.length > 0) {
            setHistory(list);
          } else if (mData) {
            // Display current enrolled plan payment record if standalone history is empty
            const ptPrice = Number(mData.ptPlanPrice) || 5000;
            const paid = Number(mData.paidAmount) || ptPrice;
            const due = Number(mData.dueAmount) || 0;
            setHistory([
              {
                id: mData.id || "p_curr",
                memberName: mData.name || mData.fullName || "Athlete",
                planName: mData.ptPlanName || mData.planName || "Personal Training Package",
                paidAmount: paid,
                amount: paid + due,
                dueAmount: due,
                paymentMode: mData.paymentMode || "online",
                date: mData.joinDate || new Date().toISOString().split("T")[0],
                status: due > 0 ? "partial" : "paid"
              }
            ]);
          }
        } catch (err) {
          console.warn("Error loading member payments:", err);
        }
      }
      setLoading(false);
    }
    loadPayments();
  }, [gymId, profileId, user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Fee & Payment Invoices</h1>
        <p className="text-slate-500 text-xs mt-1">View your transaction history and download official fee receipts</p>
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
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No payment invoices found.
                </td>
              </tr>
            ) : (
              history.map((p) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}