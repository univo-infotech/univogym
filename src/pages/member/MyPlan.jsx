import React from "react";
import { CreditCard, Check } from "lucide-react";

export default function MyPlan() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">My Gym Plan</h2>
        <p className="text-slate-400 text-xs mt-1">Current package validity and available upgrade options</p>
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-green-500/30 space-y-4">
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">CURRENT ACTIVE PLAN</span>
        <h3 className="text-2xl font-extrabold text-white">3-Month Pro Transformation</h3>
        <p className="text-xs text-slate-400">Valid: 01 Aug 2026 — 30 Oct 2026 (48 Days Remaining)</p>
        <ul className="space-y-2 pt-2 border-t border-slate-700/60 text-xs text-slate-300">
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" /> Full Gym floor access (Cardio + Free weights)</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" /> Dedicated Personal Trainer assigned</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" /> Locker + Shower facility access</li>
        </ul>
      </div>
    </div>
  );
}
