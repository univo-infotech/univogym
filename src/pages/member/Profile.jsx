import React, { useState } from "react";
import { User, Phone, Mail, MapPin, ShieldCheck } from "lucide-react";
import Button from "../../components/ui/Button";

export default function MemberProfile() {
  const [name, setName] = useState("Vikas Malhotra");
  const [phone] = useState("+91 9876543210");
  const [email, setEmail] = useState("vikas.m@gmail.com");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">My Athlete Profile</h2>
        <p className="text-slate-400 text-xs mt-1">Manage personal details & view liability waiver confirmation</p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="text-xs text-slate-300">Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-slate-300">Registered WhatsApp Phone (Verified)</label>
          <input type="text" disabled value={phone} className="w-full mt-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2 text-sm text-slate-400" />
        </div>
        <div>
          <label className="text-xs text-slate-300">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
        </div>
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <span className="font-bold text-green-400 block">Liability Waiver Digitally Signed</span>
            Signed during self-registration with physical fitness disclosure and release terms.
          </div>
        </div>
        <Button size="sm">Save Profile</Button>
      </div>
    </div>
  );
}
