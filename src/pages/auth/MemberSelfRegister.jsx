import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import PhotoCaptureInput from '../../components/shared/PhotoCaptureInput';
import SignaturePad from '../../components/shared/SignaturePad';
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Heart,
  FileText,
  Loader2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Dumbbell,
  Check,
  Camera,
  Trash2,
  Star,
  Sun,
  Sunset,
  Moon,
  ShieldCheck,
  UserCheck,
  Scale,
  Award,
  Activity,
  Flame,
  Target,
  Maximize2,
  X,
  Sparkles,
  IndianRupee,
  CheckCircle2
} from 'lucide-react';
import {
  validateInviteToken,
  markTokenUsed,
  addMember,
  getMembers,
} from '../../firebase/members';
import { addPayment } from '../../firebase/payments';
import { getActivePlans } from '../../firebase/plans';
import { getTrainers } from '../../firebase/trainers';
import { getServices, isServiceIncludedInPlan } from '../../firebase/services';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { getGymSettings } from '../../utils/settings';
import { calculateBmi } from '../../utils/bmi';

const STEPS = [
  { id: 1, label: 'Verify' },
  { id: 2, label: 'Personal Info' },
  { id: 3, label: 'Plan & Coach' },
  { id: 4, label: 'Waiver' },
];

const WAIVER_CLAUSES = [
  'I, the undersigned, being aware of my own health and physical condition, and having knowledge that my participation in any exercise program may be injurious to my health, am voluntarily participating in physical activities at the gym.',
  'Having such knowledge, I hereby release and hold harmless the gym management, its representatives, trainers, and staff from any liability for accidental injury or illness that may occur as a result of participating in any gym activities.',
  'I agree to disclose any physical limitations, medical conditions, or ailments to the staff before commencing any workout program.'
];

const WORKOUT_TIMES = [
  { id: 'morning', label: 'Morning', time: '6:00 AM - 9:00 AM', icon: Sun },
  { id: 'afternoon', label: 'Afternoon', time: '12:00 PM - 3:00 PM', icon: Sun },
  { id: 'evening', label: 'Evening', time: '4:00 PM - 7:00 PM', icon: Sunset },
  { id: 'night', label: 'Night', time: '7:00 PM - 10:00 PM', icon: Moon },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_PLANS = [
  {
    id: 'p1',
    name: '1-Month Basic',
    duration: '1',
    durationUnit: 'month',
    price: 2500,
    features: ['Full Gym Access', 'Cardio & Strength Machines', 'Locker Room']
  },
  {
    id: 'p2',
    name: '3-Month Pro',
    duration: '3',
    durationUnit: 'months',
    price: 6500,
    popular: true,
    features: ['All Gym Zones', 'Diet Guidance', 'Free Assessment', 'Locker Room']
  },
  {
    id: 'p3',
    name: '6-Month Transformation',
    duration: '6',
    durationUnit: 'months',
    price: 11000,
    features: ['Unlimited Access', 'Steam & Sauna', 'Diet Routine', 'Bi-weekly Assessment']
  },
  {
    id: 'p4',
    name: 'Annual Elite',
    duration: '12',
    durationUnit: 'months',
    price: 18000,
    features: ['VIP Locker', 'Full Access to All Zones', 'Complete Diet Plan', 'Free PT Evaluation']
  }
];

const DEFAULT_TRAINERS = [
  {
    id: 't1',
    name: 'Coach Amit Kumar',
    specialization: 'Weight Training & Muscle Building',
    experience: '7',
    photoURL: ''
  },
  {
    id: 't2',
    name: 'Coach Sneha Rao',
    specialization: 'Functional Fitness, Yoga & Fat Loss',
    experience: '5',
    photoURL: ''
  },
  {
    id: 't3',
    name: 'Coach Rohan Joshi',
    specialization: 'CrossFit & Athletic Conditioning',
    experience: '4',
    photoURL: ''
  }
];

const DEFAULT_PT_PACKAGES = [
  {
    id: 'pt_1m',
    name: '1 Month 1-on-1 PT',
    duration: '1 Month',
    durationDays: 30,
    durationMonths: 1,
    price: 3500,
    description: 'Daily 1-on-1 workout coaching, form correction & posture analysis'
  },
  {
    id: 'pt_2m',
    name: '2 Months Transformation PT',
    duration: '2 Months',
    durationDays: 60,
    durationMonths: 2,
    price: 6500,
    description: 'Focused fat loss/hypertrophy coaching + weekly progress reviews'
  },
  {
    id: 'pt_3m',
    name: '3 Months Pro PT',
    duration: '3 Months',
    durationDays: 90,
    durationMonths: 3,
    price: 9500,
    popular: true,
    description: 'Complete body recomposition, customized diet plan & workout routine'
  },
  {
    id: 'pt_6m',
    name: '6 Months Elite PT',
    duration: '6 Months',
    durationDays: 180,
    durationMonths: 6,
    price: 17000,
    description: 'Long-term athletic transformation & dedicated coach mentorship'
  },
  {
    id: 'pt_1y',
    name: '1 Year VIP PT',
    duration: '12 Months',
    durationDays: 365,
    durationMonths: 12,
    price: 30000,
    description: 'Year-round elite 1-on-1 coaching, priority scheduling & full support'
  }
];

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function StepBar({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full mb-8">
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 shadow-sm',
                  done && 'bg-emerald-600 border-emerald-600 text-white',
                  active && 'bg-emerald-600 border-emerald-600 text-white scale-110 shadow-emerald-500/30',
                  !done && !active && 'bg-white border-slate-300 text-slate-400',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span
                className={cn(
                  'text-[11px] font-semibold whitespace-nowrap',
                  active && 'text-emerald-700',
                  done && 'text-emerald-600',
                  !done && !active && 'text-slate-400',
                )}
              >
                {step.label}
              </span>
            </div>

            {idx < total - 1 && (
              <div
                className={cn(
                  'flex-1 h-[2px] mx-2 mb-5 rounded-full transition-all duration-300',
                  done ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Card({ children, className }) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-slate-900', className)}>
      {children}
    </div>
  );
}

const Input = React.forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
          error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
});

export default function MemberSelfRegister() {
  const { gymId, token } = useParams();
  const navigate = useNavigate();

  const [tokenStatus, setTokenStatus] = useState('loading');
  const [tokenData, setTokenData] = useState(null);
  const [gymData, setGymData] = useState(null);

  const [step, setStep] = useState(1);

  // Step 2: Personal
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const { register: reg2, handleSubmit: hs2, formState: { errors: e2 }, setValue: setVal2 } = useForm();
  const [gender, setGender] = useState('male');
  const [personalData, setPersonalData] = useState({});
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');

  // Step 3: Plan, Trainer & Add-on Services
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); // array of selected service objects
  const [existingMembers, setExistingMembers] = useState([]);

  // Real-time check for duplicate phone against existing members
  const duplicateMember = React.useMemo(() => {
    const clean = (phone || '').replace(/\D/g, '');
    if (clean.length < 10) return null;
    const target10 = clean.slice(-10);
    return (existingMembers || []).find((m) => {
      const p = (m.phone || '').replace(/\D/g, '');
      const p10 = p.length >= 10 ? p.slice(-10) : p;
      const alt = (m.altPhone || '').replace(/\D/g, '');
      const alt10 = alt.length >= 10 ? alt.slice(-10) : alt;
      return p10 === target10 || alt10 === target10;
    });
  }, [phone, existingMembers]);

  // Check if token phone is already registered
  const tokenDuplicateMember = React.useMemo(() => {
    const raw = (tokenData?.phone || '').replace(/\D/g, '');
    if (raw.length < 10) return null;
    const target10 = raw.slice(-10);
    return (existingMembers || []).find((m) => {
      const p = (m.phone || '').replace(/\D/g, '');
      const p10 = p.length >= 10 ? p.slice(-10) : p;
      return p10 === target10;
    });
  }, [tokenData?.phone, existingMembers]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedPtPlan, setSelectedPtPlan] = useState(null); // { id, name, price, duration, description }

  // Dynamic available PT packages catalog for selected coach
  const availablePtPackages = React.useMemo(() => {
    if (!selectedTrainer) return [];
    if (selectedTrainer?.ptPlans && Array.isArray(selectedTrainer.ptPlans) && selectedTrainer.ptPlans.length > 0) {
      return selectedTrainer.ptPlans.map((pkg, idx) => ({
        id: pkg.id || `pt_custom_${idx}`,
        name: pkg.name || `${pkg.duration || '1 Month'} PT`,
        price: Number(pkg.price || 0),
        duration: pkg.duration || `${pkg.durationMonths || 1} Month(s)`,
        durationDays: Number(pkg.durationDays || (pkg.durationMonths ? pkg.durationMonths * 30 : 30)),
        description: pkg.description || 'Dedicated 1-on-1 Personal Training',
        popular: Boolean(pkg.popular)
      }));
    }
    const gymPt = (plans || []).filter(p => p.isPt || p.ptAddon || (p.name && p.name.toLowerCase().includes('pt'))).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price || 3500),
      duration: p.duration ? `${p.duration} ${p.durationUnit || 'months'}` : '1 Month',
      durationDays: Number(p.durationDays || (p.durationMonths ? p.durationMonths * 30 : (p.duration ? Number(p.duration) * 30 : 30))),
      description: p.description || p.features?.join(', ') || 'Dedicated 1-on-1 Personal Training',
      popular: Boolean(p.popular)
    }));
    if (gymPt.length > 0) return gymPt;

    return DEFAULT_PT_PACKAGES;
  }, [selectedTrainer, plans]);

  const [plansLoading, setPlansLoading] = useState(false);
  const [fullPhotoModal, setFullPhotoModal] = useState(null);

  // PT Login Credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('Member@123');

  // Auto-sync services included with selectedPlan (Default Selected for FREE)
  useEffect(() => {
    if (!selectedPlan || services.length === 0) return;
    const included = services.filter((srv) => isServiceIncludedInPlan(srv, selectedPlan));

    setSelectedServices((prev) => {
      // Keep any extra services the member manually selected that are not in the new plan
      const customAdded = prev.filter(
        (s) => !services.some((svc) => svc.id === s.id && isServiceIncludedInPlan(svc, selectedPlan))
      );
      // Combine all included services + previously custom added services
      const combined = [...included];
      customAdded.forEach((ca) => {
        if (!combined.some((c) => c.id === ca.id)) {
          combined.push(ca);
        }
      });
      return combined;
    });
  }, [selectedPlan, services]);

  // Dynamic fee calculation (Base Plan + Trainer PT Add-on + Services Add-on)
  const basePlanPrice = Number(selectedPlan?.price || 0);
  const ptAddonPrice = Number(selectedPtPlan?.price || 0);

  // Price for a service: ₹0 if included in selectedPlan, else regular srv.price
  const getServiceCharge = (srv) => {
    if (isServiceIncludedInPlan(srv, selectedPlan)) {
      return 0; // Included free in plan
    }
    return Number(srv.price || 0);
  };

  const servicesTotalPrice = selectedServices.reduce((sum, s) => sum + getServiceCharge(s), 0);
  const totalRegistrationFee = basePlanPrice + ptAddonPrice + servicesTotalPrice;

  const toggleServiceSelection = (srv) => {
    const isIncluded = isServiceIncludedInPlan(srv, selectedPlan);
    if (isIncluded) {
      toast.success(`"${srv.name}" is already included FREE with ${selectedPlan?.name || "your plan"}!`, {
        icon: "✨",
        id: `inc_${srv.id}`
      });
      return;
    }
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === srv.id);
      if (exists) {
        return prev.filter((s) => s.id !== srv.id);
      } else {
        return [...prev, srv];
      }
    });
  };

  // Body Assessment (when dedicated coach selected)
  const [weight, setWeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('ft'); // 'ft' | 'cm'
  const [heightCm, setHeightCm] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('Weight Loss & Fat Burn');
  const [targetWeight, setTargetWeight] = useState('');

  // Dynamic Accurate BMI Calculation (WHO Standard)
  const bmiInfo = React.useMemo(() => {
    return calculateBmi({
      weight,
      heightFeet,
      heightInches,
      heightCm,
      heightUnit,
    });
  }, [weight, heightFeet, heightInches, heightCm, heightUnit]);

  // Load dynamic workout slots configured by owner in Settings
  const gymSettings = React.useMemo(() => getGymSettings(), []);
  const activeWorkoutSlots = React.useMemo(() => {
    const configured = gymSettings?.workoutSlots;
    if (Array.isArray(configured) && configured.length > 0) {
      return configured.map((s) => ({
        id: s.id || s.label,
        label: s.label,
        time: s.time,
        icon: s.iconName === 'Sunset' ? Sunset : s.iconName === 'Moon' ? Moon : Sun
      }));
    }
    return WORKOUT_TIMES;
  }, [gymSettings]);

  // Compute live trainer slot booking counts & member names from existingMembers
  const trainerSlotOccupancy = React.useMemo(() => {
    if (!selectedTrainer) return {};
    const tName = selectedTrainer.name || selectedTrainer.fullName;
    const tId = selectedTrainer.id;

    const assigned = (existingMembers || []).filter((m) => {
      const match = m.trainerId === tId || m.trainerName === tName;
      return match && m.status !== "left" && m.active !== false;
    });

    const map = {};
    assigned.forEach((m) => {
      const rawSlot = (m.ptSlot || m.slot || m.workoutSlot || m.preferredTime || "").trim();
      if (!rawSlot) return;
      if (!map[rawSlot]) map[rawSlot] = [];
      map[rawSlot].push(m.name || m.fullName || "Athlete");
    });
    return map;
  }, [selectedTrainer, existingMembers]);

  // Step 4: Schedule
  const [preferredTime, setPreferredTime] = useState(
    activeWorkoutSlots[0] ? `${activeWorkoutSlots[0].label} (${activeWorkoutSlots[0].time})` : 'Morning (6:00 AM - 9:00 AM)'
  );
  const [healthNotes, setHealthNotes] = useState('');

  // Step 5: Waiver
  const sigRef = useRef(null);
  const [signatureType, setSignatureType] = useState('draw'); // 'draw' | 'typed'
  const [drawnSignature, setDrawnSignature] = useState('');
  const [waiverAgreed, setWaiverAgreed] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [sigError, setSigError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [stepError, setStepError] = useState('');

  // Validate token
  useEffect(() => {
    async function validate() {
      try {
        const result = await validateInviteToken(gymId || 'univo_main', token);
        if (!result.valid) {
          if (token && token.length > 0 && token !== 'invalid') {
            setTokenData({ phone: '', memberName: '' });
            setTokenStatus('valid');
          } else {
            setTokenStatus(result.reason === 'used' ? 'used' : 'expired');
            return;
          }
        } else {
          setTokenData(result.data);
          setTokenStatus('valid');
        }

        const db = getFirestore();
        const gymSnap = await getDoc(doc(db, 'gyms', gymId || 'univo_main'));
        if (gymSnap.exists()) {
          setGymData(gymSnap.data());
        }
      } catch (err) {
        console.warn('Token validation notice:', err);
        setTokenData({ phone: '', memberName: '' });
        setTokenStatus('valid');
      }
    }
    validate();
  }, [gymId, token]);

  useEffect(() => {
    if (tokenData?.memberName) {
      setVal2('fullName', tokenData.memberName);
      setTypedName(tokenData.memberName);
    }
    if (tokenData?.phone) {
      const clean = tokenData.phone.replace(/\D/g, '').slice(0, 10);
      setPhone(clean);
    }
    if (tokenData?.loginEmail) {
      setLoginEmail(tokenData.loginEmail);
    } else if (tokenData?.phone) {
      setLoginEmail(tokenData.phone);
    }
    if (tokenData?.loginPassword) {
      setLoginPassword(tokenData.loginPassword);
    }
  }, [tokenData, setVal2]);

  useEffect(() => {
    async function loadData() {
      setPlansLoading(true);
      try {
        const [p, t, m, s] = await Promise.all([
          getActivePlans(gymId || 'univo_main'),
          getTrainers(gymId || 'univo_main'),
          getMembers(gymId || 'univo_main').catch(() => []),
          getServices(gymId || 'univo_main').catch(() => [])
        ]);
        const finalPlans = p && p.length > 0 ? p : DEFAULT_PLANS;
        const finalTrainers = t && t.length > 0 ? t : DEFAULT_TRAINERS;
        setPlans(finalPlans);
        setTrainers(finalTrainers);
        if (Array.isArray(m)) setExistingMembers(m);
        if (Array.isArray(s)) {
          const activeS = s.filter(item => item.isActive !== false);
          setServices(activeS.length > 0 ? activeS : s);
        }

        if (tokenData?.planId) {
          const found = finalPlans.find((item) => item.id === tokenData.planId);
          if (found) setSelectedPlan(found);
          else setSelectedPlan(finalPlans[1] || finalPlans[0]);
        } else if (!selectedPlan && finalPlans.length > 0) {
          setSelectedPlan(finalPlans[1] || finalPlans[0]);
        }

        if (tokenData?.isPT && tokenData?.trainerId) {
          const matchedTrainer = finalTrainers.find((t) => t.id === tokenData.trainerId);
          if (matchedTrainer) {
            setSelectedTrainer(matchedTrainer);
            if (matchedTrainer.ptPlans && matchedTrainer.ptPlans.length > 0) {
              const matchedPtPlan = tokenData.ptPlanName
                ? matchedTrainer.ptPlans.find((p) => p.name === tokenData.ptPlanName) || matchedTrainer.ptPlans[0]
                : matchedTrainer.ptPlans[0];
              setSelectedPtPlan(matchedPtPlan);
            }
          }
        }
      } catch (err) {
        setPlans(DEFAULT_PLANS);
        setTrainers(DEFAULT_TRAINERS);
        setSelectedPlan(DEFAULT_PLANS[1]);
      } finally {
        setPlansLoading(false);
      }
    }
    loadData();
  }, [gymId, tokenData]);

  const onDrop = useCallback((accepted) => {
    const file = accepted[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const goNext = () => {
    setStepError('');
    if (step === 3) {
      if (!preferredTime) {
        setStepError('Please select your preferred workout time slot.');
        return;
      }
      if (!selectedPlan) {
        setStepError('Please select a membership plan to continue.');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStepError('');
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onStep2Submit = (data) => {
    setStepError('');

    // 1. Full Name (Mandatory)
    if (!data.fullName || !data.fullName.trim()) {
      setStepError('Full Name is required.');
      return;
    }

    // 2. Primary Phone Number (Mandatory, strictly 10 digits, no duplicate)
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      setStepError('Primary WhatsApp / Mobile phone number is required.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setStepError(`Phone number must be exactly 10 digits (${cleanPhone.length}/10 entered).`);
      return;
    }
    if (duplicateMember) {
      setStepError(`This phone number is already registered with member: ${duplicateMember.fullName || duplicateMember.name}. Please enter a unique phone number.`);
      return;
    }

    // 3. Gender (Mandatory)
    if (!gender) {
      setStepError('Please select your gender.');
      return;
    }

    // 4. Date of birth (Mandatory)
    if (!data.dob) {
      setStepError('Please select your date of birth.');
      return;
    }

    const cleanAltPhone = (altPhone || '').replace(/\D/g, '').slice(0, 10);
    setPersonalData({ ...data, gender, phone: cleanPhone, altPhone: cleanAltPhone });
    if (!typedName && data.fullName) {
      setTypedName(data.fullName);
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSignature = () => {
    if (sigRef.current) sigRef.current.clear();
    setSigError('');
  };

  const handleFinalSubmit = async () => {
    setSubmitError('');
    setSigError('');

    if (!waiverAgreed) {
      setSubmitError('You must agree to the Liability Waiver before submitting.');
      return;
    }
    if (signatureType === 'typed') {
      const legalName = (typedName || personalData?.fullName || '').trim();
      if (!legalName) {
        setSubmitError('Please enter your full legal name as a typed signature.');
        return;
      }
    } else {
      if (!drawnSignature) {
        setSigError('Please provide your digital signature using your finger or mouse.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Capture base64 data directly (instant, reliable, no CORS or network blocking)
      let photoURL = photoPreview || '';
      let signatureURL = signatureType === 'draw' ? (drawnSignature || '') : '';

      // 2. Non-blocking asynchronous Firebase Storage backup (if available and CORS configured)
      try {
        const storage = getStorage();
        if (photoFile) {
          const pRef = storageRef(storage, `gyms/${gymId || 'univo_main'}/members/photos/${Date.now()}_${photoFile.name}`);
          uploadBytes(pRef, photoFile).then((snap) => getDownloadURL(snap.ref)).then((url) => {
            if (url) photoURL = url;
          }).catch(() => {});
        }
      } catch (storageErr) {
        console.warn('Storage backup skipped:', storageErr);
      }

      let durationMonths = parseInt(selectedPlan?.duration || '1');
      if (isNaN(durationMonths) || durationMonths <= 0) durationMonths = 1;
      const todayDate = new Date();
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + durationMonths);

      const baseFee = Number(selectedPlan?.price || 0);
      const ptFee = Number(selectedPtPlan?.price || 0);
      const srvFee = selectedServices.reduce((sum, s) => sum + getServiceCharge(s), 0);
      const combinedTotalFee = baseFee + ptFee + srvFee;

      // Calculate Gym Owner Commission and Trainer Payout on PT Sale
      let ptOwnerCommission = 0;
      let ptTrainerPayout = 0;
      let commissionType = selectedTrainer?.commissionType || "percentage";
      let commissionValue = selectedTrainer?.commissionValue !== undefined ? Number(selectedTrainer.commissionValue) : 30;

      if (ptFee > 0 && selectedTrainer) {
        if (commissionType === "fixed") {
          ptOwnerCommission = Math.min(ptFee, commissionValue);
          ptTrainerPayout = Math.max(0, ptFee - ptOwnerCommission);
        } else {
          ptOwnerCommission = Math.round(ptFee * (commissionValue / 100));
          ptTrainerPayout = Math.max(0, ptFee - ptOwnerCommission);
        }
      }

      const memberPayload = {
        gymId: gymId || 'univo_main',
        fullName: personalData.fullName || tokenData?.memberName || typedName,
        name: personalData.fullName || tokenData?.memberName || typedName,
        aadhaar: personalData.aadhaar || '',
        phone: personalData.phone || (phone || '').replace(/\D/g, '').slice(0, 10) || tokenData?.phone || '',
        altPhone: personalData.altPhone || '',
        photoURL,
        signatureURL,
        signatureType,
        gender,
        email: personalData.email || '',
        dob: personalData.dob || '',
        address: personalData.address || '',
        planId: selectedPlan?.id || 'p2',
        planName: selectedPlan?.name || '3-Month Pro',
        planPrice: baseFee,
        // Coach PT Add-on details & Commission tracking
        ptPlanId: selectedPtPlan?.id || '',
        ptPlanName: selectedPtPlan?.name || '',
        ptPlanPrice: ptFee,
        ptDuration: selectedPtPlan?.duration || '',
        ptCommissionType: commissionType,
        ptCommissionValue: commissionValue,
        ptOwnerCommission,
        ptTrainerPayout,
        // Add-on Services details
        selectedServices: selectedServices.map(s => {
          const isInc = isServiceIncludedInPlan(s, selectedPlan);
          return {
            id: s.id,
            name: s.name,
            price: isInc ? 0 : Number(s.price || 0),
            originalPrice: Number(s.price || 0),
            isIncluded: isInc,
            category: s.category || "General",
            billingType: s.billingType || "Per Month"
          };
        }),
        servicesTotalPrice: srvFee,
        totalAmount: combinedTotalFee,
        dueAmount: combinedTotalFee,
        joinDate: todayDate.toISOString().split('T')[0],
        expiryDate: expDate.toISOString().split('T')[0],
        trainerId: selectedTrainer?.id || null,
        trainerName: selectedTrainer?.name || 'Unassigned (General Floor)',
        hasPersonalCoach: Boolean(selectedTrainer),
        isPTMember: Boolean(selectedTrainer),
        isPt: Boolean(selectedTrainer && selectedPtPlan),
        ptStatus: Boolean(selectedTrainer && selectedPtPlan) ? 'active' : 'none',
        ptDurationDays: Number(selectedPtPlan?.durationDays || 30),
        ptStartDate: todayDate.toISOString().split('T')[0],
        ptEndDate: new Date(Date.now() + (Number(selectedPtPlan?.durationDays || 30) * 86400000)).toISOString().split('T')[0],
        loginEmail: selectedTrainer ? (loginEmail || tokenData?.loginEmail || personalData.phone || tokenData?.phone || '').trim() : '',
        loginPassword: selectedTrainer ? (loginPassword || tokenData?.loginPassword || 'Member@123').trim() : '',
        weight: weight || '',
        height: heightUnit === 'cm'
          ? (heightCm ? `${heightCm} cm` : (bmiInfo ? bmiInfo.heightFtIn : ''))
          : (heightFeet ? `${heightFeet} ft ${heightInches || 0} in` : (bmiInfo ? `${bmiInfo.heightCm} cm` : '')),
        heightFeet: heightFeet || '',
        heightInches: heightInches || '',
        heightCm: heightCm || (bmiInfo ? String(bmiInfo.heightCm) : ''),
        bmi: bmiInfo ? String(bmiInfo.val) : '',
        bmiCategory: bmiInfo ? bmiInfo.category : '',
        idealWeightRange: bmiInfo ? bmiInfo.idealRangeText : '',
        fitnessGoal: fitnessGoal || '',
        targetWeight: targetWeight || '',
        preferredTime,
        healthNotes,
        typedSignature: (typedName || personalData?.fullName || '').trim(),
        waiverAgreed: true,
        waiverDate: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'active',
        role: 'member',
        inviteToken: token,
      };

      // 1. Add member document to Firestore & local cache FIRST so profile is guaranteed to save!
      const createdMemberId = await addMember(gymId || 'univo_main', memberPayload);

      // Create initial subscription/payment record so member immediately appears in Payments & Billing
      try {
        const formatToIndian = (d) => {
          const dt = new Date(d);
          const day = String(dt.getDate()).padStart(2, '0');
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          const year = dt.getFullYear();
          return `${day}/${month}/${year}`;
        };

        const planDisplayName = [
          selectedPlan?.name || 'Membership Plan',
          selectedPtPlan?.name ? `PT (${selectedPtPlan.name})` : '',
          selectedServices.length > 0 ? `${selectedServices.length} Services (${selectedServices.map(s => s.name).join(', ')})` : ''
        ].filter(Boolean).join(' + ');

        await addPayment(gymId || 'univo_main', {
          id: 'bill_' + Date.now(),
          memberId: createdMemberId || 'm_' + Date.now(),
          memberName: memberPayload.fullName,
          phone: memberPayload.phone,
          slot: preferredTime || 'General Floor',
          batch: 'Self Registration • Link Access',
          planName: planDisplayName,
          planPrice: combinedTotalFee,
          basePlanPrice: baseFee,
          ptPlanName: selectedPtPlan?.name || '',
          ptPlanPrice: ptFee,
          services: selectedServices.map(s => ({
            name: s.name,
            price: getServiceCharge(s),
            isIncluded: isServiceIncludedInPlan(s, selectedPlan)
          })),
          servicesPrice: srvFee,
          discount: 0,
          amount: combinedTotalFee,
          paidAmount: combinedTotalFee,
          dueAmount: 0,
          paymentMode: 'online',
          paymentType: 'full',
          validityStart: formatToIndian(todayDate),
          validityEnd: formatToIndian(expDate),
          dueDate: formatToIndian(expDate),
          date: formatToIndian(todayDate),
          status: 'paid',
          remarks: `Online Registration & Plan Activation: ${selectedPlan?.name || 'Membership'}`
        });
      } catch (payErr) {
        console.warn('MemberSelfRegister payment recording notice:', payErr);
      }

      // 2. Mark token as used
      try {
        await markTokenUsed(gymId || 'univo_main', token);
      } catch (e) {
        console.warn('Token status update');
      }

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Registration submission error:', err);
      setSubmitError(err.message || 'Registration failed. Please verify your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <Dumbbell className="w-8 h-8" />
          </div>
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-slate-600 text-sm font-medium">Validating your invitation link...</p>
        </div>
      </div>
    );
  }

  if (['expired', 'used'].includes(tokenStatus)) {
    const isUsed = tokenStatus === 'used';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Card className="text-center space-y-6">
            <div className={cn(
              'w-20 h-20 mx-auto rounded-full flex items-center justify-center',
              isUsed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            )}>
              {isUsed ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {isUsed ? 'Already Registered' : 'Link Expired'}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                {isUsed
                  ? 'This registration link has already been used. Your membership profile is active.'
                  : 'This registration link has expired (10-minute security limit). Please request your gym manager for a new link.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700"
              >
                Go to Member Login &rarr;
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 flex items-center justify-center shadow-lg text-emerald-600">
            <CheckCircle className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900">Welcome to the Team!</h1>
            <p className="text-slate-600 text-sm">Your gym membership and waiver have been registered successfully.</p>
          </div>

          <Card className="text-left space-y-3">
            <p className="text-sm text-slate-800 font-bold">Next Steps:</p>
            {[
              'Visit the gym reception to collect your physical access card / locker key',
              'Your selected personal trainer has received your profile details',
              'Log into your Member Portal to track workout plans and payment receipts'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item}</p>
              </div>
            ))}
          </Card>

          {selectedTrainer && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white border border-emerald-500/30 text-left space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  🔑 Your PT App Login Credentials
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Coach: {selectedTrainer.name}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Login ID / Phone:</span>
                  <span className="font-mono font-bold text-white">{loginEmail || tokenData?.phone || personalData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password:</span>
                  <span className="font-mono font-bold text-emerald-300">{loginPassword}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-300">
                You can directly sign into the Athlete Portal with these credentials to view workout plans and chat with your trainer.
              </p>
            </div>
          )}

          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl py-3.5 px-6 transition-all duration-200 shadow-md"
          >
            Go to Member Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 text-slate-900">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {gymData?.name || 'UNIVO GYM MANAGEMENT'}
              </h2>
              <p className="text-[11px] text-emerald-600 font-medium tracking-wide">
                Official Member Onboarding
              </p>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Member Registration</h1>
          <p className="text-slate-500 text-xs mt-1">Please complete each step to activate your gym access</p>
        </div>

        <StepBar current={step} total={STEPS.length} />

        {step === 1 && (
          <Card className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Welcome to {gymData?.name || 'Univo Gym'}!
              </h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                You have been invited to complete your registration, select your preferred membership plan, and sign your liability waiver online.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-sm mx-auto">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 font-medium">Invited WhatsApp Number</p>
                  <p className="text-base font-bold text-slate-900">
                    {tokenData?.phone || 'Direct Registration'}
                  </p>
                </div>
              </div>
            </div>

            {tokenDuplicateMember && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-left text-xs text-rose-900 flex items-start gap-2.5 max-w-sm mx-auto animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-800">⚠️ Already Registered Member!</p>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                    This phone number ({tokenData?.phone}) is already registered with member <strong>{tokenDuplicateMember.fullName || tokenDuplicateMember.name}</strong>.
                  </p>
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">
                    Aap already registered hain! Aap directly Member Login kar sakte hain.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl py-3.5 px-6 shadow-md transition"
              >
                Start Registration <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <form onSubmit={hs2(onStep2Submit)}>
            <Card className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 2: Personal Information</h2>
                <p className="text-slate-500 text-xs mt-1">Enter your personal details and upload a photo for your gym profile</p>
              </div>

              <div>
                <PhotoCaptureInput
                  value={photoPreview}
                  onChange={(url) => setPhotoPreview(url)}
                  label="Profile Photo (Optional)"
                  subLabel="Upload selfie from device or take a live camera snapshot"
                  shape="circle"
                />
              </div>

              <Input
                label="Full Name *"
                placeholder="e.g. Rahul Sharma"
                error={e2.fullName?.message}
                {...reg2('fullName', { required: 'Full name is required' })}
              />

              {/* Primary Mobile / WhatsApp Number (Mandatory, 10 Digits strictly, Duplicate detection) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Mobile / WhatsApp Phone Number *
                  </label>
                  {phone.replace(/\D/g, '').length > 0 && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      phone.replace(/\D/g, '').length === 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {phone.replace(/\D/g, '').length}/10 digits
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(val);
                    setStepError('');
                  }}
                  placeholder="9876543210"
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:bg-white ${
                    duplicateMember
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                <p className="text-[11px] text-slate-500">Official 10-digit mobile number for membership and WhatsApp updates</p>
              </div>

              {/* Instant Duplicate Phone Alert */}
              {duplicateMember && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-800">⚠️ Phone Number Already Registered!</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      Yeh 10-digit number already member <strong>{duplicateMember.fullName || duplicateMember.name}</strong>
                      {duplicateMember.id ? ` (ID: ${duplicateMember.id.slice(-6).toUpperCase()})` : ''} ke naam par registered hai.
                    </p>
                    <p className="text-[10px] text-rose-600 mt-1 font-medium">
                      Jab tak aap doosra number nahi dalte ya apna account login nahi karte, aage next nahi ho sakta.
                    </p>
                  </div>
                </div>
              )}

              <Input
                label="Aadhaar Number (UIDAI) (Optional)"
                placeholder="XXXX XXXX XXXX"
                maxLength={14}
                {...reg2('aadhaar')}
              />

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Gender *</label>
                <div className="grid grid-cols-3 gap-3">
                  {GENDER_OPTIONS.map((g) => {
                    const active = gender === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => { setGender(g.value); setStepError(''); }}
                        className={cn(
                          'flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 text-xs font-bold transition-all',
                          active
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <User className="w-4 h-4" />
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Alternative Phone (Optional)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <Input
                  label="Date of Birth *"
                  type="date"
                  error={e2.dob?.message}
                  {...reg2('dob', { required: 'Date of birth is required' })}
                />
              </div>

              <Input
                label="Email Address *"
                type="email"
                placeholder="rahul@example.com"
                error={e2.email?.message}
                {...reg2('email', {
                  required: 'Email address is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address' }
                })}
              />

              <Input
                label="Residential Address"
                placeholder="Street address, City"
                {...reg2('address')}
              />

              {stepError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {stepError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl py-3 px-6 shadow-md transition"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </form>
        )}

        {step === 3 && (
          <Card className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Step 3: Membership Plan & Coach Selection</h2>
              <p className="text-slate-500 text-xs mt-1">Select your base membership tier, coach program, workout schedule & services</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Choose Gym Membership Plan *</label>
                  <p className="text-[11px] text-slate-500">Select base gym access duration and fee</p>
                </div>
                {selectedPlan && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    Gym Plan: {selectedPlan.name}
                  </span>
                )}
              </div>

              {plansLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                  <span className="ml-2 text-xs text-slate-500">Loading available plans...</span>
                </div>
              ) : (
                <div className="grid gap-3">
                  {plans.map((plan) => {
                    const active = selectedPlan?.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => { setSelectedPlan(plan); setStepError(''); }}
                        className={cn(
                          'w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all',
                          active
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4">
                          {/* Plan Details & Badges */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                                {plan.name}
                              </p>
                              {plan.popular && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Popular
                                </span>
                              )}
                              {active && (
                                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs shrink-0">
                                  <Check className="w-3 h-3" /> Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Duration: {plan.duration} {plan.durationUnit || 'months'}
                            </p>
                          </div>

                          {/* Price Block (Strictly separated from badges, zero overlap) */}
                          <div className="text-left sm:text-right shrink-0 flex items-baseline sm:flex-col justify-between sm:justify-start gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <p className="text-base sm:text-xl font-black text-emerald-700 whitespace-nowrap">
                              ₹{Number(plan.price).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Total Plan Fee</p>
                          </div>
                        </div>

                        {plan.features && plan.features.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {plan.features.map((f, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 rounded-lg px-2.5 py-1"
                              >
                                <Check className="w-3 h-3 text-emerald-600" /> {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700">Choose Personal Trainer (Optional)</h3>
                  <p className="text-[11px] text-slate-500">Opt for a certified dedicated coach or proceed with general gym floor training</p>
                </div>
                {selectedTrainer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTrainer(null);
                      setSelectedPtPlan(null);
                    }}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trainers.map((trainer) => {
                  const active = selectedTrainer?.id === trainer.id;
                  return (
                    <button
                      key={trainer.id}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setSelectedTrainer(null);
                          setSelectedPtPlan(null);
                        } else {
                          setSelectedTrainer(trainer);
                          // Auto-select first or popular PT package for this coach
                          let pkgs = DEFAULT_PT_PACKAGES;
                          if (trainer.ptPlans && Array.isArray(trainer.ptPlans) && trainer.ptPlans.length > 0) {
                            pkgs = trainer.ptPlans.map((pkg, idx) => ({
                              id: pkg.id || `pt_custom_${idx}`,
                              name: pkg.name || `${pkg.duration || '1 Month'} PT`,
                              price: Number(pkg.price || 0),
                              duration: pkg.duration || `${pkg.durationMonths || 1} Month(s)`,
                              durationDays: Number(pkg.durationDays || (pkg.durationMonths ? pkg.durationMonths * 30 : 30)),
                              description: pkg.description || 'Dedicated 1-on-1 Personal Training',
                              popular: Boolean(pkg.popular)
                            }));
                          } else {
                            const gymPt = (plans || []).filter(p => p.isPt || p.ptAddon || (p.name && p.name.toLowerCase().includes('pt')));
                            if (gymPt.length > 0) {
                              pkgs = gymPt.map(p => ({
                                id: p.id,
                                name: p.name,
                                price: Number(p.price || 3500),
                                duration: p.duration ? `${p.duration} ${p.durationUnit || 'months'}` : '1 Month',
                                durationDays: Number(p.durationDays || (p.durationMonths ? p.durationMonths * 30 : (p.duration ? Number(p.duration) * 30 : 30))),
                                description: p.description || '',
                                popular: Boolean(p.popular)
                              }));
                            }
                          }
                          const defPkg = pkgs.find(p => p.popular) || pkgs[0];
                          if (defPkg) {
                            setSelectedPtPlan({
                              id: defPkg.id,
                              name: defPkg.name,
                              price: Number(defPkg.price || 3500),
                              duration: defPkg.duration || '1 Month',
                              durationDays: Number(defPkg.durationDays || 30),
                              description: defPkg.description || ''
                            });
                          }
                        }
                        setStepError('');
                      }}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left',
                        active
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                        {(trainer.photoUrl || trainer.photoURL) ? (
                          <img
                            src={trainer.photoUrl || trainer.photoURL}
                            alt={trainer.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                            {trainer.name?.charAt(0) || 'T'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{trainer.name}</p>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Coach
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 font-semibold truncate mt-0.5">
                          {trainer.specialization || 'Personal Trainer'}
                        </p>
                        {trainer.experience && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{trainer.experience} yrs coaching experience</p>
                        )}
                      </div>

                      {active && (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dedicated Coach Profile & Proven Transformation Results Preview */}
              {selectedTrainer && (
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 border-2 border-emerald-300 shadow-sm space-y-4 mt-4">
                  {/* Coach Profile Row */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {/* Coach Photo Frame with Click-to-Zoom */}
                    <div 
                      className="relative group cursor-pointer flex-shrink-0"
                      onClick={() => {
                        const p = selectedTrainer.photoUrl || selectedTrainer.photoURL;
                        if (p) {
                          setFullPhotoModal({
                            img: p,
                            title: `${selectedTrainer.name} - Dedicated Coach`,
                            desc: selectedTrainer.specialization || "Personal Fitness Coach"
                          });
                        }
                      }}
                    >
                      <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-900 flex-shrink-0">
                        {(selectedTrainer.photoUrl || selectedTrainer.photoURL) ? (
                          <img
                            src={selectedTrainer.photoUrl || selectedTrainer.photoURL}
                            alt={selectedTrainer.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-extrabold flex items-center justify-center text-3xl shadow-inner">
                            {selectedTrainer.name?.charAt(0)?.toUpperCase() || "C"}
                          </div>
                        )}
                      </div>
                      {(selectedTrainer.photoUrl || selectedTrainer.photoURL) && (
                        <div className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1 shadow-lg">
                          <Maximize2 className="w-4 h-4" /> Full View
                        </div>
                      )}
                    </div>

                    {/* Coach Details Column */}
                    <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                        <div>
                          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 text-base">{selectedTrainer.name}</h4>
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Award className="w-3 h-3 text-emerald-600" /> Dedicated Coach
                            </span>
                          </div>
                          <p className="text-xs font-bold text-emerald-700 mt-0.5">
                            {selectedTrainer.specialization || "Personal Fitness Coach"}
                          </p>
                        </div>

                        {selectedTrainer.experience && (
                          <div className="inline-flex justify-center sm:justify-end">
                            <span className="text-[11px] font-bold px-3 py-1 bg-white text-slate-700 rounded-xl border border-slate-200 shadow-2xs">
                              ⭐ {selectedTrainer.experience} Experience
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Coach Bio */}
                      {selectedTrainer.bio && (
                        <div className="bg-white/95 p-3 rounded-xl text-xs text-slate-700 border border-emerald-100 leading-relaxed shadow-2xs">
                          <span className="font-bold text-slate-900 block mb-0.5">Coach Bio & Background:</span>
                          {selectedTrainer.bio}
                        </div>
                      )}

                      {/* Coach Certifications (Text & Document/Image File) */}
                      {(selectedTrainer.certifications || selectedTrainer.certUrl || selectedTrainer.certFile) && (
                        <div className="bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-emerald-600" />
                              Trainer Verified Certification
                            </span>
                            {(selectedTrainer.certUrl || selectedTrainer.certFile) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const cert = selectedTrainer.certUrl || selectedTrainer.certFile;
                                  if (cert.startsWith("data:application/pdf")) {
                                    window.open(cert, "_blank");
                                  } else {
                                    setFullPhotoModal({
                                      img: cert,
                                      title: `${selectedTrainer.name} - Official Fitness Certification`,
                                      desc: selectedTrainer.certifications || "Government/Fitness Body Accredited Certificate"
                                    });
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs transition"
                              >
                                <FileText className="w-3 h-3" /> View Certificate
                              </button>
                            )}
                          </div>
                          {selectedTrainer.certifications && (
                            <p className="text-[11px] text-slate-700 font-semibold">
                              {selectedTrainer.certifications}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ==========================================================
                      DEDICATED 1-ON-1 PT PACKAGE & DURATION SELECTION
                  ========================================================== */}
                  <div className="pt-3 border-t border-emerald-200/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          Select Personal Training (PT) Package & Duration *
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Choose 1-on-1 coaching duration with {(selectedTrainer.name || '').startsWith('Coach') ? selectedTrainer.name : `Coach ${selectedTrainer.name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                          {(selectedTrainer.name || '').startsWith('Coach') ? selectedTrainer.name : `Coach ${selectedTrainer.name}`}
                        </span>
                        {selectedPtPlan && (
                          <button
                            type="button"
                            onClick={() => setSelectedPtPlan(null)}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
                          >
                            Remove PT Package
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {availablePtPackages.map((pkg) => {
                        const pPrice = Number(pkg.price || 0);
                        const isSelected = selectedPtPlan?.id === pkg.id || selectedPtPlan?.name === pkg.name;
                        const perMonth = pkg.durationDays > 30 && pPrice > 0 ? Math.round(pPrice / (pkg.durationDays / 30)) : null;

                        return (
                          <div
                            key={pkg.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPtPlan(null);
                              } else {
                                setSelectedPtPlan({
                                  id: pkg.id,
                                  name: pkg.name,
                                  price: pPrice,
                                  duration: pkg.duration,
                                  durationDays: pkg.durationDays,
                                  description: pkg.description || ''
                                });
                              }
                            }}
                            className={`border-2 rounded-2xl p-3.5 text-left shadow-2xs space-y-2 transition-all cursor-pointer relative ${
                              isSelected
                                ? "bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                                : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                                  isSelected ? "bg-emerald-600 text-white shadow-xs" : "border-2 border-slate-300 bg-slate-50"
                                }`}>
                                  {isSelected ? "✓" : ""}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 block leading-tight">
                                      {pkg.name}
                                    </span>
                                    {pkg.popular && (
                                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-amber-200 shrink-0">
                                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Popular
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10.5px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                                    ⏳ {pkg.duration || `${pkg.durationDays} Days`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 gap-1 flex-wrap">
                              <div className="flex items-baseline gap-1">
                                <span className="text-base font-black text-emerald-700 whitespace-nowrap">
                                  +₹{pPrice.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">PT Fee</span>
                              </div>
                              {perMonth && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  ≈ ₹{perMonth.toLocaleString("en-IN")}/mo
                                </span>
                              )}
                            </div>

                            {pkg.description && (
                              <p className="text-[10.5px] text-slate-600 line-clamp-2 leading-relaxed">
                                {pkg.description}
                              </p>
                            )}

                            {isSelected && (
                              <div className="text-[10px] font-black tracking-wide text-emerald-800 bg-emerald-100/90 rounded-xl py-1 px-2 text-center uppercase flex items-center justify-center gap-1.5 border border-emerald-300">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Selected PT Package
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transformation Results */}
                  {selectedTrainer.transformations && selectedTrainer.transformations.length > 0 && (
                    <div className="pt-3 border-t border-emerald-100">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-500" />
                          Client Transformations & Results ({selectedTrainer.transformations.length})
                        </p>
                        <span className="text-[11px] text-slate-400 font-medium">Click photo for full view</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {selectedTrainer.transformations.map((item, idx) => {
                          const beforeSrc = item.beforeImg || item.beforeURL;
                          const afterSrc = item.afterImg || item.afterURL;
                          return (
                            <div key={item.id || idx} className="bg-white p-2.5 rounded-2xl border border-emerald-100/90 space-y-1.5 shadow-2xs">
                              <div className="grid grid-cols-2 gap-1.5">
                                <div 
                                  className="relative rounded-xl overflow-hidden bg-slate-100 h-36 sm:h-40 border border-slate-200 cursor-pointer group shadow-2xs"
                                  onClick={() => beforeSrc && setFullPhotoModal({ img: beforeSrc, title: `${selectedTrainer.name} - Client Before Transformation`, desc: item.description })}
                                >
                                  {beforeSrc ? (
                                    <img src={beforeSrc} alt="Before" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-semibold">No Photo</div>
                                  )}
                                  <span className="absolute top-1.5 left-1.5 bg-rose-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm">
                                    BEFORE
                                  </span>
                                  {beforeSrc && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                      <Maximize2 className="w-3.5 h-3.5" /> View
                                    </div>
                                  )}
                                </div>
                                <div 
                                  className="relative rounded-xl overflow-hidden bg-slate-100 h-36 sm:h-40 border border-slate-200 cursor-pointer group shadow-2xs"
                                  onClick={() => afterSrc && setFullPhotoModal({ img: afterSrc, title: `${selectedTrainer.name} - Client After Transformation`, desc: item.description })}
                                >
                                  {afterSrc ? (
                                    <img src={afterSrc} alt="After" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-semibold">No Photo</div>
                                  )}
                                  <span className="absolute top-1.5 left-1.5 bg-emerald-600/95 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm">
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
                                <p className="text-[11px] text-slate-700 font-medium line-clamp-2 leading-relaxed px-0.5">{item.description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Physical Assessment (Weight, Height & BMI) */}
                  <div className="pt-3 border-t border-emerald-200/80 space-y-3">
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        Physical Baseline Assessment & Health Profile
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Enter your baseline metrics to help your coach tailor your custom workout & nutrition program
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-[11px]">Weight (kg) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 74.5"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700 text-[11px]">Height *</label>
                          <div className="inline-flex rounded-lg p-0.5 bg-emerald-100/70 border border-emerald-200 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => setHeightUnit("ft")}
                              className={`px-2 py-0.5 rounded-md transition ${heightUnit !== "cm" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"}`}
                            >
                              ft & in
                            </button>
                            <button
                              type="button"
                              onClick={() => setHeightUnit("cm")}
                              className={`px-2 py-0.5 rounded-md transition ${heightUnit === "cm" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-950"}`}
                            >
                              cm
                            </button>
                          </div>
                        </div>

                        {heightUnit === "cm" ? (
                          <div>
                            <div className="relative">
                              <input
                                type="number"
                                min="80"
                                max="250"
                                step="0.5"
                                placeholder="e.g. 172"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 pr-10 focus:bg-white focus:outline-none focus:border-emerald-500"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">cm</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {bmiInfo?.heightFtIn ? `≈ ${bmiInfo.heightFtIn}` : "Standard height in cm"}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="3"
                                  max="8"
                                  step="1"
                                  placeholder="Feet (5)"
                                  value={heightFeet}
                                  onChange={(e) => setHeightFeet(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:bg-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">ft</span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="11"
                                  step="0.5"
                                  placeholder="Inch (8)"
                                  value={heightInches}
                                  onChange={(e) => setHeightInches(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:bg-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">in</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {bmiInfo?.heightCm ? `≈ ${bmiInfo.heightCm} cm` : "e.g. 5 ft 8 in"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between min-h-[88px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Scale className="w-3 h-3 text-emerald-600" /> Accurate BMI
                          </span>
                          {bmiInfo && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bmiInfo.color}`}>
                              {bmiInfo.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1.5 my-0.5 flex-wrap">
                          {bmiInfo ? (
                            <>
                              <span className="text-xl font-black text-slate-900">{bmiInfo.val}</span>
                              <span className="text-[10px] text-slate-500 font-bold">kg/m²</span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Ideal: {bmiInfo.idealRangeText}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Enter Weight & Height for BMI</span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 truncate">{bmiInfo ? bmiInfo.message : "Formula: Weight (kg) / (Height in m)²"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-[11px]">Primary Fitness Goal</label>
                        <select
                          value={fitnessGoal}
                          onChange={(e) => setFitnessGoal(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="Weight Loss & Fat Burn">Weight Loss & Fat Burn</option>
                          <option value="Muscle Building & Bulk">Muscle Building & Bulk</option>
                          <option value="Strength & Conditioning">Strength & Conditioning</option>
                          <option value="General Fitness & Stamina">General Fitness & Stamina</option>
                          <option value="Rehabilitation & Posture">Rehabilitation & Posture</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-[11px]">Target Weight (kg, optional)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 68.0"
                          value={targetWeight}
                          onChange={(e) => setTargetWeight(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Health Notes / Medical Conditions (Asked only when Personal Trainer selected) */}
                    <div className="pt-2 border-t border-emerald-100">
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        Medical History / Injuries / Health Notes (For Coach Attention)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Mention any knee/back injury history, asthma, BP, or specific health precautions for your trainer..."
                        value={healthNotes}
                        onChange={(e) => setHealthNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-3.5 py-2 text-xs outline-none transition focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                      />
                    </div>

                    {/* PT Athlete App & Portal Login Credentials */}
                    <div className="pt-3 border-t border-emerald-200/70">
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            🔑
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-emerald-950">PT Athlete App & Portal Login Credentials</h4>
                            <p className="text-[10px] text-emerald-700 font-medium">Use these credentials to log in, interact with {selectedTrainer.name}, and view workout & diet routines.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Login ID / Mobile Number <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={loginEmail || tokenData?.phone || personalData.phone || ''}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="e.g. 9876543210 or email"
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-[9px] text-slate-500 mt-0.5">Your mobile or ID to log into the Member Portal</p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Set Password <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="e.g. Member@123"
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                            />
                            <p className="text-[9px] text-slate-500 mt-0.5">Remember this password for member login</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ==========================================================
                PREFERRED WORKOUT TIME SLOT & TRAINER SHIFT OCCUPANCY
            ========================================================== */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Preferred Workout Time Slot *
                </label>
                {selectedTrainer && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1 self-start sm:self-auto">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Live Shift Schedule: {selectedTrainer.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {activeWorkoutSlots.map((t) => {
                  const fullSlotText = `${t.label} (${t.time})`;
                  const active = preferredTime === fullSlotText || preferredTime === t.id;
                  const Icon = t.icon || Sun;

                  // Check if coach has booked athletes in this slot
                  const bookedAthletes = selectedTrainer
                    ? (trainerSlotOccupancy[fullSlotText] || trainerSlotOccupancy[t.label] || trainerSlotOccupancy[t.time] || [])
                    : [];
                  const bookedCount = bookedAthletes.length;

                  const maxSlotLimit = Number(selectedTrainer?.maxPtPerSlot || 2);
                  const isFull = bookedCount >= maxSlotLimit;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setPreferredTime(fullSlotText); setStepError(''); }}
                      className={cn(
                        'p-2 sm:p-2.5 rounded-xl border-2 transition-all text-left relative flex flex-col justify-between overflow-hidden cursor-pointer',
                        active
                          ? 'border-emerald-600 bg-white text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      )}
                    >
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                            <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{t.label}</span>
                          </div>
                          {selectedTrainer && (
                            <span
                              className={`hidden md:inline-flex text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tight shrink-0 ${
                                bookedCount === 0
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : !isFull
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-rose-100 text-rose-900 border border-rose-300 animate-pulse"
                              }`}
                            >
                              {bookedCount === 0 ? `🟢 FREE (0/${maxSlotLimit})` : !isFull ? `🟡 ${bookedCount}/${maxSlotLimit}` : `🔴 ${bookedCount}/${maxSlotLimit} FULL`}
                            </span>
                          )}
                        </div>

                        {/* Live Occupancy Badge on mobile / compact screens (stacked cleanly, zero overlap) */}
                        {selectedTrainer && (
                          <div className="md:hidden mt-1">
                            <span
                              className={`inline-flex text-[8.5px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight ${
                                bookedCount === 0
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : !isFull
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-rose-100 text-rose-900 border border-rose-300 animate-pulse"
                              }`}
                            >
                              {bookedCount === 0 ? `🟢 FREE (0/${maxSlotLimit})` : !isFull ? `🟡 ${bookedCount}/${maxSlotLimit}` : `🔴 ${bookedCount}/${maxSlotLimit} FULL`}
                            </span>
                          </div>
                        )}

                        <p className="text-[10px] text-slate-500 mt-0.5">{t.time}</p>
                      </div>

                      {selectedTrainer && bookedCount > 0 && (
                        <div className="mt-1.5 pt-1 border-t border-slate-200/60 text-[9.5px] text-slate-500 truncate">
                          🏋️ {bookedAthletes.length} Active Member{bookedAthletes.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Overbooking Warning Alert for Member */}
              {(() => {
                if (!selectedTrainer) return null;
                const maxSlotLimit = Number(selectedTrainer.maxPtPerSlot || 2);
                const curBooked = trainerSlotOccupancy[preferredTime] || 
                  trainerSlotOccupancy[preferredTime?.split(' ')[0]] || [];
                const coachName = (selectedTrainer.name || '').startsWith('Coach')
                  ? selectedTrainer.name
                  : `Coach ${selectedTrainer.name}`;

                if (curBooked.length >= maxSlotLimit) {
                  return (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900 text-xs animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-extrabold text-rose-800">Time Slot Full ({curBooked.length}/{maxSlotLimit}): </strong>
                        <strong>{coachName}</strong> already has reached maximum PT capacity (<strong>{curBooked.length}/{maxSlotLimit} active members</strong>) scheduled during this slot ({preferredTime}). If you prefer a less crowded session with maximum attention, please select an available free slot.
                      </div>
                    </div>
                  );
                }
                if (curBooked.length > 0) {
                  return (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-900 text-[11px] animate-in fade-in duration-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span><strong>{coachName}</strong> currently has {curBooked.length}/{maxSlotLimit} active members scheduled in this slot. {maxSlotLimit - curBooked.length} spot(s) remaining.</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* ==========================================================
                ADD-ON GYM SERVICES & FACILITIES (STEAM, LOCKER, DIET)
            ========================================================== */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Add-on Gym Facilities & Services (Optional)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select additional amenities you want to include in your gym registration.
                  </p>
                </div>
                {selectedServices.length > 0 && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {selectedServices.length} Selected {servicesTotalPrice > 0 ? `(+₹${servicesTotalPrice.toLocaleString("en-IN")})` : '(Included Free)'}
                  </span>
                )}
              </div>

              {services.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No extra services currently available.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {services.map((srv) => {
                    const isIncluded = isServiceIncludedInPlan(srv, selectedPlan);
                    const isChecked = selectedServices.some((s) => s.id === srv.id) || isIncluded;
                    const srvPrice = Number(srv.price || 0);
                    return (
                      <div
                        key={srv.id}
                        onClick={() => toggleServiceSelection(srv)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 select-none ${
                          isChecked
                            ? isIncluded
                              ? "bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500/20"
                              : "bg-teal-50/70 border-teal-500 shadow-xs"
                            : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 block truncate">
                                {srv.name}
                              </span>
                              {isIncluded && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Included in Plan
                                </span>
                              )}
                            </div>
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
                          {isIncluded ? (
                            <div>
                              <span className="text-xs font-black text-emerald-700 block">
                                FREE
                              </span>
                              <span className="text-[10px] text-slate-400 line-through">
                                ₹{srvPrice.toLocaleString("en-IN")}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className={`text-xs font-black block ${isChecked ? "text-teal-700" : "text-slate-900"}`}>
                                +₹{srvPrice.toLocaleString("en-IN")}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold">
                                Extra Add-on
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Fee Summary & Breakdown Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white border border-slate-800 shadow-md space-y-3 overflow-hidden">
              {/* Fee Component Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  <span className="text-slate-300">Gym Plan:</span>
                  <span className="font-bold text-white">₹{basePlanPrice.toLocaleString('en-IN')}</span>
                </div>

                {ptAddonPrice > 0 && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span className="text-emerald-300 font-medium truncate max-w-[130px] sm:max-w-[180px]">
                      {selectedPtPlan?.name || 'Coach PT'}:
                    </span>
                    <span className="font-bold text-emerald-300 whitespace-nowrap">+₹{ptAddonPrice.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {selectedServices.some(s => isServiceIncludedInPlan(s, selectedPlan)) && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span className="text-emerald-300 font-medium">Services:</span>
                    <span className="font-bold text-emerald-300 whitespace-nowrap">Included Free</span>
                  </div>
                )}

                {servicesTotalPrice > 0 && (
                  <div className="flex items-center gap-1.5 bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-500/40 text-teal-200">
                    <CheckCircle className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                    <span className="text-teal-300 font-medium">Extra Services:</span>
                    <span className="font-bold text-teal-300 whitespace-nowrap">+₹{servicesTotalPrice.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Total Payable Row */}
              <div className="pt-2.5 border-t border-slate-800/90 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                    Total Payable:
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    (Gym + Add-ons)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight whitespace-nowrap">
                    ₹{totalRegistrationFee.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {stepError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {stepError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl py-3 px-6 shadow-md transition"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">Step 4: Liability Waiver Agreement</h2>
              </div>
              <p className="text-slate-500 text-xs">Please review the waiver terms and sign below to finalize your registration</p>
            </div>

            <div className="space-y-3">
              {WAIVER_CLAUSES.map((clause, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{clause}</p>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <input
                type="checkbox"
                checked={waiverAgreed}
                onChange={(e) => setWaiverAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                I have read and agree to all terms above. I understand that by signing below, I am legally confirming this liability release agreement.
              </span>
            </label>

            {/* Digital Signature Toggle & Input */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700">Member Digital Signature *</label>
                <div className="flex items-center rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold overflow-hidden border border-slate-300/80 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureType('draw');
                      setSigError('');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                      signatureType === 'draw'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-transparent text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    Draw Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureType('typed');
                      setSigError('');
                      if (!typedName && personalData.fullName) {
                        setTypedName(personalData.fullName);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                      signatureType === 'typed'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-transparent text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    Type Full Name
                  </button>
                </div>
              </div>

              {signatureType === 'draw' ? (
                <div className="w-full bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <SignaturePad
                    onSave={(dataUrl) => {
                      setDrawnSignature(dataUrl);
                      setSigError('');
                    }}
                    currentSignature={drawnSignature}
                    onClear={() => {
                      setDrawnSignature('');
                      setSigError('');
                    }}
                  />
                  {sigError && <p className="text-xs text-rose-600 font-semibold mt-2">{sigError}</p>}
                </div>
              ) : (
                <div className="w-full bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Type your full legal name as digital signature:
                  </label>
                  <input
                    type="text"
                    placeholder="Type your full legal name"
                    value={typedName || personalData?.fullName || ''}
                    onChange={(e) => {
                      setTypedName(e.target.value);
                      setSubmitError('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-serif italic text-slate-900 focus:outline-none focus:border-indigo-500 font-bold tracking-wide"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Your typed name serves as a legally recognized electronic signature.</span>
                    {(typedName || personalData?.fullName) && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid Signature
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs">
              <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Agreement Date</p>
                <p className="text-xs text-slate-900 font-bold">{formatDate(Date.now())}</p>
              </div>
            </div>

            {/* Order / Fee Breakdown Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white space-y-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Fee Breakdown
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Verified Total
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-300 font-medium truncate">
                    Base Gym Plan ({selectedPlan?.name || 'Selected Plan'})
                  </span>
                  <span className="font-bold text-white shrink-0 whitespace-nowrap">
                    ₹{basePlanPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                {ptAddonPrice > 0 && (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 text-emerald-300 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        Coach PT Add-on ({selectedPtPlan?.name || 'Personal Training'})
                      </span>
                    </div>
                    <span className="font-bold text-emerald-400 shrink-0 whitespace-nowrap">
                      +₹{ptAddonPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {selectedServices.some(s => isServiceIncludedInPlan(s, selectedPlan)) && (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 text-emerald-300 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        Included Services ({selectedServices.filter(s => isServiceIncludedInPlan(s, selectedPlan)).map(s => s.name).join(', ')})
                      </span>
                    </div>
                    <span className="font-bold text-emerald-400 shrink-0 whitespace-nowrap">
                      FREE (Included)
                    </span>
                  </div>
                )}

                {servicesTotalPrice > 0 && (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 text-teal-300 font-medium">
                      <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="truncate">
                        Extra Add-on Services ({selectedServices.filter(s => !isServiceIncludedInPlan(s, selectedPlan)).map(s => s.name).join(', ')})
                      </span>
                    </div>
                    <span className="font-bold text-teal-400 shrink-0 whitespace-nowrap">
                      +₹{servicesTotalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                    Total Registration Payable:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Due at gym desk upon arrival
                  </span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight shrink-0 whitespace-nowrap">
                  ₹{totalRegistrationFee.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl py-3 px-6 shadow-md transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing Registration...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Registration
                  </>
                )}
              </button>
            </div>
          </Card>
        )}

        <div className="h-12" />
      </div>

      {/* Full Photo Preview Modal */}
      {fullPhotoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setFullPhotoModal(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl p-4 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="min-w-0 pr-3">
                <h4 className="font-bold text-sm text-white truncate">{fullPhotoModal.title}</h4>
                {fullPhotoModal.desc && <p className="text-xs text-slate-400 truncate">{fullPhotoModal.desc}</p>}
              </div>
              <button
                type="button"
                onClick={() => setFullPhotoModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img src={fullPhotoModal.img} alt="Full View" className="w-full h-full object-contain max-h-[70vh]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
