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
  FileText,
  CreditCard,
  Building,
  AlertCircle,
  Instagram,
  MapPin,
  HeartPulse,
  Share2
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
  "Calisthenics & Bodyweight",
  "Yoga & Flexibility",
  "Nutrition & Diet Strategy",
  "Injury Rehab & Posture",
  "Sports Performance & Speed",
  "Senior & Youth Fitness"
];

export default function TrainerProfile() {
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [trainerId, setTrainerId] = useState("");
  const [activeTab, setActiveTab] = useState("personal"); // "personal" | "professional" | "schedule" | "pt_packages" | "payout_bank"

  const [form, setForm] = useState({
    // 1. Personal & Identity
    name: "",
    gender: "Male",
    dob: "",
    email: "",
    loginPassword: "",
    phone: "",
    altPhone: "",
    address: "",
    aadhaar: "",
    photoUrl: "",
    idProofUrl: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyRelation: "Family",

    // 2. Professional & Skills
    designation: "Certified Personal Fitness Coach",
    experience: "4 Years",
    bio: "",
    certifications: "Certified Personal Trainer (CPT) & Sports Nutritionist",
    certUrl: "",
    instagram: "",
    specializations: ["Weight Training & Hypertrophy", "Bodybuilding & Posing"],

    // 3. Shift & Schedule
    schedule: "Morning (6:00 AM - 11:00 AM) & Evening (5:00 PM - 9:30 PM)",
    shiftType: "split", // "morning" | "evening" | "split" | "fullday"
    weeklyOff: "Sunday",

    // 4. Agreement & Compensation
    salary: 0,
    commissionType: "percentage",
    commissionValue: 20,

    // 5. Custom PT Packages
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
    ],

    // 6. Bank & UPI Details for Payouts
    upiId: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
    ifscCode: ""
  });

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
            name: tData.name || tData.fullName || "",
            gender: tData.gender || "Male",
            dob: tData.dob || "",
            email: tData.email || tData.loginEmail || "",
            loginPassword: tData.loginPassword || tData.password || "Coach@123",
            phone: tData.phone || "",
            altPhone: tData.altPhone || "",
            address: tData.address || "",
            aadhaar: tData.aadhaar || "",
            photoUrl: tData.photoUrl || tData.photo || "",
            idProofUrl: tData.idProofUrl || "",
            emergencyContactName: tData.emergencyContactName || "",
            emergencyContactPhone: tData.emergencyContactPhone || "",
            emergencyRelation: tData.emergencyRelation || "Family",

            designation: tData.designation || "Certified Personal Fitness Coach",
            experience: tData.experience ? String(tData.experience) : "4 Years",
            bio: tData.bio || "",
            certifications: tData.certifications || "Certified Personal Trainer & Sports Nutritionist",
            certUrl: tData.certUrl || "",
            instagram: tData.instagram || "",
            specializations: Array.isArray(tData.specializations)
              ? tData.specializations
              : tData.specialization
              ? [tData.specialization]
              : ["Weight Training & Hypertrophy"],

            schedule: tData.schedule || "Morning (6:00 AM - 11:00 AM) & Evening (5:00 PM - 9:30 PM)",
            shiftType: tData.shiftType || "split",
            weeklyOff: tData.weeklyOff || "Sunday",

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
                ],

            upiId: tData.upiId || "",
            bankAccountName: tData.bankAccountName || "",
            bankAccountNumber: tData.bankAccountNumber || "",
            bankName: tData.bankName || "",
            ifscCode: tData.ifscCode || ""
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

  const handleFileAttachment = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1500 * 1024) {
      toast.error("File should be under 1.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result }));
      toast.success("Document attached successfully!");
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
          name: "6 Months Elite Transformation",
          duration: "6 Months (144 Sessions)",
          sessionsCount: 144,
          price: 19999,
          description: "Full body transformation, diet chart, supplement guidance & weekly audit"
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

      localStorage.setItem("univo_trainer_session", JSON.stringify({ id: targetId, ...payload }));
      toast.success("Trainer profile, schedule and packages saved successfully! Owner can now view all details.");
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
        <p className="text-sm font-semibold">Loading coach profile and configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Top Banner Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            {/* Avatar */}
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
                  {form.designation || "Personal Trainer"}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 px-3 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Live in System
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {form.name || "Coach Profile Setup"}
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-lg">
                {form.bio || "Personal Fitness & Diet Coach at Univo Gym Management"}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-emerald-200">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> {form.experience}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {form.phone || "No phone"}
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
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-emerald-900 font-black text-xs sm:text-sm shadow-xl hover:bg-emerald-50 transition shrink-0 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-600" />
            {saving ? "Saving Changes..." : "Save Profile & Setup"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs for Profile Sections */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: "personal", label: "1. Personal & Account", icon: User },
          { id: "professional", label: "2. Skills & Certifications", icon: Award },
          { id: "schedule", label: "3. Shifts & Schedule", icon: Clock },
          { id: "pt_packages", label: "4. PT Packages & Pricing", icon: Dumbbell },
          { id: "payout_bank", label: "5. Payout Bank & UPI", icon: CreditCard }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Personal Information & Credentials */}
        {activeTab === "personal" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Login ID & Portal Access</h3>
                  <p className="text-[11px] text-slate-500">Credentials given by Gym Owner or created for your login</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Login Email / ID *</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    You can change your password anytime; Gym Owner can also see and assist if forgotten.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Personal & Identity Details</h3>
                  <p className="text-[11px] text-slate-500">Your official identity, contact and residential information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    placeholder="e.g. Boggey man"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone / WhatsApp Number *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                      placeholder="9876543210"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Alternate Phone</label>
                  <input
                    type="tel"
                    value={form.altPhone}
                    onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    placeholder="Optional alternate contact"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Aadhaar / National ID</label>
                  <input
                    type="text"
                    value={form.aadhaar}
                    onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    placeholder="XXXX-XXXX-XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Residential Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  placeholder="Complete residential address..."
                />
              </div>

              {/* Emergency Contact */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Emergency Contact
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={form.emergencyContactName}
                      onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                      placeholder="Name of relative/guardian"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={form.emergencyRelation}
                      onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                      placeholder="e.g. Father, Spouse, Brother"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      value={form.emergencyContactPhone}
                      onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                      placeholder="Emergency contact number"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Skills, Bio & Certifications */}
        {activeTab === "professional" && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Designation & Experience</h3>
                  <p className="text-[11px] text-slate-500">Your professional title and training experience</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Professional Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white"
                    placeholder="e.g. Senior Strength Coach"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Experience (Years)</label>
                  <input
                    type="text"
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white"
                    placeholder="e.g. 5 Years"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Instagram / Portfolio</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.instagram}
                      onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white"
                      placeholder="@coach_boggey"
                    />
                    <Instagram className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bio & Coaching Philosophy</label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white"
                  placeholder="Introduce your training style, previous athlete transformations, and fitness mindset..."
                />
              </div>
            </div>

            {/* Specializations */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Fitness Specializations & Skills</h3>
                  <p className="text-[11px] text-slate-500">Click to select all your verified training domains</p>
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

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Certifications & Accreditations</label>
                <input
                  type="text"
                  value={form.certifications}
                  onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white"
                  placeholder="e.g. ACE CPT, ISSA Sports Nutrition, K11 Fitness Academy"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Shifts & Availability */}
        {activeTab === "schedule" && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gym Floor Schedule & Shift Availability</h3>
                <p className="text-[11px] text-slate-500">Configure your daily working hours and weekly off for gym members</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Shift Pattern</label>
                <select
                  value={form.shiftType}
                  onChange={(e) => setForm({ ...form, shiftType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                >
                  <option value="split">Split Shift (Morning + Evening)</option>
                  <option value="morning">Morning Shift Only</option>
                  <option value="evening">Evening Shift Only</option>
                  <option value="fullday">Full Day Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Timing Details</label>
                <input
                  type="text"
                  value={form.schedule}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                  placeholder="e.g. 6:00 AM - 11:00 AM & 5:00 PM - 9:30 PM"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Weekly Off Day</label>
                <select
                  value={form.weeklyOff}
                  onChange={(e) => setForm({ ...form, weeklyOff: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                >
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Rotational">Rotational</option>
                  <option value="None">None (7 Days)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-3">
              <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Floor Availability Note:</span>
                Members assigned to you will see your active training slots when booking workout sessions or requesting form checks.
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PT Packages & Pricing */}
        {activeTab === "pt_packages" && (
          <div className="space-y-6">
            {/* Agreement Box */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Commercial Contract Terms (Gym Owner Agreement)</h3>
                    <p className="text-[11px] text-slate-500">Your commission percentage deal agreed with gym administration</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active Agreement
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Gym Owner Cut</span>
                  <h4 className="text-xl font-black text-slate-900">
                    {form.commissionType === "percentage" ? `${form.commissionValue}%` : `Rs. ${form.commissionValue}`}
                  </h4>
                  <p className="text-[11px] text-slate-500">Commission retained by gym on PT package sale</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">Your Net Retention</span>
                  <h4 className="text-xl font-black text-emerald-700">
                    {form.commissionType === "percentage" ? `${100 - Number(form.commissionValue)}%` : `Balance Package`}
                  </h4>
                  <p className="text-[11px] text-emerald-700">Your direct payout per client</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Base Monthly Salary</span>
                  <h4 className="text-xl font-black text-slate-900">
                    Rs. {Number(form.salary || 0).toLocaleString("en-IN")}
                  </h4>
                  <p className="text-[11px] text-slate-500">Fixed base pay (if applicable)</p>
                </div>
              </div>
            </div>

            {/* Packages Editor */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Personal Training (PT) Packages Offered</h3>
                    <p className="text-[11px] text-slate-500">
                      Configure duration, sessions and rates that Gym Owner can assign to new athletes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addPtPlan}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Package
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
                            placeholder="e.g. 1-on-1 coaching, form check & custom diet"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between text-[11px]">
                          <span className="text-purple-900 font-semibold">
                            Gym Cut ({form.commissionValue}%): <b>Rs. {gymCut}</b>
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
          </div>
        )}

        {/* TAB 5: Bank & UPI Payout Details */}
        {activeTab === "payout_bank" && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Banking & UPI Payout Information</h3>
                <p className="text-[11px] text-slate-500">
                  Gym Owner uses these details to disburse your PT commission earnings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">UPI ID (Google Pay / PhonePe / Paytm)</label>
                <input
                  type="text"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                  placeholder="e.g. coach@okhdfcbank or 9876543210@paytm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Account Holder Name</label>
                <input
                  type="text"
                  value={form.bankAccountName}
                  onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                  placeholder="Name as in bank passbook"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Account Number</label>
                <input
                  type="text"
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                  placeholder="Account Number"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Name & Branch</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900"
                  placeholder="e.g. State Bank of India, Main Branch"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">IFSC Code</label>
                <input
                  type="text"
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 uppercase"
                  placeholder="SBIN0001234"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Direct Owner Settlement:</span>
                Whenever PT packages are collected by the gym, the owner can view your verified UPI ID or Bank account to settle your coach payout without confusion.
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button at bottom */}
        <div className="flex items-center justify-between p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">All Changes Sync in Real-Time:</span> Gym Owner dashboard reflects your updated details instantly.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Updates..." : "Save All Profile Information"}
          </button>
        </div>
      </form>
    </div>
  );
}
