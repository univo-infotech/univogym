import React, { useState } from "react";
import { Camera, Plus } from "lucide-react";
import Button from "../../components/ui/Button";

export default function BeforeAfter() {
  const [results] = useState([
    { name: "Rahul V.", beforeWeight: "92 kg", afterWeight: "78 kg", duration: "90 Days", notes: "14 kg fat loss, lean muscle definition gained" },
    { name: "Pooja S.", beforeWeight: "74 kg", afterWeight: "63 kg", duration: "60 Days", notes: "Waist reduced by 4 inches, high cardiovascular stamina" }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Before & After Client Transformations</h2>
          <p className="text-slate-400 text-xs mt-1">Upload client progress photos, weight metrics and body composition results</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />}>Upload Transformation</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {results.map((r, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-bold text-white">{r.name}</h4>
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold">{r.duration}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs text-slate-400 uppercase">Before</span>
                <div className="text-xl font-bold text-slate-200 mt-1">{r.beforeWeight}</div>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <span className="text-xs text-green-400 uppercase font-semibold">After</span>
                <div className="text-xl font-bold text-green-400 mt-1">{r.afterWeight}</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 italic">"{r.notes}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}
