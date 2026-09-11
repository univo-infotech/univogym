import React, { useState } from "react";
import { Tag, Send, MessageSquare } from "lucide-react";
import Button from "../../components/ui/Button";
import { openWhatsApp } from "../../utils/whatsapp";

export default function Offers() {
  const [broadcastMessage, setBroadcastMessage] = useState(
    "🔥 *UNIVO GYM SPECIAL OFFER!*\n\nGet 20% OFF on 6-Month & 1-Year plans this festival season. Free Personal Training assessment included!\n\nVisit gym reception to claim today 💪"
  );
  const [targetAudience, setTargetAudience] = useState("all");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Offers & WhatsApp Broadcast</h2>
        <p className="text-slate-400 text-xs mt-1">Send marketing discounts, festival wishes & gym announcements directly on WhatsApp</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp Message Composer
          </h3>

          <div>
            <label className="text-xs text-slate-300">Select Target Group</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
            >
              <option value="all">All Active Members</option>
              <option value="expired">Expired Members (Win-back)</option>
              <option value="expiring">Members Expiring This Week</option>
              <option value="leads">Demo / Inquiries (Leads)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-300">Message Content</label>
            <textarea
              rows={6}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono resize-none"
            />
          </div>

          <Button
            variant="whatsapp"
            fullWidth
            icon={<Send className="w-4 h-4" />}
            onClick={() => openWhatsApp("", broadcastMessage)}
          >
            Broadcast to {targetAudience.toUpperCase()} Group
          </Button>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-teal-400" /> Live Gym Offers
          </h3>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-green-400">SUMMER TRANSFORMATION</span>
                <span className="text-xs text-slate-400">Valid till 30 Sep</span>
              </div>
              <h4 className="text-base font-bold text-white mt-1">Flat 20% OFF + 15 Days Free</h4>
              <p className="text-xs text-slate-300 mt-1">Applicable on 3-month and 6-month combo packages with personal training.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-400">REFERRAL BONUS</span>
                <span className="text-xs text-slate-400">Always Active</span>
              </div>
              <h4 className="text-base font-bold text-white mt-1">Bring a Friend, Get 1 Month Free</h4>
              <p className="text-xs text-slate-300 mt-1">When your referred friend joins for 3+ months, both get 1 month extension.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
