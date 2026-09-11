import React, { useState } from "react";
import { CheckSquare, CheckCircle2, XCircle } from "lucide-react";
import Button from "../../components/ui/Button";

export default function TrainerAttendance() {
  const [members, setMembers] = useState([
    { id: 1, name: "Vikas Malhotra", time: "06:30 AM", present: true },
    { id: 2, name: "Neha Sharma", time: "08:00 AM", present: false },
    { id: 3, name: "Aman Gupta", time: "07:00 PM", present: false },
  ]);

  const toggle = (id) => {
    setMembers(members.map(m => m.id === id ? { ...m, present: !m.present } : m));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Member Daily Attendance</h2>
        <p className="text-slate-400 text-xs mt-1">Mark attendance for assigned personal training clients</p>
      </div>

      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
            <div>
              <h4 className="text-base font-bold text-white">{m.name}</h4>
              <p className="text-xs text-slate-400">Scheduled: {m.time}</p>
            </div>
            <button
              onClick={() => toggle(m.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                m.present
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {m.present ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {m.present ? "Present (Checked In)" : "Mark Present"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
