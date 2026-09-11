import React, { useState } from "react";
import { CheckSquare, CheckCircle, XCircle, Clock } from "lucide-react";

export default function TrainerAttendance() {
  const [list, setList] = useState([
    { id: "a1", name: "Vikas Malhotra", time: "06:30 AM", status: "present" },
    { id: "a2", name: "Neha Sharma", time: "08:00 AM", status: "present" },
    { id: "a3", name: "Karan Johar", time: "05:30 PM", status: "pending" },
    { id: "a4", name: "Aman Gupta", time: "07:00 PM", status: "pending" },
  ]);

  const toggleStatus = (id) => {
    setList(list.map(item => item.id === id ? { ...item, status: item.status === "present" ? "absent" : "present" } : item));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Athlete Daily Attendance</h1>
        <p className="text-slate-500 text-xs mt-1">Mark daily check-ins for personal training and floor athletes</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Athlete Name</th>
              <th className="px-5 py-3.5">Slot Timing</th>
              <th className="px-5 py-3.5">Attendance Status</th>
              <th className="px-5 py-3.5 text-right">Quick Mark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 font-bold text-slate-900">{item.name}</td>
                <td className="px-5 py-3.5 font-mono text-slate-500">{item.time}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    item.status === "present" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    item.status === "absent" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => toggleStatus(item.id)}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs transition"
                  >
                    Toggle Present / Absent
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}