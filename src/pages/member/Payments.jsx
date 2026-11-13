import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Download,
  CheckCircle,
  FileText,
  CreditCard,
  AlertCircle,
  Calendar,
  Receipt,
  QrCode,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { generatePaymentReceipt } from "../../utils/pdf";
import { useAuth } from "../../contexts/AuthContext";
import { getMemberPayments } from "../../firebase/payments";
import { formatDate } from "../../utils/dateUtils";

export default function MemberPayments() {
  const { gymId, profileId, user } = useAuth();
  const [history, setHistory] = useState([]);
  const [member, setMember] = useState(null);
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
          setMember(mData);
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
            const totalPlanPrice = Number(mData.planPrice || mData.totalAmount || mData.ptPlanPrice || 0);
            const paid = Number(mData.paidAmount) || (mData.paymentStatus === "paid" ? totalPlanPrice : 0);
            const due = Number(mData.dueAmount) || Math.max(0, totalPlanPrice - paid);
            setHistory([
              {
                id: mData.id || "p_curr",
                memberName: mData.name || mData.fullName || "Athlete",
                planName: mData.planName || mData.ptPlanName || "Gym Membership",
                paidAmount: paid,
                amount: totalPlanPrice || (paid + due),
                dueAmount: due,
                paymentMode: mData.paymentMode || "Online UPI",
                date: mData.joinDate || new Date().toISOString().split("T")[0],
                status: due > 0 ? "partial" : "paid",
              },
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

  const totalPaid = history.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const totalDue = history.reduce((sum, p) => sum + (Number(p.dueAmount) || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Billing & Payment Invoices</h1>
          <p className="text-slate-500 text-xs mt-1">
            View transaction history and download official tax fee receipts
          </p>
        </div>

        <Link
          to="/member/plan"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950 flex items-center gap-2 self-start sm:self-auto"
        >
          <QrCode className="w-4 h-4" /> Renew Membership via UPI
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Paid to Date</span>
            <div className="text-2xl font-black text-slate-900">₹{totalPaid.toLocaleString()}</div>
            <span className="text-[11px] font-bold text-emerald-600">Active Membership</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            totalDue > 0 ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"
          }`}>
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Outstanding Due Balance</span>
            <div className={`text-2xl font-black ${totalDue > 0 ? "text-amber-600" : "text-slate-900"}`}>
              ₹{totalDue.toLocaleString()}
            </div>
            <span className={`text-[11px] font-bold ${totalDue > 0 ? "text-amber-600" : "text-teal-600"}`}>
              {totalDue > 0 ? "Pay at Reception / UPI" : "All Fees Cleared"}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Next Plan Expiry</span>
            <div className="text-lg font-bold text-slate-900 truncate">
              {member?.expiryDate ? formatDate(member.expiryDate) : "Active Plan"}
            </div>
            <span className="text-[11px] font-bold text-indigo-600">
              {member?.planName || "Gym Plan"}
            </span>
          </div>
        </div>
      </div>

      {/* Invoice Ledger Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Payment Ledger & Receipts
          </h3>
          <span className="text-xs text-slate-500">{history.length} Invoices</span>
        </div>

        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Invoice Date</th>
              <th className="px-5 py-3.5">Membership Plan</th>
              <th className="px-5 py-3.5">Payment Mode</th>
              <th className="px-5 py-3.5">Amount Paid</th>
              <th className="px-5 py-3.5">Remaining Due</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Official Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                  No payment invoices found.
                </td>
              </tr>
            ) : (
              history.map((p) => {
                const isPaid = Number(p.dueAmount || 0) === 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-medium text-slate-700">{formatDate(p.date)}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{p.planName}</td>
                    <td className="px-5 py-3.5 uppercase font-semibold text-slate-600">{p.paymentMode || "UPI"}</td>
                    <td className="px-5 py-3.5 font-extrabold text-emerald-600 text-sm">₹{p.paidAmount}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-500">₹{p.dueAmount || 0}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isPaid ? "PAID" : "PARTIAL DUE"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => generatePaymentReceipt(p)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" /> Download PDF
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
