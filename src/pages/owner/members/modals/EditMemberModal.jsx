import React, { useState, useMemo } from 'react';
import { 
  User, CreditCard, Activity, Clock, RotateCcw, 
  Dumbbell, Sparkles, AlertTriangle, Scale, Check 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { updateMember } from '../../../../firebase/members';
import Modal from '../../../../components/ui/Modal';
import PhotoCaptureInput from '../../../../components/shared/PhotoCaptureInput';
import { getGymSettings } from '../../../../utils/settings';
import { toDate } from '../memberUtils';

const EDIT_FITNESS_GOALS = [
  'Weight Loss & Fat Burn',
  'Muscle Building & Bulk',
  'Strength & Conditioning',
  'Body Recomposition',
  'General Fitness & Stamina',
  'Rehabilitation & Posture Correction'
];

const EDIT_GOAL_TIMELINES = [
  '30 Days',
  '60 Days',
  '90 Days',
  '6 Months',
  '1 Year'
];

/**
 * Modal to Edit ALL Member Information
 */
export default function EditMemberModal({ member, initialTab = 'personal', onClose, onSave, trainers = [], plans = [], existingMembers = [] }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'personal' | 'membership' | 'assessment'

  // --- Tab 1: Personal & Photo ---
  const [photoURL, setPhotoURL] = useState(member.photoURL || member.photo || '');
  const [name, setName] = useState(member.name || member.fullName || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [altPhone, setAltPhone] = useState(member.altPhone || member.emergencyPhone || '');
  const [email, setEmail] = useState(member.email || '');
  const [aadharNumber, setAadharNumber] = useState(member.aadharNumber || member.aadharNo || member.aadhaar || '');
  const [gender, setGender] = useState(member.gender || 'Male');
  const [dob, setDob] = useState(() => {
    const d = member.dob || member.dateOfBirth;
    if (d) {
      const parsed = toDate(d);
      if (parsed && !isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
      if (typeof d === 'string' && d.includes('-')) return d.slice(0, 10);
    }
    return '';
  });
  const [address, setAddress] = useState(member.address || '');

  // Format Aadhaar Number
  const handleAadhaarChange = (val) => {
    const raw = val.replace(/\D/g, '').slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1-');
    setAadharNumber(formatted);
  };

  // --- Tab 2: Membership, Schedule & Trainer ---
  const gymSettings = useMemo(() => getGymSettings(), []);
  const activeSlots = useMemo(() => {
    const configured = gymSettings?.workoutSlots;
    if (Array.isArray(configured) && configured.length > 0) {
      return configured.map((s) => ({
        id: s.id || s.label,
        label: s.label,
        time: s.time
      }));
    }
    return [
      { id: 'morning', label: 'Morning (6:00 AM - 9:00 AM)' },
      { id: 'afternoon', label: 'Afternoon (12:00 PM - 3:00 PM)' },
      { id: 'evening', label: 'Evening (4:00 PM - 7:00 PM)' },
      { id: 'night', label: 'Night (7:00 PM - 10:00 PM)' },
      { id: 'general', label: 'General Shift' }
    ];
  }, [gymSettings]);

  const [slot, setSlot] = useState(
    member.slot || member.workoutSlot || member.preferredTime || (activeSlots[0]?.label || 'Morning (6:00 AM - 9:00 AM)')
  );

  const availablePlans = useMemo(() => {
    if (plans && plans.length > 0) return plans;
    return [
      { id: 'p1', name: '1-Month Basic', durationMonths: 1, price: 2500 },
      { id: 'p2', name: '3-Month Pro', durationMonths: 3, price: 6500 },
      { id: 'p3', name: '6-Month Transformation', durationMonths: 6, price: 11000 },
      { id: 'p4', name: 'Annual Elite Plan', durationMonths: 12, price: 18000 }
    ];
  }, [plans]);

  const [planId, setPlanId] = useState(member.planId || (availablePlans[0]?.id || ''));
  const selectedPlan = useMemo(() => {
    return availablePlans.find((p) => p.id === planId) || availablePlans[0] || null;
  }, [availablePlans, planId]);

  const [customPlanPrice, setCustomPlanPrice] = useState(
    member.planPrice !== undefined ? String(member.planPrice) : String(selectedPlan?.price || 0)
  );

  const [joiningDate, setJoiningDate] = useState(() => {
    const jd = member.joiningDate || member.joinDate || member.createdAt;
    if (jd) {
      const d = toDate(jd);
      if (d && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
      if (typeof jd === 'string' && jd.includes('-')) return jd.slice(0, 10);
    }
    return new Date().toISOString().split('T')[0];
  });

  const [expiryDate, setExpiryDate] = useState(() => {
    const ed = member.expiryDate;
    if (ed) {
      const d = toDate(ed);
      if (d && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
      if (typeof ed === 'string' && ed.includes('-')) return ed.slice(0, 10);
    }
    return '';
  });

  const handleRecalculateExpiry = () => {
    if (!selectedPlan) return;
    const durationMonths = Number(selectedPlan.durationMonths || selectedPlan.duration || 1);
    const start = new Date(joiningDate || new Date());
    start.setMonth(start.getMonth() + durationMonths);
    const formatted = start.toISOString().split('T')[0];
    setExpiryDate(formatted);
    toast.success(`Expiry date recalculated: ${formatted}`);
  };

  // Trainer & PT selection
  const allTrainers = useMemo(() => {
    const GENERAL_TRAINER = {
      id: 't0',
      name: 'General Floor Trainer (Included)',
      specialization: 'General Gym Floor Support',
      experience: 'Gym Staff',
      bio: 'General floor trainers provide assistance with equipment usage, form correction, and safety on the gym floor.'
    };
    return [GENERAL_TRAINER, ...trainers.filter((t) => t.id !== 't0' && (t.name || t.fullName) !== 'General Floor Trainer (Included)')];
  }, [trainers]);

  const [trainerName, setTrainerName] = useState(member.trainerName || 'General Floor Trainer (Included)');
  const selectedTrainerObj = useMemo(() => {
    return allTrainers.find((t) => (t.name || t.fullName) === trainerName) || allTrainers[0];
  }, [allTrainers, trainerName]);

  const isPersonalTrainer = selectedTrainerObj && (selectedTrainerObj.name || selectedTrainerObj.fullName) !== 'General Floor Trainer (Included)';

  // Compute live trainer slot booking counts & member names from existingMembers
  const trainerSlotOccupancy = useMemo(() => {
    if (!selectedTrainerObj || !isPersonalTrainer) return {};
    const tName = selectedTrainerObj.name || selectedTrainerObj.fullName;
    const tId = selectedTrainerObj.id;

    // Filter active members assigned to this trainer (excluding this current member being edited)
    const assigned = (existingMembers || []).filter((m) => {
      if (m.id === member.id) return false;
      const match = m.trainerId === tId || m.trainerName === tName;
      return match && m.status !== 'left' && m.active !== false;
    });

    const map = {};
    assigned.forEach((m) => {
      const rawSlot = (m.ptSlot || m.slot || m.workoutSlot || m.preferredTime || '').trim();
      if (!rawSlot) return;
      if (!map[rawSlot]) map[rawSlot] = [];
      map[rawSlot].push(m.name || m.fullName || 'Member');
    });
    return map;
  }, [selectedTrainerObj, isPersonalTrainer, existingMembers, member.id]);

  const [ptPlanId, setPtPlanId] = useState(member.ptPlanId || '');
  const [ptPlanName, setPtPlanName] = useState(member.ptPlanName || '');
  const [ptPlanPrice, setPtPlanPrice] = useState(Number(member.ptPlanPrice || 0));
  const [ptDuration, setPtDuration] = useState(member.ptDuration || '');

  // --- Tab 3: Physical Assessment & Health ---
  const [weight, setWeight] = useState(member.weight ? String(member.weight) : '');
  const [heightFeet, setHeightFeet] = useState(member.heightFeet || '5');
  const [heightInches, setHeightInches] = useState(member.heightInches || '8');
  const [fitnessGoal, setFitnessGoal] = useState(member.fitnessGoal || EDIT_FITNESS_GOALS[0]);
  const [targetWeight, setTargetWeight] = useState(member.targetWeight ? String(member.targetWeight) : '');
  const [targetTimeline, setTargetTimeline] = useState(member.targetTimeline || '90 Days');
  const [healthNotes, setHealthNotes] = useState(member.healthNotes || member.medicalHistory || '');
  const [medicalNotes, setMedicalNotes] = useState(member.medicalNotes || '');

  // Dynamic BMI Calculation
  const bmiInfo = useMemo(() => {
    const w = parseFloat(weight);
    const ft = parseFloat(heightFeet);
    const inch = parseFloat(heightInches || 0);
    if (!w || !ft || w <= 0 || ft <= 0) return null;

    const totalInches = ft * 12 + inch;
    const hM = totalInches * 0.0254;
    const val = parseFloat((w / (hM * hM)).toFixed(1));
    let category = 'Normal';
    let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let tip = 'Healthy range for overall fitness and performance';

    if (val < 18.5) {
      category = 'Underweight';
      color = 'text-blue-700 bg-blue-50 border-blue-200';
      tip = 'Higher protein intake & progressive overload recommended';
    } else if (val <= 24.9) {
      category = 'Normal Weight (Healthy)';
      color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      tip = 'Prime condition for lean muscle growth & strength conditioning';
    } else if (val <= 29.9) {
      category = 'Overweight';
      color = 'text-amber-700 bg-amber-50 border-amber-200';
      tip = 'Caloric deficit & structured cardio/resistance split advised';
    } else {
      category = 'Obese';
      color = 'text-rose-700 bg-rose-50 border-rose-200';
      tip = 'Customized cardio, joint-friendly lifting & nutrition advised';
    }

    return { val, category, color, tip };
  }, [weight, heightFeet, heightInches]);

  const [loading, setLoading] = useState(false);

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name.trim()) {
      toast.error('Member full name is required');
      setActiveTab('personal');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required');
      setActiveTab('personal');
      return;
    }

    setLoading(true);

    const basePrice = Number(customPlanPrice) >= 0 ? Number(customPlanPrice) : Number(selectedPlan?.price || 0);
    const ptPriceNum = Number(ptPlanPrice || 0);

    // Calculate Gym Owner Commission and Trainer Payout on PT
    let ptOwnerCommission = member.ptOwnerCommission || 0;
    let ptTrainerPayout = member.ptTrainerPayout || 0;
    let commissionType = selectedTrainerObj?.commissionType || member.ptCommissionType || 'percentage';
    let commissionValue = selectedTrainerObj?.commissionValue !== undefined
      ? Number(selectedTrainerObj.commissionValue)
      : (member.ptCommissionValue !== undefined ? Number(member.ptCommissionValue) : 30);

    if (ptPriceNum > 0 && isPersonalTrainer) {
      if (commissionType === 'fixed') {
        ptOwnerCommission = Math.min(ptPriceNum, commissionValue);
        ptTrainerPayout = Math.max(0, ptPriceNum - ptOwnerCommission);
      } else {
        ptOwnerCommission = Math.round(ptPriceNum * (commissionValue / 100));
        ptTrainerPayout = Math.max(0, ptPriceNum - ptOwnerCommission);
      }
    } else if (!isPersonalTrainer) {
      ptOwnerCommission = 0;
      ptTrainerPayout = 0;
    }

    const payload = {
      name: name.trim(),
      fullName: name.trim(),
      phone: phone.trim(),
      altPhone: altPhone.trim(),
      email: email.trim(),
      aadhaar: aadharNumber.trim(),
      aadharNumber: aadharNumber.trim(),
      gender,
      dob,
      address: address.trim(),
      photoURL,
      // Membership & Slot
      slot,
      workoutSlot: slot,
      preferredTime: slot,
      planId: selectedPlan?.id || member.planId || '',
      planName: selectedPlan?.name || member.planName || 'Standard Plan',
      planPrice: basePrice,
      durationMonths: selectedPlan ? Number(selectedPlan.durationMonths || selectedPlan.duration || 1) : (member.durationMonths || 1),
      joiningDate,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : (member.expiryDate || null),
      // Trainer & PT Addon
      trainerName: selectedTrainerObj ? (selectedTrainerObj.name || selectedTrainerObj.fullName) : trainerName,
      trainerId: selectedTrainerObj?.id || '',
      hasPersonalCoach: isPersonalTrainer,
      isPt: isPersonalTrainer,
      ptStatus: isPersonalTrainer ? 'active' : (member.ptStatus || ''),
      ptStartDate: isPersonalTrainer ? (member.ptStartDate || new Date().toISOString().split('T')[0]) : null,
      ptPlanId: isPersonalTrainer ? (ptPlanId || '') : '',
      ptPlanName: isPersonalTrainer ? (ptPlanName || '') : '',
      ptPlanPrice: isPersonalTrainer ? ptPriceNum : 0,
      ptDuration: isPersonalTrainer ? (ptDuration || '') : '',
      ptCommissionType: commissionType,
      ptCommissionValue: commissionValue,
      ptOwnerCommission,
      ptTrainerPayout,
      // Physical Assessment & Health
      weight: weight ? String(weight) : '',
      height: heightFeet ? `${heightFeet} ft ${heightInches || 0} in` : '',
      heightFeet: heightFeet || '',
      heightInches: heightInches || '',
      bmi: bmiInfo ? String(bmiInfo.val) : (member.bmi || ''),
      bmiCategory: bmiInfo ? bmiInfo.category : (member.bmiCategory || ''),
      fitnessGoal,
      targetWeight: targetWeight ? String(targetWeight) : '',
      targetTimeline,
      healthNotes: healthNotes.trim(),
      medicalNotes: medicalNotes.trim()
    };

    try {
      await updateMember(member.id, payload);
      toast.success('Member details updated successfully!');
      if (onSave) onSave(member.id, payload);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error updating member:', err);
      toast.error('Failed to update member: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="✏️ Edit Full Member Profile"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition ${
              activeTab === 'personal'
                ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>1. Personal & Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('membership')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition ${
              activeTab === 'membership'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>2. Plan & Coach</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assessment')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition ${
              activeTab === 'assessment'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Assessment & Goals</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TAB 1: PERSONAL & PHOTO */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              {/* Photo Input (Camera & Upload) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <PhotoCaptureInput
                  value={photoURL}
                  onChange={(img) => setPhotoURL(img)}
                  label="Member Profile Photo"
                  subLabel="Take live webcam photo or upload picture from device"
                  shape="circle"
                />
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Phone (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Alt Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alternative Phone Number</label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Emergency / Alternate phone"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Aadhaar, Gender & DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar Card No.</label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="XXXX-XXXX-XXXX"
                    value={aadharNumber}
                    onChange={(e) => handleAadhaarChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / Street, Locality, City"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERSHIP, SCHEDULE & TRAINER */}
          {activeTab === 'membership' && (
            <div className="space-y-4">
              {/* Workout Slot Selection with Live Trainer Availability */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Preferred Workout Slot
                  </label>
                  {isPersonalTrainer && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                      Coach Schedule: {selectedTrainerObj.name} ({selectedTrainerObj?.allowedShifts ? `${selectedTrainerObj.allowedShifts.length} Shifts Active` : `Max ${selectedTrainerObj?.maxPtPerSlot || 2} PT/Shift`})
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeSlots.map((s) => {
                    const fullText = s.time ? `${s.label} (${s.time})` : s.label;
                    const isSelected = slot === fullText || slot === s.label;

                    const slotKey = (() => {
                      const raw = `${s.id || ''} ${s.label || ''}`.toLowerCase();
                      if (raw.includes("morning")) return "morning";
                      if (raw.includes("afternoon")) return "afternoon";
                      if (raw.includes("evening")) return "evening";
                      if (raw.includes("night")) return "night";
                      return s.id || s.label;
                    })();

                    const isShiftAllowed = !isPersonalTrainer || !Array.isArray(selectedTrainerObj?.allowedShifts) || selectedTrainerObj.allowedShifts.length === 0 || selectedTrainerObj.allowedShifts.includes(slotKey);
                    const maxSlotLimit = isPersonalTrainer
                      ? Number(selectedTrainerObj?.shiftPtLimits?.[slotKey] ?? selectedTrainerObj?.maxPtPerSlot ?? 2)
                      : 999;

                    const bookedAthletes = isPersonalTrainer
                      ? (trainerSlotOccupancy[fullText] || trainerSlotOccupancy[s.label] || trainerSlotOccupancy[s.time] || [])
                      : [];
                    const bookedCount = bookedAthletes.length;
                    const isFull = isShiftAllowed && bookedCount >= maxSlotLimit;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (isPersonalTrainer && !isShiftAllowed) {
                            toast.error(`Coach ${selectedTrainerObj?.name || 'Trainer'} is not available during ${s.label} shift.`);
                            return;
                          }
                          setSlot(fullText);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition text-xs font-semibold flex flex-col justify-between cursor-pointer ${
                          !isShiftAllowed && isPersonalTrainer
                            ? 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold">{s.label}</p>
                            {isPersonalTrainer && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wide shrink-0 ${
                                  !isShiftAllowed
                                    ? 'bg-slate-200 text-slate-600 border border-slate-300'
                                    : bookedCount === 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : !isFull
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300 animate-pulse'
                                }`}
                              >
                                {!isShiftAllowed
                                  ? '⚪ Shift Off'
                                  : bookedCount === 0
                                  ? `🟢 Free (0/${maxSlotLimit})`
                                  : !isFull
                                  ? `🟡 ${bookedCount}/${maxSlotLimit}`
                                  : `🔴 ${bookedCount}/${maxSlotLimit} Full`}
                              </span>
                            )}
                          </div>
                          {s.time && <p className="text-[10px] text-slate-500 mt-0.5">{s.time}</p>}
                        </div>

                        {isPersonalTrainer && bookedCount > 0 && isShiftAllowed && (
                          <div className="mt-1.5 pt-1 border-t border-slate-100 text-[9.5px] text-slate-600 truncate">
                            🏋️ {bookedAthletes.join(', ')}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Overbooking Alert Warning in EditMemberModal */}
                {(() => {
                  if (!isPersonalTrainer || !selectedTrainerObj) return null;
                  const currentSlotKey = (() => {
                    const raw = (slot || '').toLowerCase();
                    if (raw.includes("morning")) return "morning";
                    if (raw.includes("afternoon")) return "afternoon";
                    if (raw.includes("evening")) return "evening";
                    if (raw.includes("night")) return "night";
                    return slot;
                  })();

                  const isCurShiftAllowed = !Array.isArray(selectedTrainerObj.allowedShifts) || selectedTrainerObj.allowedShifts.length === 0 || selectedTrainerObj.allowedShifts.includes(currentSlotKey);
                  const maxSlotLimit = Number(selectedTrainerObj?.shiftPtLimits?.[currentSlotKey] ?? selectedTrainerObj?.maxPtPerSlot ?? 2);
                  const curBooked = trainerSlotOccupancy[slot] || [];

                  if (!isCurShiftAllowed) {
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2 text-amber-950 animate-in fade-in duration-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-tight">
                          <strong className="font-extrabold text-amber-900">Shift Not Assigned: </strong>
                          Coach <strong>{selectedTrainerObj.name}</strong> does not take PT sessions during this shift (<strong>{slot}</strong>). Please select one of the coach's active shifts: <strong>{(selectedTrainerObj.allowedShifts || []).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}</strong>.
                        </div>
                      </div>
                    );
                  }

                  if (curBooked.length >= maxSlotLimit) {
                    return (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900 animate-in fade-in duration-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-tight">
                          <strong className="font-extrabold text-rose-800">Trainer Shift Capacity Full ({curBooked.length}/{maxSlotLimit})! </strong>
                          Coach <strong>{selectedTrainerObj.name}</strong> ke paas is shift (<strong>{slot}</strong>) mein pehle se <strong>{curBooked.length} athletes</strong> booked hain ({curBooked.join(', ')}). Maximum capacity {maxSlotLimit} PT for this shift hai.
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Membership Plan Selection */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    Base Gym Membership Plan
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600">
                    Duration: {selectedPlan?.durationMonths || selectedPlan?.duration || 1} Month(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availablePlans.map((p) => {
                    const isSelected = planId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPlanId(p.id);
                          setCustomPlanPrice(String(p.price || 0));
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-indigo-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-extrabold">{p.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{p.durationMonths || p.duration || 1} Month(s)</p>
                        </div>
                        <span className="text-xs font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                          ₹{Number(p.price || 0).toLocaleString('en-IN')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Plan Fee (₹)</label>
                    <input
                      type="number"
                      value={customPlanPrice}
                      onChange={(e) => setCustomPlanPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600">Expiry Date</label>
                      <button
                        type="button"
                        onClick={handleRecalculateExpiry}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                        title="Recalculate expiry date using selected plan duration"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Auto
                      </button>
                    </div>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Coach / Trainer Selection & PT Add-on */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-purple-600" />
                    Assigned Trainer / Coach
                  </label>
                  <select
                    value={trainerName}
                    onChange={(e) => {
                      const tName = e.target.value;
                      setTrainerName(tName);
                      if (tName === 'General Floor Trainer (Included)') {
                        setPtPlanId('');
                        setPtPlanName('');
                        setPtPlanPrice(0);
                        setPtDuration('');
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                  >
                    {allTrainers.map((t) => (
                      <option key={t.id} value={t.name || t.fullName}>
                        {t.name || t.fullName} {t.specialization ? `(${t.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If Personal Trainer is Selected: PT Addon Packages & Commission */}
                {isPersonalTrainer && (
                  <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Personal Training (PT) Package Add-on:
                      </span>
                      {ptPlanId && (
                        <button
                          type="button"
                          onClick={() => {
                            setPtPlanId('');
                            setPtPlanName('');
                            setPtPlanPrice(0);
                            setPtDuration('');
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
                        >
                          Remove PT Add-on
                        </button>
                      )}
                    </div>

                    {selectedTrainerObj.ptPlans && selectedTrainerObj.ptPlans.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedTrainerObj.ptPlans.map((pkg, pidx) => {
                          const pPrice = Number(pkg.price || 0);
                          const isSelected = ptPlanId === (pkg.id || `pt_${pidx}`) || ptPlanName === pkg.name;
                          return (
                            <div
                              key={pkg.id || pidx}
                              onClick={() => {
                                if (isSelected) {
                                  setPtPlanId('');
                                  setPtPlanName('');
                                  setPtPlanPrice(0);
                                  setPtDuration('');
                                } else {
                                  setPtPlanId(pkg.id || `pt_${pidx}`);
                                  setPtPlanName(pkg.name);
                                  setPtPlanPrice(pPrice);
                                  setPtDuration(pkg.duration || '');
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-purple-100 border-purple-600 ring-2 ring-purple-400/20'
                                  : 'bg-white border-purple-200 hover:border-purple-300'
                              }`}
                            >
                              <div>
                                <p className="text-xs font-bold text-purple-950">{pkg.name}</p>
                                <p className="text-[10px] text-purple-600">{pkg.duration || 'Custom PT'}</p>
                              </div>
                              <span className="text-xs font-black text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                                +₹{pPrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-purple-800 mb-0.5">PT Package Name</label>
                          <input
                            type="text"
                            placeholder="e.g. 1-on-1 PT Monthly"
                            value={ptPlanName}
                            onChange={(e) => setPtPlanName(e.target.value)}
                            className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs text-purple-950 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-purple-800 mb-0.5">PT Fee (₹)</label>
                          <input
                            type="number"
                            placeholder="e.g. 3000"
                            value={ptPlanPrice || ''}
                            onChange={(e) => setPtPlanPrice(Number(e.target.value) || 0)}
                            className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-purple-950 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Deal Breakdown Preview */}
                    {ptPlanPrice > 0 && (
                      <div className="pt-1 text-[11px] text-purple-800 flex items-center justify-between font-semibold border-t border-purple-200/80">
                        <span>Total PT Add-on: +₹{Number(ptPlanPrice).toLocaleString('en-IN')}</span>
                        <span>
                          Trainer Deal:{' '}
                          {selectedTrainerObj.commissionType === 'fixed'
                            ? `Owner Commission ₹${selectedTrainerObj.commissionValue || 0}`
                            : `Owner Commission ${selectedTrainerObj.commissionValue ?? 30}%`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PHYSICAL ASSESSMENT & HEALTH */}
          {activeTab === 'assessment' && (
            <div className="space-y-4">
              {/* Weight & Height with Live BMI */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Body Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 72"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Height (ft & in)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          min="3"
                          max="8"
                          placeholder="5"
                          value={heightFeet}
                          onChange={(e) => setHeightFeet(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ft</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="11"
                          placeholder="8"
                          value={heightInches}
                          onChange={(e) => setHeightInches(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">in</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time BMI Display Card */}
                {bmiInfo ? (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${bmiInfo.color}`}>
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-xs font-black">
                          BMI: {bmiInfo.val} — <span className="font-bold">{bmiInfo.category}</span>
                        </p>
                        <p className="text-[10px] opacity-90 mt-0.5">{bmiInfo.tip}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Enter weight and height to view automatic BMI calculation.</p>
                )}
              </div>

              {/* Fitness Goal, Target Weight & Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Fitness Goal</label>
                  <select
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    {EDIT_FITNESS_GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 68"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Goal Timeline</label>
                  <select
                    value={targetTimeline}
                    onChange={(e) => setTargetTimeline(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    {EDIT_GOAL_TIMELINES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Health Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">General Health Notes</label>
                <textarea
                  rows={2}
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  placeholder="Dietary habits, routine or general fitness notes..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Medical History & Precautionary Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Medical Notes / Past Injuries / Precautionary Conditions
                </label>
                <textarea
                  rows={2}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Past surgeries, back pain, blood pressure, asthma, knee injuries, etc."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab === 'membership' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                >
                  ← Personal
                </button>
              )}
              {activeTab === 'personal' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('membership')}
                  className="py-2 px-3 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition"
                >
                  Plan & Coach →
                </button>
              )}
              {activeTab === 'membership' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('assessment')}
                  className="py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition"
                >
                  Assessment →
                </button>
              )}
              {activeTab === 'assessment' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('membership')}
                  className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                >
                  ← Plan & Coach
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving Changes...' : 'Save All Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
