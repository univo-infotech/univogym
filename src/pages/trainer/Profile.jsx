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
  Save,
  Lock,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Flame,
  BadgeCheck,
  Eye,
  Camera
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
  const [activeTab, setActiveTab] = useState("general");
  const [showCertPreview, setShowCertPreview] = useState(false);

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
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      {/* TOP HERO PROFILE BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700/60 shadow-2xl p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="relative">
              {form.photoUrl ? (
                <img
                  src={form.photoUrl}
                  alt={form.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-emerald-500/80 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-black shadow-xl border-4 border-emerald-500/50">
                  {(form.name || "TR").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black shadow-lg">
                <BadgeCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {form.name || "Head Coach"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-extrabold tracking-wide uppercase">
                  Verified Trainer
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-emerald-300 flex items-center justify-center sm:justify-start gap-1.5">
                <Dumbbell className="w-4 h-4" /> {form.specialization || "Certified Fitness Specialist"}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {form.experience || "5 Years"} Exp.
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> {form.phone || "Not set"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-teal-400" /> {form.email || "coach@univogym.com"}
                </span>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex sm:flex-col items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Updates..." : "Save Profile"}
            </button>
            <span className="text-[11px] text-slate-400 font-medium text-center">
              Auto-syncs with Member Portal
            </span>
          </div>
        </div>

        {/* TAB NAVIGATION PILLS */}
        <div className="mt-8 pt-4 border-t border-slate-700/60 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {[
            { id: "general", label: "General Info", icon: User },
            { id: "credentials", label: "App Login & Security", icon: KeyRound },
            { id: "plans", label: "PT Plans & Commission", icon: HandCoins },
            { id: "transformations", label: "Transformations & Certs", icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-105"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">

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
              <div className="flex items-center gap-2">
                {form.certUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowCertPreview(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                )}
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold group-hover:bg-emerald-500 group-hover:text-white transition">
                  {form.certUrl ? "Change File" : "Browse"}
                </div>
              </div>
              <input
                type="file"
                accept="image/jpeg, image/png, application/pdf"
                onChange={(e) => handleFileUpload(e, "certUrl")}
                className="hidden"
              />
            </label>
          </div>

          {/* Gym Owner & Trainer PT Commission Deal (READ-ONLY FOR TRAINER) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border-2 border-indigo-200/90 shadow-2xs space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <HandCoins className="w-4 h-4 text-indigo-600" /> Gym Owner & Trainer PT Commission Deal
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-700" /> Owner Managed (View Only)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Yeh commission deal Gym Owner dwara set ki gayi hai. Trainer sirf dekh sakta hai, edit/change nahi kar sakta.
                </p>
              </div>

              <div className="px-3 py-1 rounded-xl bg-indigo-100/70 border border-indigo-200 text-xs font-black text-indigo-950">
                {form.commissionType === "percentage"
                  ? `${form.commissionValue || 30}% Owner / ${100 - (form.commissionValue || 30)}% Trainer`
                  : `Flat ₹${Number(form.commissionValue || 0).toLocaleString("en-IN")} Owner Cut`}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="p-3 bg-white rounded-xl border border-indigo-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Active Commission Structure</span>
                <p className="text-sm font-black text-indigo-950 mt-1">
                  {form.commissionType === "percentage"
                    ? `Gym Owner: ${form.commissionValue || 30}%  |  Trainer Share: ${100 - (form.commissionValue || 30)}%`
                    : `Flat ₹${Number(form.commissionValue || 0).toLocaleString("en-IN")} per PT Sale`}
                </p>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Commission modify karwane ke liye Gym Owner se sampark karein.
                </p>
              </div>

              {/* Live Split Example Simulation */}
              <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-100 pb-1">
                  <span>Example on ₹5,000 PT Sale:</span>
                  <span className="text-indigo-600 font-extrabold">Auto Calculated</span>
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

          {/* Trainer PT Membership Packages (LOCKED & READ-ONLY FOR TRAINER) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Trainer PT Packages
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-[10px] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" /> Fixed by Owner
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Yeh packages aur pricing Gym Owner dwara approve aur set ki gayi hain (View Only).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {form.ptPlans.map((plan, idx) => (
                <div
                  key={plan.id || idx}
                  className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl relative space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <Dumbbell className="w-3 h-3 text-emerald-600" /> Package #{idx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-700 bg-white border border-emerald-200 px-3 py-1 rounded-xl shadow-xs">
                      ₹{Number(plan.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Package Name</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">{plan.name}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration & Validity</span>
                      <p className="text-xs font-bold text-emerald-800 mt-0.5">
                        {plan.duration || `${plan.durationValue || 1} ${plan.durationType || "months"}`}
                        {plan.sessionsCount ? ` (${plan.sessionsCount} sessions)` : ""}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Fees</span>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        ₹{Number(plan.price || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {plan.description && (
                    <div className="text-[11px] text-slate-600 bg-white/70 px-3 py-1.5 rounded-lg border border-slate-100">
                      <strong className="text-slate-800">What's Included:</strong> {plan.description}
                    </div>
                  )}
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

      {/* CERTIFICATE FULL MODAL PREVIEW */}
      {showCertPreview && form.certUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Trainer Verified Certificate
              </h3>
              <button
                type="button"
                onClick={() => setShowCertPreview(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto flex items-center justify-center p-2 bg-slate-950/60 rounded-2xl">
              {form.certUrl.startsWith("data:application/pdf") ? (
                <iframe src={form.certUrl} className="w-full h-[60vh] rounded-xl border border-slate-800" title="Certificate PDF" />
              ) : (
                <img src={form.certUrl} alt="Trainer Certificate" className="max-h-[65vh] object-contain rounded-xl shadow-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
