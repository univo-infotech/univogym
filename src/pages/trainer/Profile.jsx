import React, { useState, useEffect } from "react";
import {
  KeyRound,
  CheckCircle2,
  Award,
  Trash2,
  FileText,
  Dumbbell,
  IndianRupee,
  Sparkles,
  Calculator,
  Calendar,
  Clock,
  Percent,
  HandCoins,
  ImageIcon,
  Plus,
  X,
  Save
} from "lucide-react";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import { useAuth } from "../../contexts/AuthContext";
import { getTrainer, getTrainers, updateTrainer } from "../../firebase/trainers";
import toast from "react-hot-toast";

export default function TrainerProfile() {
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trainerId, setTrainerId] = useState("");

  const [form, setForm] = useState({
    photoUrl: "",
    name: "",
    phone: "",
    email: "",
    password: "",
    experience: "5 Years",
    specialization: "Weight Training & Hypertrophy",
    bio: "",
    certUrl: "",
    commissionType: "percentage", // "percentage" | "fixed"
    commissionValue: 30,
    ptPlans: [
      {
        id: 1,
        name: "1 Month 1-on-1 PT",
        durationType: "months",
        durationValue: 1,
        sessionsCount: 24,
        duration: "1 Month (24 Sessions)",
        price: 4500,
        description: "Personalized workout routine, daily form check & diet guidance"
      },
      {
        id: 2,
        name: "3 Months Transformation PT",
        durationType: "months",
        durationValue: 3,
        sessionsCount: 72,
        duration: "3 Months (72 Sessions)",
        price: 11000,
        description: "Dedicated 1-on-1 coaching, supplement strategy & weekly body fat audit"
      }
    ],
    transformations: [
      { id: 1, beforeImg: "", afterImg: "", description: "" }
    ]
  });

  // Format Duration Text
  const formatPtDuration = (type, value, sessions) => {
    const val = Number(value) || 1;
    let durText = "";
    if (type === "days") {
      durText = `${val} Day${val > 1 ? "s" : ""}`;
    } else if (type === "years") {
      durText = `${val} Year${val > 1 ? "s" : ""}`;
    } else {
      durText = `${val} Month${val > 1 ? "s" : ""}`;
    }

    if (sessions && Number(sessions) > 0) {
      return `${durText} (${sessions} Sessions)`;
    }
    return durText;
  };

  const getPtTotalDays = (type, value) => {
    const val = Number(value) || 1;
    if (type === "days") return val;
    if (type === "years") return val * 365;
    return val * 30; // months
  };

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        let tData = null;

        if (profileId) {
          try {
            tData = await getTrainer(GID, profileId);
          } catch (e) {}
        }

        if (!tData) {
          const savedSession = localStorage.getItem("univo_trainer_session");
          if (savedSession) {
            try {
              tData = JSON.parse(savedSession);
            } catch (e) {}
          }
        }

        if (!tData || !tData.name) {
          const allTrainers = await getTrainers(GID);
          const searchEmail = (user?.email || "").toLowerCase().trim();
          const searchName = (user?.displayName || "").toLowerCase().trim();
          const found = allTrainers.find((t) => {
            const tEmail = (t.email || t.loginEmail || "").toLowerCase().trim();
            const tName = (t.name || t.fullName || "").toLowerCase().trim();
            return (searchEmail && tEmail === searchEmail) || (searchName && tName === searchName);
          });
          if (found) {
            tData = found;
          } else if (allTrainers.length > 0) {
            tData = allTrainers[0];
          }
        }

        if (tData) {
          setTrainerId(tData.id || profileId || "i5sXkR1c7jIkPb89US2x");
          setForm({
            photoUrl: tData.photoUrl || tData.photo || "",
            name: tData.name || tData.fullName || "",
            phone: tData.phone || "",
            email: tData.email || tData.loginEmail || "",
            password: tData.loginPassword || tData.password || "Coach@123",
            experience: tData.experience ? String(tData.experience) : "5 Years",
            specialization: tData.specialization || (Array.isArray(tData.specializations) ? tData.specializations[0] : "Weight Training & Hypertrophy"),
            bio: tData.bio || "",
            certUrl: tData.certUrl || "",
            commissionType: tData.commissionType || tData.ptCommissionType || "percentage",
            commissionValue: tData.commissionValue !== undefined ? tData.commissionValue : (tData.ptCommissionValue !== undefined ? tData.ptCommissionValue : 30),
            ptPlans: Array.isArray(tData.ptPlans) && tData.ptPlans.length > 0
              ? tData.ptPlans.map((p, idx) => ({
                  id: p.id || idx + 1,
                  name: p.name || "",
                  durationType: p.durationType || (p.duration?.toLowerCase().includes("year") ? "years" : p.duration?.toLowerCase().includes("day") ? "days" : "months"),
                  durationValue: p.durationValue || (p.duration?.toLowerCase().includes("3 month") ? 3 : p.duration?.toLowerCase().includes("6 month") ? 6 : p.duration?.toLowerCase().includes("1 year") ? 1 : 1),
                  sessionsCount: p.sessionsCount || (p.duration?.match(/\d+(?=\s*sessions)/i)?.[0] ? Number(p.duration.match(/\d+(?=\s*sessions)/i)[0]) : 24),
                  duration: p.duration || "1 Month (24 Sessions)",
                  price: p.price || "",
                  description: p.description || ""
                }))
              : [
                  {
                    id: 1,
                    name: "1 Month 1-on-1 PT",
                    durationType: "months",
                    durationValue: 1,
                    sessionsCount: 24,
                    duration: "1 Month (24 Sessions)",
                    price: 4500,
                    description: "Personalized workout routine, daily form check & diet guidance"
                  },
                  {
                    id: 2,
                    name: "3 Months Transformation PT",
                    durationType: "months",
                    durationValue: 3,
                    sessionsCount: 72,
                    duration: "3 Months (72 Sessions)",
                    price: 11000,
                    description: "Dedicated 1-on-1 coaching, supplement strategy & weekly body fat audit"
                  }
                ],
            transformations: Array.isArray(tData.transformations) && tData.transformations.length > 0
              ? tData.transformations.map((t, idx) => ({
                  id: t.id || idx + 1,
                  beforeImg: t.beforeImg || t.beforeURL || "",
                  afterImg: t.afterImg || t.afterURL || "",
                  description: t.description || t.notes || ""
                }))
              : [{ id: 1, beforeImg: "", afterImg: "", description: "" }]
          });
        }
      } catch (err) {
        console.error("Failed to load trainer profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [GID, profileId, user]);

  const handleFileUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error("File is too large. Please select a file under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result }));
      toast.success("File attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  // PT Plans Handlers
  const handlePtPlanChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.ptPlans];
      const plan = { ...updated[index], [field]: value };

      if (field === "durationType" || field === "durationValue" || field === "sessionsCount") {
        const dType = field === "durationType" ? value : (plan.durationType || "months");
        const dVal = field === "durationValue" ? value : (plan.durationValue || 1);
        const sess = field === "sessionsCount" ? value : plan.sessionsCount;
        plan.duration = formatPtDuration(dType, dVal, sess);
      }

      updated[index] = plan;
      return { ...prev, ptPlans: updated };
    });
  };

  const applyPtPreset = (index, presetType, presetVal, presetSess) => {
    setForm((prev) => {
      const updated = [...prev.ptPlans];
      const plan = { ...updated[index] };
      plan.durationType = presetType;
      plan.durationValue = presetVal;
      plan.sessionsCount = presetSess;
      plan.duration = formatPtDuration(presetType, presetVal, presetSess);
      if (!plan.name || plan.name.includes("Month") || plan.name.includes("Year") || plan.name.includes("Day")) {
        const prefix = presetType === "years" ? `${presetVal} Year` : presetType === "days" ? `${presetVal} Days` : `${presetVal} Month`;
        plan.name = `${prefix} 1-on-1 PT`;
      }
      updated[index] = plan;
      return { ...prev, ptPlans: updated };
    });
  };

  const addPtPlan = () => {
    setForm((prev) => ({
      ...prev,
      ptPlans: [
        ...prev.ptPlans,
        {
          id: Date.now(),
          name: "1 Month 1-on-1 PT",
          durationType: "months",
          durationValue: 1,
          sessionsCount: 24,
          duration: "1 Month (24 Sessions)",
          price: "",
          description: "Personalized workout routine, daily form check & diet guidance"
        }
      ]
    }));
  };

  const removePtPlan = (index) => {
    if (form.ptPlans.length <= 1) {
      toast.error("You must have at least one PT package.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      ptPlans: prev.ptPlans.filter((_, i) => i !== index)
    }));
  };

  // Transformations Handlers
  const updateTransformationPhoto = (index, type, url) => {
    setForm((prev) => {
      const updated = [...prev.transformations];
      updated[index] = { ...updated[index], [type]: url };
      return { ...prev, transformations: updated };
    });
  };

  const handleTransformationDesc = (val, index) => {
    setForm((prev) => {
      const updated = [...prev.transformations];
      updated[index] = { ...updated[index], description: val };
      return { ...prev, transformations: updated };
    });
  };

  const addMoreTransformation = () => {
    setForm((prev) => ({
      ...prev,
      transformations: [
        ...prev.transformations,
        { id: Date.now(), beforeImg: "", afterImg: "", description: "" }
      ]
    }));
  };

  const removeTransformation = (index) => {
    if (form.transformations.length <= 1) {
      setForm((prev) => ({
        ...prev,
        transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }]
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      transformations: prev.transformations.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Trainer name and phone number are required.");
      return;
    }

    setSaving(true);
    try {
      const targetId = trainerId || "i5sXkR1c7jIkPb89US2x";
      const payload = {
        name: form.name.trim(),
        fullName: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        loginEmail: form.email.trim(),
        password: form.password.trim(),
        loginPassword: form.password.trim(),
        experience: form.experience,
        specialization: form.specialization,
        specializations: [form.specialization],
        bio: form.bio,
        photoUrl: form.photoUrl || "",
        certUrl: form.certUrl || "",
        commissionType: form.commissionType || "percentage",
        commissionValue: Number(form.commissionValue) || 0,
        ptPlans: (form.ptPlans || [])
          .filter((p) => p.name && p.price)
          .map((p) => ({ ...p, price: Number(p.price) })),
        transformations: form.transformations.filter(t => t.beforeImg || t.afterImg || t.description),
        updatedAt: new Date().toISOString()
      };

      await updateTrainer(GID, targetId, payload);
      localStorage.setItem("univo_trainer_session", JSON.stringify({ id: targetId, ...payload }));
      toast.success("Trainer profile updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">Loading trainer profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Header card matching the design */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Personal Trainer Profile Setup</h2>
            <p className="text-xs text-slate-500">Edit and update all details of your personal trainer profile</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Form Body - Exactly matching the image */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Top Profile Photo: Upload Photo & Take Live Photo */}
          <div>
            <PhotoCaptureInput
              value={form.photoUrl}
              onChange={(url) => setForm((prev) => ({ ...prev, photoUrl: url }))}
              label="Trainer Portrait Photo"
              subLabel="Upload trainer portrait or take live camera photo"
              shape="circle"
            />
          </div>

          {/* Trainer Full Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Trainer Full Name *
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
              placeholder="e.g. Coach Amit Kumar"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Phone Number (WhatsApp) *
            </label>
            <input
              required
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
              placeholder="9876543210"
            />
          </div>

          {/* Trainer Portal Login Access */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-600" /> Trainer Portal Login ID & Password
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                Coach App Access
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Coach will use these credentials to log in to their personal Trainer Portal to manage assigned members & diet plans.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase">
                  Login ID / Email *
                </label>
                <input
                  required
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 outline-none"
                  placeholder="coach@univogym.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase">
                  Login Password *
                </label>
                <input
                  required
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 outline-none font-mono font-bold text-emerald-800"
                  placeholder="e.g. Coach@123"
                />
              </div>
            </div>
          </div>

          {/* Experience & Specialization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Experience
              </label>
              <input
                type="text"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="e.g. 5 Years"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Specialization
              </label>
              <input
                type="text"
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="e.g. Weight Training & Hypertrophy"
              />
            </div>
          </div>

          {/* Professional Bio / Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Professional Bio / Description
            </label>
            <textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none resize-none"
              placeholder="Short description of the trainer's background, achievements..."
            ></textarea>
          </div>

          {/* Certification Upload Section */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" /> Trainer Certification
            </h4>
            <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-emerald-50/60 hover:border-emerald-300 transition group bg-white shadow-xs">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition">
                {form.certUrl ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <Award className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {form.certUrl ? "Certificate Attached" : "Upload Certification"}
                </p>
                <p className="text-[10px] text-slate-500">Supports PDF, JPG, PNG (Max 800KB)</p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold group-hover:bg-emerald-500 group-hover:text-white transition">
                {form.certUrl ? "Change File" : "Browse"}
              </div>
              <input
                type="file"
                accept="image/jpeg, image/png, application/pdf"
                onChange={(e) => handleFileUpload(e, "certUrl")}
                className="hidden"
              />
            </label>
          </div>

          {/* Gym Owner & Trainer PT Commission Deal */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border-2 border-indigo-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <HandCoins className="w-4 h-4 text-indigo-600" /> Gym Owner & Trainer PT Commission Deal (कमीशन समझौता)
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  PT membership sale hone par Trainer dwara Gym Owner ko diya jane wala share:
                </p>
              </div>
              <div className="flex rounded-xl overflow-hidden border border-indigo-200 text-[11px] font-bold self-start sm:self-auto bg-white">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, commissionType: "percentage" }))}
                  className={`px-3 py-1.5 transition flex items-center gap-1 ${
                    form.commissionType === "percentage"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-indigo-50"
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" /> Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, commissionType: "fixed" }))}
                  className={`px-3 py-1.5 transition flex items-center gap-1 ${
                    form.commissionType === "fixed"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-indigo-50"
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Fixed Amount (₹)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {form.commissionType === "percentage" ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Gym Owner Share (%):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.commissionValue}
                      onChange={(e) => setForm((prev) => ({ ...prev, commissionValue: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-black text-indigo-950 focus:outline-none focus:border-indigo-500 pr-8"
                      placeholder="30"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Gym ko <strong>{form.commissionValue || 0}%</strong> milega, Trainer ka <strong>{Math.max(0, 100 - (form.commissionValue || 0))}%</strong> bachega.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Gym Owner Fixed Cut per PT Sale (₹):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={form.commissionValue}
                      onChange={(e) => setForm((prev) => ({ ...prev, commissionValue: Math.max(0, Number(e.target.value)) }))}
                      className="w-full bg-white border border-indigo-200 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-indigo-950 focus:outline-none focus:border-indigo-500"
                      placeholder="1500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Har PT admission par flat <strong>₹{Number(form.commissionValue || 0).toLocaleString("en-IN")}</strong> Gym ka share hoga.
                  </span>
                </div>
              )}

              {/* Live Split Example Simulation */}
              <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-100 pb-1">
                  <span>Example on ₹5,000 PT Sale:</span>
                  <span className="text-indigo-600 font-extrabold">Auto Split</span>
                </div>
                {(() => {
                  const samplePrice = 5000;
                  const ownerCut = form.commissionType === "percentage"
                    ? Math.round(samplePrice * ((Number(form.commissionValue) || 0) / 100))
                    : Math.min(samplePrice, Number(form.commissionValue) || 0);
                  const trainerCut = Math.max(0, samplePrice - ownerCut);

                  return (
                    <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70">
                        <p className="text-[10px] font-bold text-indigo-700">🏢 Gym Owner Cut</p>
                        <p className="text-xs font-black text-indigo-950 mt-0.5">₹{ownerCut.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                        <p className="text-[10px] font-bold text-emerald-700">🏋️ Trainer Earning</p>
                        <p className="text-xs font-black text-emerald-950 mt-0.5">₹{trainerCut.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Trainer PT Membership Packages */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Trainer PT Packages (व्यक्तिगत प्रशिक्षण पैकेज)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Define custom membership & PT pricing packages specific to this trainer.
                </p>
              </div>
              <button
                type="button"
                onClick={addPtPlan}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add PT Package
              </button>
            </div>

            <div className="space-y-3">
              {form.ptPlans.map((plan, idx) => (
                <div
                  key={plan.id || idx}
                  className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl relative space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Dumbbell className="w-3 h-3 text-emerald-600" /> Package #{idx + 1}
                    </span>
                    {form.ptPlans.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePtPlan(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="Remove package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Quick Duration Presets */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
                      <Clock className="w-3 h-3 text-emerald-600" /> Quick Duration Presets (तुरंत पैकेज चुनें):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { label: "1 Month", type: "months", val: 1, sess: 24 },
                        { label: "3 Months", type: "months", val: 3, sess: 72 },
                        { label: "6 Months", type: "months", val: 6, sess: 144 },
                        { label: "1 Year", type: "years", val: 1, sess: 288 }
                      ].map((preset) => {
                        const isMatch = (plan.durationType || "months") === preset.type && Number(plan.durationValue || 1) === preset.val;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyPtPreset(idx, preset.type, preset.val, preset.sess)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
                              isMatch
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                            }`}
                          >
                            {preset.label}
                            <span className={`block text-[9px] font-normal ${isMatch ? "text-emerald-100" : "text-slate-400"}`}>
                              ({preset.sess} sessions)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Package Name */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        Package Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={plan.name}
                        onChange={(e) => handlePtPlanChange(idx, "name", e.target.value)}
                        placeholder="e.g. 1 Month 1-on-1 PT"
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    {/* Month / Year / Days Value & Unit */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> Month / Year Duration *
                      </label>
                      <div className="flex gap-1.5 mt-1">
                        <input
                          required
                          type="number"
                          min="1"
                          value={plan.durationValue || 1}
                          onChange={(e) => handlePtPlanChange(idx, "durationValue", Math.max(1, Number(e.target.value)))}
                          className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none text-center"
                        />
                        <select
                          value={plan.durationType || "months"}
                          onChange={(e) => handlePtPlanChange(idx, "durationType", e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 outline-none"
                        >
                          <option value="months">Month(s)</option>
                          <option value="years">Year(s)</option>
                          <option value="days">Day(s)</option>
                        </select>
                      </div>
                    </div>

                    {/* Planned Sessions */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        Sessions
                      </label>
                      <input
                        type="number"
                        value={plan.sessionsCount || 24}
                        onChange={(e) => handlePtPlanChange(idx, "sessionsCount", Number(e.target.value))}
                        placeholder="24"
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 outline-none text-center font-bold"
                      />
                    </div>

                    {/* Package Total Fees */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        Fees (₹) *
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          ₹
                        </span>
                        <input
                          required
                          type="number"
                          value={plan.price}
                          onChange={(e) => handlePtPlanChange(idx, "price", e.target.value)}
                          placeholder="4500"
                          className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automatic Calculation Banner */}
                  <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Calculator className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-emerald-950">
                          {plan.duration || formatPtDuration(plan.durationType || "months", plan.durationValue || 1, plan.sessionsCount)}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium ml-1.5">
                          (Total: ~{getPtTotalDays(plan.durationType || "months", plan.durationValue || 1)} Days valid)
                        </span>
                      </div>
                    </div>

                    {plan.price && Number(plan.price) > 0 && (
                      <div className="flex items-center gap-3 font-semibold text-[11px] text-emerald-900 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-100">
                        {(plan.durationType === "years" || (plan.durationType === "months" && Number(plan.durationValue) > 1)) && (
                          <span>
                            Monthly Rate: <strong className="text-emerald-700 font-extrabold">₹{Math.round(Number(plan.price) / ((plan.durationType === "years" ? Number(plan.durationValue || 1) * 12 : Number(plan.durationValue || 1)))).toLocaleString("en-IN")}/mo</strong>
                          </span>
                        )}
                        {plan.sessionsCount && Number(plan.sessionsCount) > 0 && (
                          <span>
                            Per Session: <strong className="text-emerald-700 font-extrabold">₹{Math.round(Number(plan.price) / Number(plan.sessionsCount)).toLocaleString("en-IN")}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      What's Included / Description
                    </label>
                    <input
                      type="text"
                      value={plan.description}
                      onChange={(e) => handlePtPlanChange(idx, "description", e.target.value)}
                      placeholder="e.g. Customized workout split, daily form check & personalized diet plan"
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transformations / Before-After Section with Add More */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" /> Client Transformation Results
              </h4>
              <button
                type="button"
                onClick={addMoreTransformation}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add More Result
              </button>
            </div>

            <div className="space-y-4">
              {form.transformations.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl relative space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700">
                      Result #{idx + 1}
                    </span>
                    {form.transformations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTransformation(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="Remove this transformation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Side-by-side Before & After */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PhotoCaptureInput
                      value={item.beforeImg}
                      onChange={(url) => updateTransformationPhoto(idx, "beforeImg", url)}
                      label="Before Transformation"
                      subLabel="Upload file or take live snap"
                      shape="rounded"
                      aspectRatio="square"
                    />
                    <PhotoCaptureInput
                      value={item.afterImg}
                      onChange={(url) => updateTransformationPhoto(idx, "afterImg", url)}
                      label="After Transformation"
                      subLabel="Upload file or take live snap"
                      shape="rounded"
                      aspectRatio="square"
                    />
                  </div>

                  {/* Description below */}
                  <div>
                    <input
                      type="text"
                      value={item.description || ""}
                      onChange={(e) => handleTransformationDesc(e.target.value, idx)}
                      placeholder="e.g. 12 Weeks Fat Loss & Muscle Gain - 14kg down"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Save Button matching image */}
          <button
            disabled={saving}
            type="submit"
            className="w-full py-3.5 mt-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:shadow-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {saving ? (
              "Updating Profile..."
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Update Trainer Profile & Setup
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
