import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Palette, MessageSquare, Check, Building2, Phone, MapPin, FileSignature } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import { getGymSettings, saveGymSettings } from "../../utils/settings";

export default function Settings() {
  const [settings, setSettings] = useState(getGymSettings());

  useEffect(() => {
    setSettings(getGymSettings());
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    saveGymSettings(settings);
    toast.success("Gym settings and branding saved successfully!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gym Settings & Custom Branding</h1>
        <p className="text-slate-500 text-xs mt-1">
          Har gym owner apna Gym Name, Tagline, WhatsApp Reminders, aur Official Signature Receipt ke liye set kar sakta hai
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Gym Identity Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" /> Gym Profile & Branding
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Gym Name (Har jagah aur Receipt pe show hoga)</label>
              <input
                required
                type="text"
                value={settings.gymName}
                onChange={(e) => setSettings({ ...settings, gymName: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Gym Tagline / Motto</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Official Gym Phone / WhatsApp</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Gym Address / Branch</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Bill Receipt Signatory Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-emerald-600" /> Bill Receipt Signature & Authority
          </h3>
          <p className="text-xs text-slate-500">
            Payment receipt PDF download karte waqt jo authority signature stamp aayega:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Authorized Signatory Name</label>
              <input
                type="text"
                value={settings.ownerSignatureName}
                onChange={(e) => setSettings({ ...settings, ownerSignatureName: e.target.value })}
                placeholder="e.g. Manish Sharma (Authorized Signatory)"
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Designation / Role Title</label>
              <input
                type="text"
                value={settings.ownerSignatureTitle}
                onChange={(e) => setSettings({ ...settings, ownerSignatureTitle: e.target.value })}
                placeholder="e.g. Gym Owner / Managing Director"
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Reminder Templates */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Renewal Reminder Notification Template
          </h3>
          <p className="text-xs text-slate-500">
            Variables: {"{name}"} = Member Name, {"{plan}"} = Plan Name, {"{expiry}"} = Expiry Date, {"{amount}"} = Renewal Price, {"{gym_name}"} = Gym Name
          </p>
          <textarea
            rows={4}
            value={settings.whatsappReminder}
            onChange={(e) => setSettings({ ...settings, whatsappReminder: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
          />

          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pt-2 border-t border-slate-100">
            <MessageSquare className="w-5 h-5 text-teal-600" /> WhatsApp Welcome Message
          </h3>
          <textarea
            rows={4}
            value={settings.whatsappWelcome}
            onChange={(e) => setSettings({ ...settings, whatsappWelcome: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
          />

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition"
          >
            Save All Settings & Branding
          </button>
        </div>
      </form>
    </div>
  );
}