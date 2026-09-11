import React, { useState } from "react";
import { Users, Search, MessageCircle, Eye, Dumbbell, Award, Flame } from "lucide-react";

export default function MyMembers() {
  const [members] = useState([
    { id: "m1", name: "Vikas Malhotra", phone: "+91 9876543210", goal: "Hypertrophy & Muscle Gain", streak: "18 Days", plan: "3-Month Pro", status: "Active" },
    { id: "m2", name: "Neha Sharma", phone: "+91 9811223344", goal: "Fat Loss & Core Strength", streak: "24 Days", plan: "6-Month Transformation", status: "Active" },
    { id: "m3", name: "Karan Johar", phone: "+91 9711003322", goal: "Deadlift & Posture Rehab", streak: "12 Days", plan: "Annual Elite", status: "Active" },
    { id: "m4", name: "Aman Gupta", phone: "+91 9988776655", goal: "Mobility & Agility Training", streak: "8 Days", plan: "1-Month Basic", status: "Active" },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Personal Training Athletes</h1>
        <p className="text-slate-500 text-xs mt-1">Athletes assigned for your dedicated 1-on-1 fitness supervision</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {members.map((m) => (
          <div key={m.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-emerald-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {m.status}
              </span>
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500" /> {m.streak}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{m.name}</h3>
              <p className="text-xs text-emerald-700 font-semibold mt-1">Goal: {m.goal}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.plan}</p>
            </div>

            <button
              onClick={() => {
                const num = m.phone.replace(/\D/g, "");
                window.open(`https://wa.me/${num}?text=Hi%20${m.name},%20ready%20for%20today's%20workout%20session?%20💪`, "_blank");
              }}
              className="w-full py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Check-in
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}