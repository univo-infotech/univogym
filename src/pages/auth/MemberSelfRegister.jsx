import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import PhotoCaptureInput from '../../components/shared/PhotoCaptureInput';
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
  X
} from 'lucide-react';
import {
  validateInviteToken,
  markTokenUsed,
  addMember,
} from '../../firebase/members';
import { addPayment } from '../../firebase/payments';
import { getActivePlans } from '../../firebase/plans';
import { getTrainers } from '../../firebase/trainers';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

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

  // Step 3: Plan & Trainer
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [fullPhotoModal, setFullPhotoModal] = useState(null);

  // Body Assessment (when dedicated coach selected)
  const [weight, setWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('8');
  const [fitnessGoal, setFitnessGoal] = useState('Weight Loss & Fat Burn');
  const [targetWeight, setTargetWeight] = useState('');

  // Dynamic BMI Calculation from Weight (kg) and Height (ft & in)
  const bmiInfo = React.useMemo(() => {
    const w = parseFloat(weight);
    const ft = parseFloat(heightFeet);
    const inch = parseFloat(heightInches || 0);
    if (!w || !ft || w <= 0 || ft <= 0) return null;

    // 1 ft = 12 in, 1 in = 0.0254 m
    const totalInches = ft * 12 + inch;
    const hM = totalInches * 0.0254;
    const val = parseFloat((w / (hM * hM)).toFixed(1));
    let category = "Normal";
    let color = "text-emerald-700 bg-emerald-50 border-emerald-200";

    if (val < 18.5) {
      category = "Underweight";
      color = "text-blue-700 bg-blue-50 border-blue-200";
    } else if (val <= 24.9) {
      category = "Normal (Healthy)";
      color = "text-emerald-700 bg-emerald-50 border-emerald-200";
    } else if (val <= 29.9) {
      category = "Overweight";
      color = "text-amber-700 bg-amber-50 border-amber-200";
    } else {
      category = "Obese";
      color = "text-rose-700 bg-rose-50 border-rose-200";
    }
    return { val, category, color };
  }, [weight, heightFeet, heightInches]);

  // Step 4: Schedule
  const [preferredTime, setPreferredTime] = useState('morning');
  const [healthNotes, setHealthNotes] = useState('');

  // Step 5: Waiver
  const sigRef = useRef(null);
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
  }, [tokenData, setVal2]);

  useEffect(() => {
    async function loadData() {
      setPlansLoading(true);
      try {
        const [p, t] = await Promise.all([
          getActivePlans(gymId || 'univo_main'),
          getTrainers(gymId || 'univo_main'),
        ]);
        const finalPlans = p && p.length > 0 ? p : DEFAULT_PLANS;
        const finalTrainers = t && t.length > 0 ? t : DEFAULT_TRAINERS;
        setPlans(finalPlans);
        setTrainers(finalTrainers);

        if (tokenData?.planId) {
          const found = finalPlans.find((item) => item.id === tokenData.planId);
          if (found) setSelectedPlan(found);
          else setSelectedPlan(finalPlans[1] || finalPlans[0]);
        } else if (!selectedPlan && finalPlans.length > 0) {
          setSelectedPlan(finalPlans[1] || finalPlans[0]);
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
    if (!gender) {
      setStepError('Please select your gender.');
      return;
    }
    setPersonalData({ ...data, gender });
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
    if (!typedName.trim()) {
      setSubmitError('Please enter your full name as a typed signature.');
      return;
    }
    if (sigRef.current && sigRef.current.isEmpty()) {
      setSigError('Please provide your digital signature using your finger or mouse.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Capture base64 data directly (instant, reliable, no CORS or network blocking)
      let photoURL = photoPreview || '';
      let signatureURL = '';
      if (sigRef.current && !sigRef.current.isEmpty()) {
        signatureURL = sigRef.current.toDataURL('image/png');
      }

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

      const memberPayload = {
        gymId: gymId || 'univo_main',
        fullName: personalData.fullName || tokenData?.memberName || typedName,
        name: personalData.fullName || tokenData?.memberName || typedName,
        aadhaar: personalData.aadhaar || '',
        phone: tokenData?.phone || personalData.altPhone || personalData.phone || '',
        photoURL,
        signatureURL,
        gender,
        email: personalData.email || '',
        dob: personalData.dob || '',
        address: personalData.address || '',
        planId: selectedPlan?.id || 'p2',
        planName: selectedPlan?.name || '3-Month Pro',
        planPrice: selectedPlan?.price || 6500,
        joinDate: todayDate.toISOString().split('T')[0],
        expiryDate: expDate.toISOString().split('T')[0],
        trainerId: selectedTrainer?.id || null,
        trainerName: selectedTrainer?.name || 'Unassigned (General Floor)',
        hasPersonalCoach: Boolean(selectedTrainer),
        weight: weight || '',
        height: heightFeet ? `${heightFeet} ft ${heightInches || 0} in` : '',
        heightFeet: heightFeet || '',
        heightInches: heightInches || '',
        bmi: bmiInfo ? String(bmiInfo.val) : '',
        bmiCategory: bmiInfo ? bmiInfo.category : '',
        fitnessGoal: fitnessGoal || '',
        targetWeight: targetWeight || '',
        preferredTime,
        healthNotes,
        typedSignature: typedName.trim(),
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

        const planPriceNum = Number(selectedPlan?.price || 6500);
        await addPayment(gymId || 'univo_main', {
          id: 'bill_' + Date.now(),
          memberId: createdMemberId || 'm_' + Date.now(),
          memberName: memberPayload.fullName,
          phone: memberPayload.phone,
          slot: preferredTime || 'General Floor',
          batch: 'Self Registration • Link Access',
          planName: selectedPlan?.name || 'Membership Plan',
          planPrice: planPriceNum,
          discount: 0,
          amount: planPriceNum,
          paidAmount: planPriceNum,
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

      // 3. Optional Auth account creation (does not block registration)
      if (personalData.email) {
        try {
          const auth = getAuth();
          const tempPassword = `Univo@${Math.random().toString(36).slice(2, 8)}123`;
          const cred = await createUserWithEmailAndPassword(auth, personalData.email, tempPassword);
          memberPayload.uid = cred.user.uid;
          memberPayload.tempPassword = tempPassword;
        } catch (authErr) {
          console.warn('Auth user registration note (member profile already saved):', authErr.message);
        }
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
                <Input
                  label="Alternative Phone Number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  {...reg2('altPhone')}
                />
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
              <p className="text-slate-500 text-xs mt-1">Select your preferred workout slot, membership tier, and dedicated coach</p>
            </div>

            {/* Preferred Workout Time Slot at Start of Step 3 */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Preferred Workout Time Slot *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {WORKOUT_TIMES.map((t) => {
                  const active = preferredTime === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setPreferredTime(t.id); setStepError(''); }}
                      className={cn(
                        'p-2.5 rounded-xl border-2 transition-all text-left',
                        active
                          ? 'border-emerald-600 bg-white text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Icon className="w-3.5 h-3.5 text-amber-500" />
                        {t.label}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{t.time}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Choose Membership Plan *</label>
                {selectedPlan && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    Selected: {selectedPlan.name}
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
                          'relative w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all',
                          active
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                      >
                        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                          {plan.popular && (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Popular
                            </span>
                          )}
                          {active && (
                            <span className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                        </div>

                        <div className="flex items-start justify-between pr-14">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{plan.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Duration: {plan.duration} {plan.durationUnit || 'months'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-extrabold text-emerald-700">
                              ₹{Number(plan.price).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-400">Total Plan Fee</p>
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
                    onClick={() => setSelectedTrainer(null)}
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
                        setSelectedTrainer(active ? null : trainer);
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

                      {/* Coach Certifications */}
                      {selectedTrainer.certifications && (
                        <p className="text-[11px] text-slate-600 pt-0.5">
                          <strong className="text-slate-800">Certifications: </strong> {selectedTrainer.certifications}
                        </p>
                      )}
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
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        Physical Baseline Assessment & Health Profile
                      </h5>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        For Coach Program
                      </span>
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
                        <label className="font-bold text-slate-700 block mb-1 text-[11px]">Height (ft & in) *</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="relative">
                            <input
                              type="number"
                              min="3"
                              max="8"
                              step="1"
                              placeholder="5"
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
                              step="1"
                              placeholder="8"
                              value={heightInches}
                              onChange={(e) => setHeightInches(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:bg-white focus:outline-none focus:border-emerald-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">in</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {heightFeet ? `${heightFeet} ft ${heightInches || 0} in` : "e.g. 5 ft 8 in"}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Your BMI</span>
                        <div className="flex items-baseline gap-1.5 my-0.5">
                          {bmiInfo ? (
                            <>
                              <span className="text-xl font-black text-slate-900">{bmiInfo.val}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bmiInfo.color}`}>
                                {bmiInfo.category}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Enter Wt & Ht</span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400">BMI = Weight / (Height in m)²</span>
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
                  </div>
                </div>
              )}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Digital Signature *</label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Signature
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{
                    className: 'w-full',
                    height: 160,
                    style: { touchAction: 'none', display: 'block', width: '100%' },
                  }}
                  penColor="#0f172a"
                  backgroundColor="#f8fafc"
                  onEnd={() => setSigError('')}
                />
              </div>
              <p className="text-[11px] text-slate-500">Sign with your finger on phone or drag mouse on desktop</p>
              {sigError && <p className="text-xs text-rose-600 font-semibold">{sigError}</p>}
            </div>

            <Input
              label="Full Name (Printed Signature) *"
              placeholder="e.g. Rahul Sharma"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
            />

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs">
              <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Agreement Date</p>
                <p className="text-xs text-slate-900 font-bold">{formatDate(Date.now())}</p>
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
