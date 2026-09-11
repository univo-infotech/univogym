import React, { useState, useEffect, useRef } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Palette,
  MessageSquare,
  Check,
  Building2,
  Phone,
  MapPin,
  FileSignature,
  Upload,
  Image as ImageIcon,
  Trash2,
  PenTool,
  CheckCircle,
  FileText,
  Sparkles,
  RotateCcw
} from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import { getGymSettings, saveGymSettings } from "../../utils/settings";
import SignaturePad from "../../components/shared/SignaturePad";

export default function Settings() {
  const [settings, setSettings] = useState(getGymSettings());
  const [signatureMode, setSignatureMode] = useState("draw"); // "draw" or "upload"
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  useEffect(() => {
    setSettings(getGymSettings());
  }, []);

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    saveGymSettings(settings);
    toast.success("Gym settings, official logo & signature saved successfully!");
  };

  // Logo upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo file size must be less than 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setSettings((prev) => ({ ...prev, logoUrl: dataUrl }));
      toast.success("Gym logo uploaded successfully! Remember to save settings.");
    };
    reader.readAsDataURL(file);
  };

  // Reset logo to default
  const handleResetLogo = () => {
    setSettings((prev) => ({ ...prev, logoUrl: "/logo-icon.png" }));
    toast.success("Reset to default Univo logo.");
  };

  // Signature image file upload handler
  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Signature image must be less than 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setSettings((prev) => ({ ...prev, signatureUrl: dataUrl }));
      toast.success("Official signature image uploaded! Remember to save settings.");
    };
    reader.readAsDataURL(file);
  };

  // Digital canvas signature save handler
  const handleCanvasSignatureSave = (dataUrl) => {
    setSettings((prev) => ({ ...prev, signatureUrl: dataUrl }));
    toast.success("Digital signature captured! Click 'Save All Settings' below to persist.");
  };

  // Clear signature
  const handleClearSignature = () => {
    setSettings((prev) => ({ ...prev, signatureUrl: "" }));
    toast.success("Signature cleared.");
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          Gym Settings & Custom Branding
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Customize your official Gym Logo, Digital Signature Stamp, Bill Authority, and WhatsApp Reminders.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Official Gym Logo Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              Official Gym Logo
            </h3>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Appears on PDF Receipts & Navigation
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            {/* Logo Preview Box */}
            <div className="relative group w-28 h-28 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center p-2 shadow-xs shrink-0 overflow-hidden">
              <img
                src={settings.logoUrl || "/logo-icon.png"}
                alt="Gym Logo Preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="p-1.5 rounded-full bg-white text-slate-800 shadow-md hover:scale-105 transition"
                  title="Change Logo"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Logo Actions */}
            <div className="space-y-2 text-center sm:text-left flex-1">
              <h4 className="text-sm font-bold text-slate-900">Upload Gym Crest or Brand Logo</h4>
              <p className="text-xs text-slate-500">
                Recommended: Square image with transparent background (PNG, JPG or WEBP). Max size 2 MB.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload New Logo
                </button>

                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Official Bill Receipt Signature & Authority Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-emerald-600" />
              Official Bill Signature & Stamp
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Embedded on Official Tax Receipts
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Configure the authorized signature and title stamped onto all computer-generated tax receipts and membership invoices.
          </p>

          {/* Signatory Name & Designation Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Authorized Signatory Name *</label>
              <input
                required
                type="text"
                value={settings.ownerSignatureName}
                onChange={(e) => setSettings({ ...settings, ownerSignatureName: e.target.value })}
                placeholder="e.g. Manish Sharma (Authorized Signatory)"
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Designation / Role Title *</label>
              <input
                required
                type="text"
                value={settings.ownerSignatureTitle}
                onChange={(e) => setSettings({ ...settings, ownerSignatureTitle: e.target.value })}
                placeholder="e.g. Gym Owner / Managing Director"
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Signature Capture Mode Toggle */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSignatureMode("draw")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  signatureMode === "draw"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Draw Digital Signature
              </button>

              <button
                type="button"
                onClick={() => setSignatureMode("upload")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  signatureMode === "upload"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Scanned Signature / Seal
              </button>
            </div>

            {/* Mode 1: Draw Digital Signature Canvas */}
            {signatureMode === "draw" && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <SignaturePad
                  onSave={handleCanvasSignatureSave}
                  onClear={handleClearSignature}
                  currentSignature={settings.signatureUrl}
                />
              </div>
            )}

            {/* Mode 2: Upload Scanned Signature Image */}
            {signatureMode === "upload" && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Upload image of your physical signature or round gym seal
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Supported: PNG or JPG with white/transparent background.
                  </p>
                  <button
                    type="button"
                    onClick={() => signatureInputRef.current?.click()}
                    className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Select Signature Image
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Invoice Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Live Receipt Preview (Signature Stamp)
              </span>
              {settings.signatureUrl && (
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove Signature
                </button>
              )}
            </div>

            <div className="flex items-center justify-between py-3 px-2">
              {/* Official Seal Simulation */}
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/80 flex flex-col items-center justify-center text-center p-1">
                <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest">VERIFIED</span>
                <CheckCircle className="w-4 h-4 text-emerald-400 my-0.5" />
                <span className="text-[7px] text-emerald-300 font-bold uppercase truncate max-w-[65px]">
                  {settings.gymName || "UNIVO GYM"}
                </span>
              </div>

              {/* Signatory line preview */}
              <div className="text-center w-52 space-y-1">
                {settings.signatureUrl ? (
                  <div className="h-12 flex items-end justify-center">
                    <img
                      src={settings.signatureUrl}
                      alt="Signature"
                      className="max-h-12 max-w-full object-contain filter invert"
                    />
                  </div>
                ) : (
                  <div className="h-12 flex items-end justify-center text-[11px] text-slate-500 italic">
                    (No signature drawn/uploaded)
                  </div>
                )}
                <div className="w-full border-b border-slate-600"></div>
                <p className="text-xs font-bold text-slate-200">{settings.ownerSignatureName}</p>
                <p className="text-[10px] text-slate-400">{settings.ownerSignatureTitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Gym Profile & Address Details */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" /> Gym Profile & Branch Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Gym Name (Printed on all receipts)</label>
              <input
                required
                type="text"
                value={settings.gymName}
                onChange={(e) => setSettings({ ...settings, gymName: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Gym Tagline / Motto</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
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
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Gym Address / Facility Location</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 4. WhatsApp Reminder Templates */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Renewal Reminder Notification Template
          </h3>
          <p className="text-xs text-slate-500">
            Dynamic Variables: {"{name}"} = Member Name, {"{plan}"} = Plan Name, {"{expiry}"} = Expiry Date, {"{amount}"} = Renewal Price, {"{gym_name}"} = Gym Name
          </p>
          <textarea
            rows={4}
            value={settings.whatsappReminder}
            onChange={(e) => setSettings({ ...settings, whatsappReminder: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
          />

          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pt-2 border-t border-slate-100">
            <MessageSquare className="w-5 h-5 text-teal-600" /> WhatsApp Welcome Message
          </h3>
          <textarea
            rows={4}
            value={settings.whatsappWelcome}
            onChange={(e) => setSettings({ ...settings, whatsappWelcome: e.target.value })}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-black text-sm shadow-md transition"
          >
            Save All Settings, Logo & Signature
          </button>
        </div>
      </form>
    </div>
  );
}