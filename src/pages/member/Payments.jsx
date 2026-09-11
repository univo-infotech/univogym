import React from "react";
import { DollarSign, Download, CheckCircle2 } from "lucide-react";

export default function MemberPayments() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Payment Receipts & History</h2>
        <p className="text-slate-400 text-xs mt-1">Download official membership tax invoices & receipts</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
        <div>
          <span className="text-xs text-slate-400">01 Aug 2026 • 3-Month Pro Transformation</span>
          <div className="text-lg font-bold text-white mt-0.5">₹7,500 <span className="text-xs text-green-400 font-semibold">(Paid via UPI)</span></div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> PAID
        </span>
      </div>
    </div>
  );
}
