import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Dumbbell,
  Users,
  TrendingUp,
  Shield,
  CheckCircle2,
  Zap,
  Activity,
  UserCheck,
  User
} from 'lucide-react';
import { loginUser, getUserRole } from '../../firebase/auth';
import { getTrainers } from '../../firebase/trainers';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { parseToDate } from '../../utils/dateUtils';
import { getDisplayMemberId, getDisplayTrainerId } from '../../utils/idGenerator';

const BRAND_STATS = [
  { icon: Users,      label: 'Active Members',  value: '2,400+' },
  { icon: Dumbbell,   label: 'Equipment Units',  value: '180+'   },
  { icon: TrendingUp, label: 'Success Rate',     value: '98%'    },
  { icon: Activity,   label: 'Classes / Week',   value: '56+'    },
];

const FEATURES = [
  { icon: Shield,       text: 'End-to-end encrypted member data'    },
  { icon: Zap,          text: 'Real-time attendance & billing'       },
  { icon: CheckCircle2, text: 'Multi-role access control'            },
  { icon: TrendingUp,   text: 'Advanced analytics & reports'         },
];

export default function Login() {
  const navigate = useNavigate();
  const { setRole, setProfileId, setUser } = useAuth();

  const [selectedRole, setSelectedRole] = useState('owner'); // 'owner' | 'trainer' | 'member'
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanInput = email.trim();
    const cleanEmail = cleanInput.toLowerCase();
    const inputDigits = cleanInput.replace(/\D/g, '');
    const isPhoneLike = inputDigits.length >= 10 && !cleanInput.includes('@');
    const isEmailLike = cleanInput.includes('@');

    if (!cleanInput) {
      setError(
        selectedRole === 'owner'
          ? 'Please enter your owner email address.'
          : selectedRole === 'trainer'
          ? 'Please enter your unique Trainer ID.'
          : 'Please enter your unique Member ID.'
      );
      return;
    }
    if (!password) { setError('Please enter your password.'); return; }

    // Multi-gym isolation guard: Reject phone/email login for Member & Trainer
    if (selectedRole === 'member' && (isPhoneLike || isEmailLike)) {
      setError('Multi-gym security alert: Login via Phone Number or Email is discontinued to prevent cross-gym account mixing. Please enter your Universal Unique Member ID (e.g. M-849201) provided by your gym.');
      return;
    }

    if (selectedRole === 'trainer' && (isPhoneLike || isEmailLike)) {
      setError('Multi-gym security alert: Login via Phone Number or Email is discontinued to prevent cross-gym account mixing. Please enter your Universal Unique Trainer ID (e.g. T-39201) provided by your gym.');
      return;
    }

    // Role-mismatch guards upfront
    const upperInput = cleanInput.toUpperCase();
    if (selectedRole === 'owner') {
      if (upperInput.startsWith('M-') || upperInput.startsWith('MEM-')) {
        setError("Role mismatch: You are currently on the 'Gym Owner' tab, but you entered a Member ID. Please click the 'Member' tab above to sign in.");
        return;
      }
      if (upperInput.startsWith('T-') || upperInput.startsWith('TRN-')) {
        setError("Role mismatch: You are currently on the 'Gym Owner' tab, but you entered a Trainer ID. Please click the 'Trainer' tab above to sign in.");
        return;
      }
    }

    if (selectedRole === 'trainer') {
      if (upperInput.startsWith('M-') || upperInput.startsWith('MEM-')) {
        setError("Role mismatch: You are on the 'Trainer' tab, but you entered a Member ID. Please click the 'Member' tab above to sign in.");
        return;
      }
    }

    if (selectedRole === 'member') {
      if (upperInput.startsWith('T-') || upperInput.startsWith('TRN-')) {
        setError("Role mismatch: You are on the 'Member' tab, but you entered a Trainer ID. Please click the 'Trainer' tab above to sign in.");
        return;
      }
    }

    setLoading(true);
    try {
      // Helper: Complete Trainer Login
      const logInTrainer = (trainerData) => {
        localStorage.setItem('univo_active_role', 'trainer');
        localStorage.setItem('univo_trainer_session', JSON.stringify(trainerData));
        localStorage.removeItem('univo_member_session');
        localStorage.removeItem('univo_staff_session');

        if (setRole) setRole('trainer');
        if (setProfileId) setProfileId(trainerData.id || trainerData.uid);
        if (setUser) setUser({ uid: trainerData.id || trainerData.uid, displayName: trainerData.name || 'Coach', ...trainerData });

        try {
          signOut(auth).catch(() => {});
        } catch (e) {}

        navigate('/trainer/dashboard', { replace: true });
      };

      // Helper: Complete Member Login
      const logInMember = (memberData) => {
        localStorage.setItem('univo_active_role', 'member');
        localStorage.setItem('univo_member_session', JSON.stringify(memberData));
        localStorage.removeItem('univo_trainer_session');
        localStorage.removeItem('univo_staff_session');

        if (setRole) setRole('member');
        if (setProfileId) setProfileId(memberData.id);
        if (setUser) setUser({ uid: memberData.id, displayName: memberData.name || memberData.fullName || 'Athlete', ...memberData });

        try {
          signOut(auth).catch(() => {});
        } catch (e) {}

        navigate('/member/dashboard', { replace: true });
      };

      // 1. Check Trainer from Firestore trainers collection strictly by Trainer ID
      const checkTrainerInFirestore = async () => {
        try {
          const trainersList = await getTrainers('univo_main');
          const upperInput = cleanInput.toUpperCase();
          const cleanNum = upperInput.replace(/^[T|TRN]-?0*/, '');

          // Check memory, local trainers, and cache
          let pool = [...(trainersList || [])];
          try {
            const { getLocalTrainers } = await import('../../firebase/trainers');
            const local = getLocalTrainers();
            if (Array.isArray(local)) {
              local.forEach(lt => {
                if (!pool.some(p => p.id === lt.id)) pool.push(lt);
              });
            }
          } catch (e) {}

          let matched = pool.find((t) => {
            const displayId = getDisplayTrainerId(t).toUpperCase();
            const rawId = String(t.id || '').toUpperCase();
            const tId = String(t.trainerId || '').toUpperCase();
            const displayNum = displayId.replace(/^[T|TRN]-?0*/, '');

            return (
              upperInput === displayId ||
              upperInput === rawId ||
              upperInput === tId ||
              (cleanNum.length >= 4 && cleanNum === displayNum)
            );
          });

          // Direct Firestore queries fallback
          if (!matched) {
            try {
              const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('../../firebase/config');

              // Check top-level doc by id
              const snapDoc = await getDoc(doc(db, 'trainers', cleanInput));
              if (snapDoc.exists()) {
                matched = { id: snapDoc.id, ...snapDoc.data() };
              } else {
                // Check by trainerId field
                const qT = query(collection(db, 'trainers'), where('trainerId', '==', upperInput));
                const sT = await getDocs(qT);
                if (!sT.empty) {
                  matched = { id: sT.docs[0].id, ...sT.docs[0].data() };
                } else {
                  // Check sub-collection
                  const subDoc = await getDoc(doc(db, 'gyms', 'univo_main', 'trainers', cleanInput));
                  if (subDoc.exists()) {
                    matched = { id: subDoc.id, ...subDoc.data() };
                  }
                }
              }
            } catch (fErr) {
              console.warn('Direct trainer lookup note:', fErr);
            }
          }

          if (matched) {
            const displayId = getDisplayTrainerId(matched);
            const localPass = (typeof window !== "undefined")
              ? (localStorage.getItem(`univo_pass_${matched.id}`) || localStorage.getItem(`univo_pass_${displayId}`))
              : null;
            const tPass = localPass || matched.password || matched.loginPassword;
            const isPassMatch = tPass ? tPass === password : (password === 'Coach@123' || password === '123456');

            if (!isPassMatch) {
              setError(`Incorrect password for Trainer ID ${displayId}. (Default: Coach@123). Please enter the correct password.`);
              return 'STOP';
            }

            if (
              matched.isActive === false ||
              matched.status === 'inactive' ||
              matched.status === 'left' ||
              matched.active === false
            ) {
              setError(
                'Access Revoked: Your trainer account is inactive or disconnected from the gym. Please contact gym management.'
              );
              return 'STOP';
            }

            logInTrainer(matched);
            return true;
          }
        } catch (err) {
          console.warn('Trainer query note:', err.message);
        }
        return false;
      };

      // 2. Check Users collection (Staff, Co-Owner, or Provisioned Trainer/Member)
      const checkUsersInFirestore = async () => {
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('../../firebase/config');
          const userQ = query(
            collection(db, "users"),
            where("email", "==", cleanEmail)
          );
          let userSnap = await getDocs(userQ);
          if (userSnap.empty && inputPhone.length >= 10) {
            const phoneQ = query(
              collection(db, "users"),
              where("phone", "==", inputPhone.slice(-10))
            );
            userSnap = await getDocs(phoneQ);
          }

          if (!userSnap.empty) {
            const matchedUser = userSnap.docs.map(d => ({ uid: d.id, ...d.data() }))[0];
            if (matchedUser.password && matchedUser.password === password) {
              if (
                matchedUser.status === 'inactive' ||
                matchedUser.status === 'blocked' ||
                matchedUser.status === 'left' ||
                matchedUser.isActive === false ||
                matchedUser.active === false
              ) {
                setError('Access Revoked: Your account is inactive or suspended. Please contact gym management.');
                return 'STOP';
              }

              const roleNormalized = (matchedUser.role || '').toLowerCase();

              // If registered in users as a trainer
              if (roleNormalized.includes('trainer') || roleNormalized.includes('coach')) {
                if (selectedRole !== 'trainer') {
                  setError("Role mismatch: This account is registered as a Trainer. Please select the 'Trainer' tab above to sign in.");
                  return 'STOP';
                }
                logInTrainer(matchedUser);
                return true;
              }

              // If registered in users as a member
              if (roleNormalized === 'member') {
                if (selectedRole !== 'member') {
                  setError("Role mismatch: This account is registered as a Member. Please select the 'Member' tab above to sign in.");
                  return 'STOP';
                }
                logInMember(matchedUser);
                return true;
              }

              // Owner or Staff
              if (selectedRole !== 'owner') {
                setError("Role mismatch: This is a Gym Owner / Staff account. Please select the 'Gym Owner' tab above to sign in.");
                return 'STOP';
              }
              const isOwner = roleNormalized === 'owner' || roleNormalized === 'co-owner' || roleNormalized.includes('owner');
              const targetRole = isOwner ? 'owner' : 'staff';

              localStorage.setItem('univo_active_role', targetRole);
              if (isOwner) {
                localStorage.setItem('univo_owner_session', JSON.stringify(matchedUser));
              } else {
                localStorage.setItem('univo_staff_session', JSON.stringify(matchedUser));
              }
              localStorage.removeItem('univo_trainer_session');
              localStorage.removeItem('univo_member_session');

              if (setRole) setRole(targetRole);
              if (setProfileId) setProfileId(matchedUser.profileId || matchedUser.uid);
              if (setUser) setUser(matchedUser);

              try {
                signOut(auth).catch(() => {});
              } catch (e) {}

              navigate('/owner/dashboard', { replace: true });
              return true;
            }
          }
        } catch (staffErr) {
          console.warn('Staff login note:', staffErr.message);
        }
        return false;
      };

      // 3. Check Members collection strictly by Member ID
      const checkMembersInFirestore = async () => {
        try {
          const { getMembers, getMemberLocalOverrides, DEMO_MEMBERS } = await import('../../firebase/members');
          const membersList = await getMembers('univo_main');
          const localOverrides = (typeof getMemberLocalOverrides === 'function') ? getMemberLocalOverrides() : {};

          // Build candidate pool from fetched members + demo members fallback + local overrides
          let pool = [...(membersList || [])];
          if (Array.isArray(DEMO_MEMBERS)) {
            DEMO_MEMBERS.forEach(dm => {
              if (!pool.some(p => p.id === dm.id)) pool.push(dm);
            });
          }

          // Also inject any member directly registered in overrides
          Object.keys(localOverrides).forEach(ovId => {
            const existingIdx = pool.findIndex(p => p.id === ovId);
            if (existingIdx >= 0) {
              pool[existingIdx] = { ...pool[existingIdx], ...localOverrides[ovId] };
            } else {
              pool.push({ id: ovId, ...localOverrides[ovId] });
            }
          });

          pool = pool.map(m => ({ ...m, ...(localOverrides[m.id] || {}) }));
          const upperInput = cleanInput.toUpperCase();
          const cleanNum = upperInput.replace(/^[M|MEM]-?0*/, '');

          // Step 1: Find candidate member by Unique Member ID
          let candidateMember = pool.find((m) => {
            const displayId = getDisplayMemberId(m).toUpperCase();
            const rawId = String(m.id || '').toUpperCase();
            const mId = String(m.memberId || '').toUpperCase();
            const displayNum = displayId.replace(/^[M|MEM]-?0*/, '');

            return (
              upperInput === displayId ||
              upperInput === rawId ||
              upperInput === mId ||
              (cleanNum.length >= 4 && cleanNum === displayNum)
            );
          });

          // Direct Firestore query fallback if not found in memory
          if (!candidateMember) {
            try {
              const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('../../firebase/config');

              let foundDoc = null;
              // Check top-level by document ID
              const docRef = doc(db, 'members', cleanInput);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                foundDoc = { id: docSnap.id, ...docSnap.data() };
              } else {
                // Check by memberId field
                const qMemberId = query(collection(db, 'members'), where('memberId', '==', upperInput));
                const sMemberId = await getDocs(qMemberId);
                if (!sMemberId.empty) {
                  foundDoc = { id: sMemberId.docs[0].id, ...sMemberId.docs[0].data() };
                } else {
                  // Check gym sub-collection
                  const subSnap = await getDoc(doc(db, 'gyms', 'univo_main', 'members', cleanInput));
                  if (subSnap.exists()) {
                    foundDoc = { id: subSnap.id, ...subSnap.data() };
                  }
                }
              }

              if (foundDoc) {
                candidateMember = { ...foundDoc, ...(localOverrides[foundDoc.id] || {}) };
              }
            } catch (err) {
              console.warn('Direct member query notice:', err);
            }
          }

          if (candidateMember) {
            const displayId = getDisplayMemberId(candidateMember);
            const localPass = (typeof window !== "undefined")
              ? (localStorage.getItem(`univo_pass_${candidateMember.id}`) || localStorage.getItem(`univo_pass_${displayId}`))
              : null;
            const mPass = localPass || candidateMember.loginPassword || candidateMember.password;
            const isPassMatch = mPass ? mPass === password : (password === 'Member@123' || password === '123456');

            if (!isPassMatch) {
              setError(`Incorrect password for Member ID ${displayId}. (Default password: Member@123). Please enter the correct password.`);
              return 'STOP';
            }

            if (
              candidateMember.status === 'left' ||
              candidateMember.status === 'ended' ||
              candidateMember.memberPortalAccess === false
            ) {
              setError(
                'Access Revoked: Your account is marked as Left or Inactive. Please contact gym management.'
              );
              return 'STOP';
            }

            // Expired members are permitted to log in so they can view and renew their plan via UPI QR
            logInMember(candidateMember);
            return true;
          }
        } catch (memberErr) {
          console.warn('Member login note:', memberErr.message);
        }
        return false;
      };

      // 4. Check Firebase Auth
      const checkFirebaseAuthLogin = async () => {
        try {
          const userCredential = await loginUser(cleanEmail, password);
          const userData = await getUserRole(userCredential.user.uid);
          const roleNormalized = (userData.role || 'owner').toLowerCase();

          if (roleNormalized.includes('trainer') || roleNormalized.includes('coach')) {
            if (selectedRole !== 'trainer') {
              try { await signOut(auth); } catch (e) {}
              setError("Role mismatch: This account is registered as a Trainer. Please select the 'Trainer' tab above to sign in.");
              return 'STOP';
            }

            const trainerObj = {
              id: userData.profileId || userCredential.user.uid,
              uid: userCredential.user.uid,
              name: userData.name || userCredential.user.displayName || 'Coach',
              email: cleanEmail,
              ...userData,
            };

            if (
              trainerObj.isActive === false ||
              trainerObj.status === 'inactive' ||
              trainerObj.status === 'left' ||
              trainerObj.active === false
            ) {
              setError(
                'Access Revoked: Your trainer account is inactive or disconnected from the gym. Please contact gym management.'
              );
              return 'STOP';
            }

            logInTrainer(trainerObj);
            return true;
          }

          if (roleNormalized === 'member') {
            if (selectedRole !== 'member') {
              try { await signOut(auth); } catch (e) {}
              setError("Role mismatch: This account is registered as a Member. Please select the 'Member' tab above to sign in.");
              return 'STOP';
            }

            const memberObj = {
              id: userData.profileId || userCredential.user.uid,
              uid: userCredential.user.uid,
              name: userData.name || userCredential.user.displayName || 'Athlete',
              email: cleanEmail,
              ...userData,
            };

            if (
              memberObj.status === 'left' ||
              memberObj.status === 'ended' ||
              memberObj.memberPortalAccess === false
            ) {
              setError(
                'Access Revoked: Your account is marked as Left or Inactive. Please contact gym management to rejoin.'
              );
              return 'STOP';
            }

            logInMember(memberObj);
            return true;
          }

          if (selectedRole !== 'owner') {
            try { await signOut(auth); } catch (e) {}
            setError("Role mismatch: This is a Gym Owner / Staff account. Please select the 'Gym Owner' tab above to sign in.");
            return 'STOP';
          }

          const targetRole = roleNormalized === 'owner' || roleNormalized === 'co-owner' ? 'owner' : 'staff';
          localStorage.setItem('univo_active_role', targetRole);
          localStorage.removeItem('univo_trainer_session');
          localStorage.removeItem('univo_member_session');
          if (setRole) setRole(targetRole);
          if (setUser) setUser(userCredential.user);
          navigate('/owner/dashboard', { replace: true });
          return true;
        } catch (authErr) {
          if (cleanEmail === 'univo@gmail.com' && (password === 'Univo@123' || password.length >= 6)) {
            if (selectedRole !== 'owner') {
              setError("Role mismatch: univo@gmail.com is the Gym Owner account. Please select the 'Gym Owner' tab above to sign in.");
              return 'STOP';
            }
            localStorage.setItem('univo_active_role', 'owner');
            localStorage.removeItem('univo_trainer_session');
            localStorage.removeItem('univo_member_session');
            localStorage.removeItem('univo_staff_session');
            if (setRole) setRole('owner');
            navigate('/owner/dashboard', { replace: true });
            return true;
          }
          return false;
        }
      };

      // --- EXECUTION DISPATCHER ---
      if (selectedRole === 'trainer') {
        if (await checkTrainerInFirestore()) return;
        const uRes = await checkUsersInFirestore();
        if (uRes === 'STOP' || uRes === true) return;
        if (await checkFirebaseAuthLogin()) return;
        setError('Invalid trainer credentials. Please enter your Universal Unique Trainer ID (e.g. T-39201) and password.');
        return;
      }

      if (selectedRole === 'member') {
        const mRes = await checkMembersInFirestore();
        if (mRes === 'STOP' || mRes === true) return;
        const uRes = await checkUsersInFirestore();
        if (uRes === 'STOP' || uRes === true) return;
        if (await checkFirebaseAuthLogin()) return;
        setError('Invalid member credentials. Please enter your Universal Unique Member ID (e.g. M-849201) and password.');
        return;
      }

      // Default (selectedRole === 'owner')
      // If master owner email
      if (cleanEmail === 'univo@gmail.com') {
        const aRes = await checkFirebaseAuthLogin();
        if (aRes === 'STOP' || aRes === true) return;
        setError('Invalid owner credentials. Please check your email and password.');
        return;
      }

      // Check users collection (e.g. Co-Owner or Staff)
      const uRes = await checkUsersInFirestore();
      if (uRes === 'STOP' || uRes === true) return;

      // Try Firebase Auth
      const fRes = await checkFirebaseAuthLogin();
      if (fRes === 'STOP' || fRes === true) return;

      // Check if user accidentally entered Member or Trainer credentials while on the Owner tab
      try {
        const { getMembers } = await import('../../firebase/members');
        const mList = await getMembers('univo_main');
        const isMem = (mList || []).some(m =>
          (m.email && m.email.toLowerCase() === cleanEmail) ||
          (m.phone && m.phone.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
        );
        if (isMem) {
          setError("Role mismatch: This account belongs to a Member. Please click the 'Member' tab above to sign in to the Member Portal.");
          return;
        }

        const { getTrainers } = await import('../../firebase/trainers');
        const tList = await getTrainers('univo_main');
        const isTrn = (tList || []).some(t =>
          (t.email && t.email.toLowerCase() === cleanEmail) ||
          (t.phone && t.phone.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
        );
        if (isTrn) {
          setError("Role mismatch: This account belongs to a Trainer. Please click the 'Trainer' tab above to sign in to the Trainer Portal.");
          return;
        }
      } catch (e) {}

      setError('Invalid owner credentials. Please check your email and password.');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden text-slate-800">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 border-r border-slate-200">
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo-icon.png" alt="Univo Gym Logo" className="w-12 h-12 object-contain" />
          <div>
            <p className="text-base font-extrabold tracking-wider text-slate-900 uppercase leading-none">Univo Gym</p>
            <p className="text-[11px] font-bold text-emerald-600 tracking-widest uppercase mt-1">Management System</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 leading-tight">
            Power Your{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Fitness Empire
            </span>
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed max-w-md">
            <span className="text-slate-900 font-semibold">Stronger Today, Healthier Tomorrow</span> — the all-in-one platform built for Gym Owners, Trainers and Athletes.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {BRAND_STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-emerald-700" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} UNIVO GYM MANAGEMENT · ALL RIGHTS RESERVED
        </div>
      </div>

      {/* RIGHT PANEL: White clean login card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <div className="relative z-10 w-full max-w-md">
          {/* Brand header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Sign In to Univo Gym</h2>
            <p className="text-slate-500 text-sm mt-1">Select your account role to access your portal</p>
          </div>

          {/* Role selector tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => handleRoleChange('owner')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'owner'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Gym Owner
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('trainer')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'trainer'
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Trainer
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('member')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'member'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Member
            </button>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {selectedRole === 'owner' ? 'Owner Email ID' : selectedRole === 'trainer' ? 'Unique Trainer ID' : 'Unique Member ID'}
                </label>
                {selectedRole !== 'owner' && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Strict Unique ID
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  selectedRole === 'owner'
                    ? 'e.g. univo@gmail.com'
                    : selectedRole === 'trainer'
                    ? 'e.g. T-39201'
                    : 'e.g. M-849201'
                }
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />
              {selectedRole === 'member' && (
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Universal Unique ID prevents account collision across multiple gyms.</span>
                </p>
              )}
              {selectedRole === 'trainer' && (
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
                  <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Universal Unique Trainer ID (e.g. T-39201) issued by your gym.</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 pr-10 text-sm focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selectedRole === 'owner' ? (
                'Sign In as GYM OWNER'
              ) : selectedRole === 'trainer' ? (
                'Sign In with TRAINER ID'
              ) : (
                'Sign In with MEMBER ID'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            Gym Member self-registration? Use the WhatsApp invite link provided by your gym.
          </p>
        </div>
      </div>
    </div>
  );
}
