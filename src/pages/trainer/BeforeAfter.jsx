import React, { useState } from "react";
import { Camera, Plus, Sparkles } from "lucide-react";
import Button from "../../components/ui/Button";

export default function BeforeAfter() {
  const [gallery] = useState([
    { name: "Vikas Malhotra", weightBefore: "92 kg", weightAfter: "78 kg", duration: "90 Days", trainer: "Coach Amit" },
    { name: "Neha Sharma", weightBefore: "74 kg", weightAfter: "61 kg", duration: "120 Days", trainer: "Coach Sneha" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Before & After Transformations</h1>
          <p className="text-slate-500 text-xs mt-1">Showcase real client fat-loss and muscle transformation results</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gallery.map((g, idx) => (
          <div key={idx} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{g.name}</h3>
                <p className="text-xs text-slate-500">Mentored by {g.trainer}</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {g.duration} Journey
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Starting Weight</span>
                <p className="text-xl font-extrabold text-slate-700 mt-1">{g.weightBefore}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-xs font-bold text-emerald-600 uppercase">Current Weight</span>
                <p className="text-xl font-extrabold text-emerald-700 mt-1">{g.weightAfter}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}