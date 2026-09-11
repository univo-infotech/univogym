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
} from 'lucide-react';
import { loginUser, getUserRole } from '../../firebase/auth';

// ─── Brand stats shown on the left panel ────────────────────────────────────
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

// ─── Component ───────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // ── Handle submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password)     { setError('Please enter your password.');       return; }

    setLoading(true);
    try {
      const userCredential = await loginUser(email.trim(), password);
      const uid  = userCredential.user.uid;
      const role = await getUserRole(uid);

      if      (role === 'owner')   navigate('/owner/dashboard',   { replace: true });
      else if (role === 'trainer') navigate('/trainer/dashboard', { replace: true });
      else if (role === 'member')  navigate('/member/dashboard',  { replace: true });
      else setError('Your account does not have a valid role. Please contact support.');
    } catch (err) {
      console.error('Login error:', err);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password. Please try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please wait a moment and try again.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled. Please contact support.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        default:
          setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden">

      {/* ══════════ LEFT PANEL (hidden on mobile) ══════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">

        {/* Layered backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0a1628]" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        {/* Subtle dot-grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#00b4d8 1px,transparent 1px),linear-gradient(90deg,#00b4d8 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* ── Logo row ── */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center shadow-lg shadow-teal-500/25 overflow-hidden">
            <img
              src="/logo-icon.png"
              alt="Univo"
              className="w-7 h-7 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <Dumbbell className="w-5 h-5 text-white" style={{ display: 'none' }} />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-teal-400 uppercase">Univo Gym</p>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase">Management System</p>
          </div>
        </div>

        {/* ── Hero content ── */}
        <div className="relative z-10 space-y-6">

          {/* Full logo */}
          <div className="mb-2">
            <img
              src="/logo-full.png"
              alt="Univo Gym Management"
              className="h-14 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
            Power Your{' '}
            <span className="bg-gradient-to-r from-teal-400 to-green-400 bg-clip-text text-transparent">
              Fitness Empire
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            <span className="text-slate-300 font-medium">Stronger Today, Healthier Tomorrow</span> — the
            all-in-one platform that simplifies gym management so you can focus on what matters most.
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {BRAND_STATS.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 backdrop-blur-sm hover:border-teal-500/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-teal-400" />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="space-y-3 pt-2">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-green-400" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="relative z-10">
          <p className="text-xs text-slate-600 tracking-wider uppercase">
            © {new Date().getFullYear()} Univo Gym Management · All rights reserved
          </p>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL — Login Form ══════════ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 relative">

        {/* Mobile bg */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div
          className="absolute inset-0 lg:hidden opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#00b4d8 1px,transparent 1px),linear-gradient(90deg,#00b4d8 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center shadow-lg shadow-teal-500/30 overflow-hidden">
              <img
                src="/logo-icon.png"
                alt="Univo"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <Dumbbell className="w-5 h-5 text-white" style={{ display: 'none' }} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest text-teal-400 uppercase">Univo Gym</p>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase">Management System</p>
            </div>
          </div>

          {/* ── Glass card ── */}
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-black/40">

            {/* Card header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-slate-400 text-sm mt-1">Sign in to your management portal</p>
              <div className="mt-4 w-12 h-1 rounded-full bg-gradient-to-r from-teal-400 to-green-400" />
            </div>

            {/* Error alert */}
            {error && (
              <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  className="w-full bg-slate-900/70 border border-slate-600/60 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    disabled={loading}
                    className="w-full bg-slate-900/70 border border-slate-600/60 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all duration-200 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye    className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                  onClick={() =>
                    alert('Please contact your gym administrator to reset your password.')
                  }
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white font-semibold text-sm rounded-xl py-3.5 px-6 transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-green-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-xs text-slate-500">
                New member?{' '}
                <span className="text-slate-400">
                  Use the registration link sent to your WhatsApp.
                </span>
              </p>
            </div>
          </div>

          {/* Mobile tagline */}
          <p className="lg:hidden text-center text-xs text-slate-600 mt-6 tracking-widest uppercase">
            Stronger Today · Healthier Tomorrow
          </p>
        </div>
      </div>
    </div>
  );
}
