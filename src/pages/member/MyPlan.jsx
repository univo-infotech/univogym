import React, { useState, useEffect } from "react";
import { CreditCard, Check, Calendar, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getMember } from "../../firebase/members";

export default function MyPlan() {
  const { gymId, profileId, user } = useAuth();
  const [member, setMember] = useState(null);

  useEffect(() => {
    async function loadPlan() {
      const GID = gymId || "univo_main";
      let m = null;
      if (profileId) {
        try {
          m = await getMember(GID, profileId);
        } catch (e) {}
      }
      if (!m) {
        const saved = localStorage.getItem("univo_member_session");
        if (saved) {
          try {
            m = JSON.parse(saved);
          } catch (e) {}
        }
      }
      if (m) setMember(m);
    }
    loadPlan();
  }, [gymId, profileId, user]);

  const planTitle = member?.ptPlanName || member?.planName || "Personal Training Transformation";
  const coach = member?.personalTrainer || member?.trainerName || member?.trainer || "Assigned Coach";
  const expiry = member?.expiryDate ? new Date(member?.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Active";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Gym & PT Plan</h2>
        <p className="text-slate-500 text-xs mt-1">Current package validity and membership details</p>
      </div>

      <div className="p-7 rounded-3xl bg-white border border-emerald-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
            Active PT Package
          </span>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Valid till: {expiry}
          </span>
        </div>

        <div>
          <h3 className="text-2xl font-extrabold text-slate-900">{planTitle}</h3>
          <p className="text-xs text-emerald-700 font-medium mt-1">Assigned Personal Coach: {coach}</p>
        </div>

        <ul className="space-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-700">
          <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> Full Gym floor access (Cardio + Free weights zone)</li>
          <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> Dedicated 1-on-1 PT Coach guidance & Diet charts</li>
          <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> Live Chat & direct consultation with trainer</li>
          <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> Body assessment & weekly transformation tracking</li>
        </ul>
      </div>
    </div>
  );
}
