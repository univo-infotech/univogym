import React, { useState, useRef, useEffect, useMemo } from "react";
import Modal from "../ui/Modal";
import SignaturePad from "./SignaturePad";
import PhotoCaptureInput from "./PhotoCaptureInput";
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
  Moon,
  Award,
  Activity,
  Target,
  Scale,
  Check,
  ChevronDown,
  Info,
  Flame,
  Image as ImageIcon,
  Eye,
  Maximize2,
  CheckCircle2,
  IndianRupee,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { addMember } from "../../firebase/members";
import { getTrainers } from "../../firebase/trainers";
import { getPlans, getActivePlans } from "../../firebase/plans";
import { getServices, DEFAULT_SERVICES } from "../../firebase/services";
import { getGymSettings } from "../../utils/settings";
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

const GENERAL_TRAINER = {
  id: "t0",
  name: "General Floor Trainer (Included)",
  specialization: "General Gym Floor Support",
  experience: "Gym Staff",
  bio: "General floor trainers provide assistance with equipment usage, form correction, and safety on the gym floor.",
};

const FITNESS_GOALS = [
  "Weight Loss & Fat Burn",
  "Muscle Building & Bulk",
  "Strength & Conditioning",
  "Body Recomposition",
  "General Fitness & Stamina",
  "Rehabilitation & Posture Correction"
];

export default function DirectAddMemberModal({ isOpen, onClose, onSuccess, plans = null, trainers = null, existingMembers = [] }) {
  const { gymId } = useAuth();
  const GID = gymId || "univo_main";
  const fileInputRef = useRef(null);

  const [dbTrainers, setDbTrainers] = useState([]);
  const [dbPlans, setDbPlans] = useState([]);
  const [dbServices, setDbServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); // array of selected service objects
  const [fullPhotoModal, setFullPhotoModal] = useState(null); // { img, title, desc }

  // Fetch real trainers, plans & services created by owner from Firestore
  useEffect(() => {
    async function loadData() {
      try {
        const [trainerList, planList, serviceList] = await Promise.all([
          getTrainers(GID),
          getPlans(GID),
          getServices(GID),
        ]);
        if (trainerList && trainerList.length > 0) {
          setDbTrainers(trainerList);
        }
        if (planList && planList.length > 0) {
          // Filter only active plans
          const activeOnly = planList.filter(p => p.isActive !== false);
          setDbPlans(activeOnly.length > 0 ? activeOnly : planList);
        }
        if (serviceList && serviceList.length > 0) {
          const activeServices = serviceList.filter(s => s.isActive !== false);
          setDbServices(activeServices.length > 0 ? activeServices : DEFAULT_SERVICES);
        } else {
          setDbServices(DEFAULT_SERVICES);
        }
      } catch (err) {
        console.warn("Could not load data in AddMemberModal:", err);
      }
    }
    if (isOpen) {
      loadData();
    }
  }, [GID, isOpen]);

  // Use plans passed via props OR loaded from Firestore. If owner has created plans, use ONLY their plans!
  const availablePlans = useMemo(() => {
    if (plans && plans.length > 0) return plans;
    if (dbPlans && dbPlans.length > 0) return dbPlans;
    return DEFAULT_PLANS;
  }, [plans, dbPlans]);

  // Keep formData.planId in sync with availablePlans if current planId is not in availablePlans
  useEffect(() => {
    if (availablePlans.length > 0) {
      setFormData((prev) => {
        const exists = availablePlans.some((p) => p.id === prev.planId);
        if (!exists) {
          return { ...prev, planId: availablePlans[0].id };
        }
        return prev;
      });
    }
  }, [availablePlans]);

  // Load custom workout slots configured by owner in Settings
  const gymSettings = useMemo(() => getGymSettings(), [isOpen]);
  const activeSlots = useMemo(() => {
    const configured = gymSettings?.workoutSlots;
    if (Array.isArray(configured) && configured.length > 0) {
      return configured.map((s) => ({
        id: s.id || s.label,
        label: s.label,
        time: s.time,
        icon: s.iconName === "Sunset" ? Sunset : s.iconName === "Moon" ? Moon : Sun
      }));
    }
    return WORKOUT_SLOTS;
  }, [gymSettings]);
  
  // Combine general floor trainer with trainers
  const availableTrainers = useMemo(() => {
    const customList = (trainers && trainers.length > 0) ? trainers : dbTrainers;
    return [GENERAL_TRAINER, ...customList.filter(t => t.id !== "t0")];
  }, [trainers, dbTrainers]);

  // Complete member registration form state
  const [formData, setFormData] = useState({
    fullName: "",
    aadhaar: "",
    phone: "",
    altPhone: "",
    email: "",
    gender: "Male",
    dob: "",
    address: "",
    photoURL: "",
    planId: "p2",
    trainerName: "General Floor Trainer (Included)",
    ptPlanId: "",
    ptPlanName: "",
    ptPlanPrice: 0,
    ptDuration: "",
    preferredSlot: activeSlots[0] ? `${activeSlots[0].label} (${activeSlots[0].time})` : "Morning (6:00 AM - 9:00 AM)",
    healthNotes: "",
    // Member Portal Login Credentials
    loginEmail: "",
    loginPassword: "",
    // Personal Training & Assessment metrics
    weight: "",
    heightFeet: "5",
    heightInches: "8",
    fitnessGoal: "Weight Loss & Fat Burn",
    targetWeight: "",
    targetTimeline: "90 Days",
    medicalNotes: "",
    // Waiver
    waiverAgreed: true,
    signatureURL: "",
    signatureType: "draw",
    typedSignature: "",
    joiningDate: new Date().toISOString().split("T")[0],
  });

  const [saving, setSaving] = useState(false);

  // Selected trainer object
  const selectedTrainerObj = useMemo(() => {
    return availableTrainers.find(t => t.name === formData.trainerName) || availableTrainers[0];
  }, [availableTrainers, formData.trainerName]);

  const isPersonalTrainer = selectedTrainerObj && selectedTrainerObj.name !== "General Floor Trainer (Included)";

  // Selected base gym membership plan
  const currentBasePlan = useMemo(() => {
    return availablePlans.find((p) => p.id === formData.planId) || availablePlans[0];
  }, [availablePlans, formData.planId]);

  // Combined Fee Calculation: Gym Membership Plan Fee + Personal Trainer PT Package Add-on Fee + Selected Services Fee
  const basePlanPrice = Number(currentBasePlan?.price || 0);
  const ptAddonPrice = Number(formData.ptPlanPrice || 0);
  const servicesTotalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalPayableFee = basePlanPrice + ptAddonPrice + servicesTotalPrice;

  const toggleServiceSelection = (srv) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === srv.id);
      if (exists) {
        return prev.filter((s) => s.id !== srv.id);
      } else {
        return [...prev, srv];
      }
    });
  };

  // Compute live trainer slot booking counts & member names from existingMembers
  const trainerSlotOccupancy = useMemo(() => {
    if (!selectedTrainerObj || !isPersonalTrainer) return {};
    const tName = selectedTrainerObj.name || selectedTrainerObj.fullName;
    const tId = selectedTrainerObj.id;

    // Filter active members assigned to this trainer
    const assigned = (existingMembers || []).filter((m) => {
      const match = m.trainerId === tId || m.trainerName === tName;
      return match && m.status !== "left" && m.active !== false;
    });

    // Group members by slot/timing
    const map = {};
    assigned.forEach((m) => {
      const rawSlot = (m.ptSlot || m.slot || m.workoutSlot || m.preferredTime || "").trim();
      if (!rawSlot) return;
      if (!map[rawSlot]) map[rawSlot] = [];
      map[rawSlot].push(m.name || m.fullName || "Member");
    });
    return map;
  }, [selectedTrainerObj, isPersonalTrainer, existingMembers]);

  // Dynamic BMI Calculation from Weight in kg and Height in ft & in
  const bmiInfo = useMemo(() => {
    const w = parseFloat(formData.weight);
    const ft = parseFloat(formData.heightFeet);
    const inch = parseFloat(formData.heightInches || 0);
    if (!w || !ft || w <= 0 || ft <= 0) return null;

    // 1 ft = 12 in, 1 in = 0.0254 meters
    const totalInches = ft * 12 + inch;
    const hM = totalInches * 0.0254;
    const val = parseFloat((w / (hM * hM)).toFixed(1));
    let category = "Normal";
    let color = "text-emerald-700 bg-emerald-50 border-emerald-200";
    let message = "Healthy range for overall fitness and performance";

    if (val < 18.5) {
      category = "Underweight";
      color = "text-blue-700 bg-blue-50 border-blue-200";
      message = "Higher protein intake & progressive overload recommended";
    } else if (val <= 24.9) {
      category = "Normal Weight (Healthy)";
      color = "text-emerald-700 bg-emerald-50 border-emerald-200";
      message = "Prime condition for lean muscle growth & strength conditioning";
    } else if (val <= 29.9) {
      category = "Overweight";
      color = "text-amber-700 bg-amber-50 border-amber-200";
      message = "Caloric deficit & structured cardio/resistance split advised";
    } else {
      category = "Obese";
      color = "text-rose-700 bg-rose-50 border-rose-200";
      message = "Customized cardio, joint-friendly lifting & nutrition advised";
    }

    return { val, category, color, message };
  }, [formData.weight, formData.heightFeet, formData.heightInches]);

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile photo must be under 2 MB");
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

    const basePrice = Number(selectedPlan.price || 0);
    const ptPrice = Number(formData.ptPlanPrice || 0);
    const combinedTotalFee = basePrice + ptPrice;

    // Calculate Gym Owner Commission and Trainer Payout on PT Sale
    let ptOwnerCommission = 0;
    let ptTrainerPayout = 0;
    let commissionType = selectedTrainerObj?.commissionType || "percentage";
    let commissionValue = selectedTrainerObj?.commissionValue !== undefined ? Number(selectedTrainerObj.commissionValue) : 30;

    if (ptPrice > 0 && isPersonalTrainer) {
      if (commissionType === "fixed") {
        ptOwnerCommission = Math.min(ptPrice, commissionValue);
        ptTrainerPayout = Math.max(0, ptPrice - ptOwnerCommission);
      } else {
        ptOwnerCommission = Math.round(ptPrice * (commissionValue / 100));
        ptTrainerPayout = Math.max(0, ptPrice - ptOwnerCommission);
      }
    }

    const newMember = {
      id: "m_" + Date.now(),
      name: formData.fullName.trim(),
      fullName: formData.fullName.trim(),
      aadhaar: formData.aadhaar.trim(),
      phone: formData.phone.trim(),
      altPhone: formData.altPhone.trim(),
      email: formData.email.trim(),
      gender: formData.gender,
      dob: formData.dob,
      address: formData.address.trim(),
      photoURL: formData.photoURL,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      planPrice: basePrice,
      ptPlanId: formData.ptPlanId || "",
      ptPlanName: formData.ptPlanName || "",
      ptPlanPrice: ptPrice,
      ptDuration: formData.ptDuration || "",
      // PT Deal Commission & Payout Tracking
      ptCommissionType: commissionType,
      ptCommissionValue: commissionValue,
      ptOwnerCommission,
      selectedServices: selectedServices.map(s => ({
        id: s.id,
        name: s.name,
        price: Number(s.price || 0),
        category: s.category || "General",
        billingType: s.billingType || "Per Month"
      })),
      servicesTotalPrice,
      totalAmount: basePrice + ptPrice + servicesTotalPrice,
      dueAmount: basePrice + ptPrice + servicesTotalPrice,
      paidAmount: 0,
      trainerName: formData.trainerName,
      trainerId: selectedTrainerObj?.id || "",
      hasPersonalCoach: isPersonalTrainer,
      isPTMember: isPersonalTrainer,
      // Portal Access Credentials - ONLY created when member opts for PT
      loginEmail: isPersonalTrainer
        ? (formData.loginEmail.trim() || formData.email.trim() || formData.phone.trim())
        : "",
      password: isPersonalTrainer
        ? (formData.loginPassword.trim() || "Member@123")
        : "",
      loginPassword: isPersonalTrainer
        ? (formData.loginPassword.trim() || "Member@123")
        : "",
      // Physical Assessment Metrics
      weight: formData.weight ? String(formData.weight) : "",
      height: formData.heightFeet ? `${formData.heightFeet} ft ${formData.heightInches || 0} in` : "",
      heightFeet: formData.heightFeet || "",
      heightInches: formData.heightInches || "",
      bmi: bmiInfo ? String(bmiInfo.val) : "",
      bmiCategory: bmiInfo ? bmiInfo.category : "",
      fitnessGoal: formData.fitnessGoal,
      targetWeight: formData.targetWeight ? String(formData.targetWeight) : "",
      targetTimeline: formData.targetTimeline,
      preferredTime: formData.preferredSlot,
      slot: formData.preferredSlot,
      healthNotes: formData.healthNotes.trim(),
      medicalNotes: formData.medicalNotes.trim(),
      waiverAgreed: true,
      signatureURL: finalSignature,
      status: "active",
      registeredBy: "owner_direct",
      createdAt: new Date(formData.joiningDate).toISOString(),
      expiryDate: expiry.toISOString(),
      renewalFee: selectedPlan.price ? String(selectedPlan.price) : "2500"
    };

    try {
      const createdId = await addMember(GID, newMember);
      if (createdId) {
        newMember.id = createdId;
      }
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
      aadhaar: "",
      phone: "",
      altPhone: "",
      email: "",
      loginEmail: "",
      loginPassword: "",
      gender: "Male",
      dob: "",
      address: "",
      photoURL: "",
      planId: "p2",
      trainerName: "General Floor Trainer (Included)",
      preferredSlot: "Morning (6:00 AM - 9:00 AM)",
      healthNotes: "",
      weight: "",
      heightFeet: "5",
      heightInches: "8",
      fitnessGoal: "Weight Loss & Fat Burn",
      targetWeight: "",
      targetTimeline: "90 Days",
      medicalNotes: "",
      waiverAgreed: true,
      signatureURL: "",
      signatureType: "draw",
      typedSignature: "",
      joiningDate: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Add Member Directly (Complete Registration Form)"
        maxWidth="max-w-5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-slate-800 text-xs max-h-[82vh] overflow-y-auto pr-1">
          
          {/* ============================================================
              SECTION 1: PHOTO & PERSONAL DETAILS (2-COLUMN ON DESKTOP)
          ============================================================ */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-indigo-600" />
                1. Member Profile & Identification
              </h4>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 1 of 3
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: Portrait Photo Capture */}
              <div className="lg:col-span-4 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-center">
                <PhotoCaptureInput
                  value={formData.photoURL}
                  onChange={(url) => setFormData((prev) => ({ ...prev, photoURL: url }))}
                  label="Portrait Photo"
                  subLabel="Upload file or take live camera snapshot"
                  shape="rounded"
                />
              </div>

              {/* Right Column: Personal & Contact Fields */}
              <div className="lg:col-span-8 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Aadhaar Number (UIDAI)</label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="XXXX XXXX XXXX"
                      value={formData.aadhaar}
                      onChange={(e) => {
                        // Auto-format as 4-digit blocks: 1234 5678 9012
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                        const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
                        setFormData({ ...formData, aadhaar: formatted });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold tracking-wider placeholder:tracking-normal"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Primary Phone *</label>
                    <input
                      required
                      type="tel"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Alt. Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="Family / Emergency"
                      value={formData.altPhone}
                      onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="name@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Residential Address</label>
                    <input
                      type="text"
                      placeholder="Flat / Street address, Area, City"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================
              SECTION 2: MEMBERSHIP PLAN, TIME SLOT & ASSIGNED COACH
          ============================================================ */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Dumbbell className="w-4 h-4 text-purple-600" />
                2. Gym Membership Plan, Workout Slot & Coach
              </h4>
              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 2 of 3
              </span>
            </div>

            {/* Preferred Workout Time Slot with LIVE Trainer Availability & Occupancy */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Preferred Workout Time Slot *
                </label>
                {isPersonalTrainer && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 self-start sm:self-auto">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    Live Trainer Slot Schedule: {selectedTrainerObj.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {activeSlots.map((s) => {
                  const fullText = `${s.label} (${s.time})`;
                  const isSelected = formData.preferredSlot === fullText;
                  const Icon = s.icon || Sun;

                  // Find how many athletes are booked with THIS trainer in this slot
                  const bookedAthletes = isPersonalTrainer
                    ? (trainerSlotOccupancy[fullText] || trainerSlotOccupancy[s.label] || trainerSlotOccupancy[s.time] || [])
                    : [];
                  const bookedCount = bookedAthletes.length;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, preferredSlot: fullText })}
                      className={`p-2.5 rounded-xl text-left border transition relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-1 ring-amber-400"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Icon className="w-3.5 h-3.5 text-amber-500" />
                            {s.label}
                          </div>
                          {/* Live Occupancy Badge when a Personal Trainer is selected */}
                          {isPersonalTrainer && (
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wide shrink-0 ${
                                bookedCount === 0
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : bookedCount === 1
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-rose-100 text-rose-900 border border-rose-300 animate-pulse"
                              }`}
                            >
                              {bookedCount === 0 ? "🟢 Free" : bookedCount === 1 ? "🟡 1 Booked" : `🔴 ${bookedCount} Busy`}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{s.time}</p>
                      </div>

                      {/* Show active member names booked in this slot */}
                      {isPersonalTrainer && bookedCount > 0 && (
                        <div className="mt-1.5 pt-1 border-t border-slate-200/60 text-[9.5px] text-slate-600 truncate">
                          🏋️ {bookedAthletes.join(", ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Overbooking Alert Warning */}
              {(() => {
                if (!isPersonalTrainer) return null;
                const curBooked = trainerSlotOccupancy[formData.preferredSlot] || [];
                if (curBooked.length >= 2) {
                  return (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900 animate-in fade-in duration-200">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-tight">
                        <strong className="font-extrabold text-rose-800">Trainer Slot Overbooked! </strong>
                        Coach <strong>{selectedTrainerObj.name}</strong> ke paas is slot (<strong>{formData.preferredSlot}</strong>) mein pehle se <strong>{curBooked.length} athletes</strong> training le rahe hain ({curBooked.join(", ")}). Trainer ek waqt mein zyada members par dhyan nahi de payega. Agar sambhav ho toh doosra free slot chunein.
                      </div>
                    </div>
                  );
                }
                if (curBooked.length === 1) {
                  return (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-900 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Coach <strong>{selectedTrainerObj.name}</strong> is already coaching <strong>{curBooked[0]}</strong> at this slot.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Selectors Row: Plan, Date, Coach */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Gym Membership Plan */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Gym Membership Plan *
                </label>
                <select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{Number(p.price || 0).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Base gym access plan
                </span>
              </div>

              {/* Admission / Joining Date */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Admission / Joining Date</label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Assigned Coach / Trainer */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Coach / Trainer</label>
                <select
                  value={formData.trainerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isGen = !val || val === GENERAL_TRAINER.name;
                    setFormData((prev) => ({
                      ...prev,
                      trainerName: val,
                      ...(isGen ? { ptPlanId: "", ptPlanName: "", ptPlanPrice: 0, ptDuration: "" } : {})
                    }));
                  }}
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


            {/* ==========================================================
                COACH DETAILS & PROPER RESIZED PROFILE CARD
            ========================================================== */}
            {isPersonalTrainer && selectedTrainerObj && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 border-2 border-indigo-200 shadow-sm space-y-4 transition-all">
                {/* Header Profile Row */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  
                  {/* Coach Photo Frame */}
                  <div 
                    className="relative group cursor-pointer flex-shrink-0"
                    onClick={() => {
                      const p = selectedTrainerObj.photoUrl || selectedTrainerObj.photoURL;
                      if (p) {
                        setFullPhotoModal({
                          img: p,
                          title: `${selectedTrainerObj.name} - Coach Photo`,
                          desc: selectedTrainerObj.specialization
                        });
                      }
                    }}
                  >
                    {(selectedTrainerObj.photoUrl || selectedTrainerObj.photoURL) ? (
                      <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden border-2 border-indigo-400 shadow-md bg-slate-900 flex-shrink-0">
                        <img
                          src={selectedTrainerObj.photoUrl || selectedTrainerObj.photoURL}
                          alt={selectedTrainerObj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-3xl shadow-md flex-shrink-0">
                        {selectedTrainerObj.name?.charAt(0)?.toUpperCase() || "C"}
                      </div>
                    )}
                    {(selectedTrainerObj.photoUrl || selectedTrainerObj.photoURL) && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1 shadow-lg">
                        <Maximize2 className="w-4 h-4" /> Full View
                      </div>
                    )}
                  </div>

                  {/* Coach Credentials Column */}
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                      <div>
                        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                          <h5 className="font-extrabold text-slate-900 text-base">{selectedTrainerObj.name}</h5>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <Award className="w-3 h-3 text-indigo-600" /> Dedicated Coach
                          </span>
                        </div>
                        <p className="text-xs font-bold text-indigo-600 mt-0.5">
                          {selectedTrainerObj.specialization || "Personal Fitness Coach"}
                        </p>
                      </div>

                      {selectedTrainerObj.experience && (
                        <div className="inline-flex justify-center sm:justify-end">
                          <span className="text-[11px] font-bold px-3 py-1 bg-white text-slate-700 rounded-xl border border-slate-200 shadow-2xs">
                            ⭐ {selectedTrainerObj.experience} Experience
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Coach Bio */}
                    {selectedTrainerObj.bio && (
                      <div className="bg-white/90 p-3 rounded-xl text-xs text-slate-700 border border-indigo-100 leading-relaxed shadow-2xs">
                        <span className="font-bold text-slate-900 block mb-0.5">Coach Bio & Background:</span>
                        {selectedTrainerObj.bio}
                      </div>
                    )}

                    {/* Coach Certifications (Text & Document/Image File) */}
                    {(selectedTrainerObj.certifications || selectedTrainerObj.certUrl || selectedTrainerObj.certFile) && (
                      <div className="bg-indigo-50/70 border border-indigo-200/80 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-indigo-600" />
                            Trainer Verified Certification
                          </span>
                          {(selectedTrainerObj.certUrl || selectedTrainerObj.certFile) && (
                            <button
                              type="button"
                              onClick={() => {
                                const cert = selectedTrainerObj.certUrl || selectedTrainerObj.certFile;
                                if (cert.startsWith("data:application/pdf")) {
                                  window.open(cert, "_blank");
                                } else {
                                  setFullPhotoModal({
                                    img: cert,
                                    title: `${selectedTrainerObj.name} - Official Fitness Certification`,
                                    desc: selectedTrainerObj.certifications || "Accredited Trainer Certificate"
                                  });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs transition"
                            >
                              <FileText className="w-3 h-3" /> View Certificate
                            </button>
                          )}
                        </div>
                        {selectedTrainerObj.certifications && (
                          <p className="text-[11px] text-slate-700 font-semibold">
                            {selectedTrainerObj.certifications}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Trainer Custom PT Packages (Interactive Add-on Selection) */}
                    {selectedTrainerObj.ptPlans && selectedTrainerObj.ptPlans.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Select Personal Training (PT) Add-on Package:
                          </span>
                          {formData.ptPlanId && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  ptPlanId: "",
                                  ptPlanName: "",
                                  ptPlanPrice: 0,
                                  ptDuration: "",
                                }))
                              }
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline"
                            >
                              Remove PT Add-on
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedTrainerObj.ptPlans.map((pkg, pidx) => {
                            const pPrice = Number(pkg.price || 0);
                            const durType = pkg.durationType || (pkg.duration?.toLowerCase().includes("year") ? "years" : "months");
                            const durVal = Number(pkg.durationValue) || (pkg.duration?.toLowerCase().includes("3 month") ? 3 : pkg.duration?.toLowerCase().includes("6 month") ? 6 : pkg.duration?.toLowerCase().includes("1 year") ? 1 : 1);
                            const totalMonths = durType === "years" ? durVal * 12 : durVal;
                            const perMonth = (totalMonths > 1 && pPrice > 0) ? Math.round(pPrice / totalMonths) : null;
                            const isSelected = formData.ptPlanId === (pkg.id || `pt_${pidx}`) || formData.ptPlanName === pkg.name;

                            return (
                              <div
                                key={pkg.id || pidx}
                                onClick={() => {
                                  if (isSelected) {
                                    // Deselect
                                    setFormData((prev) => ({
                                      ...prev,
                                      ptPlanId: "",
                                      ptPlanName: "",
                                      ptPlanPrice: 0,
                                      ptDuration: "",
                                    }));
                                  } else {
                                    // Select as Add-on
                                    setFormData((prev) => ({
                                      ...prev,
                                      ptPlanId: pkg.id || `pt_${pidx}`,
                                      ptPlanName: pkg.name,
                                      ptPlanPrice: pPrice,
                                      ptDuration: pkg.duration || `${durVal} ${durType}`,
                                    }));
                                    toast.success(`Added ${pkg.name} (+₹${pPrice.toLocaleString("en-IN")})`);
                                  }
                                }}
                                className={`rounded-2xl p-3 text-left transition cursor-pointer border-2 space-y-1.5 relative ${
                                  isSelected
                                    ? "bg-indigo-50/90 border-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                                    : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 shadow-2xs"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] shrink-0 ${
                                        isSelected ? "bg-indigo-600" : "border-2 border-slate-300"
                                      }`}
                                    >
                                      {isSelected && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                    <span className="text-xs font-extrabold text-indigo-950 truncate">
                                      {pkg.name}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-black shrink-0 px-2 py-0.5 rounded-lg border ${
                                      isSelected
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }`}
                                  >
                                    +₹{pPrice.toLocaleString("en-IN")}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap text-[10px] pl-5">
                                  {pkg.duration && (
                                    <span className="text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                                      ⏳ {pkg.duration}
                                    </span>
                                  )}
                                  {perMonth && (
                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      ₹{perMonth.toLocaleString("en-IN")}/mo
                                    </span>
                                  )}
                                </div>

                                {pkg.description && (
                                  <p className="text-[10px] text-slate-600 line-clamp-1 pl-5">
                                    {pkg.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add-on Summary Pill */}
                        {formData.ptPlanName && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 border border-indigo-200 flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              PT Add-on: <span className="text-emerald-800 font-extrabold">{formData.ptPlanName}</span>
                            </span>
                            <span className="font-extrabold text-indigo-950">
                              +₹{Number(formData.ptPlanPrice || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coach Client Transformations (Results) with high-end card styling */}
                {selectedTrainerObj.transformations && selectedTrainerObj.transformations.length > 0 ? (
                  <div className="pt-3 border-t border-indigo-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        Client Results & Transformations ({selectedTrainerObj.transformations.length})
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium">Click photos to view full size</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTrainerObj.transformations.map((item, idx) => {
                        const beforeSrc = item.beforeImg || item.beforeURL;
                        const afterSrc = item.afterImg || item.afterURL;
                        return (
                          <div key={item.id || idx} className="bg-white p-2.5 rounded-2xl border border-indigo-100/90 shadow-2xs space-y-2 hover:shadow-sm transition">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Before Image */}
                              <div 
                                className="relative rounded-xl overflow-hidden bg-slate-100 h-36 sm:h-40 border border-slate-200 cursor-pointer group shadow-2xs"
                                onClick={() => beforeSrc && setFullPhotoModal({ img: beforeSrc, title: "Before Transformation", desc: item.description })}
                              >
                                {beforeSrc ? (
                                  <img src={beforeSrc} alt="Before" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-semibold">No Photo</div>
                                )}
                                <span className="absolute top-1.5 left-1.5 bg-rose-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm tracking-wide">
                                  BEFORE
                                </span>
                                {beforeSrc && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                    <Maximize2 className="w-3.5 h-3.5" /> View
                                  </div>
                                )}
                              </div>

                              {/* After Image */}
                              <div 
                                className="relative rounded-xl overflow-hidden bg-slate-100 h-36 sm:h-40 border border-slate-200 cursor-pointer group shadow-2xs"
                                onClick={() => afterSrc && setFullPhotoModal({ img: afterSrc, title: "After Transformation", desc: item.description })}
                              >
                                {afterSrc ? (
                                  <img src={afterSrc} alt="After" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-semibold">No Photo</div>
                                )}
                                <span className="absolute top-1.5 left-1.5 bg-emerald-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm tracking-wide">
                                  AFTER
                                </span>
                                {afterSrc && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                    <Maximize2 className="w-3.5 h-3.5" /> View
                                  </div>
                                )}
                              </div>
                            </div>

                            {item.description && (
                              <p className="text-[11px] text-slate-700 font-medium line-clamp-2 leading-relaxed px-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 text-xs text-slate-500 italic">
                    Coach verified. Personalized workout routine and diet plan will be scheduled upon member joining.
                  </div>
                )}
              </div>
            )}

            {/* ==========================================================
                PERSONAL TRAINING BODY ASSESSMENT & MEDICAL HISTORY
            ========================================================== */}
            {isPersonalTrainer && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border-2 border-purple-200 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                  <div>
                    <h5 className="font-bold text-purple-950 text-xs sm:text-sm flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-purple-600" />
                      Coach Physical Assessment & Health Profile
                    </h5>
                    <p className="text-[11px] text-purple-800/80 mt-0.5">
                      Baseline body metrics & medical background for {selectedTrainerObj.name} to design safe, target workout plans
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold bg-purple-200 text-purple-900 px-2.5 py-0.5 rounded-full">
                    Coach Assessment
                  </span>
                </div>

                {/* Weight, Height and BMI Display Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Weight Input */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1 text-xs">
                      <Scale className="w-3.5 h-3.5 text-purple-600" /> Body Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="250"
                      placeholder="e.g. 74.5"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded in kg</span>
                  </div>

                  {/* Height Input (Feet & Inches) */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1 text-xs">
                      <Activity className="w-3.5 h-3.5 text-purple-600" /> Height (ft & in) *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="3"
                          max="8"
                          step="1"
                          placeholder="5"
                          value={formData.heightFeet}
                          onChange={(e) => setFormData({ ...formData, heightFeet: e.target.value })}
                          className="w-full bg-white border border-purple-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:outline-none focus:border-purple-600"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">ft</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="11"
                          step="1"
                          placeholder="8"
                          value={formData.heightInches}
                          onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })}
                          className="w-full bg-white border border-purple-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:outline-none focus:border-purple-600"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">in</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {formData.heightFeet ? `${formData.heightFeet} ft ${formData.heightInches || 0} in` : "e.g. 5 ft 8 in"}
                    </span>
                  </div>

                  {/* Auto Calculated BMI Card */}
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Calculated BMI</span>
                      {bmiInfo && (
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${bmiInfo.color}`}>
                          {bmiInfo.category}
                        </span>
                      )}
                    </div>

                    <div className="my-0.5">
                      {bmiInfo ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-purple-950">{bmiInfo.val}</span>
                          <span className="text-[10px] text-slate-500 font-bold">kg/m²</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Enter Weight & Height</span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 leading-tight truncate">
                      {bmiInfo ? bmiInfo.message : "Formula: Weight / (Height in m)²"}
                    </p>
                  </div>
                </div>

                {/* Goal & Target Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-purple-600" /> Primary Fitness Goal
                    </label>
                    <select
                      value={formData.fitnessGoal}
                      onChange={(e) => setFormData({ ...formData, fitnessGoal: e.target.value })}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                    >
                      {FITNESS_GOALS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 68.0"
                      value={formData.targetWeight}
                      onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Goal Timeline</label>
                    <select
                      value={formData.targetTimeline}
                      onChange={(e) => setFormData({ ...formData, targetTimeline: e.target.value })}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                    >
                      <option value="30 Days">30 Days (Fast Track)</option>
                      <option value="90 Days">90 Days (Recommended)</option>
                      <option value="6 Months">6 Months Transformation</option>
                      <option value="1 Year">1 Year Athletic Development</option>
                    </select>
                  </div>
                </div>

                {/* Medical History / Injuries (Asked only when Personal Trainer is chosen) */}
                <div className="pt-2 border-t border-purple-200/80">
                  <label className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5 text-xs">
                    <Heart className="w-4 h-4 text-rose-500" />
                    Medical History / Past Injuries / Health Notes (For Coach Attention)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Lower back stiffness, old knee surgery, high BP, asthma, or any specific exercise precautions"
                    value={formData.healthNotes}
                    onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                    className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-600 placeholder:text-slate-400"
                  />
                </div>

                  {/* ==========================================================
                      PT ATHLETE APP & PORTAL LOGIN CREDENTIALS (ONLY WHEN PT TAKEN)
                  ========================================================== */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 border-2 border-indigo-500/40 text-white space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-1.5">
                            PT Member Portal Login Credentials
                          </h5>
                          <p className="text-[11px] text-indigo-300">
                            Member ne PT liya hai. In credentials se member app/portal me login karke Coach {selectedTrainerObj.name} se 1-on-1 live chat, customized diet aur workout routine access karega.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                        PT Access Only
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          Login ID / Phone *
                        </label>
                        <input
                          type="text"
                          value={formData.loginEmail}
                          onChange={(e) => setFormData({ ...formData, loginEmail: e.target.value })}
                          placeholder={formData.phone || formData.email || "e.g. 9876543210"}
                          className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                          Create Login Password *
                        </label>
                        <input
                          type="text"
                          value={formData.loginPassword}
                          onChange={(e) => setFormData({ ...formData, loginPassword: e.target.value })}
                          placeholder="Member@123"
                          className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3.5 py-2 text-xs text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono font-bold tracking-wider"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-300/80 italic">
                      💡 Note: PT membership expire hote hi login block ho jayega aur renew hone par wahi se continue hoga.
                    </p>
                  </div>
                </div>
              )}

            {/* ==========================================================
                ADD-ON GYM SERVICES & AMENITIES CHECKLIST (STEAM, LOCKER, DIET)
            ========================================================== */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Add-on Gym Services & Facilities (Optional)
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select extra services for this member. Selected service fees will be added directly to the registration bill.
                  </p>
                </div>
                {selectedServices.length > 0 && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {selectedServices.length} Selected (+₹{servicesTotalPrice.toLocaleString("en-IN")})
                  </span>
                )}
              </div>

              {dbServices.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No gym services configured.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dbServices.map((srv) => {
                    const isChecked = selectedServices.some((s) => s.id === srv.id);
                    const srvPrice = Number(srv.price || 0);
                    return (
                      <div
                        key={srv.id}
                        onClick={() => toggleServiceSelection(srv)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 select-none ${
                          isChecked
                            ? "bg-emerald-50/70 border-emerald-500 shadow-xs"
                            : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Controlled by card click
                            className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {srv.name}
                            </span>
                            {srv.desc && (
                              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                {srv.desc}
                              </p>
                            )}
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                              {srv.category || "Service"} • {srv.billingType || "Per Month"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black block ${isChecked ? "text-emerald-700" : "text-slate-900"}`}>
                            +₹{srvPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            Fee Add-on
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
              SECTION 3: LIABILITY WAIVER & DIGITAL SIGNATURE
          ============================================================ */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                3. Liability Waiver & Signature
              </h4>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 3 of 3
              </span>
            </div>

            {/* Waiver Text Box */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
              <p className="font-bold text-slate-900 mb-0.5">Assumption of Risk & Release of Liability Agreement:</p>
              <p className="mb-0.5">
                1. I acknowledge that participation in exercise programs, weight training, cardio, and general fitness activities involves inherent physical risks.
              </p>
              <p className="mb-0.5">
                2. I voluntarily assume all risks connected with participation in gym training and release Univo Gym Management, its owners, and trainers from liability for accidental injury.
              </p>
              <p>
                3. I certify that I am physically capable of participating in these exercises and will disclose any acute medical limitations to gym coaches.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
              <input
                type="checkbox"
                checked={formData.waiverAgreed}
                onChange={(e) => setFormData({ ...formData, waiverAgreed: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              I have read, understood, and accept all the terms of the Liability Waiver
            </label>

            {/* Signature Selection */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-700 text-xs">Member Digital Signature</span>
                <div className="flex rounded-xl overflow-hidden border border-slate-200 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, signatureType: "draw" })}
                    className={`px-3.5 py-1.5 ${
                      formData.signatureType === "draw"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Draw Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, signatureType: "typed" })}
                    className={`px-3.5 py-1.5 ${
                      formData.signatureType === "typed"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Type Full Name
                  </button>
                </div>
              </div>

              {formData.signatureType === "draw" ? (
                <div className="w-full max-w-2xl bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <SignaturePad
                    onSave={(dataUrl) => setFormData((prev) => ({ ...prev, signatureURL: dataUrl }))}
                    onClear={() => setFormData((prev) => ({ ...prev, signatureURL: "" }))}
                  />
                </div>
              ) : (
                <div className="w-full max-w-2xl bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Type your full legal name as digital signature:
                  </label>
                  <input
                    type="text"
                    placeholder="Type your full legal name"
                    value={formData.typedSignature || formData.fullName}
                    onChange={(e) => setFormData({ ...formData, typedSignature: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-serif italic text-slate-900 focus:outline-none focus:border-indigo-500 font-bold tracking-wide"
                  />
                  <p className="text-[10px] text-slate-400">
                    Your typed name serves as a legally recognized electronic signature for this registration.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Order Fee Summary & Breakdown Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-slate-800">
            <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-medium">Gym Plan:</span>
                <span className="font-bold text-white">₹{basePlanPrice.toLocaleString("en-IN")}</span>
              </div>
              {ptAddonPrice > 0 && (
                <>
                  <span className="text-indigo-400 font-extrabold">+</span>
                  <div className="flex items-center gap-1.5 bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/40">
                    <Sparkles className="w-3 h-3 text-indigo-300" />
                    <span className="text-indigo-200 font-medium truncate max-w-[120px] sm:max-w-[180px]">
                      {formData.ptPlanName || "PT Add-on"}:
                    </span>
                    <span className="font-bold text-indigo-300">₹{ptAddonPrice.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              {servicesTotalPrice > 0 && (
                <>
                  <span className="text-emerald-400 font-extrabold">+</span>
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-200 font-medium">
                      {selectedServices.length} Services:
                    </span>
                    <span className="font-bold text-emerald-300">₹{servicesTotalPrice.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
              <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Total Fee:</span>
              <span className="text-lg font-black text-emerald-400">
                ₹{totalPayableFee.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-200 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 text-center"
            >
              {saving ? "Registering Member..." : "Register Member & Activate Plan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Full Size Image Preview Modal */}
      {fullPhotoModal && (
        <Modal
          isOpen={!!fullPhotoModal}
          onClose={() => setFullPhotoModal(null)}
          title={fullPhotoModal.title || "Image Preview"}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-3 text-center p-2">
            <div className="max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5 flex items-center justify-center">
              <img
                src={fullPhotoModal.img}
                alt="Full Preview"
                className="max-h-[68vh] w-auto object-contain rounded-2xl shadow"
              />
            </div>
            {fullPhotoModal.desc && (
              <p className="text-xs text-slate-600 font-medium">{fullPhotoModal.desc}</p>
            )}
            <button
              type="button"
              onClick={() => setFullPhotoModal(null)}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Close Preview
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
