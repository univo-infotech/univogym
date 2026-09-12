import React from "react";
import { CreditCard, Dumbbell, Calendar, Flame, CheckCircle2 } from "lucide-react";
import StatCard from "../../components/ui/StatCard";

export default function MemberDashboard() {
  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/80">
        <h1 className="text-3xl font-extrabold text-slate-900">Welcome back, Athlete! 💪</h1>
        <p className="text-emerald-700 font-medium text-sm mt-1">UNIVO GYM MANAGEMENT • "Stronger Today, Healthier Tomorrow"</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Workout Streak" value="14 Days" icon={<Flame className="w-5 h-5 text-amber-600" />} color="orange" />
        <StatCard title="Days Attended (Month)" value="18 / 26" icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} color="green" />
        <StatCard title="Plan Expiry" value="48 Days Left" icon={<Calendar className="w-5 h-5 text-teal-600" />} color="teal" />
        <StatCard title="Assigned PT" value="Coach Amit" icon={<Dumbbell className="w-5 h-5 text-blue-600" />} color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" /> Active Membership
          </h3>
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-900">3-Month Pro Transformation</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold">ACTIVE</span>
            </div>
            <p className="text-xs text-slate-500">Valid until: 30 October 2026</p>
            <p className="text-xs text-slate-700 pt-2 border-t border-emerald-100">
              Includes: Cardio Zone, Strength Machines, Locker, Steam Bath (Weekend)
            </p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-teal-600" /> Today's Workout Focus
          </h3>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs text-teal-700 font-bold uppercase">Upper Body Push Day</span>
            <ul className="space-y-1.5 text-xs text-slate-700 mt-2">
              <li>• Incline Dumbbell Bench Press — 4 sets x 10 reps</li>
              <li>• Seated Dumbbell Shoulder Press — 3 sets x 12 reps</li>
              <li>• Cable Triceps Pushdown — 4 sets x 15 reps</li>
              <li>• 15 mins Post-workout Stairmaster cardio</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Supplement Store Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-emerald-100 text-xs font-bold uppercase tracking-wider">
            Gym Member Privilege
          </span>
          <h3 className="text-xl font-extrabold mt-2">Authentic Protein & Pre-Workouts at Reception</h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Avail exclusive discounts on 100% genuine whey proteins, creatine monohydrate & accessories directly verified by our gym trainers.
          </p>
        </div>
        <a
          href="/member/store"
          className="px-6 py-3 rounded-2xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 transition shadow-md whitespace-nowrap"
        >
          Browse Gym Store & Rates →
        </a>
      </div>
    </div>
  );
}