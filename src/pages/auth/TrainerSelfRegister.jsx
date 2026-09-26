import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Dumbbell,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Award,
  Briefcase,
  FileText,
  Image as ImageIcon,
  Plus,
  X,
  KeyRound,
  Sparkles,
  Clock,
  IndianRupee,
  Layers,
  ArrowRight,
  Sun,
  Sunset,
  Moon,
  Power,
  Trash2,
  Calendar,
  Calculator,
  Percent,
  HandCoins
} from "lucide-react";
import { addTrainer, getTrainerInvite } from "../../firebase/trainers";
import { DEFAULT_SHIFTS_CONFIG } from "../owner/Trainers";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import toast from "react-hot-toast";

export default function TrainerSelfRegister() {
  const { gymId, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(Boolean(token));
  const [submitted, setSubmitted] = useState(false);
  const [inviteData, setInviteData] = useState(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "Coach@123",
    specialization: "Weight Training & Hypertrophy",
    experience: "5 Years",
    salary: "",
    joinDate: todayStr,
    certifications: "",
    bio: "",
    photoUrl: "",
    certUrl: "",
    // PT Commission Deal (Percentage or Fixed amount)
    commissionType: "percentage",
    commissionValue: 30,
    // Shifts & Capacity
    allowedShifts: ["morning", "evening"],
    maxShiftsCount: 2,
    shiftPtLimits: { morning: 2, afternoon: 2, evening: 2, night: 2 },
    maxPtPerSlot: 2,
    // PT Packages
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
    transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }],
  });

  useEffect(() => {
    async function fetchInvite() {
      if (!token) return;
      setLoadingInvite(true);
      try {
        const inv = await getTrainerInvite(gymId, token);
        if (inv) {
          setInviteData(inv);
          setForm((prev) => ({
            ...prev,
            name: inv.name || prev.name,
            phone: inv.phone || prev.phone,
            email: inv.email || inv.loginEmail || prev.email,
            password: inv.password || inv.loginPassword || prev.password,
            specialization: inv.specialization || prev.specialization,
            experience: inv.experience || prev.experience,
            salary: inv.salary !== undefined && inv.salary !== "" ? inv.salary : prev.salary,
            joinDate: inv.joinDate || prev.joinDate,
            bio: inv.bio || prev.bio,
            photoUrl: inv.photoUrl || prev.photoUrl,
            certUrl: inv.certUrl || prev.certUrl,
            commissionType: inv.commissionType || prev.commissionType,
            commissionValue: inv.commissionValue !== undefined ? inv.commissionValue : prev.commissionValue,
            allowedShifts: Array.isArray(inv.allowedShifts) && inv.allowedShifts.length > 0 ? inv.allowedShifts : prev.allowedShifts,
            shiftPtLimits: inv.shiftPtLimits || prev.shiftPtLimits,
            ptPlans: (inv.ptPlans && inv.ptPlans.length > 0) ? inv.ptPlans : prev.ptPlans,
            transformations: (inv.transformations && inv.transformations.length > 0) ? inv.transformations : prev.transformations,
          }));
        }
      } catch (err) {
        console.warn("Could not load invite token data:", err);
      } finally {
        setLoadingInvite(false);
      }
    }
    fetchInvite();
  }, [gymId, token]);

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

  const handleTransformationFile = (e, index, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error("Image is too large. Please select an image under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => {
        const updated = [...prev.transformations];
        updated[index] = { ...updated[index], [type]: reader.result };
        return { ...prev, transformations: updated };
      });
      toast.success(`${type === "beforeImg" ? "Before" : "After"} photo uploaded!`);
    };
    reader.readAsDataURL(file);
  };

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

  // --- PT MEMBERSHIP PACKAGE HELPERS & HANDLERS ---
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
          description: "1-on-1 personalized training & diet tracking"
        }
      ]
    }));
  };

  const removePtPlan = (index) => {
    setForm((prev) => ({
      ...prev,
      ptPlans: prev.ptPlans.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setLoading(true);
    try {
      const email = form.email || `${form.phone.replace(/\D/g, "")}@trainer.univogym.com`;
      const trainerData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: email,
        loginEmail: email,
        password: form.password || "Coach@123",
        loginPassword: form.password || "Coach@123",
        specialization: form.specialization || "Weight Training & Hypertrophy",
        experience: form.experience || "5 Years",
        salary: Number(form.salary !== undefined && form.salary !== "" ? form.salary : 0),
        joinDate: form.joinDate || todayStr,
        certifications: form.certifications || "",
        bio: form.bio || "",
        photoUrl: form.photoUrl || "",
        certUrl: form.certUrl || "",
        commissionType: form.commissionType || "percentage",
        commissionValue: Number(form.commissionValue !== undefined ? form.commissionValue : 30),
        allowedShifts: Array.isArray(form.allowedShifts) && form.allowedShifts.length > 0 ? form.allowedShifts : ["morning", "evening"],
        maxShiftsCount: Number((form.allowedShifts || []).length || 2),
        shiftPtLimits: form.shiftPtLimits || { morning: 2, afternoon: 2, evening: 2, night: 2 },
        maxPtPerSlot: Number(form.maxPtPerSlot || 2),
        ptPlans: form.ptPlans || [],
        transformations: form.transformations.filter(t => t.beforeImg || t.afterImg || t.description),
        hasLogin: true,
        membersCount: 0,
        inviteToken: token || null
      };

      await addTrainer(gymId || "univo_main", trainerData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100 space-y-5">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Welcome to the Team, Coach! 🏋️‍♂️</h2>
            <p className="text-slate-600 text-xs mt-2 leading-relaxed">
              Aapka trainer profile successfully register ho gaya hai. Aapke shifts, slot limits aur PT membership packages active ho chuke hain.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left space-y-2 text-xs">
            <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-600" /> Aapka Coach Portal Login:
            </div>
            <p className="text-slate-700">
              • <strong>Login ID / Phone:</strong> {form.phone} {form.email ? `(${form.email})` : ''}
            </p>
            <p className="text-slate-700">
              • <strong>Password:</strong> <span className="font-mono font-bold text-emerald-800">{form.password}</span>
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md hover:from-emerald-500 hover:to-teal-500 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Login to Coach Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900">Trainer Self-Registration</h2>
          <p className="text-sm text-slate-500">
            Create your coach profile, shifts availability, PT packages & transformation portfolio.
          </p>
          <div className="max-w-xs mx-auto text-left pt-2">
            <PhotoCaptureInput
              value={form.photoUrl}
              onChange={(url) => setForm(prev => ({ ...prev, photoUrl: url }))}
              label="Trainer Portrait Photo"
              subLabel="Upload picture or take live camera photo"
              shape="circle"
            />
          </div>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 1. Personal Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-emerald-600" /> Personal Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                    placeholder="e.g. Coach Amit Kumar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Phone Number *</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" /> Coach Portal Password *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-emerald-800 focus:bg-white focus:border-emerald-500 outline-none transition"
                    placeholder="Coach@123"
                  />
                </div>
              </div>
            </div>

            {/* 2. Professional Details & Salary */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Briefcase className="w-4 h-4 text-emerald-600" /> Professional Details & Remuneration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Specialization</label>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                    placeholder="e.g. Hypertrophy, CrossFit"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Years of Experience</label>
                  <input
                    type="text"
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                    placeholder="e.g. 5 Years"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Agreed / Expected Monthly Base Salary (₹) (Optional)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      value={form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                      placeholder="e.g. 25000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Joining Date</label>
                  <input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Professional Bio
                </label>
                <textarea
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition resize-none"
                  placeholder="Write a short description about yourself, achievements and coaching philosophy..."
                ></textarea>
              </div>
            </div>

            {/* 3. Gym & Trainer PT Commission Revenue Deal */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border-2 border-indigo-200/90 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <HandCoins className="w-4 h-4 text-indigo-600" /> Gym & Trainer PT Revenue Share Deal
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    PT client join karne par Gym aur Trainer ka split deal:
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
                      Gym Share (%):
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
                      Gym ko <strong>{form.commissionValue || 0}%</strong> milega, Trainer ko <strong>{Math.max(0, 100 - (form.commissionValue || 0))}%</strong> milega.
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Gym Fixed Share per PT Sale (₹):
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

                {/* Split simulation */}
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
                          <p className="text-[10px] font-bold text-indigo-700">🏢 Gym Cut</p>
                          <p className="text-xs font-black text-indigo-950 mt-0.5">₹{ownerCut.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                          <p className="text-[10px] font-bold text-emerald-700">🏋️ Trainer Cut</p>
                          <p className="text-xs font-black text-emerald-950 mt-0.5">₹{trainerCut.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* 4. Trainer Shifts & Slot-Wise PT Capacity */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border-2 border-amber-200/90 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" /> Trainer Shifts & Slot-Wise PT Capacity
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Aap <strong>kitni shifts</strong> me available rahenge aur <strong>kis shift me kitne PT clients</strong> handle kar sakte hain:
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0 self-start sm:self-auto">
                  Shifts & Capacity
                </span>
              </div>

              {/* Shift Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span>1️⃣ Shifts Availability Presets:</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    {form.allowedShifts?.length || 0} Shift{(form.allowedShifts?.length || 0) > 1 ? "s" : ""} Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "1 Shift", shifts: ["morning"], desc: "Morning Only" },
                    { label: "2 Shifts", shifts: ["morning", "evening"], desc: "Morning + Evening" },
                    { label: "3 Shifts", shifts: ["morning", "afternoon", "evening"], desc: "Morn + Aft + Eve" },
                    { label: "All 4 Shifts", shifts: ["morning", "afternoon", "evening", "night"], desc: "Full Gym Access" },
                  ].map((preset) => {
                    const isSelected = (form.allowedShifts || []).length === preset.shifts.length && preset.shifts.every(s => (form.allowedShifts || []).includes(s));
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, allowedShifts: preset.shifts, maxShiftsCount: preset.shifts.length }))}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40"
                            : "bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40"
                        }`}
                      >
                        <div className="text-xs font-bold">{preset.label}</div>
                        <div className={`text-[9px] ${isSelected ? "text-amber-100" : "text-slate-400"}`}>{preset.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slot-wise PT capacity */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-2">
                  <span>2️⃣ Shift Wise PT Capacity (Har Shift Me Max PT Clients):</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(DEFAULT_SHIFTS_CONFIG || [
                    { id: "morning", label: "Morning", time: "6:00 AM - 9:00 AM", icon: Sun, color: "text-amber-500", bg: "bg-amber-50" },
                    { id: "afternoon", label: "Afternoon", time: "12:00 PM - 3:00 PM", icon: Sun, color: "text-orange-500", bg: "bg-orange-50" },
                    { id: "evening", label: "Evening", time: "4:00 PM - 7:00 PM", icon: Sunset, color: "text-indigo-500", bg: "bg-indigo-50" },
                    { id: "night", label: "Night", time: "7:00 PM - 10:00 PM", icon: Moon, color: "text-purple-500", bg: "bg-purple-50" },
                  ]).map((shift) => {
                    const Icon = shift.icon || Clock;
                    const isAllowed = (form.allowedShifts || []).includes(shift.id);
                    const shiftLimit = form.shiftPtLimits?.[shift.id] !== undefined ? form.shiftPtLimits[shift.id] : (form.maxPtPerSlot || 2);

                    return (
                      <div
                        key={shift.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isAllowed
                            ? "bg-white border-amber-300 shadow-2xs"
                            : "bg-slate-50/80 border-slate-200/80 opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${shift.bg || "bg-amber-50"} ${shift.color || "text-amber-600"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900">{shift.label}</span>
                                <span className="text-[10px] text-slate-400">({shift.time})</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => {
                                const current = prev.allowedShifts || [];
                                const next = current.includes(shift.id)
                                  ? current.filter(id => id !== shift.id)
                                  : [...current, shift.id];
                                return { ...prev, allowedShifts: next, maxShiftsCount: next.length };
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              isAllowed
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                                : "bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300"
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            {isAllowed ? "Active Shift" : "Shift Off"}
                          </button>
                        </div>

                        {isAllowed ? (
                          <div className="mt-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-slate-600">Max PT in this shift:</span>
                              <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {shiftLimit} PT Clients
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    setForm(prev => ({
                                      ...prev,
                                      shiftPtLimits: { ...(prev.shiftPtLimits || {}), [shift.id]: num },
                                      maxPtPerSlot: num
                                    }));
                                  }}
                                  className={`flex-1 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                    Number(shiftLimit) === num
                                      ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300"
                                  }`}
                                >
                                  {num} PT
                                </button>
                              ))}
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                                <span className="text-[9px] font-bold text-slate-400">Custom:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={shiftLimit}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value) || 1);
                                    setForm(prev => ({
                                      ...prev,
                                      shiftPtLimits: { ...(prev.shiftPtLimits || {}), [shift.id]: val },
                                      maxPtPerSlot: val
                                    }));
                                  }}
                                  className="w-8 text-center text-xs font-bold text-slate-800 bg-white rounded border border-slate-200 py-0.5 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 py-1.5 px-2 rounded-lg bg-slate-100/80 text-[10.5px] text-slate-500 italic text-center">
                            ⛔ Shift Off — Trainer is not available during this time slot.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary banner */}
              {(() => {
                const activeCount = form.allowedShifts?.length || 0;
                const totalDailyPt = (form.allowedShifts || []).reduce((acc, sid) => {
                  const lim = form.shiftPtLimits?.[sid] !== undefined ? Number(form.shiftPtLimits[sid]) : Number(form.maxPtPerSlot || 2);
                  return acc + (lim || 0);
                }, 0);

                return (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-950">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Summary: <strong>{activeCount} Active Shift{activeCount > 1 ? "s" : ""}</strong>
                        {activeCount > 0 ? ` (${form.allowedShifts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")})` : " (None)"}
                      </span>
                    </div>
                    <div className="font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md self-start sm:self-auto border border-amber-200">
                      Max Daily PT Capacity: <span className="font-black text-amber-950">{totalDailyPt} Athletes / Day</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 5. Trainer PT Membership Packages */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 border-2 border-emerald-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Trainer PT Packages
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Define custom membership & PT pricing packages for your coaching clients:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPtPlan}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Package
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
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="Remove package"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Quick Duration Presets */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
                        <Clock className="w-3 h-3 text-emerald-600" /> Quick Duration Presets:
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
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
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
                          <Calendar className="w-3 h-3 text-slate-400" /> Duration *
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

            {/* 6. Certification Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-emerald-600" /> Certifications
              </h3>
              <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition group bg-white shadow-xs">
                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition">
                  {form.certUrl ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <Award className="w-6 h-6 text-slate-400 group-hover:text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">Upload Certificate (PDF, JPG, PNG)</p>
                  <p className="text-xs text-slate-500">Max size 800KB</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold group-hover:bg-emerald-600 group-hover:text-white transition">
                  {form.certUrl ? "Change File" : "Browse"}
                </div>
                <input type="file" accept="image/jpeg, image/png, application/pdf" onChange={(e) => handleFileUpload(e, 'certUrl')} className="hidden" />
              </label>
            </div>

            {/* 7. Side-by-side Transformations Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" /> Client Transformations
                </h3>
                <button
                  type="button"
                  onClick={addMoreTransformation}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
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
                        Transformation #{idx + 1}
                      </span>
                      {form.transformations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTransformation(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

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

                    <div>
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => handleTransformationDesc(e.target.value, idx)}
                        placeholder="e.g. 16 Weeks Transformation - 12kg fat loss"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                disabled={loading}
                type="submit"
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Submitting Profile..." : "Submit Trainer Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
