import React, { useState } from "react";
import { Tag, Send, MessageSquare, Sparkles, Percent } from "lucide-react";
import Button from "../../components/ui/Button";
import { openWhatsApp } from "../../utils/whatsapp";

export default function Offers() {
  const [broadcastMessage, setBroadcastMessage] = useState(
    "🔥 *UNIVO GYM SPECIAL OFFER!*\n\nGet 20% FLAT OFF on 6-Month & 1-Year plans this season! Free Personal Training fitness assessment included.\n\nVisit gym reception to claim today 💪"
  );
  const [targetAudience, setTargetAudience] = useState("all");

  const dummyOffers = [
    { id: "o1", title: "Festival Flash Sale", discount: "20% OFF", plan: "Annual Elite", expiry: "30 Sep 2026", active: true },
    { id: "o2", title: "Buddy Transformation Deal", discount: "Buy 1 Get 1 at 50%", plan: "6-Month Transformation", expiry: "15 Oct 2026", active: true },
    { id: "o3", title: "Student Fitness Pass", discount: "Flat ₹1000 OFF", plan: "3-Month Pro", expiry: "Ongoing", active: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Offers & WhatsApp Broadcast</h1>
        <p className="text-slate-500 text-xs mt-1">
          Send marketing promotions, festival discounts & win-back messages directly on WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Composer */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Direct Broadcaster
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-700">Select Target Group</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
            >
              <option value="all">All Active Members (148 Members)</option>
              <option value="expired">Expired Members (Win-back Deal)</option>
              <option value="expiring">Members Expiring This Week (Renewal Prompt)</option>
              <option value="leads">Walk-in Leads & Trials</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Message Content</label>
            <textarea
              rows={5}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono resize-none focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={() => openWhatsApp("", broadcastMessage)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Open WhatsApp Broadcast
          </button>
        </div>

        {/* Active Promos */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" /> Active Membership Offers
          </h3>

          <div className="space-y-3">
            {dummyOffers.map((off) => (
              <div key={off.id} className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      {off.discount}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{off.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Applies to: {off.plan} • Valid: {off.expiry}</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  LIVE
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}