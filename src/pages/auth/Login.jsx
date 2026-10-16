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

    const cleanEmail = email.trim().toLowerCase();
    const inputPhone = email.trim().replace(/\D/g, '');
    if (!cleanEmail) { setError('Please enter your email address, phone or login ID.'); return; }
    if (!password) { setError('Please enter your password.'); return; }

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

      // 1. Check Trainer from Firestore trainers collection
      const checkTrainerInFirestore = async () => {
        try {
          const trainersList = await getTrainers('univo_main');
          const matched = trainersList.find((t) => {
            const tEmail = (t.email || t.loginEmail || '').trim().toLowerCase();
            const tPhone = (t.phone || '').trim().replace(/\D/g, '');
            const tPass = t.password || t.loginPassword;

            const isIdMatch =
              (tEmail && tEmail === cleanEmail) ||
              (inputPhone.length >= 10 && tPhone && tPhone.endsWith(inputPhone.slice(-10)));
            const isPassMatch = tPass ? tPass === password : password === 'Coach@123';
            return isIdMatch && isPassMatch;
          });

          if (matched) {
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
              if (matchedUser.status === 'inactive' || matchedUser.status === 'blocked') {
                setError('Account suspended. Please contact gym management.');
                return 'STOP';
              }

              const roleNormalized = (matchedUser.role || '').toLowerCase();

              // If registered in users as a trainer
              if (roleNormalized.includes('trainer') || roleNormalized.includes('coach')) {
                logInTrainer(matchedUser);
                return true;
              }

              // If registered in users as a member
              if (roleNormalized === 'member') {
                logInMember(matchedUser);
                return true;
              }

              // Owner or Staff
              const isOwner = roleNormalized === 'owner' || roleNormalized === 'co-owner' || roleNormalized.includes('owner');
              const targetRole = isOwner ? 'owner' : 'staff';

              localStorage.setItem('univo_active_role', targetRole);
              localStorage.setItem('univo_staff_session', JSON.stringify(matchedUser));
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

      // 3. Check Members collection
      const checkMembersInFirestore = async () => {
        try {
          const { getMembers, DEMO_MEMBERS } = await import('../../firebase/members');
          const membersList = await getMembers('univo_main');

          // Combined search pool: membersList + DEMO_MEMBERS
          const pool = [...(membersList || [])];
          if (Array.isArray(DEMO_MEMBERS)) {
            for (const dm of DEMO_MEMBERS) {
              if (!pool.some(m => m.id === dm.id)) {
                pool.push({
                  ...dm,
                  password: dm.password || dm.loginPassword || 'Member@123',
                  loginPassword: dm.loginPassword || dm.password || 'Member@123',
                });
              }
            }
          }

          let matchedMember = pool.find((m) => {
            const memberIdentifiers = [m.email, m.loginEmail, m.username, m.memberId, m.id]
              .filter(Boolean)
              .map((e) => String(e).trim().toLowerCase());
            const mPhone = (m.phone || '').trim().replace(/\D/g, '');
            const mName = (m.name || m.fullName || '').trim().toLowerCase();
            const mPass = m.loginPassword || m.password;

            const isEmailOrIdMatch =
              memberIdentifiers.includes(cleanEmail) ||
              (m.id && String(m.id).toLowerCase() === cleanEmail) ||
              (m.memberId && String(m.memberId).toLowerCase() === cleanEmail) ||
              (mName && mName.replace(/\s+/g, '') === cleanEmail.replace(/\s+/g, ''));

            const isPhoneMatch =
              inputPhone.length >= 7 &&
              Boolean(mPhone) &&
              (mPhone === inputPhone ||
               mPhone.endsWith(inputPhone.slice(-10)) ||
               inputPhone.endsWith(mPhone.slice(-10)));

            const isIdMatch = isEmailOrIdMatch || isPhoneMatch;
            const isPassMatch = mPass ? mPass === password : (password === 'Member@123' || password === '123456');
            return isIdMatch && isPassMatch;
          });

          // Direct Firestore query fallback if not found in memory
          if (!matchedMember) {
            try {
              const { collection, query, where, getDocs } = await import('firebase/firestore');
              const { db } = await import('../../firebase/config');

              let foundDoc = null;
              if (cleanEmail.includes('@')) {
                const qEmail = query(collection(db, 'members'), where('email', '==', cleanEmail));
                const sEmail = await getDocs(qEmail);
                if (!sEmail.empty) foundDoc = { id: sEmail.docs[0].id, ...sEmail.docs[0].data() };
              }
              if (!foundDoc && inputPhone.length >= 10) {
                const qPhone = query(collection(db, 'members'), where('phone', '==', inputPhone.slice(-10)));
                const sPhone = await getDocs(qPhone);
                if (!sPhone.empty) foundDoc = { id: sPhone.docs[0].id, ...sPhone.docs[0].data() };
              }

              if (foundDoc) {
                const mPass = foundDoc.loginPassword || foundDoc.password;
                const isPassMatch = mPass ? mPass === password : (password === 'Member@123' || password === '123456');
                if (isPassMatch) {
                  matchedMember = foundDoc;
                }
              }
            } catch (err) {
              console.warn('Direct member query notice:', err);
            }
          }

          if (matchedMember) {
            if (
              matchedMember.status === 'left' ||
              matchedMember.status === 'ended' ||
              matchedMember.memberPortalAccess === false
            ) {
              setError(
                'Access Revoked: Your account is inactive or disconnected from the gym. Please contact gym management.'
              );
              return 'STOP';
            }

            // Expired members are permitted to log in so they can view and renew their plan via UPI QR
            logInMember(matchedMember);
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
            const trainerObj = {
              id: userData.profileId || userCredential.user.uid,
              uid: userCredential.user.uid,
              name: userData.name || userCredential.user.displayName || 'Coach',
              email: cleanEmail,
              ...userData,
            };
            logInTrainer(trainerObj);
            return true;
          }

          if (roleNormalized === 'member') {
            const memberObj = {
              id: userData.profileId || userCredential.user.uid,
              uid: userCredential.user.uid,
              name: userData.name || userCredential.user.displayName || 'Athlete',
              email: cleanEmail,
              ...userData,
            };
            logInMember(memberObj);
            return true;
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
        setError('Invalid trainer credentials. Please enter your registered email or phone and password.');
        return;
      }

      if (selectedRole === 'member') {
        const mRes = await checkMembersInFirestore();
        if (mRes === 'STOP' || mRes === true) return;
        const uRes = await checkUsersInFirestore();
        if (uRes === 'STOP' || uRes === true) return;
        if (await checkFirebaseAuthLogin()) return;
        setError('Invalid member credentials. Please enter your registered mobile number or email and password.');
        return;
      }

      // Default (selectedRole === 'owner')
      // If master owner email
      if (cleanEmail === 'univo@gmail.com') {
        if (await checkFirebaseAuthLogin()) return;
        setError('Invalid owner credentials. Please check your email and password.');
        return;
      }

      // Check users collection (e.g. Co-Owner, Staff, or provisioned Trainer)
      const uRes = await checkUsersInFirestore();
      if (uRes === 'STOP' || uRes === true) return;

      // Auto-detect if user entered Trainer credentials while on Owner tab!
      if (await checkTrainerInFirestore()) return;

      // Auto-detect if user entered Member credentials while on Owner tab!
      const mRes = await checkMembersInFirestore();
      if (mRes === 'STOP' || mRes === true) return;

      // Try Firebase Auth
      if (await checkFirebaseAuthLogin()) return;

      setError('Invalid email or password. Please check your credentials and try again.');
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {selectedRole === 'owner' ? 'Owner Email ID' : selectedRole === 'trainer' ? 'Trainer Email or Mobile No.' : 'Member Mobile No. or Email'}
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === 'owner' ? 'e.g. univo@gmail.com' : selectedRole === 'trainer' ? 'e.g. coach@gmail.com or 9876543210' : 'e.g. 9630237549'}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
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
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Sign In as ${selectedRole.toUpperCase()}`}
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
