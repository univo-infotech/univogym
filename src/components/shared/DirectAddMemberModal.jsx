import React, { useState, useRef } from "react";
import Modal from "../ui/Modal";
import SignaturePad from "./SignaturePad";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Heart,
  FileText,
  Upload,
  Camera,
  RotateCcw,
  CheckCircle,
  ShieldCheck,
  Dumbbell,
  Trash2,
  Sparkles,
  Sun,
  Sunset,
  Moon
} from "lucide-react";
import toast from "react-hot-toast";
import { addMember } from "../../firebase/members";
import { useAuth } from "../../contexts/AuthContext";

const WORKOUT_SLOTS = [
  { id: "morning", label: "Morning", time: "6:00 AM - 9:00 AM", icon: Sun },
  { id: "afternoon", label: "Afternoon", time: "12:00 PM - 3:00 PM", icon: Sun },
  { id: "evening", label: "Evening", time: "4:00 PM - 7:00 PM", icon: Sunset },
  { id: "night", label: "Night", time: "7:00 PM - 10:00 PM", icon: Moon },
];

const DEFAULT_PLANS = [
  { id: "p1", name: "1-Month Basic", durationMonths: 1, price: 2500 },
  { id: "p2", name: "3-Month Pro", durationMonths: 3, price: 6500 },
  { id: "p3", name: "6-Month Transformation", durationMonths: 6, price: 11000 },
  { id: "p4", name: "Annual Elite Plan", durationMonths: 12, price: 18000 },
];

const DEFAULT_TRAINERS = [
  { id: "t1", name: "Coach Amit Kumar (Head Trainer)" },
  { id: "t2", name: "Coach Sneha Rao (Yoga & Core)" },
  { id: "t3", name: "Coach Rohan Joshi (CrossFit)" },
  { id: "t0", name: "General Floor Trainer (Included)" },
];

export default function DirectAddMemberModal({ isOpen, onClose, onSuccess, plans = null, trainers = null }) {
  const { gymId } = useAuth();
  const fileInputRef = useRef(null);

  // Complete member registration form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    altPhone: "",
    email: "",
    gender: "Male",
    dob: "",
    address: "",
    photoURL: "",
    planId: "p2",
    trainerName: "General Floor Trainer (Included)",
    preferredSlot: "Morning (6:00 AM - 9:00 AM)",
    healthNotes: "",
    waiverAgreed: true,
    signatureURL: "",
    signatureType: "draw", // "draw" or "typed"
    typedSignature: "",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  const [saving, setSaving] = useState(false);

  const availablePlans = plans && plans.length > 0 ? plans : DEFAULT_PLANS;
  const availableTrainers = trainers && trainers.length > 0 ? trainers : DEFAULT_TRAINERS;

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Profile photo must be less than 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, photoURL: reader.result }));
      toast.success("Profile photo uploaded!");
    };
    reader.readAsDataURL(file);
  };

  // Submit full member form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("Member full name is required");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!formData.waiverAgreed) {
      toast.error("Please accept the liability waiver agreement");
      return;
    }

    setSaving(true);

    const selectedPlan = availablePlans.find((p) => p.id === formData.planId) || availablePlans[0];
    const durationMonths = Number(selectedPlan.durationMonths || selectedPlan.duration || 3);
    const expiry = new Date(formData.joiningDate);
    expiry.setMonth(expiry.getMonth() + durationMonths);

    const finalSignature = formData.signatureType === "draw"
      ? formData.signatureURL
      : formData.typedSignature || formData.fullName;

    const newMember = {
      id: "m_" + Date.now(),
      name: formData.fullName.trim(),
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      altPhone: formData.altPhone.trim(),
      email: formData.email.trim(),
      gender: formData.gender,
      dob: formData.dob,
      address: formData.address.trim(),
      photoURL: formData.photoURL,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      trainerName: formData.trainerName,
      preferredTime: formData.preferredSlot,
      slot: formData.preferredSlot,
      healthNotes: formData.healthNotes.trim(),
      waiverAgreed: true,
      signatureURL: finalSignature,
      status: "active",
      registeredBy: "owner_direct",
      createdAt: new Date(formData.joiningDate).toISOString(),
      expiryDate: expiry.toISOString(),
      renewalFee: selectedPlan.price ? String(selectedPlan.price) : "2500"
    };

    try {
      await addMember(gymId || "univo_main", newMember);
    } catch (err) {
      console.warn("Direct member recorded in offline state:", err);
    }

    if (onSuccess) onSuccess(newMember);
    toast.success(`${newMember.fullName} registered successfully!`);
    setSaving(false);
    onClose();

    // Reset form
    setFormData({
      fullName: "",
      phone: "",
      altPhone: "",
      email: "",
      gender: "Male",
      dob: "",
      address: "",
      photoURL: "",
      planId: "p2",
      trainerName: "General Floor Trainer (Included)",
      preferredSlot: "Morning (6:00 AM - 9:00 AM)",
      healthNotes: "",
      waiverAgreed: true,
      signatureURL: "",
      signatureType: "draw",
      typedSignature: "",
      joiningDate: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="➕ Add Member Directly (Complete Registration Form)"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-slate-800 text-xs max-h-[80vh] overflow-y-auto pr-1">
        
        {/* 1. Photo & Identification Section */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-indigo-600" />
              1. Profile Photo & Identification
            </h4>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
              Step 1 of 5
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Photo Avatar Preview */}
            <div className="relative group w-24 h-24 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-2 text-slate-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <span className="text-[10px] font-semibold">No Photo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded-full bg-white text-slate-800 shadow hover:scale-105 transition"
                  title="Upload / Capture Photo"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Photo Upload Actions */}
            <div className="space-y-1.5 flex-1 text-center sm:text-left">
              <p className="font-bold text-slate-800 text-xs">Member Profile Photo (Camera or Gallery)</p>
              <p className="text-[11px] text-slate-500">
                Upload member portrait or take selfie for gym attendance and digital member ID card.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Photo
                </button>
                {formData.photoURL && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, photoURL: "" }))}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name and Phones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Ajay Prajapati"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">WhatsApp Phone Number *</label>
              <input
                required
                type="tel"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Emergency / Alt Phone</label>
              <input
                type="tel"
                placeholder="e.g. 9196302375"
                value={formData.altPhone}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Personal Information */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-emerald-600" />
              2. Personal Details
            </h4>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              Step 2 of 5
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Gender</label>
              <div className="grid grid-cols-3 gap-1.5">
                {["Male", "Female", "Other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition text-center ${
                      formData.gender === g
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Date of Birth (DOB)</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="member@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Residential Address / City</label>
            <input
              type="text"
              placeholder="e.g. 102 Green Avenue, MP Nagar, Bhopal"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* 3. Membership Plan & Trainer Assignment */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Dumbbell className="w-4 h-4 text-purple-600" />
              3. Membership Plan & Trainer
            </h4>
            <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
              Step 3 of 5
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Membership Plan</label>
              <select
                value={formData.planId}
                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {availablePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.price?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Admission / Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Assigned Coach / Trainer</label>
              <select
                value={formData.trainerName}
                onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {availableTrainers.map((t) => (
                  <option key={t.id || t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Workout Schedule & Health Profile */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              4. Workout Schedule & Health Profile
            </h4>
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
              Step 4 of 5
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1.5">Preferred Workout Time Slot</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WORKOUT_SLOTS.map((s) => {
                const fullText = `${s.label} (${s.time})`;
                const isSelected = formData.preferredSlot === fullText;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, preferredSlot: fullText })}
                    className={`p-2 rounded-xl text-left border transition ${
                      isSelected
                        ? "bg-amber-50 border-amber-400 text-amber-900 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Icon className="w-3.5 h-3.5 text-amber-500" />
                      {s.label}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{s.time}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Medical History / Injuries / Fitness Goals
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Weight loss goal, back injury history, high BP, asthma (optional)"
              value={formData.healthNotes}
              onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* 5. Liability Waiver Agreement & Signature */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              5. Liability Waiver & Signature
            </h4>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              Step 5 of 5
            </span>
          </div>

          {/* Waiver Clauses */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
            <p>1. <strong>Physical Activity Awareness:</strong> The member is voluntarily participating in fitness activities aware of their health condition.</p>
            <p>2. <strong>Release of Liability:</strong> The gym and its trainers are released from liability for accidental injuries incurred during training.</p>
            <p>3. <strong>Health Disclosure:</strong> The member agrees to inform trainers of any limitations or medical constraints.</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.waiverAgreed}
              onChange={(e) => setFormData({ ...formData, waiverAgreed: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-slate-800">
              I have read, understood, and agreed to all 3 Liability Waiver terms above
            </span>
          </label>

          {/* Member Digital Signature Pad */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, signatureType: "draw" })}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  formData.signatureType === "draw"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                ✍️ Draw Member Signature
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, signatureType: "typed" })}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  formData.signatureType === "typed"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                ⌨️ Typed Signature
              </button>
            </div>

            {formData.signatureType === "draw" ? (
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <SignaturePad
                  onSave={(dataUrl) => {
                    setFormData((prev) => ({ ...prev, signatureURL: dataUrl }));
                    toast.success("Signature recorded!");
                  }}
                  onClear={() => setFormData((prev) => ({ ...prev, signatureURL: "" }))}
                  currentSignature={formData.signatureURL}
                />
                {formData.signatureURL && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Signature captured successfully
                  </p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Type member's full legal name as digital signature"
                  value={formData.typedSignature || formData.fullName}
                  onChange={(e) => setFormData({ ...formData, typedSignature: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-serif italic text-slate-900"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
          >
            {saving ? "Saving Member..." : "Save & Complete Direct Registration"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
