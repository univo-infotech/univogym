import React from "react";
import { Users, Phone, MessageSquare } from "lucide-react";
import Button from "../../components/ui/Button";
import { openWhatsApp } from "../../utils/whatsapp";

export default function MyMembers() {
  const members = [
    { name: "Vikas Malhotra", phone: "9876543210", goal: "Muscle Gain", plan: "6-Month Transformation", joined: "10 Jun 2026" },
    { name: "Neha Sharma", phone: "9812345678", goal: "Fat Loss & Tone", plan: "3-Month Pro", joined: "01 Jul 2026" },
    { name: "Aman Gupta", phone: "9988776655", goal: "Strength & Powerlifting", plan: "Annual Elite", joined: "15 May 2026" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Assigned Personal Training Clients</h2>
        <p className="text-slate-400 text-xs mt-1">Track workout routine, diets and send direct WhatsApp updates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {members.map((m, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 font-medium">{m.goal}</span>
              <span className="text-xs text-slate-400">{m.plan}</span>
            </div>
            <h4 className="text-base font-bold text-white">{m.name}</h4>
            <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {m.phone}</p>
            <div className="pt-2 border-t border-slate-800">
              <Button size="xs" variant="whatsapp" fullWidth icon={<MessageSquare className="w-3.5 h-3.5" />} onClick={() => openWhatsApp(m.phone, `Hi ${m.name}, here is your training update from your Univo Gym Coach!`)}>
                Chat on WhatsApp
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
