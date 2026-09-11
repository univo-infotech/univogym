import React, { useEffect, useState } from "react";
import { Dumbbell, Users, CheckSquare, Camera, MessageCircle, ArrowRight } from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import { useAuth } from "../../contexts/AuthContext";
import { getTrainerMembers } from "../../firebase/trainers";

export default function TrainerDashboard() {
  const { gymId, profileId } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock sessions for today's schedule
  const sessions = [
    { time: "06:30 AM", name: "Vikas Malhotra", goal: "Hypertrophy Chest & Triceps", status: "Done" },
    { time: "08:00 AM", name: "Neha Sharma", goal: "Core & High Intensity Cardio", status: "Upcoming" },
    { time: "05:30 PM", name: "Karan Johar", goal: "Deadlift Form Correction & Back", status: "Upcoming" },
    { time: "07:00 PM", name: "Aman Gupta", goal: "Leg Day & Mobility Drill", status: "Upcoming" },
  ];

  useEffect(() => {
    async function loadMembers() {
      if (gymId && profileId) {
        try {
          const m = await getTrainerMembers(gymId, profileId);
          setMembers(m);
        } catch (e) {
          console.error("Failed to load PT members:", e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadMembers();
  }, [gymId, profileId]);

  return (
    <div className="space-y-6 pb-10">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Trainer Portal 🏋️‍♂️</h1>
          <p className="text-emerald-700 font-medium text-sm mt-1">Manage your PT Clients, Schedules, and Transformations</p>
        </div>
        <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition">
          Update My Profile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My PT Members" value={members.length} icon={<Users className="w-5 h-5 text-teal-600" />} color="teal" />
        <StatCard title="Today's Sessions" value="4" icon={<Dumbbell className="w-5 h-5 text-emerald-600" />} color="green" />
        <StatCard title="Pending Workouts" value="2" icon={<CheckSquare className="w-5 h-5 text-amber-600" />} color="orange" />
        <StatCard title="Transformations" value="12" icon={<Camera className="w-5 h-5 text-blue-600" />} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Today's PT Sessions</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">View All</span>
          </div>
          <div className="space-y-3 flex-1">
            {sessions.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800">{s.time}</span>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{s.name}</h5>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{s.goal}</p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                  s.status === "Done" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* My PT Clients */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">My PT Clients</h3>
            <span className="text-xs font-bold text-slate-500">{members.length} Total</span>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-4">Loading clients...</p>
            ) : members.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No PT clients yet</p>
                <p className="text-xs text-slate-500 mt-1">Clients assigned to you will appear here.</p>
              </div>
            ) : (
              members.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {m.photoUrl ? (
                        <img src={m.photoUrl} alt={m.name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-xs">
                          {(m.name || "M").split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">{m.name}</h5>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{m.planName || "PT Plan"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const num = (m.phone || "").replace(/\D/g, "");
                          window.open(`https://wa.me/${num}?text=Hi%20${m.name},%20Checking%20in%20on%20your%20progress!`, "_blank");
                        }}
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between gap-2">
                     <button className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition">
                       Log Workout
                     </button>
                     <button className="flex-1 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-100 transition">
                       Update Results
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}