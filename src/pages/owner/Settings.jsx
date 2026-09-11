import React, { useState } from "react";
import { Settings as SettingsIcon, Bell, Palette, MessageSquare } from "lucide-react";
import Button from "../../components/ui/Button";

export default function Settings() {
  const [gymName, setGymName] = useState("UNIVO GYM MANAGEMENT");
  const [tagline, setTagline] = useState("Stronger Today, Healthier Tomorrow");
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    "Hi {name}, welcome to UNIVO GYM! Your plan {plan} has been activated successfully."
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Customization & Gym Settings</h2>
        <p className="text-slate-400 text-xs mt-1">Customize dashboard widgets, WhatsApp templates & gym branding</p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-white">Gym Branding & Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-300">Gym Name</label>
            <input type="text" value={gymName} onChange={(e) => setGymName(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-300">Tagline / Motto</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-white">WhatsApp Notification Template</h3>
        <p className="text-xs text-slate-400">Use placeholders like {"{name}"}, {"{plan}"}, {"{amount}"} for dynamic member messages.</p>
        <textarea
          rows={3}
          value={whatsappTemplate}
          onChange={(e) => setWhatsappTemplate(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono"
        />
        <Button size="sm">Save Settings</Button>
      </div>
    </div>
  );
}
