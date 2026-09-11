import React from "react";
import { Dumbbell, Users, CheckSquare, Camera } from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import Button from "../../components/ui/Button";

export default function TrainerDashboard() {
  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 border border-teal-500/20">
        <h1 className="text-3xl font-extrabold text-white">Trainer Portal 🏋️</h1>
        <p className="text-teal-400 text-sm mt-1">Univo Gym Management • Coach & Member Progress Tracker</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="My PT Members" value="18" icon={<Users className="w-5 h-5 text-teal-400" />} color="teal" />
        <StatCard title="Today's Sessions" value="6" icon={<Dumbbell className="w-5 h-5 text-green-400" />} color="green" />
        <StatCard title="Pending Workouts" value="4" icon={<CheckSquare className="w-5 h-5 text-amber-400" />} color="orange" />
        <StatCard title="Transformations" value="12" icon={<Camera className="w-5 h-5 text-blue-400" />} color="blue" />
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-4">Today's Scheduled Personal Training Sessions</h3>
        <div className="space-y-3">
          {[
            { time: "06:30 AM", name: "Vikas Malhotra", goal: "Hypertrophy Chest & Triceps", status: "Done" },
            { time: "08:00 AM", name: "Neha Sharma", goal: "Core & High Intensity Cardio", status: "Upcoming" },
            { time: "05:30 PM", name: "Karan Johar", goal: "Deadlift Form Correction & Back", status: "Upcoming" },
            { time: "07:00 PM", name: "Aman Gupta", goal: "Leg Day & Mobility Drill", status: "Upcoming" },
          ].map((s, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-2 py-1 rounded bg-slate-900 text-teal-400">{s.time}</span>
                <div>
                  <h5 className="text-sm font-bold text-white">{s.name}</h5>
                  <p className="text-xs text-slate-400">{s.goal}</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.status === "Done" ? "bg-green-500/20 text-green-400" : "bg-teal-500/20 text-teal-400"}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
