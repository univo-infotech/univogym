import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Dumbbell,
  Award,
  Calendar,
  Clock,
  Briefcase,
  IndianRupee,
  Save,
  CheckCircle2,
  Sparkles,
  Camera,
  Plus,
  Trash2,
  ShieldCheck,
  Percent,
  FileText
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getTrainer, getTrainers, updateTrainer } from "../../firebase/trainers";
import toast from "react-hot-toast";

const AVAILABLE_SPECIALIZATIONS = [
  "Weight Training & Hypertrophy",
  "Fat Loss & Conditioning",
  "Bodybuilding & Posing",
  "CrossFit & HIIT",
  "Functional & Mobility",
  "Powerlifting & Strength",
  "Yoga & Flexibility",
  "Nutrition & Diet Strategy",
  "Injury Rehab & Posture"
];

export default function TrainerProfile() {
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [trainerId, setTrainerId] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    loginPassword: "",
    phone: "",
    experience: "4 Years",
    bio: "",
    certifications: "Certified Fitness & Nutrition Coach",
    photoUrl: "",
    schedule: "Morning (6:00 AM - 11:00 AM) & Evening (5:00 PM - 9:30 PM)",
    specializations: ["Weight Training & Hypertrophy", "Bodybuilding & Posing"],
    salary: 0,
    commissionType: "percentage",
    commissionValue: 20,
    ptPlans: [
      {
        id: 1,
        name: "1 Month 1-on-1 PT",
        duration: "1 Month (24 Sessions)",
        sessionsCount: 24,
        price: 4500,
        description: "Personalized workout routine, daily form check & diet guidance"
      },
      {
        id: 2,
        name: "3 Months Transformation PT",
        duration: "3 Months (72 Sessions)",
        sessionsCount: 72,
        price: 11000,
        description: "Dedicated 1-on-1 coaching, supplement strategy & weekly body fat audit"
      }
    ]
  });

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        let tData = null;

        // 1. Direct profileId
        if (profileId) {
          try {
            tData = await getTrainer(GID, profileId);
          } catch (e) {}
        }

        // 2. Saved session
        if (!tData) {
          const savedSession = localStorage.getItem("univo_trainer_session");
          if (savedSession) {
            try {
              tData = JSON.parse(savedSession);
            } catch (e) {}
          }
        }

        // 3. Search all trainers
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
            name: tData.name || tData.fullName || "",
            email: tData.email || tData.loginEmail || "",
            loginPassword: tData.loginPassword || tData.password || "Coach@123",
            phone: tData.phone || "",
            experience: tData.experience ? String(tData.experience) : "4 Years",
            bio: tData.bio || "",
            certifications: tData.certifications || "Certified Fitness Coach",
            photoUrl: tData.photoUrl || tData.photo || "",
            schedule: tData.schedule || "Morning (6:00 AM - 11:00 AM) & Evening (5:00 PM - 9:30 PM)",
            specializations: Array.isArray(tData.specializations)
              ? tData.specializations
              : tData.specialization
              ? [tData.specialization]
              : ["Weight Training & Hypertrophy"],
            salary: tData.salary || 0,
            commissionType: tData.commissionType || tData.ptCommissionType || "percentage",
            commissionValue: tData.commissionValue !== undefined ? tData.commissionValue : (tData.ptCommissionValue !== undefined ? tData.ptCommissionValue : 20),
            ptPlans: Array.isArray(tData.ptPlans) && tData.ptPlans.length > 0
              ? tData.ptPlans
              : [
                  {
                    id: 1,
                    name: "1 Month 1-on-1 PT",
                    duration: "1 Month (24 Sessions)",
                    sessionsCount: 24,
                    price: 4500,
                    description: "Personalized workout routine, daily form check & diet guidance"
                  },
                  {
                    id: 2,
                    name: "3 Months Transformation PT",
                    duration: "3 Months (72 Sessions)",
                    sessionsCount: 72,
                    price: 11000,
                    description: "Dedicated 1-on-1 coaching, supplement strategy & weekly body fat audit"
                  }
                ]
          });
        }
      } catch (err) {
        console.error("Failed to load trainer profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [gymId, profileId, user]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Image file should be under 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, photoUrl: reader.result }));
      toast.success("Profile photo updated!");
    };
    reader.readAsDataURL(file);
  };

  const toggleSpecialization = (spec) => {
    setForm((prev) => {
      const exists = prev.specializations.includes(spec);
      const updated = exists
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec];
      return { ...prev, specializations: updated };
    });
  };

  const handlePtPlanChange = (index, field, val) => {
    setForm((prev) => {
      const updated = [...prev.ptPlans];
      updated[index] = { ...updated[index], [field]: val };
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
          name: "Custom Transformation PT",
          duration: "1 Month (24 Sessions)",
          sessionsCount: 24,
          price: 5000,
          description: "1-on-1 personalized training and diet plan"
        }
      ]
    }));
  };

  const removePtPlan = (index) => {
    if (form.ptPlans.length <= 1) {
      toast.error("You must offer at least one PT package.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      ptPlans: prev.ptPlans.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Trainer name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        loginEmail: form.email.trim(),
        loginPassword: form.loginPassword.trim(),
        phone: form.phone.trim(),
        specialization: form.specializations[0] || "Fitness Coach",
        updatedAt: new Date().toISOString()
      };

      const targetId = trainerId || "i5sXkR1c7jIkPb89US2x";
      await updateTrainer(GID, targetId, payload);

      // Update local storage session
      localStorage.setItem("univo_trainer_session", JSON.stringify({ id: targetId, ...payload }));
      toast.success("Trainer profile and packages updated successfully!");
    } catch (err) {
      console.error("Save trainer profile error:", err);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">Loading your coach profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            {/* Avatar with upload trigger */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/10 border-2 border-white/30 backdrop-blur-md overflow-hidden flex items-center justify-center text-white text-3xl font-black shadow-inner">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{form.name ? form.name.charAt(0).toUpperCase() : "C"}</span>
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer shadow-lg transition">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-3 py-0.5 rounded-full text-emerald-100">
                  Certified Personal Coach
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 px-3 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {form.name || "Coach Profile"}
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-lg">
                {form.bio || "Personal Fitness Coach at Univo Gym Management"}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-emerald-200">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> {form.experience}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {form.phone || "No phone provided"}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {form.email || "No email"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-emerald-900 font-extrabold text-sm shadow-lg hover:bg-emerald-50 transition shrink-0 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-600" />
            {saving ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Main Profile Editor Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Account Credentials & Contact */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Information & Login Credentials</h3>
              <p className="text-[11px] text-slate-500">Your trainer portal credentials and identity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="e.g. Boggey man"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Login Email / Username</label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="Coach@gmail.com"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Login Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.loginPassword}
                  onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="Coach@123"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone / WhatsApp *</label>
              <div className="relative">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  placeholder="9876543210"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Experience (Years)</label>
              <input
                type="text"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="e.g. 5 Years"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Shift & Daily Schedule</label>
              <input
                type="text"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                placeholder="Morning & Evening Slots"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Bio & Training Philosophy</label>
            <textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="Tell your athletes about your training style and results..."
            />
          </div>
        </div>

        {/* Section 2: Specializations & Certifications */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fitness Specializations & Badges</h3>
              <p className="text-[11px] text-slate-500">Tap to select your primary areas of coaching expertise</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {AVAILABLE_SPECIALIZATIONS.map((spec) => {
              const active = form.specializations.includes(spec);
              return (
                <button
                  type="button"
                  key={spec}
                  onClick={() => toggleSpecialization(spec)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    active
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${active ? "text-white" : "text-slate-300"}`} />
                  {spec}
                </button>
              );
            })}
          </div>

          <div className="pt-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Certifications & Accreditations</label>
            <input
              type="text"
              value={form.certifications}
              onChange={(e) => setForm({ ...form, certifications: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              placeholder="e.g. ACE Certified Personal Trainer, CPR/AED"
            />
          </div>
        </div>

        {/* Section 3: Financial Deal & PT Commission Agreement */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gym Owner Commission Deal & Salary</h3>
                <p className="text-[11px] text-slate-500">Agreed commercial contract terms with Gym Owner</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active Deal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Gym Owner Cut</span>
              <h4 className="text-xl font-black text-slate-900">
                {form.commissionType === "percentage" ? `${form.commissionValue}%` : `Rs. ${form.commissionValue}`}
              </h4>
              <p className="text-[11px] text-slate-500">Deducted from each PT package</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Coach Retention</span>
              <h4 className="text-xl font-black text-emerald-700">
                {form.commissionType === "percentage" ? `${100 - Number(form.commissionValue)}%` : `Balance Package`}
              </h4>
              <p className="text-[11px] text-emerald-700">Your direct payout per athlete</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Base Monthly Salary</span>
              <h4 className="text-xl font-black text-slate-900">
                Rs. {Number(form.salary || 0).toLocaleString("en-IN")}
              </h4>
              <p className="text-[11px] text-slate-500">Fixed monthly retainer</p>
            </div>
          </div>
        </div>

        {/* Section 4: Personal Training (PT) Packages Offered */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">My Personal Training (PT) Packages</h3>
                <p className="text-[11px] text-slate-500">
                  Packages available for Gym Owner to select when assigning members to you
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addPtPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add PT Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.ptPlans.map((plan, idx) => {
              const gymCut = form.commissionType === "percentage"
                ? Math.round(Number(plan.price || 0) * (Number(form.commissionValue) / 100))
                : Math.min(Number(plan.price || 0), Number(form.commissionValue));
              const coachCut = Math.max(0, Number(plan.price || 0) - gymCut);

              return (
                <div key={plan.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">Package #{idx + 1}</span>
                    {form.ptPlans.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePtPlan(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Package Name</label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => handlePtPlanChange(idx, "name", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Duration & Sessions</label>
                        <input
                          type="text"
                          value={plan.duration}
                          onChange={(e) => handlePtPlanChange(idx, "duration", e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Price (Rs.)</label>
                        <input
                          type="number"
                          value={plan.price}
                          onChange={(e) => handlePtPlanChange(idx, "price", Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Package Description</label>
                      <input
                        type="text"
                        value={plan.description || ""}
                        onChange={(e) => handlePtPlanChange(idx, "description", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 focus:outline-none"
                        placeholder="e.g. Daily form check & customized diet"
                      />
                    </div>

                    <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between text-[11px]">
                      <span className="text-purple-900 font-semibold">
                        Gym Cut: <b>Rs. {gymCut}</b>
                      </span>
                      <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        You Earn: Rs. {coachCut}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save All Profile & Package Updates"}
          </button>
        </div>
      </form>
    </div>
  );
}
