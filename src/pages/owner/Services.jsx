import React, { useState } from "react";
import { Plus, Star } from "lucide-react";
import Button from "../../components/ui/Button";

export default function Services() {
  const [services] = useState([
    { name: "Personal Training (PT)", desc: "1-on-1 dedicated coach with custom diet & form monitoring", price: "₹4,000/mo" },
    { name: "Diet & Nutrition Consultation", desc: "Weekly macro planning, body fat analysis, supplement guidance", price: "₹1,500/session" },
    { name: "Steam & Sauna Bath", desc: "Post-workout recovery & detox session", price: "₹200/session" },
    { name: "Locker Facility", desc: "Secure digital locker for daily fitness accessories", price: "₹500/mo" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gym Services & Add-ons</h2>
          <p className="text-slate-400 text-xs mt-1">Special services, personal training sessions and recovery facilities</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-start">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {s.name}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">{s.desc}</p>
            </div>
            <span className="text-sm font-bold text-green-400 px-3 py-1 bg-green-500/10 rounded-xl border border-green-500/20">
              {s.price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
