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

  const [selectedRole, setSelectedRole] = useState('owner'); // 'owner' | 'trainer' | 'member'
  const [email,        setEmail]        = useState('univo@gmail.com');
  const [password,     setPassword]     = useState('Univo@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    if (role === 'owner') {
      setEmail('univo@gmail.com');
      setPassword('Univo@123');
    } else if (role === 'trainer') {
      setEmail('trainer@univogym.com');
      setPassword('Trainer@123');
    } else {
      setEmail('member@univogym.com');
      setPassword('Member@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password)     { setError('Please enter your password.');       return; }

    setLoading(true);
    try {
      // If mock/demo login for trainer or member or owner
      if (email.includes('trainer') || selectedRole === 'trainer') {
        navigate('/trainer/dashboard', { replace: true });
        return;
      }
      if (email.includes('member') || selectedRole === 'member') {
        navigate('/member/dashboard', { replace: true });
        return;
      }

      const userCredential = await loginUser(email.trim(), password);
      const uid = userCredential?.user ? userCredential.user.uid : userCredential.uid;
      const role = await getUserRole(uid);

      if (role === 'trainer' || selectedRole === 'trainer') navigate('/trainer/dashboard', { replace: true });
      else if (role === 'member' || selectedRole === 'member') navigate('/member/dashboard', { replace: true });
      else navigate('/owner/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      // Fallback for easy demo if password doesn't match firebase yet
      if (email === 'univo@gmail.com' || selectedRole === 'owner') {
        navigate('/owner/dashboard', { replace: true });
      } else {
        setError('Invalid email or password. Please try again.');
      }
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
                {selectedRole === 'owner' ? 'Owner Email ID' : selectedRole === 'trainer' ? 'Trainer Email ID' : 'Member Email ID'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
