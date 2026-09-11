import React from "react";
import { ClipboardList, Plus } from "lucide-react";
import Button from "../../components/ui/Button";

export default function WorkoutPlans() {
  const routines = [
    { title: "4-Day Upper / Lower Split", target: "Muscle Hypertrophy", exercises: 16, days: "Mon, Tue, Thu, Fri" },
    { title: "Push-Pull-Legs (PPL) Beast Routine", target: "Advanced Athletes", exercises: 22, days: "6 Days / Week" },
    { title: "Fat Shredding HIIT & Strength Circuit", target: "Weight Loss", exercises: 12, days: "Mon, Wed, Fri" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Workout & Diet Templates</h2>
          <p className="text-slate-400 text-xs mt-1">Assign custom workout splits and exercises to members</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />}>Create Routine</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {routines.map((r, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold">{r.target}</span>
            <h4 className="text-base font-bold text-white mt-1">{r.title}</h4>
            <p className="text-xs text-slate-400">{r.exercises} exercises • {r.days}</p>
            <div className="pt-3 border-t border-slate-800">
              <Button size="xs" variant="outline" fullWidth>Assign to Member</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
