import React from "react";
import { CreditCard, Dumbbell, Calendar, Flame, CheckCircle2 } from "lucide-react";
import StatCard from "../../components/ui/StatCard";

export default function MemberDashboard() {
  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-green-950 via-slate-900 to-slate-900 border border-green-500/20">
        <h1 className="text-3xl font-extrabold text-white">Welcome back, Athlete! 💪</h1>
        <p className="text-green-400 text-sm mt-1">UNIVO GYM MANAGEMENT • "Stronger Today, Healthier Tomorrow"</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Workout Streak" value="14 Days" icon={<Flame className="w-5 h-5 text-amber-400" />} color="orange" />
        <StatCard title="Days Attended (Month)" value="18 / 26" icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} color="green" />
        <StatCard title="Plan Expiry" value="48 Days Left" icon={<Calendar className="w-5 h-5 text-teal-400" />} color="teal" />
        <StatCard title="Assigned PT" value="Coach Amit" icon={<Dumbbell className="w-5 h-5 text-blue-400" />} color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-400" /> Active Membership
          </h3>
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-white">3-Month Pro Transformation</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">ACTIVE</span>
            </div>
            <p className="text-xs text-slate-400">Valid until: 30 October 2026</p>
            <p className="text-xs text-slate-300 pt-2 border-t border-slate-700">Includes: Cardio Zone, Strength Machines, Locker, Steam Bath (Weekend)</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-teal-400" /> Today's Workout Focus
          </h3>
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
            <span className="text-xs text-teal-400 font-semibold uppercase">Upper Body Push Day</span>
            <ul className="space-y-1 text-xs text-slate-300 mt-2">
              <li>• Incline Dumbbell Bench Press — 4 sets x 10 reps</li>
              <li>• Seated Dumbbell Shoulder Press — 3 sets x 12 reps</li>
              <li>• Cable Triceps Pushdown — 4 sets x 15 reps</li>
              <li>• 15 mins Post-workout Stairmaster cardio</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
