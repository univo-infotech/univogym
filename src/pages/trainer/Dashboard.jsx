import React from "react";
import { Dumbbell, Users, CheckSquare, Camera, CheckCircle2 } from "lucide-react";
import StatCard from "../../components/ui/StatCard";

export default function TrainerDashboard() {
  const sessions = [
    { time: "06:30 AM", name: "Vikas Malhotra", goal: "Hypertrophy Chest & Triceps", status: "Done" },
    { time: "08:00 AM", name: "Neha Sharma", goal: "Core & High Intensity Cardio", status: "Upcoming" },
    { time: "05:30 PM", name: "Karan Johar", goal: "Deadlift Form Correction & Back", status: "Upcoming" },
    { time: "07:00 PM", name: "Aman Gupta", goal: "Leg Day & Mobility Drill", status: "Upcoming" },
  ];

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-teal-50 via-emerald-50 to-white border border-teal-200/80">
        <h1 className="text-3xl font-extrabold text-slate-900">Trainer Portal 🏋️</h1>
        <p className="text-teal-700 font-medium text-sm mt-1">UNIVO GYM MANAGEMENT • Coach & Athlete Progress Tracker</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My PT Members" value="18" icon={<Users className="w-5 h-5 text-teal-600" />} color="teal" />
        <StatCard title="Today's Sessions" value="6" icon={<Dumbbell className="w-5 h-5 text-emerald-600" />} color="green" />
        <StatCard title="Pending Workouts" value="4" icon={<CheckSquare className="w-5 h-5 text-amber-600" />} color="orange" />
        <StatCard title="Transformations" value="12" icon={<Camera className="w-5 h-5 text-blue-600" />} color="blue" />
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">Today's Scheduled Personal Training Sessions</h3>
        <div className="space-y-3">
          {sessions.map((s, idx) => (
            <div key={idx} className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800">{s.time}</span>
                <div>
                  <h5 className="text-sm font-bold text-slate-900">{s.name}</h5>
                  <p className="text-xs text-slate-500">{s.goal}</p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                s.status === "Done" ? "bg-emerald-100 text-emerald-800" : "bg-teal-100 text-teal-800"
              }`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}