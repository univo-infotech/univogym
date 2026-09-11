import React, { useState } from "react";
import { Settings as SettingsIcon, Bell, Palette, MessageSquare, Check } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

export default function Settings() {
  const [gymName, setGymName] = useState("UNIVO GYM MANAGEMENT");
  const [tagline, setTagline] = useState("Stronger Today, Healthier Tomorrow");
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    "Hi {name}, welcome to UNIVO GYM! Your plan {plan} has been activated successfully. Let's achieve your goals together! 💪"
  );

  const handleSave = () => {
    toast.success("Gym settings saved successfully!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gym Settings & Customization</h1>
        <p className="text-slate-500 text-xs mt-1">Customize branding, auto-messages & gym contact info</p>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Gym Profile & Branding</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Gym Name</label>
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Tagline / Motto</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Default WhatsApp Welcome Message</h3>
        <p className="text-xs text-slate-500">
          Use variables like {"{name}"}, {"{plan}"} for dynamic personalized messages.
        </p>
        <textarea
          rows={3}
          value={whatsappTemplate}
          onChange={(e) => setWhatsappTemplate(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
        />
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}