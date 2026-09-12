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
  Maximize2
} from "lucide-react";
import toast from "react-hot-toast";
import { addMember } from "../../firebase/members";
import { getTrainers } from "../../firebase/trainers";
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

export default function DirectAddMemberModal({ isOpen, onClose, onSuccess, plans = null, trainers = null }) {
  const { gymId } = useAuth();
  const GID = gymId || "univo_main";
  const fileInputRef = useRef(null);

  const [dbTrainers, setDbTrainers] = useState([]);
  const [fullPhotoModal, setFullPhotoModal] = useState(null); // { img, title, desc }

  // Fetch real trainers from Firestore
  useEffect(() => {
    async function loadTrainersList() {
      try {
        const list = await getTrainers(GID);
        if (list && list.length > 0) {
          setDbTrainers(list);
        }
      } catch (err) {
        console.warn("Could not load trainers in AddMemberModal:", err);
      }
    }
    if (isOpen) {
      loadTrainersList();
    }
  }, [GID, isOpen]);

  const availablePlans = plans && plans.length > 0 ? plans : DEFAULT_PLANS;
  
  // Combine general floor trainer with trainers
  const availableTrainers = useMemo(() => {
    const customList = (trainers && trainers.length > 0) ? trainers : dbTrainers;
    return [GENERAL_TRAINER, ...customList.filter(t => t.id !== "t0")];
  }, [trainers, dbTrainers]);

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
    // Personal Training & Assessment metrics
    weight: "",
    height: "",
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

  // Dynamic BMI Calculation
  const bmiInfo = useMemo(() => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    if (!w || !h || w <= 0 || h <= 0) return null;

    const hM = h / 100;
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
  }, [formData.weight, formData.height]);

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
      trainerId: selectedTrainerObj?.id || "",
      hasPersonalCoach: isPersonalTrainer,
      // Physical Assessment Metrics
      weight: formData.weight ? String(formData.weight) : "",
      height: formData.height ? String(formData.height) : "",
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
      await addMember(GID, newMember);
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
      weight: "",
      height: "",
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
        <form onSubmit={handleSubmit} className="space-y-6 text-slate-800 text-xs max-h-[82vh] overflow-y-auto pr-1">
          
          {/* ============================================================
              STEP 1: PHOTO & PERSONAL IDENTIFICATION
          ============================================================ */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-indigo-600" />
                1. Profile Photo & Identification
              </h4>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 1 of 5
              </span>
            </div>

            <div>
              <PhotoCaptureInput
                value={formData.photoURL}
                onChange={(url) => setFormData((prev) => ({ ...prev, photoURL: url }))}
                label="Member Portrait Photo"
                subLabel="Upload photo from device files or take a live camera snapshot"
                shape="rounded"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* ============================================================
              STEP 2: CONTACT & RESIDENTIAL DETAILS
          ============================================================ */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-emerald-600" />
                2. Contact & Address Details
              </h4>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 2 of 5
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Primary Phone Number *</label>
                <input
                  required
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alternative Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="Family / Emergency contact"
                  value={formData.altPhone}
                  onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="rahul@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street address, Flat No., Area"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* ============================================================
              STEP 3: MEMBERSHIP PLAN & TRAINER (WITH DETAILS & RESULTS)
          ============================================================ */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Dumbbell className="w-4 h-4 text-purple-600" />
                3. Membership Plan & Assigned Coach
              </h4>
              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 3 of 5
              </span>
            </div>

            {/* Selectors Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Membership Plan */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Membership Plan</label>
                <select
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - Rs. {Number(p.price || 0).toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admission / Joining Date */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Admission / Joining Date</label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Assigned Coach / Trainer */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Coach / Trainer</label>
                <select
                  value={formData.trainerName}
                  onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
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
              <div className="p-5 rounded-3xl bg-white border-2 border-indigo-200 shadow-sm space-y-4 transition-all">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                  
                  {/* Fixed Size Photo Frame with click to zoom */}
                  <div 
                    className="relative group cursor-pointer flex-shrink-0 mx-auto"
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
                      <div className="w-52 h-72 sm:w-60 sm:h-80 rounded-3xl overflow-hidden border-4 border-indigo-500 shadow-xl bg-slate-900 flex-shrink-0">
                        <img
                          src={selectedTrainerObj.photoUrl || selectedTrainerObj.photoURL}
                          alt={selectedTrainerObj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-52 h-72 sm:w-60 sm:h-80 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-5xl shadow-sm flex-shrink-0">
                        {selectedTrainerObj.name?.charAt(0)?.toUpperCase() || "C"}
                      </div>
                    )}
                    {(selectedTrainerObj.photoUrl || selectedTrainerObj.photoURL) && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 shadow-lg">
                        <Maximize2 className="w-4 h-4" /> Click for Full View
                      </div>
                    )}
                  </div>

                  {/* Coach Credentials Column */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-extrabold text-slate-900 text-base">{selectedTrainerObj.name}</h5>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                            <Award className="w-3 h-3 text-indigo-600" /> Dedicated Coach
                          </span>
                        </div>
                        <p className="text-xs font-bold text-indigo-600 mt-0.5">
                          {selectedTrainerObj.specialization || "Personal Fitness Coach"}
                        </p>
                      </div>

                      {selectedTrainerObj.experience && (
                        <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                          {selectedTrainerObj.experience} Experience
                        </span>
                      )}
                    </div>

                    {/* Coach Bio */}
                    {selectedTrainerObj.bio && (
                      <div className="bg-slate-50/80 p-3 rounded-xl text-xs text-slate-700 border border-slate-100 leading-relaxed">
                        <span className="font-bold text-slate-900 block mb-0.5">Coach Bio & Background:</span>
                        {selectedTrainerObj.bio}
                      </div>
                    )}

                    {/* Coach Certifications */}
                    {selectedTrainerObj.certifications && (
                      <p className="text-xs text-slate-500 pt-0.5">
                        <strong className="text-slate-800">Certifications: </strong> {selectedTrainerObj.certifications}
                      </p>
                    )}
                  </div>
                </div>

                {/* Coach Client Transformations (Results) */}
                {selectedTrainerObj.transformations && selectedTrainerObj.transformations.length > 0 ? (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        Client Results & Transformations ({selectedTrainerObj.transformations.length})
                      </p>
                      <span className="text-[11px] text-slate-400 font-medium">Click photos to view full size</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTrainerObj.transformations.map((item, idx) => (
                        <div key={item.id || idx} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/90 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            {/* Before Image */}
                            <div 
                              className="relative rounded-2xl overflow-hidden bg-slate-200 h-52 sm:h-64 border-2 border-slate-300/80 cursor-pointer group shadow-xs"
                              onClick={() => item.beforeImg && setFullPhotoModal({ img: item.beforeImg, title: "Before Transformation", desc: item.description })}
                            >
                              {item.beforeImg ? (
                                <img src={item.beforeImg} alt="Before" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">No Photo</div>
                              )}
                              <span className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md">
                                BEFORE
                              </span>
                              {item.beforeImg && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                  <Maximize2 className="w-4 h-4" /> View
                                </div>
                              )}
                            </div>

                            {/* After Image */}
                            <div 
                              className="relative rounded-2xl overflow-hidden bg-slate-200 h-52 sm:h-64 border-2 border-slate-300/80 cursor-pointer group shadow-xs"
                              onClick={() => item.afterImg && setFullPhotoModal({ img: item.afterImg, title: "After Transformation", desc: item.description })}
                            >
                              {item.afterImg ? (
                                <img src={item.afterImg} alt="After" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-semibold">No Photo</div>
                              )}
                              <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md">
                                AFTER
                              </span>
                              {item.afterImg && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                  <Maximize2 className="w-4 h-4" /> View
                                </div>
                              )}
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-snug">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 text-xs text-slate-400 italic">
                    Coach verified. Personalized workout routine and diet plan will be scheduled upon member joining.
                  </div>
                )}
              </div>
            )}

            {/* ==========================================================
                PERSONAL TRAINING BODY ASSESSMENT (WEIGHT, HEIGHT, BMI)
            ========================================================== */}
            {isPersonalTrainer && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border-2 border-purple-200 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-2.5">
                  <div>
                    <h5 className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-purple-600" />
                      Member Physical Assessment (Weight, Height & BMI)
                    </h5>
                    <p className="text-xs text-purple-800/80 mt-0.5">
                      Baseline body metrics required for {selectedTrainerObj.name} to design target workout plans
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold bg-purple-200 text-purple-900 px-2.5 py-0.5 rounded-full">
                    Coach Assessment
                  </span>
                </div>

                {/* Weight, Height and BMI Display Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Weight Input */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1 text-[11px] sm:text-xs">
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

                  {/* Height Input */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1 text-[11px] sm:text-xs">
                      <Activity className="w-3.5 h-3.5 text-purple-600" /> Height (cm) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="230"
                      placeholder="e.g. 175"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">In centimeters</span>
                  </div>

                  {/* Auto Calculated BMI Card */}
                  <div className="col-span-2 sm:col-span-1 bg-white p-3 rounded-2xl border border-purple-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Calculated BMI</span>
                      {bmiInfo && (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${bmiInfo.color}`}>
                          {bmiInfo.category}
                        </span>
                      )}
                    </div>

                    <div className="my-1">
                      {bmiInfo ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-purple-950">{bmiInfo.val}</span>
                          <span className="text-[11px] text-slate-500 font-bold">kg/m²</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-purple-600" /> Primary Fitness Goal
                    </label>
                    <select
                      value={formData.fitnessGoal}
                      onChange={(e) => setFormData({ ...formData, fitnessGoal: e.target.value })}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
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
                      className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Goal Timeline</label>
                    <select
                      value={formData.targetTimeline}
                      onChange={(e) => setFormData({ ...formData, targetTimeline: e.target.value })}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                    >
                      <option value="30 Days">30 Days (Fast Track)</option>
                      <option value="90 Days">90 Days (Recommended)</option>
                      <option value="6 Months">6 Months Transformation</option>
                      <option value="1 Year">1 Year Athletic Development</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================
              STEP 4: WORKOUT SCHEDULE & PREFERENCES
          ============================================================ */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                4. Workout Schedule & Health Profile
              </h4>
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 4 of 5
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Preferred Workout Time Slot</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {WORKOUT_SLOTS.map((s) => {
                  const fullText = `${s.label} (${s.time})`;
                  const isSelected = formData.preferredSlot === fullText;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, preferredSlot: fullText })}
                      className={`p-2.5 rounded-2xl text-left border transition ${
                        isSelected
                          ? "bg-amber-50 border-amber-400 text-amber-900 shadow-sm"
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
                Medical History / Injuries / Health Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Previous knee injury, back pain history, high BP, asthma (optional)"
                value={formData.healthNotes}
                onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* ============================================================
              STEP 5: LIABILITY WAIVER & DIGITAL SIGNATURE
          ============================================================ */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                5. Liability Waiver & Signature
              </h4>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                Step 5 of 5
              </span>
            </div>

            {/* Waiver Text Box */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed max-h-28 overflow-y-auto">
              <p className="font-bold text-slate-900 mb-1">Assumption of Risk & Release of Liability Agreement:</p>
              <p className="mb-1">
                1. I acknowledge that participation in exercise programs, weight training, cardio, and general fitness activities involves inherent physical risks.
              </p>
              <p className="mb-1">
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
                    className={`px-3 py-1 ${
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
                    className={`px-3 py-1 ${
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
                <div className="space-y-1.5">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-white">
                    <SignaturePad
                      onSave={(dataUrl) => setFormData((prev) => ({ ...prev, signatureURL: dataUrl }))}
                      onClear={() => setFormData((prev) => ({ ...prev, signatureURL: "" }))}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Draw using mouse, stylus, or fingertip above</p>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="Type your full legal name as digital signature"
                    value={formData.typedSignature || formData.fullName}
                    onChange={(e) => setFormData({ ...formData, typedSignature: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-serif italic text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
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
