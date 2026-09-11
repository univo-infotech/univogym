import React, { useState } from "react";
import { ClipboardList, Plus, Dumbbell, Clock, CheckCircle } from "lucide-react";
import Button from "../../components/ui/Button";

export default function WorkoutPlans() {
  const [plans] = useState([
    { title: "Hypertrophy Push-Pull-Legs (PPL)", duration: "6 Days / Week", target: "Muscle Building", exercises: 18 },
    { title: "Metabolic Fat Burn & High Intensity", duration: "5 Days / Week", target: "Weight Loss", exercises: 14 },
    { title: "Powerlifting Big 3 Strength Routine", duration: "4 Days / Week", target: "Max Strength", exercises: 12 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workout & Training Plans</h1>
          <p className="text-slate-500 text-xs mt-1">Create customized daily fitness splits and routines for members</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p, idx) => (
          <div key={idx} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Dumbbell className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                {p.duration}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
              <p className="text-xs text-slate-500 mt-1">Target: {p.target}</p>
              <p className="text-xs text-slate-500">Includes {p.exercises} Compound & Isolation Drills</p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle className="w-3.5 h-3.5" /> Assigned to 18 Athletes</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}