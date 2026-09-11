import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
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
} from 'lucide-react';
import {
  validateInviteToken,
  markTokenUsed,
  addMember,
} from '../../firebase/members';
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

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STEPS = [
  { id: 1, label: 'Verify'     },
  { id: 2, label: 'Personal'   },
  { id: 3, label: 'Membership' },
  { id: 4, label: 'Schedule'   },
  { id: 5, label: 'Waiver'     },
];

const WAIVER_CLAUSES = [
  'I the undersigned, being aware of my own health and physical condition, and having knowledge that my participation in any exercise program may be injurious to my health, am voluntarily participating in a physical activity.',
  'Having such knowledge, I hereby acknowledge this release, my representatives, agents and successors from liability for accidental injury or illness which I may incur as a result of participating in the said physical activity. I hereby assume all risks connected therewith and consent to participate in said program.',
  'I agree to disclose my physical limitations, disabilities, ailments or impairments which may affect my ability to participate in said fitness program.',
];

const WORKOUT_TIMES = [
  { id: 'morning',   label: 'Morning',   sub: '6 am â€“ 9 am',   icon: 'ðŸŒ…' },
  { id: 'afternoon', label: 'Afternoon', sub: '12 pm â€“ 3 pm',  icon: 'â˜€ï¸' },
  { id: 'evening',   label: 'Evening',   sub: '4 pm â€“ 7 pm',   icon: 'ðŸŒ†' },
  { id: 'night',     label: 'Night',     sub: '7 pm â€“ 10 pm',  icon: 'ðŸŒ™' },
];

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male',   emoji: 'â™‚ï¸' },
  { value: 'female', label: 'Female', emoji: 'â™€ï¸' },
  { value: 'other',  label: 'Other',  emoji: 'âš§ï¸' },
];

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Step progress bar */
function StepBar({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full mb-8">
      {STEPS.map((step, idx) => {
        const done   = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300',
                  done   && 'bg-green-500 border-green-500 text-white',
                  active && 'bg-teal-500 border-teal-500 text-white scale-110 shadow-lg shadow-teal-500/40',
                  !done && !active && 'bg-slate-800 border-slate-600 text-slate-500',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  active && 'text-teal-400',
                  done   && 'text-green-400',
                  !done && !active && 'text-slate-600',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < total - 1 && (
              <div className="flex-1 h-[2px] mx-1 mb-4 rounded-full transition-all duration-300"
                style={{
                  background: done
                    ? 'linear-gradient(90deg,#22c55e,#22c55e)'
                    : 'rgb(51,65,85)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Section wrapper card */
function Card({ children, className }) {
  return (
    <div className={cn(
      'bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-slate-800',
      className,
    )}>
      {children}
    </div>
  );
}

/** Text input with forwardRef for react-hook-form */
const Input = React.forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
          error && 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

/** Textarea */
function Textarea({ label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}
      <textarea
        rows={4}
        className={cn(
          'w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none',
          error && 'border-red-500/50',
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function MemberSelfRegister() {
  const { gymId, token } = useParams();
  const navigate         = useNavigate();

  // â”€â”€ Token validation state â”€â”€
  const [tokenStatus,  setTokenStatus]  = useState('loading'); // loading | valid | expired | used | error
  const [tokenData,    setTokenData]    = useState(null);
  const [gymData,      setGymData]      = useState(null);

  // â”€â”€ Step state â”€â”€
  const [step, setStep] = useState(1);

  // â”€â”€ Step 2 â€“ Personal Info â”€â”€
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const { register: reg2, handleSubmit: hs2, formState: { errors: e2 } } = useForm();
  const [gender,       setGender]       = useState('');
  const [personalData, setPersonalData] = useState({});

  // â”€â”€ Step 3 â€“ Membership â”€â”€
  const [plans,        setPlans]        = useState([]);
  const [trainers,     setTrainers]     = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [plansLoading, setPlansLoading] = useState(false);

  // â”€â”€ Step 4 â€“ Schedule â”€â”€
  const [preferredTime, setPreferredTime] = useState('');
  const [healthNotes,   setHealthNotes]   = useState('');

  // â”€â”€ Step 5 â€“ Waiver â”€â”€
  const sigRef                              = useRef(null);
  const [waiverAgreed,  setWaiverAgreed]   = useState(false);
  const [typedName,     setTypedName]      = useState('');
  const [sigSaved,      setSigSaved]       = useState(false);
  const [sigError,      setSigError]       = useState('');

  // â”€â”€ Submit state â”€â”€
  const [submitting,    setSubmitting]     = useState(false);
  const [submitError,   setSubmitError]    = useState('');
  const [success,       setSuccess]        = useState(false);

  // â”€â”€ Step navigation errors â”€â”€
  const [stepError,     setStepError]      = useState('');

  // â”€â”€â”€ Validate token on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    async function validate() {
      try {
        const result = await validateInviteToken(gymId, token);
        if (!result.valid) {
          setTokenStatus(result.reason === 'used' ? 'used' : 'expired');
          return;
        }
        setTokenData(result.data);
        setTokenStatus('valid');

        // Fetch gym details
        const db      = getFirestore();
        const gymSnap = await getDoc(doc(db, 'gyms', gymId));
        if (gymSnap.exists()) setGymData(gymSnap.data());
      } catch (err) {
        console.error('Token validation error:', err);
        setTokenStatus('error');
      }
    }
    validate();
  }, [gymId, token]);

  // â”€â”€â”€ Fetch plans & trainers when step 3 opens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (step !== 3) return;
    (async () => {
      setPlansLoading(true);
      try {
        const [p, t] = await Promise.all([
          getActivePlans(gymId),
          getTrainers(gymId),
        ]);
        setPlans(p   || []);
        setTrainers(t || []);
      } catch (err) {
        console.error('Error fetching plans/trainers:', err);
      } finally {
        setPlansLoading(false);
      }
    })();
  }, [step, gymId]);

  // â”€â”€â”€ Photo drop zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onDrop = useCallback((accepted) => {
    const file = accepted[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  // â”€â”€â”€ Step validation & navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const goNext = () => {
    setStepError('');
    if (step === 3 && !selectedPlan) {
      setStepError('Please select a membership plan to continue.');
      return;
    }
    if (step === 4 && !preferredTime) {
      setStepError('Please select your preferred workout time.');
      return;
    }
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStepError('');
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // â”€â”€â”€ Step 2 submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onStep2Submit = (data) => {
    setStepError('');
    if (!gender) { setStepError('Please select your gender.'); return; }
    setPersonalData({ ...data, gender });
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // â”€â”€â”€ Clear signature â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const clearSignature = () => {
    if (sigRef.current) sigRef.current.clear();
    setSigSaved(false);
    setSigError('');
  };

  // â”€â”€â”€ Final submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFinalSubmit = async () => {
    setSubmitError('');
    setSigError('');

    if (!waiverAgreed) {
      setSubmitError('You must agree to the Liability Waiver to continue.');
      return;
    }
    if (!typedName.trim()) {
      setSubmitError('Please enter your full name as a typed signature.');
      return;
    }
    if (sigRef.current && sigRef.current.isEmpty()) {
      setSigError('Please draw your signature above.');
      return;
    }

    setSubmitting(true);
    try {
      const storage = getStorage();
      const auth    = getAuth();

      // 1. Upload profile photo
      let photoURL = '';
      if (photoFile) {
        const photoRef  = storageRef(storage, `gyms/${gymId}/members/photos/${Date.now()}_${photoFile.name}`);
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      // 2. Upload signature
      let signatureURL = '';
      if (sigRef.current && !sigRef.current.isEmpty()) {
        const sigData  = sigRef.current.toDataURL('image/png');
        const sigBlobRef = storageRef(storage, `gyms/${gymId}/members/signatures/${Date.now()}_sig.png`);
        await uploadString(sigBlobRef, sigData, 'data_url');
        signatureURL = await getDownloadURL(sigBlobRef);
      }

      // 3. Build member payload
      const memberPayload = {
        gymId,
        phone: tokenData?.phone || '',
        photoURL,
        signatureURL,
        ...personalData,
        planId:      selectedPlan?.id   || null,
        planName:    selectedPlan?.name || '',
        planPrice:   selectedPlan?.price || 0,
        trainerId:   selectedTrainer?.id   || null,
        trainerName: selectedTrainer?.name || '',
        preferredTime,
        healthNotes,
        typedSignature: typedName.trim(),
        waiverAgreed,
        waiverDate: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
        status: 'active',
        role: 'member',
        inviteToken: token,
      };

      // 4. Create Firebase Auth user
      let userUID = null;
      if (personalData.email) {
        try {
          const tempPassword = `Univo@${Math.random().toString(36).slice(2, 10)}`;
          const cred = await createUserWithEmailAndPassword(auth, personalData.email, tempPassword);
          userUID = cred.user.uid;
          memberPayload.uid = userUID;
          memberPayload.tempPassword = tempPassword; // stored so admin can share
        } catch (authErr) {
          console.warn('Auth creation warning:', authErr.message);
          // Continue even if auth creation fails (e.g. email already exists)
        }
      }

      // 5. Save member to Firestore
      await addMember(gymId, memberPayload);

      // 6. Mark token as used
      await markTokenUsed(gymId, token);

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Registration error:', err);
      setSubmitError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // â”€â”€â”€ Render: Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Validating your invitation linkâ€¦</p>
        </div>
      </div>
    );
  }

  // â”€â”€â”€ Render: Expired / Used / Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (['expired', 'used', 'error'].includes(tokenStatus)) {
    const expired = tokenStatus === 'expired';
    const used    = tokenStatus === 'used';
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Card className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              {used
                ? <CheckCircle className="w-10 h-10 text-green-400" />
                : <XCircle     className="w-10 h-10 text-red-400"   />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {used ? 'Already Registered' : expired ? 'Link Expired' : 'Invalid Link'}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {used
                  ? 'This registration link has already been used. Your account has been created.'
                  : expired
                    ? 'This registration link has expired. Please contact your gym administrator for a new link.'
                    : 'This registration link is invalid or has been revoked. Please contact your gym.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2"
              >
                Go to Login â†’
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // â”€â”€â”€ Render: Success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Animated tick */}
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-green-500/30">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white">Welcome to the Family! ðŸŽ‰</h1>
            <p className="text-slate-400">Your account has been created successfully.</p>
          </div>

          <Card className="text-left space-y-3">
            <p className="text-sm text-slate-300 font-semibold">What's next?</p>
            {[
              'Visit the gym reception to collect your membership card',
              'Your trainer will contact you to schedule your first session',
              'Download our app and log in with your email and temporary password',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-green-400">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-400">{item}</p>
              </div>
            ))}
          </Card>

          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-semibold text-sm rounded-xl py-3.5 px-6 transition-all duration-200 shadow-lg shadow-green-500/25 hover:-translate-y-0.5"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // â”€â”€â”€ Render: Registration Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 text-slate-900">

      <div className="max-w-2xl mx-auto relative z-10">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md overflow-hidden">
              <img
                src="/logo-icon.png"
                alt="Univo"
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <Dumbbell className="w-6 h-6 text-white" style={{ display: 'none' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
                {gymData?.name || 'Univo Gym'}
              </p>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase">Member Registration</p>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Create Your Account</h1>
          <p className="text-slate-500 text-xs mt-1">Complete all steps to activate your membership and liability waiver</p>
        </div>

        {/* ── Progress bar ── */}
        <StepBar current={step} total={STEPS.length} />

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 1 â€“ Verify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 1 && (
          <Card>
            <div className="text-center space-y-6">
              {/* Gym logo */}
              {gymData?.logoURL && (
                <img
                  src={gymData.logoURL}
                  alt={gymData.name}
                  className="h-16 object-contain mx-auto"
                />
              )}

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Welcome{gymData?.name ? ` to ${gymData.name}` : ''}! 👋
                </h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                  You have been invited to join our gym. Complete this registration to activate your membership.
                </p>
              </div>

              {/* Phone number */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-xs mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500">Registered Phone</p>
                    <p className="text-base font-bold text-slate-900">{tokenData?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Invitation expires:{' '}
                <span className="text-slate-700 font-semibold">
                  {tokenData?.expiresAt ? formatDate(tokenData.expiresAt.toDate?.() || tokenData.expiresAt) : 'In 5 minutes'}
                </span>
              </p>

              <button
                onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-semibold text-sm rounded-xl py-3.5 px-6 transition-all duration-200 shadow-lg shadow-green-500/25 hover:-translate-y-0.5"
              >
                Continue to Registration
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Card>
        )}

        {/* ─── STEP 2 – Personal Info ─── */}
        {step === 2 && (
          <form onSubmit={hs2(onStep2Submit)}>
            <Card className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                <p className="text-slate-500 text-xs mt-1">Tell us about yourself</p>
                <div className="mt-3 w-10 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              </div>

              {/* Photo upload: Gallery & Live Camera Selfie */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Profile Photo <span className="text-slate-500 font-normal">(Gallery upload ya Live Camera selfie)</span>
                </label>

                {photoPreview ? (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">Photo Selected</p>
                      <p className="text-xs text-emerald-700 font-medium">Ready to upload with membership form</p>
                      <button
                        type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mt-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove & re-take photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: Gallery Upload */}
                    <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-500 cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPhotoFile(file);
                            const reader = new FileReader();
                            reader.onload = (ev) => setPhotoPreview(ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Upload className="w-7 h-7 text-emerald-600 mb-2" />
                      <span className="text-xs font-bold text-slate-900">Upload from Gallery</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Choose existing photo</span>
                    </label>

                    {/* Option 2: Live Camera Selfie */}
                    <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-500 cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPhotoFile(file);
                            const reader = new FileReader();
                            reader.onload = (ev) => setPhotoPreview(ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Camera className="w-7 h-7 text-teal-600 mb-2" />
                      <span className="text-xs font-bold text-slate-900">Take Live Selfie</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Open phone camera</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <Input
                label="Full Name *"
                placeholder="Enter your full name"
                error={e2.fullName?.message}
                {...reg2('fullName', { required: 'Full name is required' })}
              />

              {/* Gender */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Gender *</label>
                <div className="grid grid-cols-3 gap-3">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => { setGender(g.value); setStepError(''); }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200',
                        gender === g.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <span className="text-2xl">{g.emoji}</span>
                      <span className="text-xs font-semibold">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Alt phone */}
              <Input
                label="Alternative Phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...reg2('altPhone')}
              />

              {/* Email */}
              <Input
                label="Email Address *"
                type="email"
                placeholder="you@example.com"
                error={e2.email?.message}
                {...reg2('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />

              {/* DOB */}
              <Input
                label="Date of Birth *"
                type="date"
                error={e2.dob?.message}
                {...reg2('dob', { required: 'Date of birth is required' })}
              />

              {/* Address */}
              <Input
                label="Address"
                placeholder="Your residential address"
                {...reg2('address')}
              />

              {/* Step error */}
              {stepError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {stepError}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-600/60 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all duration-200 shadow-lg shadow-green-500/25 hover:-translate-y-0.5"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </form>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 3 â€“ Membership â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 3 && (
          <Card className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Choose Your Plan</h2>
              <p className="text-slate-400 text-sm mt-1">Select a membership that works for you</p>
              <div className="mt-3 w-10 h-0.5 rounded-full bg-gradient-to-r from-teal-400 to-green-400" />
            </div>

            {plansLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                <span className="ml-2 text-slate-400 text-sm">Loading plansâ€¦</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No membership plans available. Contact the gym.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {plans.map((plan) => {
                  const active = selectedPlan?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => { setSelectedPlan(plan); setStepError(''); }}
                      className={cn(
                        'relative w-full text-left p-5 rounded-xl border-2 transition-all duration-200',
                        active
                          ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/20'
                          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600',
                      )}
                    >
                      {/* Popular badge */}
                      {plan.popular && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/30">
                          <Star className="w-3 h-3" /> Popular
                        </span>
                      )}

                      <div className="flex items-start justify-between pr-16">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-base">{plan.name}</p>
                          <p className="text-xs text-slate-400">
                            {plan.duration} {plan.durationUnit || 'months'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-white">
                            â‚¹{Number(plan.price).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-500">per {plan.durationUnit || 'month'}</p>
                        </div>
                      </div>

                      {/* Features */}
                      {plan.features && plan.features.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {plan.features.map((f, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-700/50 rounded-full px-2.5 py-1"
                            >
                              <Check className="w-3 h-3 text-green-400" /> {f}
                            </span>
                          ))}
                        </div>
                      )}

                      {active && (
                        <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Personal Trainer (optional) */}
            {trainers.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Select Personal Trainer{' '}
                    <span className="text-slate-500 font-normal">(optional)</span>
                  </h3>
                </div>
                <div className="grid gap-3">
                  {trainers.map((trainer) => {
                    const active = selectedTrainer?.id === trainer.id;
                    return (
                      <button
                        key={trainer.id}
                        type="button"
                        onClick={() => setSelectedTrainer(active ? null : trainer)}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                          active
                            ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                            : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600',
                        )}
                      >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-slate-700">
                          {trainer.photoURL ? (
                            <img src={trainer.photoURL} alt={trainer.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm">{trainer.name}</p>
                          <p className="text-xs text-teal-400 truncate">
                            {trainer.specialization || 'General Fitness'}
                          </p>
                          {trainer.experience && (
                            <p className="text-xs text-slate-500">{trainer.experience} yrs experience</p>
                          )}
                        </div>
                        {active && (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step error */}
            {stepError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {stepError}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-600/60 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all duration-200 shadow-lg shadow-green-500/25 hover:-translate-y-0.5"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Card>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 4 â€“ Schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 4 && (
          <Card className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Schedule & Preferences</h2>
              <p className="text-slate-400 text-sm mt-1">Set your workout schedule and health info</p>
              <div className="mt-3 w-10 h-0.5 rounded-full bg-gradient-to-r from-teal-400 to-green-400" />
            </div>

            {/* Workout time */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                Preferred Workout Time *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {WORKOUT_TIMES.map((t) => {
                  const active = preferredTime === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setPreferredTime(t.id); setStepError(''); }}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                        active
                          ? 'border-teal-500 bg-teal-500/15 text-white shadow-lg shadow-teal-500/20'
                          : 'border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-300',
                      )}
                    >
                      <span className="text-3xl">{t.icon}</span>
                      <div className="text-center">
                        <p className={cn('text-sm font-semibold', active ? 'text-white' : 'text-slate-300')}>
                          {t.label}
                        </p>
                        <p className="text-[11px] text-slate-500">{t.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Health notes */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                Health Conditions / Notes{' '}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                rows={4}
                placeholder="Any injuries, medical conditions, or special requirements we should know aboutâ€¦"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                className="w-full bg-slate-900/70 border border-slate-600/60 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20 resize-none"
              />
            </div>

            {/* Step error */}
            {stepError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {stepError}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-600/60 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all duration-200 shadow-lg shadow-green-500/25 hover:-translate-y-0.5"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Card>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STEP 5 â€“ Waiver & Signature â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 5 && (
          <Card className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-teal-400" />
                <h2 className="text-xl font-bold text-white">Liability Waiver Agreement</h2>
              </div>
              <p className="text-slate-400 text-sm mt-1">Please read carefully before signing</p>
              <div className="mt-3 w-10 h-0.5 rounded-full bg-gradient-to-r from-teal-400 to-green-400" />
            </div>

            {/* Clauses */}
            <div className="space-y-4">
              {WAIVER_CLAUSES.map((clause, i) => (
                <div
                  key={i}
                  className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-4 flex gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-teal-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{clause}</p>
                </div>
              ))}
            </div>

            {/* Agree checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={waiverAgreed}
                  onChange={(e) => setWaiverAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
                    waiverAgreed
                      ? 'bg-green-500 border-green-500'
                      : 'bg-slate-800 border-slate-600 group-hover:border-slate-400',
                  )}
                >
                  {waiverAgreed && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </div>
              <span className="text-sm text-slate-300 leading-relaxed">
                I have read and agree to all terms above. I understand that by signing below, I am
                binding myself to the conditions set forth in this agreement.
              </span>
            </label>

            {/* Digital Signature Canvas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Digital Signature *</label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear
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
                  onEnd={() => { setSigSaved(false); setSigError(''); }}
                />
              </div>
              <p className="text-xs text-slate-500">Draw your signature above using your mouse or finger</p>
              {sigError && <p className="text-xs text-red-500">{sigError}</p>}
            </div>

            {/* Typed name */}
            <Input
              label="Full Name (Typed Signature) *"
              placeholder="Type your full name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
            />

            {/* Date */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Date of Agreement</p>
                <p className="text-sm text-slate-900 font-bold">
                  {new Date().toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Submit / step errors */}
            {submitError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-600/60 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all duration-200 shadow-lg shadow-green-500/25 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Accountâ€¦
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

        {/* Bottom padding */}
        <div className="h-12" />
      </div>
    </div>
  );
}


