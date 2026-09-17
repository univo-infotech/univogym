import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  LayoutGrid,
  LayoutList,
  Eye,
  X,
  Copy,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  Edit,
  UserMinus,
  Share2,
  Sparkles,
  QrCode,
  CalendarPlus,
  RotateCcw,
  Trash2,
  Check,
  Sun,
  IndianRupee,
  LogOut,
  Calendar,
  CreditCard,
  UserX,
  User,
  Receipt,
  Smartphone,
  Banknote,
  Building2,
  Split,
  ShieldCheck,
  Tag,
  HelpCircle,
  ChevronDown,
  Send,
  MessageSquare,
  Bell,
  Camera,
  Upload,
  Activity,
  Scale,
  Target,
  Dumbbell,
  Heart,
  Phone,
  Mail,
  FileText,
  Sunset,
  Moon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getMembers, generateInviteToken, addMember, updateMember, deleteMember } from '../../firebase/members';
import { getTrainers } from '../../firebase/trainers';
import { getPlans } from '../../firebase/plans';
import { addPayment, getAllPayments } from '../../firebase/payments';
import { getServices, DEFAULT_SERVICES } from '../../firebase/services';
import { useAuth } from '../../contexts/AuthContext';
import { getGymSettings } from '../../utils/settings';
import { generatePaymentReceipt } from '../../utils/pdf';
import {
  openWhatsApp,
  generateRenewalReminderMessage,
  generatePtRenewalReminderMessage,
  generatePartialDueReminderMessage,
  generateOverdueReminderMessage
} from '../../utils/whatsapp';
import Modal from '../../components/ui/Modal';
import DirectAddMemberModal from '../../components/shared/DirectAddMemberModal';
import PhotoCaptureInput from '../../components/shared/PhotoCaptureInput';
import { getSessionCachedData } from '../../utils/dataCache';

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

function getMemberStatus(member) {
  if (member.status === 'left') return 'left';
  if (member.status === 'ended') return 'ended';

  // If PT ended while gym membership is still valid / active:
  if (member.status === 'pt_ended' || member.ptStatus === 'ended') {
    if (member.status !== 'ended' && member.active !== false) {
      const expiry = toDate(member.expiryDate);
      if (!expiry) return 'active';
      const now = new Date();
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      if (diffDays < -2) return 'due';
      if (diffDays <= 0) return 'expired';
      if (diffDays <= 3) return 'ending_soon';
      return 'active';
    }
    return 'ended';
  }

  if (member.active === false) return 'inactive';

  const expiry = toDate(member.expiryDate);
  if (!expiry) return member.status || 'active';
  const now = new Date();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  // 1. Expired & Due conditions:
  // Expire hone ke 2 din ke baad (diffDays < -2, e.g. -3, -4) -> 'due'
  if (diffDays < -2) return 'due';
  // Expired within last 1 or 2 days (diffDays <= 0 && diffDays >= -2) -> 'expired'
  if (diffDays <= 0) return 'expired';

  // 2. Active conditions:
  // 3 din pehle khatam hone wale (1, 2, or 3 days remaining) -> 'ending_soon'
  if (diffDays <= 3) return 'ending_soon';

  // 3. Normal active
  return 'active';
}

function getMembershipEndingDetails(member) {
  const isPt = !!member.isPt || !!member.ptPlanName || (member.trainerName && member.trainerName !== 'Unassigned' && member.trainerName !== 'General Floor Trainer (Included)' && member.trainerName !== 'No Trainer');
  const gymPlan = member.planName || 'Standard Gym';
  const ptPlan = member.ptPlanName || (isPt ? '1-on-1 PT' : null);

  if (ptPlan && gymPlan) {
    if (member.ptStatus === 'ended') {
      return {
        category: 'both_pt_ended',
        badgeText: '🏋️ Gym Active (PT Ended)',
        shortText: 'Gym Active (PT Ended)',
        badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        tagText: 'Gym Active • PT Completed'
      };
    }
    return {
      category: 'both',
      badgeText: '🏋️ Gym + ✨ PT',
      shortText: 'Gym & PT',
      badgeCls: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300',
      tagText: 'Both Gym & PT Plan'
    };
  }
  if (ptPlan) {
    if (member.ptStatus === 'ended') {
      return {
        category: 'pt_ended',
        badgeText: '🛑 PT Ended',
        shortText: 'PT Ended',
        badgeCls: 'bg-purple-50 text-purple-800 border-purple-300',
        tagText: '1-on-1 PT Ended'
      };
    }
    return {
      category: 'pt',
      badgeText: '✨ 1-on-1 PT Membership',
      shortText: 'PT Only',
      badgeCls: 'bg-purple-50 text-purple-800 border-purple-300',
      tagText: '1-on-1 PT Plan'
    };
  }
  return {
    category: 'gym',
    badgeText: '🏋️ Gym Membership',
    shortText: 'Gym Only',
    badgeCls: 'bg-blue-50 text-blue-800 border-blue-300',
    tagText: 'Gym Plan'
  };
}

function getMemberDaysInfo(member) {
  const status = getMemberStatus(member);
  if (status === 'left') {
    return { text: 'Gym Left', cls: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold' };
  }
  if (status === 'ended') {
    return { text: 'PT Ended', cls: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold' };
  }
  const expiry = toDate(member.expiryDate);
  if (!expiry) return { text: 'No Expiry Set', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  
  if (diff < -2) {
    return { text: `Renewal Due (${Math.abs(diff)}d overdue)`, cls: 'bg-red-100 text-red-800 border-red-300 font-extrabold animate-pulse' };
  }
  if (diff <= 0) {
    const daysAgo = Math.abs(diff) === 0 ? 'Today' : `${Math.abs(diff)}d ago`;
    return { text: `Expired (${daysAgo})`, cls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
  }
  if (diff <= 3) {
    return { text: `Ending Soon (${diff}d left)`, cls: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse' };
  }
  return { 
    text: member.ptStatus === 'ended' ? `Gym Active (${diff}d left)` : `Active (${diff} days left)`, 
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
  };
}

function formatDate(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCountdown(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const STATUS_CONFIG = {
  paid: { label: 'Paid', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  active: { label: 'Active', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  ending_soon: { label: 'Ending Soon (≤3d)', dot: 'bg-amber-500', cls: 'bg-amber-100 text-amber-900 border border-amber-300' },
  expired: { label: 'Expired (1-2d)', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  due: { label: 'Renewal Due (2d+)', dot: 'bg-red-600', cls: 'bg-red-100 text-red-800 border border-red-300 font-extrabold' },
  overdue: { label: 'Renewal Due (2d+)', dot: 'bg-red-600', cls: 'bg-red-100 text-red-800 border border-red-300 font-extrabold' },
  left: { label: 'Left', dot: 'bg-slate-500', cls: 'bg-slate-100 text-slate-700 border border-slate-300 font-bold' },
  ended: { label: 'PT Ended', dot: 'bg-purple-500', cls: 'bg-purple-100 text-purple-800 border border-purple-300 font-bold' },
  inactive: { label: 'Inactive', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

function StatusBadge({ status, dueAmount, member }) {
  if (status === 'left' || member?.status === 'left') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        Left
      </span>
    );
  }

  // If member has ended PT BUT gym membership is still active:
  if (member?.ptStatus === 'ended' && member?.status !== 'ended' && member?.status !== 'left') {
    return (
      <div className="flex flex-col gap-1 items-start">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Gym Active
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          PT Ended
        </span>
      </div>
    );
  }

  if (status === 'ended' || member?.status === 'ended' || member?.status === 'pt_ended') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
        <span className="w-2 h-2 rounded-full bg-purple-600" />
        PT Ended
      </span>
    );
  }

  // 1. If member has paid and due is 0 (or paid full amount), show Paid badge
  const isFullyPaid = !!member?.lastPaymentDate && Number(member?.dueAmount ?? dueAmount ?? 0) <= 0;
  if (isFullyPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Paid
      </span>
    );
  }

  // 2. Only show "Due" badge if member has actually made a partial payment during collection
  const hasPartialDue = Number(member?.dueAmount ?? dueAmount) > 0 && !!member?.lastPaymentDate;
  if (hasPartialDue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Due: ₹{member?.dueAmount ?? dueAmount}
      </span>
    );
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Avatar({ member, size = 'sm' }) {
  const sizeMap = { sm: 'w-10 h-10 text-xs', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' };
  if (member.photoURL) {
    return (
      <img
        src={member.photoURL}
        alt={member.name || member.fullName}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-slate-100 shadow-sm`}
      />
    );
  }
  const initials = (member.name || member.fullName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600'
  ];
  const colorIdx = (member.name || member.fullName || '').charCodeAt(0) % colors.length;
  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

const TIMER_SECONDS = 600;

function InviteLinkModal({ gymId, onClose }) {
  const [memberName, setMemberName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPT, setIsPT] = useState(false);
  const [trainersList, setTrainersList] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('Member@123');
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    async function loadTrainers() {
      try {
        const list = await getTrainers(gymId || 'univo_main');
        setTrainersList(list || []);
        if (list && list.length > 0) setSelectedTrainerId(list[0].id);
      } catch (e) {}
    }
    loadTrainers();
  }, [gymId]);

  const startTimer = useCallback(() => {
    setSecondsLeft(TIMER_SECONDS);
    setExpired(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function handleGenerate() {
    if (!phone.trim()) {
      toast.error('WhatsApp number is required');
      return;
    }
    setGenerating(true);
    try {
      const selTrainer = trainersList.find((t) => t.id === selectedTrainerId);
      const url = await generateInviteToken(gymId || 'univo_main', {
        memberName: memberName.trim(),
        phone: phone.trim(),
        isPT,
        trainerId: isPT ? selectedTrainerId : '',
        trainerName: isPT ? (selTrainer?.name || '') : '',
        loginEmail: isPT ? (loginEmail.trim() || phone.trim()) : '',
        loginPassword: isPT ? (loginPassword.trim() || 'Member@123') : '',
      });
      setLink(url);
      startTimer();
      toast.success(isPT ? 'PT 10-Minute Link & Credentials Ready!' : '10-Minute Invite Link Ready!');
    } catch (e) {
      toast.error('Failed to generate link');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  }

  function handleWhatsApp() {
    const rawNum = phone.replace(/\D/g, '');
    const waPhone = rawNum.length === 10 ? `91${rawNum}` : rawNum;
    const selTrainer = trainersList.find((t) => t.id === selectedTrainerId);

    let extraPtMsg = '';
    if (isPT) {
      const userLogin = loginEmail.trim() || phone.trim();
      const passLogin = loginPassword.trim() || 'Member@123';
      const coachName = selTrainer?.name ? `Coach ${selTrainer.name}` : 'Personal Trainer';
      extraPtMsg = `\n\n🔑 *Your PT Member App Login Credentials:*\n• Login ID / User: *${userLogin}*\n• Password: *${passLogin}*\n• Dedicated Coach: *${coachName}*\n_Use these credentials to log in, interact with your coach, and view customized meal & workout plans!_`;
    }

    const msg = encodeURIComponent(
      `💪 *Welcome to UNIVO GYM MANAGEMENT!*\n\nHi ${memberName || 'Athlete'},\nPlease complete your gym registration form, choose your membership plan & trainer, and sign your liability waiver using this direct link:\n\n🔗 ${link}${extraPtMsg}\n\n⚠️ *Important:* This secure registration link expires in 10 minutes.`
    );
    window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank');
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="📲 10-Min WhatsApp Invite Link & QR Code"
      maxWidth="max-w-xl"
    >
      <div className='space-y-4 text-slate-800'>
        <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950'>
          <Sparkles className='w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5' />
          <p className='leading-relaxed text-[11px] text-emerald-900'>
            Member link open karke ya <strong>QR Code scan karke</strong> apna plan, trainer aur photo khud select & upload karega.
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Member Name (optional)</label>
            <input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder='e.g. Rahul Sharma'
              className='w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white'
            />
          </div>
          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>
              WhatsApp Phone Number <span className='text-rose-500'>*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (!loginEmail) setLoginEmail(e.target.value);
              }}
              placeholder='9876543210'
              className='w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white'
            />
          </div>
        </div>

        {/* PT Membership & Credentials Configuration */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPT}
              onChange={(e) => setIsPT(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Is this link for a Personal Training (PT) Member?
            </span>
          </label>

          {isPT && (
            <div className="space-y-2.5 pt-2 border-t border-indigo-200/70">
              <p className="text-[11px] text-indigo-900 leading-tight">
                PT member ke liye Portal Login ID aur Password set karein jisse wo apne trainer se live chat, diet aur workout le sake:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Assign Personal Trainer / Coach
                </label>
                <select
                  value={selectedTrainerId}
                  onChange={(e) => setSelectedTrainerId(e.target.value)}
                  className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {trainersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialization || 'Fitness Coach'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Member Login ID / Phone
                  </label>
                  <input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={phone || '9876543210'}
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Portal Login Password
                  </label>
                  <input
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Member@123"
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {!link ? (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className='w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold transition shadow-md disabled:opacity-50'
          >
            {generating ? 'Generating...' : isPT ? '⚡ Generate PT Link, QR & Credentials' : '⚡ Generate 10-Minute Link & QR Code'}
          </button>
        ) : (
          <div className='p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5'>
            <div className='flex items-center justify-between text-xs'>
              <span className='font-semibold text-slate-600 flex items-center gap-1.5'>
                <Clock className='w-4 h-4 text-emerald-600' /> Time Remaining:
              </span>
              <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full ${expired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                {expired ? 'EXPIRED' : fmtCountdown(secondsLeft)}
              </span>
            </div>

            {isPT && (
              <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>PT Login: <strong>{loginEmail.trim() || phone.trim()}</strong> | Pass: <strong className="font-mono text-emerald-700">{loginPassword.trim() || 'Member@123'}</strong></span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 shrink-0">PT Link</span>
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center pt-1'>
              <div className='space-y-2.5 flex flex-col justify-center'>
                <div>
                  <label className='text-[10px] font-bold text-slate-500 uppercase block mb-1'>Direct Registration Link</label>
                  <input
                    readOnly
                    value={link}
                    className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono select-all'
                  />
                </div>

                <div className='flex flex-col gap-2'>
                  <button
                    onClick={handleCopy}
                    className='w-full py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm'
                  >
                    <Copy className='w-3.5 h-3.5' /> Copy Link
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className='w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20'
                  >
                    Send via WhatsApp
                  </button>
                </div>
              </div>

              <div className='p-3 bg-white border-2 border-emerald-100 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm'>
                <p className='text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1'>
                  <QrCode className='w-3.5 h-3.5 text-emerald-600' /> Scan to Register
                </p>
                <div className='p-2 bg-white rounded-xl border border-slate-200 shadow-inner flex items-center justify-center'>
                  <QRCodeSVG
                    value={link}
                    size={135}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className='text-[10px] text-slate-500 mt-1.5 max-w-[180px] leading-tight'>
                  Scan with mobile camera to create ID instantly.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Modal to extend member membership date (+7, +10, +15, +30 or custom days) and collect fee
 */
function ExtendModal({ member, onClose, onSave, gymId }) {
  const [daysPreset, setDaysPreset] = useState(10);
  const [customDays, setCustomDays] = useState('');
  const [fee, setFee] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveDays = daysPreset === 'custom' ? Number(customDays) || 0 : Number(daysPreset);

  const currentExpiry = toDate(member?.expiryDate);
  const now = new Date();
  const baseDate = (currentExpiry && currentExpiry > now) ? new Date(currentExpiry) : new Date(now);
  const targetDate = new Date(baseDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (effectiveDays <= 0) {
      toast.error('Please specify valid extension days');
      return;
    }

    setLoading(true);
    try {
      const newExpiryIso = targetDate.toISOString();
      await updateMember(member.id, {
        expiryDate: newExpiryIso,
        status: 'active',
        active: true
      });

      if (Number(fee) > 0) {
        try {
          await addPayment({
            memberId: member.id,
            memberName: member.name || member.fullName,
            gymId: gymId || 'univo_main',
            amount: Number(fee),
            paidAmount: Number(fee),
            dueAmount: 0,
            mode: paymentMode,
            plan: `${member.planName || 'Membership'} (Extended +${effectiveDays} Days)`,
            date: new Date().toISOString(),
            notes: notes ? `Extension: ${notes}` : `Extended membership by ${effectiveDays} days`
          });
        } catch (payErr) {
          console.warn('Payment record warning:', payErr);
        }
      }

      toast.success(`Membership extended by ${effectiveDays} days until ${formatDate(targetDate)}!`);
      onSave(member.id, newExpiryIso);
      onClose();
    } catch (err) {
      console.error('Error extending membership:', err);
      toast.error('Failed to extend membership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="📅 Extend Membership Date"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className='space-y-4 text-slate-800'>
        <div className='p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between'>
          <div>
            <p className='font-bold text-slate-900 text-sm'>{member.name || member.fullName}</p>
            <p className='text-xs text-slate-500'>{member.phone} • {member.planName || 'General Plan'}</p>
          </div>
          <div className='text-right'>
            <span className='text-[10px] uppercase font-bold text-slate-400 block'>Current Expiry</span>
            <span className='text-xs font-semibold text-slate-700'>{formatDate(member.expiryDate)}</span>
          </div>
        </div>

        <div>
          <label className='block text-xs font-bold text-slate-700 mb-2'>
            Select Extension Days <span className='text-emerald-600'>(10 Days recommended)</span>
          </label>
          <div className='grid grid-cols-4 gap-2'>
            {[7, 10, 15, 30].map((d) => (
              <button
                type='button'
                key={d}
                onClick={() => setDaysPreset(d)}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition flex flex-col items-center justify-center ${
                  daysPreset === d
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>+{d} Days</span>
                {d === 10 && <span className='text-[9px] opacity-90'>Popular</span>}
              </button>
            ))}
          </div>

          <div className='mt-2.5 flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setDaysPreset('custom')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                daysPreset === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Custom Days
            </button>
            {daysPreset === 'custom' && (
              <input
                type='number'
                min='1'
                max='365'
                placeholder='Enter days (e.g. 12)'
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className='flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500'
                autoFocus
              />
            )}
          </div>
        </div>

        <div className='p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between'>
          <span className='text-xs font-medium text-slate-600 flex items-center gap-1.5'>
            <Calendar className='w-4 h-4 text-emerald-600' /> New Expiry Date:
          </span>
          <span className='text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg'>
            {formatDate(targetDate)} (+{effectiveDays}d)
          </span>
        </div>

        <div className='border-t border-slate-100 pt-3 space-y-3'>
          <div className='grid grid-cols-2 gap-2.5'>
            <div>
              <label className='block text-xs font-semibold text-slate-700 mb-1'>
                Extension Fee (₹) <span className='text-slate-400'>(Optional)</span>
              </label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold'>₹</span>
                <input
                  type='number'
                  placeholder='0'
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className='w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500'
                />
              </div>
            </div>

            <div>
              <label className='block text-xs font-semibold text-slate-700 mb-1'>Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500'
              >
                <option value='cash'>Cash</option>
                <option value='online'>UPI / Online</option>
                <option value='bank'>Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Remarks / Reason (Optional)</label>
            <input
              type='text'
              placeholder='e.g. 10 days extra allowance for exam / travel'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500'
            />
          </div>
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={loading || effectiveDays <= 0}
            className='flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50'
          >
            {loading ? 'Extending...' : `Confirm +${effectiveDays} Days Extension`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CollectFeeModal({ member, gymId, onClose, onSave, trainers = [], plans = [] }) {
  const settings = getGymSettings();

  const DEFAULT_PLANS_CATALOG = [
    { id: "p1", name: "1-Month Basic", durationMonths: 1, durationDays: 30, price: 2500, label: "1-Month Basic — ₹2,500" },
    { id: "p2", name: "3-Month Pro", durationMonths: 3, durationDays: 90, price: 6500, label: "3-Month Pro — ₹6,500" },
    { id: "p3", name: "6-Month Transformation", durationMonths: 6, durationDays: 180, price: 11000, label: "6-Month Transformation — ₹11,000" },
    { id: "p4", name: "Annual Elite Plan", durationMonths: 12, durationDays: 365, price: 18000, label: "Annual Elite Plan — ₹18,000" },
  ];

  const DEFAULT_PT_PLANS = [
    { id: "pt1", name: "1 Month 1-on-1 PT", price: 4500, duration: "1 Month" },
    { id: "pt2", name: "3 Months Transformation PT", price: 12000, duration: "3 Months" },
    { id: "pt3", name: "6 Months Elite PT", price: 21000, duration: "6 Months" },
    { id: "pt4", name: "Annual Pro VIP PT", price: 36000, duration: "12 Months" },
  ];

  const PLANS_CATALOG = useMemo(() => {
    let list = [];
    if (plans && plans.length > 0) {
      list = plans.map(p => ({
        id: p.id,
        name: p.name,
        durationMonths: Number(p.durationMonths || Math.round(Number(p.duration || 30) / 30) || 1),
        durationDays: Number(p.duration || (p.durationMonths ? p.durationMonths * 30 : 30)),
        price: Number(p.price || 0),
        label: `${p.name} — ₹${Number(p.price || 0).toLocaleString("en-IN")}`
      }));
    } else {
      list = [...DEFAULT_PLANS_CATALOG];
    }

    // Always include member's assigned plan if not present in the list
    if (member?.planName) {
      const exists = list.some(p => p.id === member.planId || p.name.toLowerCase() === member.planName.toLowerCase());
      if (!exists) {
        list.unshift({
          id: member.planId || "m_cur_plan",
          name: member.planName,
          durationMonths: Number(member.durationMonths || 1),
          durationDays: Number(member.durationMonths ? member.durationMonths * 30 : 30),
          price: Number(member.planPrice || 2500),
          label: `${member.planName} — ₹${Number(member.planPrice || 2500).toLocaleString("en-IN")}`
        });
      }
    }
    return list;
  }, [plans, member]);

  // Only true if member previously paid partially during collection
  const hasPartialPaymentDue = Number(member.dueAmount || 0) > 0 && !!member.lastPaymentDate;
  const existingDueAmount = Number(member.dueAmount || 0);

  // Check if member is renewing an ending soon, expired, or due plan
  const memberStatus = getMemberStatus(member);
  const isRenewing = ['ending_soon', 'expired', 'due', 'overdue'].includes(memberStatus) || (member.lastPaymentDate && !hasPartialPaymentDue);

  // Match initial plan from member or default to first
  const initialPlan = PLANS_CATALOG.find((p) =>
    (member.planId && p.id === member.planId) ||
    (member.planName && p.name.toLowerCase() === member.planName.toLowerCase()) ||
    (member.planName && (p.name.toLowerCase().includes(member.planName.toLowerCase()) || member.planName.toLowerCase().includes(p.name.toLowerCase())))
  ) || PLANS_CATALOG[0];

  const [selectedPlanId, setSelectedPlanId] = useState(initialPlan.id);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Available trainers and PT states
  const availableTrainers = useMemo(() => {
    return trainers && trainers.length > 0 ? trainers : [];
  }, [trainers]);

  const [selectedTrainerName, setSelectedTrainerName] = useState(member.trainerName || "General Floor Trainer (Included)");
  const [selectedPtPlanId, setSelectedPtPlanId] = useState(member.ptPlanId || (member.ptPlanName ? "pt_cur" : ""));
  const [selectedPtPlanName, setSelectedPtPlanName] = useState(member.ptPlanName || "");
  const [selectedPtPrice, setSelectedPtPrice] = useState(Number(member.ptPlanPrice || 0));

  const isTrainerSelected = selectedTrainerName && selectedTrainerName !== "General Floor Trainer (Included)" && selectedTrainerName !== "No Trainer";
  const selectedTrainerObj = availableTrainers.find(t => (t.name || t.fullName) === selectedTrainerName);

  const currentTrainerPtPlans = useMemo(() => {
    let list = [];
    if (selectedTrainerObj && selectedTrainerObj.ptPlans && selectedTrainerObj.ptPlans.length > 0) {
      list = [...selectedTrainerObj.ptPlans];
    } else {
      list = [...DEFAULT_PT_PLANS];
    }
    if (member.ptPlanName && !list.some(p => p.name.toLowerCase() === member.ptPlanName.toLowerCase())) {
      list.unshift({
        id: member.ptPlanId || "pt_existing",
        name: member.ptPlanName,
        price: Number(member.ptPlanPrice || 4500),
        duration: member.ptDuration || "1 Month"
      });
    }
    return list;
  }, [selectedTrainerObj, member]);

  // Smart validity start: if member has never paid yet, start from admission/joining date or today!
  const getSmartValidityStart = () => {
    if (!member.lastPaymentDate) {
      if (member.joiningDate) {
        return toDate(member.joiningDate)?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
      }
      if (member.createdAt) {
        return toDate(member.createdAt)?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
      }
      return new Date().toISOString().split("T")[0];
    }

    if (member.expiryDate) {
      const expDate = toDate(member.expiryDate);
      const now = new Date();
      if (expDate && expDate > now) {
        const nextDay = new Date(expDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay.toISOString().split("T")[0];
      }
    }
    return new Date().toISOString().split("T")[0];
  };

  const [validityStart, setValidityStart] = useState(getSmartValidityStart());
  const [validityEnd, setValidityEnd] = useState("");
  const [paymentType, setPaymentType] = useState("full"); // "full" or "partial"
  const [paymentMode, setPaymentMode] = useState("cash"); // "cash", "online", "bank", "split"
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  // Add-on Gym Services (Steam & Sauna, Locker, Diet Consultation, etc.)
  const [selectedServices, setSelectedServices] = useState(() => {
    if (Array.isArray(member.selectedServices) && member.selectedServices.length > 0) {
      return member.selectedServices;
    }
    return [];
  });
  const [availableServices, setAvailableServices] = useState([]);

  useEffect(() => {
    async function loadGymServices() {
      try {
        const s = await getServices(gymId || "univo_main");
        if (s && s.length > 0) {
          const activeOnly = s.filter((item) => item.isActive !== false);
          setAvailableServices(activeOnly.length > 0 ? activeOnly : DEFAULT_SERVICES);
        } else {
          setAvailableServices(DEFAULT_SERVICES);
        }
      } catch (e) {
        setAvailableServices(DEFAULT_SERVICES);
      }
    }
    loadGymServices();
  }, [gymId]);

  const servicesTotal = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  }, [selectedServices]);

  const toggleServiceSelection = (srv) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === srv.id || s.name === srv.name);
      if (exists) {
        return prev.filter((s) => s.id !== srv.id && s.name !== srv.name);
      } else {
        return [
          ...prev,
          {
            id: srv.id,
            name: srv.name,
            price: Number(srv.price || 0),
            category: srv.category || "General",
            billingType: srv.billingType || "Per Month",
          },
        ];
      }
    });
  };

  const currentPlan = PLANS_CATALOG.find((p) => p.id === selectedPlanId) || PLANS_CATALOG[0];
  const targetPayableTotal = hasPartialPaymentDue
    ? existingDueAmount
    : Math.max(0, currentPlan.price + Number(selectedPtPrice || 0) + Number(servicesTotal || 0) - Number(discountAmount || 0));
  const calculatedTotal = targetPayableTotal;

  const [payingNow, setPayingNow] = useState(hasPartialPaymentDue ? existingDueAmount : (initialPlan.price + Number(member.ptPlanPrice || 0) + (Array.isArray(member.selectedServices) ? member.selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0) : 0)));

  // Auto calculate validity end date
  useEffect(() => {
    if (validityStart) {
      const d = new Date(validityStart);
      d.setMonth(d.getMonth() + Number(currentPlan.durationMonths));
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      setValidityEnd(`${day}/${month}/${year}`);
    }
  }, [validityStart, selectedPlanId]);

  // Sync paying now when total or payment type changes
  useEffect(() => {
    if (paymentType === "full") {
      setPayingNow(calculatedTotal);
    }
  }, [calculatedTotal, paymentType]);

  // Split payment auto-calculation logic (half default, typing in one updates the other)
  const handleSelectPaymentMode = (modeKey) => {
    setPaymentMode(modeKey);
    if (modeKey === "split") {
      const total = Number(payingNow || 0);
      const half = Math.floor(total / 2);
      setCashAmount(String(half));
      setOnlineAmount(String(total - half));
    }
  };

  const handleCashChange = (val) => {
    setCashAmount(val);
    if (val === "") {
      setOnlineAmount(String(payingNow || 0));
      return;
    }
    const num = Number(val) || 0;
    const total = Number(payingNow || 0);
    const remaining = Math.max(0, total - num);
    setOnlineAmount(String(remaining));
  };

  const handleOnlineChange = (val) => {
    setOnlineAmount(val);
    if (val === "") {
      setCashAmount(String(payingNow || 0));
      return;
    }
    const num = Number(val) || 0;
    const total = Number(payingNow || 0);
    const remaining = Math.max(0, total - num);
    setCashAmount(String(remaining));
  };

  useEffect(() => {
    if (paymentMode === "split") {
      const total = Number(payingNow || 0);
      const numCash = Number(cashAmount) || 0;
      if (numCash > 0 && numCash <= total) {
        setOnlineAmount(String(total - numCash));
      } else {
        const half = Math.floor(total / 2);
        setCashAmount(String(half));
        setOnlineAmount(String(total - half));
      }
    }
  }, [payingNow, paymentMode]);

  const remainingDue = Math.max(0, calculatedTotal - Number(payingNow || 0));

  const toIndianDate = (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleCollect = async (sendWhatsApp = false) => {
    setLoading(true);
    const memberName = member.name || member.fullName || "Member";
    const phone = member.phone || "";
    const memberSlot = member.slot || member.workoutSlot || "General Shift";

    // Target expiry ISO for member doc (keep existing expiry if collecting remaining balance)
    let newExpiryIso;
    if (hasPartialPaymentDue && member.expiryDate) {
      newExpiryIso = member.expiryDate;
    } else if (validityEnd && validityEnd.includes("/")) {
      const [d, m, y] = validityEnd.split("/");
      newExpiryIso = new Date(`${y}-${m}-${d}T23:59:59.000Z`).toISOString();
    } else {
      newExpiryIso = new Date(Date.now() + currentPlan.durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const newPaymentRecord = {
      id: "bill_" + Date.now(),
      memberId: member.id,
      memberName,
      phone,
      slot: memberSlot,
      batch: member.batch || "Alpha Gym",
      selectedServices: selectedServices.map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price || 0),
        category: s.category || "General",
        billingType: s.billingType || "Per Month",
      })),
      servicesTotalPrice: servicesTotal,
      planName: hasPartialPaymentDue 
        ? `${member.planName || currentPlan.name}${selectedPtPlanName ? ` + PT (${selectedPtPlanName})` : ''}${servicesTotal > 0 ? ` + Services (${selectedServices.map((s) => s.name).join(', ')})` : ''} (Due Balance Settlement)` 
        : `${currentPlan.name}${selectedPtPlanName ? ` + PT (${selectedPtPlanName})` : ''}${servicesTotal > 0 ? ` + Services (${selectedServices.map((s) => s.name).join(', ')})` : ''}`,
      validityStart: toIndianDate(validityStart),
      validityEnd: hasPartialPaymentDue && member.expiryDate ? toIndianDate(member.expiryDate) : validityEnd,
      dueDate: validityEnd,
      planPrice: currentPlan.price,
      ptPlanPrice: Number(selectedPtPrice || 0),
      servicesPrice: Number(servicesTotal || 0),
      discount: Number(discountAmount || 0),
      amount: calculatedTotal,
      paidAmount: Number(payingNow),
      dueAmount: remainingDue,
      paymentMode,
      cashAmount: Number(cashAmount || 0),
      onlineAmount: Number(onlineAmount || 0),
      paymentType,
      remarks: remarks || (paymentMode === "split" ? `Cash: ₹${cashAmount}, Online: ₹${onlineAmount}` : (hasPartialPaymentDue ? "Balance Due Payment" : "")),
      date: toIndianDate(new Date()),
      status: remainingDue > 0 ? "partial" : "paid",
    };

    try {
      // 1. Update Member in Firestore & UI
      const updatedFields = {
        ...(hasPartialPaymentDue ? {} : { 
          planName: currentPlan.name, 
          planPrice: currentPlan.price,
          trainerName: selectedTrainerName,
          trainerId: selectedTrainerObj?.id || member.trainerId || '',
          hasPersonalCoach: isTrainerSelected && Number(selectedPtPrice) > 0,
          ptPlanId: selectedPtPlanId,
          ptPlanName: selectedPtPlanName,
          ptPlanPrice: Number(selectedPtPrice || 0),
          selectedServices: selectedServices.map((s) => ({
            id: s.id,
            name: s.name,
            price: Number(s.price || 0),
            category: s.category || "General",
            billingType: s.billingType || "Per Month",
          })),
          servicesTotalPrice: servicesTotal,
        }),
        expiryDate: newExpiryIso,
        status: "active",
        active: true,
        dueAmount: remainingDue,
        paidAmount: Number(member.paidAmount || 0) + Number(payingNow),
        lastPaymentDate: new Date().toISOString()
      };

      await updateMember(member.id, updatedFields);

      // 2. Record Payment in payments
      try {
        await addPayment(gymId || "univo_main", newPaymentRecord);
      } catch (pErr) {
        console.warn("Payment record warning:", pErr);
      }

      toast.success(`Fee collected successfully for ${memberName}!`);

      // 3. Update parent list
      onSave(member.id, updatedFields);

      // 4. Online Receipt Web Link (Member can click link anytime to view & download official receipt)
      const receiptLink = `${window.location.origin}/#/receipt/${newPaymentRecord.id}`;

      // 5. If WhatsApp requested, open WhatsApp with receipt link & details
      if (sendWhatsApp && phone) {
        const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName || 'UNIVO GYM'}*\n\nHello *${memberName}*,\nThank you for your payment! Here are your membership billing details:\n\n📋 *Plan:* ${currentPlan.name}${selectedPtPlanName ? ` + PT (${selectedPtPlanName})` : ''}\n🏋️ *Trainer:* ${selectedTrainerName || 'General Floor Trainer'}\n📅 *Validity:* ${newPaymentRecord.validityStart} to ${newPaymentRecord.validityEnd}\n💰 *Total Plan Fee:* ₹${calculatedTotal}\n✅ *Amount Paid:* ₹${payingNow} (${paymentMode.toUpperCase()})\n${remainingDue > 0 ? `⚠️ *Remaining Due:* ₹${remainingDue}\n` : "✨ *Status:* FULLY PAID\n"}\n🔗 *View & Download Official Receipt Online:*\n${receiptLink}\n\nStay fit and keep crushing your workouts! 💪`;
        openWhatsApp(phone, msg);
      }

      onClose();
    } catch (err) {
      console.error("Error collecting fee:", err);
      toast.error("Failed to collect fee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        hasPartialPaymentDue
          ? `Collect Remaining Due — ${member.name || member.fullName}`
          : isRenewing
          ? `⚡ Renew Membership & Plan — ${member.name || member.fullName}`
          : `Collect Admission & Plan Fee — ${member.name || member.fullName}`
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-slate-800 text-xs">
        {/* Renewal Banner if Member's plan is ending soon or expired */}
        {isRenewing && !hasPartialPaymentDue && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ⚡
              </div>
              <div>
                <p className="font-bold text-xs text-emerald-950">Membership Renewal (मेंबरशिप रिन्यू)</p>
                <p className="text-[11px] text-emerald-800 font-medium">
                  {memberStatus === 'ending_soon'
                    ? `Current plan ending soon on ${formatDate(member.expiryDate)}. New plan validity will start immediately from ${formatDate(validityStart)}.`
                    : `Plan has ended on ${formatDate(member.expiryDate)}. Renewing will reactivate member with a fresh validity cycle.`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-xs tracking-wide">
                Renew Cycle
              </span>
            </div>
          </div>
        )}

        {/* Due Balance Alert Banner if Member has pending dues from previous collection */}
        {hasPartialPaymentDue && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                ⚠️
              </div>
              <div>
                <p className="font-bold text-xs text-amber-950">Pending Balance Due (पिछली बाकी फीस)</p>
                <p className="text-[11px] text-amber-800 font-medium">
                  Outstanding balance of <b className="text-amber-950 font-extrabold">₹{existingDueAmount}</b> for current plan ({member.planName || "Active Plan"}).
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-black text-xs shadow-xs tracking-wide">
                Due: ₹{existingDueAmount}
              </span>
            </div>
          </div>
        )}

        {/* Member Card Header with Univo Gym Brand Gradient Banner */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-md">
          {/* Subtle Decorative glow background */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white font-extrabold flex items-center justify-center text-lg shadow-md border border-white/20">
                {(member.name || member.fullName || "M")[0]?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {member.name || member.fullName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                    Active Member
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300 text-[11px] mt-1">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Smartphone className="w-3 h-3 text-indigo-400" />
                    {member.phone || "No phone"}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    {member.slot || member.workoutSlot || "General Shift"}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
              <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">
                CURRENT EXPIRY
              </p>
              <p className="text-xs font-black text-emerald-300 mt-0.5">
                {formatDate(member.expiryDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Select Membership Plan and Discount */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${hasPartialPaymentDue ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              SELECT MEMBERSHIP PLAN (प्लान चुनें) *
            </label>
            <div className="relative">
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-300 hover:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition shadow-2xs"
              >
                {PLANS_CATALOG.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              SPECIAL DISCOUNT (छूट ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
              <input
                type="number"
                placeholder="e.g. 100"
                value={discountAmount || ""}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 hover:bg-white border border-slate-300 hover:border-emerald-400 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Coach & Personal Training (PT) Selection Card */}
        <div className={`p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-200 space-y-2.5 shadow-2xs ${hasPartialPaymentDue ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-purple-600" />
              Coach & Personal Training (PT) Add-on
            </span>
            {selectedPtPrice > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-[10px] border border-purple-300">
                ✨ PT Active (+₹{Number(selectedPtPrice).toLocaleString('en-IN')})
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                No PT (Floor Only)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assigned Trainer Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">
                Assigned Coach / Trainer
              </label>
              <div className="relative">
                <select
                  value={selectedTrainerName}
                  onChange={(e) => {
                    const newTName = e.target.value;
                    setSelectedTrainerName(newTName);
                    const tObj = availableTrainers.find(t => (t.name || t.fullName) === newTName);
                    if (!tObj || newTName === 'General Floor Trainer (Included)' || newTName === 'No Trainer') {
                      setSelectedPtPlanId('');
                      setSelectedPtPlanName('');
                      setSelectedPtPrice(0);
                    } else if (tObj.ptPlans && tObj.ptPlans.length > 0) {
                      setSelectedPtPlanId(tObj.ptPlans[0].id);
                      setSelectedPtPlanName(tObj.ptPlans[0].name);
                      setSelectedPtPrice(Number(tObj.ptPlans[0].price || 0));
                    }
                  }}
                  className="w-full appearance-none bg-white border border-slate-300 hover:border-indigo-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="General Floor Trainer (Included)">General Floor Trainer (Included)</option>
                  {availableTrainers.filter(t => t.name !== 'General Floor Trainer (Included)').map(t => (
                    <option key={t.id || t.name} value={t.name || t.fullName}>
                      🏋️ Coach {t.name || t.fullName} {t.specialization ? `(${t.specialization})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* PT Package Selection Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">
                PT Package / Coaching Plan
              </label>
              <div className="relative">
                <select
                  disabled={!isTrainerSelected}
                  value={selectedPtPlanName || "none"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || val === 'none') {
                      setSelectedPtPlanId('');
                      setSelectedPtPlanName('');
                      setSelectedPtPrice(0);
                    } else {
                      const foundPkg = currentTrainerPtPlans.find(p => p.name === val);
                      if (foundPkg) {
                        setSelectedPtPlanId(foundPkg.id || '');
                        setSelectedPtPlanName(foundPkg.name);
                        setSelectedPtPrice(Number(foundPkg.price || 0));
                      }
                    }
                  }}
                  className="w-full appearance-none bg-white border border-slate-300 hover:border-purple-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="none">No PT Package (₹0)</option>
                  {currentTrainerPtPlans.map((pkg, idx) => (
                    <option key={pkg.id || idx} value={pkg.name}>
                      {pkg.name} — (+₹{Number(pkg.price || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Add-on Gym Services (Steam & Sauna, Locker, Diet Consultation, etc.) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-slate-50 border border-teal-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="font-extrabold text-teal-950 text-xs">
                Add-on Gym Services & Facilities (अतिरिक्त सेवाएं)
              </span>
            </div>
            {selectedServices.length > 0 ? (
              <span className="text-[10px] font-black bg-teal-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                {selectedServices.length} Selected (+₹{servicesTotal.toLocaleString('en-IN')})
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Optional
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600">
            Member ne jo services li hain unhe check karein. Yahan se service <b>add</b> ya <b>hata (remove)</b> sakte hain:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableServices.map((srv) => {
              const isChecked = selectedServices.some((s) => s.id === srv.id || s.name === srv.name);
              const sPrice = Number(srv.price || 0);

              return (
                <div
                  key={srv.id}
                  onClick={() => toggleServiceSelection(srv)}
                  className={`p-2.5 rounded-xl border-2 cursor-pointer transition flex items-center justify-between gap-2 select-none ${
                    isChecked
                      ? 'bg-teal-50 border-teal-500 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 pointer-events-none"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{srv.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{srv.category || 'Facility'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-extrabold shrink-0 ${isChecked ? 'text-teal-800' : 'text-slate-700'}`}>
                    +₹{sPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Membership Bill Validity Period Box (Enhanced) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200 space-y-2.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Membership Validity Period ({currentPlan.durationMonths} Month duration):
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-[11px] shadow-xs tracking-wide">
              {toIndianDate(validityStart)} → {validityEnd}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-emerald-950 uppercase tracking-wider block mb-1">
                Validity Start Date (शुरू दिनांक) *
              </label>
              <input
                type="date"
                value={validityStart}
                onChange={(e) => setValidityStart(e.target.value)}
                className="w-full bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-emerald-950 uppercase tracking-wider block mb-1">
                Validity End / Due Date (समाप्ति / अगली फीस) *
              </label>
              <input
                type="text"
                value={validityEnd}
                onChange={(e) => setValidityEnd(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Fee Summary Banner */}
        <div className="p-3 px-4 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">
              {currentPlan.name} (₹{currentPlan.price})
            </span>
            {selectedPtPrice > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-purple-900/70 text-purple-200 font-bold text-[10px] border border-purple-700/60">
                + PT {selectedPtPlanName ? `(${selectedPtPlanName})` : ''}: ₹{selectedPtPrice}
              </span>
            )}
            {servicesTotal > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-teal-900/70 text-teal-200 font-bold text-[10px] border border-teal-700/60">
                + Services: ₹{servicesTotal}
              </span>
            )}
            {discountAmount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                Discount -₹{discountAmount}
              </span>
            )}
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-bold mr-2">TOTAL PAYABLE:</span>
            <span className="font-black text-emerald-400 text-base tracking-tight">
              ₹{calculatedTotal}
            </span>
          </div>
        </div>

        {/* Payment Type Selection (Full vs Partial) */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
            PAYMENT TYPE (भुगतान प्रकार)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentType("full")}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                paymentType === "full"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${paymentType === "full" ? "text-white" : "text-slate-400"}`} />
              Full Payment (पूरा ₹{calculatedTotal})
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentType("partial");
                setPayingNow(Math.floor(calculatedTotal / 2));
              }}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                paymentType === "partial"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Split className={`w-4 h-4 ${paymentType === "partial" ? "text-white" : "text-slate-400"}`} />
              Partial / Installment (किस्त)
            </button>
          </div>

          {/* If Partial is selected, show Amount Paying Now input */}
          {paymentType === "partial" && (
            <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-xl space-y-1.5 animate-in fade-in duration-150">
              <label className="text-[11px] font-black text-amber-950 uppercase block">
                Amount Paying Now (आज कितना जमा कर रहे हैं) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-amber-700">₹</span>
                <input
                  type="number"
                  value={payingNow}
                  onChange={(e) => setPayingNow(Number(e.target.value) || 0)}
                  max={calculatedTotal}
                  className="w-full bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl pl-8 pr-3 py-2 text-sm font-black text-slate-900 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Stat Cards: Total, Paying Now, Remaining Due */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TOTAL PLAN FEE</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">₹{calculatedTotal}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">PAYING NOW</p>
              <p className="text-sm font-black text-emerald-700 mt-0.5">₹{payingNow}</p>
            </div>

            <div className={`p-2.5 rounded-xl border text-center transition ${remainingDue > 0 ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${remainingDue > 0 ? "text-rose-700" : "text-slate-500"}`}>
                REMAINING DUE (बाकी)
              </p>
              <p className={`text-sm font-black mt-0.5 ${remainingDue > 0 ? "text-rose-600" : "text-slate-700"}`}>
                ₹{remainingDue}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Mode (Cash, UPI / QR, Bank, Split) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
            PAYMENT MODE (भुगतान माध्यम) *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: "cash", label: "Cash", icon: Banknote, color: "hover:border-emerald-400" },
              { key: "online", label: "UPI / QR", icon: Smartphone, color: "hover:border-indigo-400" },
              { key: "bank", label: "Bank Transfer", icon: Building2, color: "hover:border-blue-400" },
              { key: "split", label: "Split (Cash+UPI)", icon: Split, color: "hover:border-amber-400" },
            ].map((m) => {
              const IconComp = m.icon;
              const isSelected = paymentMode === m.key;
              return (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => handleSelectPaymentMode(m.key)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1.5 transition ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : `bg-white border-slate-200 text-slate-700 hover:bg-slate-50 ${m.color}`
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-600"}`} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Split Amount Inputs if Split is chosen */}
          {paymentMode === "split" && (
            <div className="p-3.5 bg-amber-500/10 border-2 border-amber-400/80 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-amber-950 flex items-center gap-1">
                    💵 Cash Amount (₹)
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">Auto-syncs with UPI</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-amber-800">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={cashAmount}
                    onChange={(e) => handleCashChange(e.target.value)}
                    className="w-full bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl pl-7 pr-3 py-2 font-black text-slate-900 focus:outline-none transition shadow-2xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-amber-950 flex items-center gap-1">
                    📱 UPI / QR Amount (₹)
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">Auto-syncs with Cash</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-indigo-700">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={onlineAmount}
                    onChange={(e) => handleOnlineChange(e.target.value)}
                    className="w-full bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl pl-7 pr-3 py-2 font-black text-slate-900 focus:outline-none transition shadow-2xs"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 text-[11px] text-amber-950 font-bold bg-amber-100/80 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-1 border border-amber-300">
                <span>Split Total: <b className="text-slate-900">₹{Number(cashAmount || 0) + Number(onlineAmount || 0)}</b> / ₹{payingNow}</span>
                <span className="text-emerald-800 font-black">✓ Ek jagah badalne par doosra apne aap calculate hota hai</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Remarks / Transaction ID */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
            PAYMENT REMARKS / TRANSACTION ID (OPTIONAL)
          </label>
          <input
            type="text"
            placeholder="e.g. GPay UPI Ref #481928 / ₹500 cash advance received"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full bg-slate-50 hover:bg-white border border-slate-300 hover:border-indigo-400 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 transition shadow-2xs"
          />
        </div>

        {/* Modal Actions matching user design */}
        <div className="pt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleCollect(false)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            {loading ? "Processing..." : `Collect ₹${payingNow} Only`}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleCollect(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-white" />
            {loading ? "Processing..." : `Collect ₹${payingNow} & WhatsApp Bill`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

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
 * Modal to Edit ALL Member Information (Matches DirectAddMemberModal)
 */
function EditMemberModal({ member, initialTab = 'personal', onClose, onSave, trainers = [], plans = [], existingMembers = [] }) {
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
      onSave(member.id, payload);
      onClose();
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
                      Coach Schedule: {selectedTrainerObj.name}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeSlots.map((s) => {
                    const fullText = s.time ? `${s.label} (${s.time})` : s.label;
                    const isSelected = slot === fullText || slot === s.label;

                    const bookedAthletes = isPersonalTrainer
                      ? (trainerSlotOccupancy[fullText] || trainerSlotOccupancy[s.label] || trainerSlotOccupancy[s.time] || [])
                      : [];
                    const bookedCount = bookedAthletes.length;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSlot(fullText)}
                        className={`p-2.5 rounded-xl border text-left transition text-xs font-semibold flex flex-col justify-between ${
                          isSelected
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
                                  bookedCount === 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : bookedCount === 1
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300 animate-pulse'
                                }`}
                              >
                                {bookedCount === 0 ? '🟢 Free' : bookedCount === 1 ? '🟡 1 Booked' : `🔴 ${bookedCount} Busy`}
                              </span>
                            )}
                          </div>
                          {s.time && <p className="text-[10px] text-slate-500 mt-0.5">{s.time}</p>}
                        </div>

                        {isPersonalTrainer && bookedCount > 0 && (
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
                  if (!isPersonalTrainer) return null;
                  const curBooked = trainerSlotOccupancy[slot] || [];
                  if (curBooked.length >= 2) {
                    return (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900 animate-in fade-in duration-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-tight">
                          <strong className="font-extrabold text-rose-800">Trainer Slot Overbooked! </strong>
                          Coach <strong>{selectedTrainerObj.name}</strong> ke paas is slot (<strong>{slot}</strong>) mein pehle se <strong>{curBooked.length} athletes</strong> booked hain ({curBooked.join(', ')}).
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

/**
 * Modal to mark a Gym Member as Left (Gym Chhod Diya)
 */
function LeftModal({ member, onClose, onSave }) {
  const [reason, setReason] = useState('Stopped coming / Gym left');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const presetReasons = [
    'Stopped coming / Gym left',
    'Membership expired & did not renew',
    'Relocated / Out of town',
    'Personal / Family reason',
    'Health / Injury break',
    'Discontinued by Gym Management',
    'Other'
  ];

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalReason = reason === 'Other' ? (customReason || 'Other') : reason;
      await updateMember(member.id, {
        status: 'left',
        active: false,
        leftAt: new Date().toISOString(),
        leftReason: finalReason
      });

      toast.success(`${member.name || member.fullName} marked as Left`);
      onSave(member.id, finalReason);
      onClose();
    } catch (err) {
      console.error('Error marking member as left:', err);
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🚪 Mark Gym Member as Left"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className='space-y-4 text-slate-800'>
        <div className='p-3.5 bg-slate-100 border border-slate-300 rounded-2xl flex items-start gap-2.5'>
          <LogOut className='w-5 h-5 text-slate-700 flex-shrink-0 mt-0.5' />
          <div className='text-xs'>
            <p className='font-bold text-slate-900'>Mark {member.name || member.fullName} as Left?</p>
            <p className='text-slate-600 mt-0.5 leading-relaxed'>
              Inka Gym Membership chhoot gaya hai. Yeh member Active list se hat kar <strong>🚪 Left</strong> filter tab me chala jayega. Aap jab chahe wapas reactivate kar sakte hain.
            </p>
          </div>
        </div>

        <div>
          <label className='block text-xs font-bold text-slate-700 mb-1.5'>Reason for Leaving</label>
          <div className='space-y-1.5 max-h-56 overflow-y-auto pr-1'>
            {presetReasons.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                  reason === r
                    ? 'bg-slate-200/70 border-slate-400 text-slate-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type='radio'
                  name='leftReason'
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className='accent-slate-700'
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <input
              type='text'
              placeholder='Specify reason...'
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className='mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-500'
              autoFocus
            />
          )}
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={loading}
            className='flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-md disabled:opacity-50'
          >
            {loading ? 'Marking...' : '🚪 Confirm Mark as Left'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Modal to mark a PT Member's package as Ended
 */
function EndMembershipModal({ member, gymId, onClose, onSave }) {
  const isBoth = (() => {
    const isPt = !!member.isPt || !!member.ptPlanName || (member.trainerName && member.trainerName !== 'Unassigned' && member.trainerName !== 'General Floor Trainer (Included)' && member.trainerName !== 'No Trainer');
    const hasGymPlan = !!member.planName && member.planName !== 'PT Only' && member.planName !== '1-on-1 PT';
    return isPt && hasGymPlan;
  })();

  const [endScope, setEndScope] = useState(isBoth ? 'pt_only' : 'all');
  const [reason, setReason] = useState('PT / 1-on-1 Training Package Completed');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const presetReasons = [
    'PT / 1-on-1 Training Package Completed',
    'PT membership expired & did not renew',
    'Switched to General Gym only (No PT)',
    'Goal achieved / Transformation complete',
    'Personal / Schedule / Relocation break',
    'Discontinued by Gym Management',
    'Other'
  ];

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalReason = reason === 'Other' ? (customReason || 'Other') : reason;

      if (endScope === 'pt_only') {
        await updateMember(gymId || 'univo_main', member.id, {
          ptStatus: 'ended',
          ptEndedAt: new Date().toISOString(),
          ptEndReason: finalReason,
          status: 'active',
          active: true,
          previousPtPlanName: member.ptPlanName || '1-on-1 PT'
        });

        toast.success(`PT package ended for ${member.name || member.fullName}. Gym membership remains ACTIVE! 🏋️`);
        onSave(member.id, { ptOnly: true, reason: finalReason });
      } else {
        await updateMember(gymId || 'univo_main', member.id, {
          status: 'ended',
          ptStatus: 'ended',
          active: false,
          endedAt: new Date().toISOString(),
          endReason: finalReason
        });

        toast.success(`${member.name || member.fullName} membership ended`);
        onSave(member.id, { ptOnly: false, reason: finalReason });
      }

      onClose();
    } catch (err) {
      console.error('Error ending PT membership:', err);
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🛑 End PT Membership"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className='space-y-4 text-slate-800'>
        {/* Scope Selector if member has both Gym & PT */}
        {isBoth && (
          <div className='p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2'>
            <p className='text-xs font-bold text-slate-800'>
              Kisko End Karna Chahte Hain?
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <button
                type='button'
                onClick={() => setEndScope('pt_only')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  endScope === 'pt_only'
                    ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-200 text-purple-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs'>
                  <Sparkles className='w-4 h-4 text-purple-600' />
                  <span>✨ Sirf PT End Karein</span>
                </div>
                <p className='text-[11px] text-purple-800/80 mt-1 leading-snug'>
                  Gym Membership <strong>Active</strong> rahegi ({member.planName || 'Gym'}). Member Active list me hi rahega.
                </p>
              </button>

              <button
                type='button'
                onClick={() => setEndScope('all')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  endScope === 'all'
                    ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-200 text-rose-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs'>
                  <LogOut className='w-4 h-4 text-rose-600' />
                  <span>🚪 Gym + PT Dono End</span>
                </div>
                <p className='text-[11px] text-rose-800/80 mt-1 leading-snug'>
                  Gym aur PT dono end ho jayenge. Member End tab me chala jayega.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Informative Banner */}
        {endScope === 'pt_only' ? (
          <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5'>
            <CheckCircle className='w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5' />
            <div className='text-xs'>
              <p className='font-bold text-emerald-950'>Gym Membership Active Rahegi 🏋️</p>
              <p className='text-emerald-800/90 mt-0.5 leading-relaxed'>
                {member.name || member.fullName} ka sirf 1-on-1 PT package complete hoga. Inka <strong>{member.planName || 'Gym Plan'}</strong> active rahega aur workout continue rahega.
              </p>
            </div>
          </div>
        ) : (
          <div className='p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-2.5'>
            <UserX className='w-4.5 h-4.5 text-purple-600 flex-shrink-0 mt-0.5' />
            <div className='text-xs'>
              <p className='font-bold text-purple-950'>End Full Membership for {member.name || member.fullName}?</p>
              <p className='text-purple-800/90 mt-0.5 leading-relaxed'>
                Yeh member Active list se hat kar <strong>🛑 End</strong> filter tab me chala jayega.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className='block text-xs font-bold text-slate-700 mb-1.5'>Reason for Ending PT</label>
          <div className='space-y-1.5 max-h-56 overflow-y-auto pr-1'>
            {presetReasons.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                  reason === r
                    ? 'bg-purple-50 border-purple-300 text-purple-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type='radio'
                  name='endReason'
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className='accent-purple-600'
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <input
              type='text'
              placeholder='Specify reason...'
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className='mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500'
              autoFocus
            />
          )}
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md disabled:opacity-50 ${
              endScope === 'pt_only'
                ? 'bg-purple-700 hover:bg-purple-800'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {loading ? 'Processing...' : endScope === 'pt_only' ? '🛑 Confirm End PT (Keep Gym Active)' : '🛑 Confirm Complete End'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Modal to confirm deleting a member permanently
 */
function DeleteConfirmModal({ member, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteMember(member.id);
      toast.success('Member removed permanently');
      onConfirm(member.id);
      onClose();
    } catch (err) {
      toast.error('Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🗑️ Delete Member"
      maxWidth="max-w-sm"
    >
      <div className='space-y-4 text-slate-800'>
        <p className='text-xs text-slate-600 leading-relaxed'>
          Are you sure you want to permanently delete <strong>{member.name || member.fullName}</strong>? This action cannot be undone.
        </p>

        <div className='flex items-center gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleDelete}
            disabled={loading}
            className='flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50'
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Members() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";
  const navigate = useNavigate();
  const settings = getGymSettings();

  // Instant seed from memory/session cache
  const [members, setMembers] = useState(() => getSessionCachedData(`members_${gymId}`) || []);
  const [trainers, setTrainers] = useState(() => getSessionCachedData(`trainers_${gymId}`) || []);
  const [plans, setPlans] = useState(() => getSessionCachedData(`plans_${gymId}`) || []);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'));
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('active');
  const [showInvite, setShowInvite] = useState(false);
  const [showDirectAdd, setShowDirectAdd] = useState(false);

  // Modals for table actions
  const [extendMember, setExtendMember] = useState(null);
  const [planMember, setPlanMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [editMemberInitialTab, setEditMemberInitialTab] = useState('personal');
  const [leftMember, setLeftMember] = useState(null);
  const [endMember, setEndMember] = useState(null);
  const [deleteTargetMember, setDeleteTargetMember] = useState(null);
  const [dueSubFilter, setDueSubFilter] = useState('all'); // 'all' | 'gym' | 'pt'

  const dummyMembers = [
    {
      id: 'm1',
      name: 'Ashis',
      fullName: 'Ashis',
      phone: '+91 7000670416',
      email: 'ashis@gmail.com',
      planName: '1 Month (Standard)',
      planPrice: 599,
      dueAmount: 0,
      paidAmount: 599,
      lastPaymentDate: '2026-09-01T10:00:00.000Z',
      slot: 'General Shift',
      trainerName: 'Coach Rohan Deshmukh',
      status: 'active',
      createdAt: '2026-09-01',
      expiryDate: '2026-10-01'
    },
    {
      id: 'm2',
      name: 'Ajay Prajapati',
      fullName: 'Ajay Prajapati',
      phone: '+91 9196302375',
      email: 'ajay.p@univogym.com',
      planName: '3 Months Pro Transformation',
      planPrice: 1499,
      dueAmount: 500,
      paidAmount: 999,
      lastPaymentDate: '2026-09-10T11:30:00.000Z',
      slot: 'General Shift',
      trainerName: 'Coach Amit Sharma',
      status: 'active',
      createdAt: '2026-09-10',
      expiryDate: '2026-12-10'
    },
    {
      id: 'm3',
      name: 'Rahul Verma',
      fullName: 'Rahul Verma',
      phone: '+91 9876543210',
      email: 'rahul.v@univogym.com',
      planName: '12 Months Annual Elite',
      planPrice: 4999,
      dueAmount: 0,
      paidAmount: 4999,
      lastPaymentDate: '2026-09-08T09:15:00.000Z',
      slot: 'General Shift',
      trainerName: 'Coach Rohan Deshmukh',
      status: 'active',
      createdAt: '2026-09-08',
      expiryDate: '2027-09-08'
    },
    {
      id: 'm4',
      name: 'Priya Sharma',
      fullName: 'Priya Sharma',
      phone: '+91 9811223344',
      email: 'priya.s@gmail.com',
      planName: '6 Months Fitness Pass',
      planPrice: 2799,
      dueAmount: 800,
      paidAmount: 1999,
      lastPaymentDate: '2026-09-05T16:00:00.000Z',
      slot: 'General Shift',
      trainerName: 'Coach Sneha Kapoor',
      status: 'active',
      createdAt: '2026-09-05',
      expiryDate: '2027-03-05'
    },
    {
      id: 'm5',
      name: 'Aman Gupta',
      fullName: 'Aman Gupta',
      phone: '+91 9988776655',
      email: 'aman.g@gmail.com',
      planName: '1 Month Basic',
      planPrice: 599,
      dueAmount: 0,
      paidAmount: 599,
      lastPaymentDate: '2026-08-15T10:00:00.000Z',
      slot: 'Morning (6am-9am)',
      trainerName: 'Unassigned',
      status: 'active',
      createdAt: '2026-08-15',
      // Ending soon: within 2 days from today (2026-09-15)
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      id: 'm6',
      name: 'Vikram Singh',
      fullName: 'Vikram Singh',
      phone: '+91 9822334455',
      email: 'vikram.s@gmail.com',
      planName: '1 Month Standard',
      planPrice: 599,
      dueAmount: 0,
      paidAmount: 599,
      lastPaymentDate: '2026-08-12T10:00:00.000Z',
      slot: 'Evening (4pm-7pm)',
      trainerName: 'Coach Rohan Deshmukh',
      status: 'active',
      createdAt: '2026-08-12',
      // Expired within last 1-2 days
      expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      id: 'm7',
      name: 'Karan Johar',
      fullName: 'Karan Johar',
      phone: '+91 9711003322',
      email: 'karan@gmail.com',
      planName: '3 Months Pro',
      planPrice: 1499,
      dueAmount: 1499,
      paidAmount: 0,
      lastPaymentDate: null,
      slot: 'Night (7pm-10pm)',
      trainerName: 'Coach Amit Sharma',
      status: 'active',
      createdAt: '2026-05-10',
      // Overdue: expired more than 3 days ago (e.g. 15 days ago)
      expiryDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      id: 'm8',
      name: 'Mohit Yadav',
      fullName: 'Mohit Yadav',
      phone: '+91 8357897047',
      email: 'mohit.y@gmail.com',
      planName: '3 Months Pro Transformation',
      planPrice: 1499,
      dueAmount: 0,
      paidAmount: 1499,
      lastPaymentDate: '2026-09-03T18:00:00.000Z',
      slot: 'General Shift',
      trainerName: 'Coach Sneha Kapoor',
      status: 'active',
      createdAt: '2026-09-03',
      expiryDate: '2026-12-03'
    }
  ];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [m, t, p, pay] = await Promise.all([
          getMembers(gymId || 'univo_main'),
          getTrainers(gymId || 'univo_main'),
          getPlans(gymId || 'univo_main'),
          getAllPayments(gymId || 'univo_main'),
        ]);

        // Auto-reconcile members with payments collection
        const enrichedMembers = (m || []).map((mem) => {
          const rawPhone = (mem.phone || '').replace(/\D/g, '');
          const memPayments = (pay || []).filter(
            (py) =>
              py.memberId === mem.id ||
              (rawPhone && (py.phone || '').replace(/\D/g, '') === rawPhone) ||
              (mem.name && py.memberName && py.memberName.toLowerCase() === mem.name.toLowerCase())
          );

          if (memPayments.length > 0) {
            // Pick most recent payment
            const latest = memPayments[0];
            const isFullyPaidRecord = Number(latest.dueAmount || 0) <= 0 && Number(latest.paidAmount || latest.amount || 0) > 0;
            return {
              ...mem,
              paidAmount: Number(mem.paidAmount || 0) || Number(latest.paidAmount || latest.amount || 0),
              dueAmount: isFullyPaidRecord ? 0 : Number(latest.dueAmount ?? mem.dueAmount ?? 0),
              lastPaymentDate: mem.lastPaymentDate || latest.date || latest.createdAt || new Date().toISOString()
            };
          }
          return mem;
        });

        setMembers(enrichedMembers);
        setTrainers(t || []);
        if (p && p.length > 0) {
          const activeOnly = p.filter(item => item.isActive !== false);
          setPlans(activeOnly.length > 0 ? activeOnly : p);
        }
      } catch (err) {
        console.warn("Could not load members:", err);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gymId]);

  // Handlers for Extend, Plan, Edit, Left, Delete
  const handleExtendSuccess = (memberId, newExpiryIso) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, expiryDate: newExpiryIso, status: 'active', active: true }
          : m
      )
    );
  };

  const handlePlanSuccess = (memberId, updatedFields) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );
  };

  const handleEditSuccess = (memberId, updatedFields) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );
  };

  const handleLeftSuccess = (memberId, reason) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, status: 'left', active: false, leftReason: reason }
          : m
      )
    );
  };

  const handleEndSuccess = (memberId, result) => {
    const isPtOnly = typeof result === 'object' ? result.ptOnly : false;
    const reason = typeof result === 'object' ? result.reason : result;

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        if (isPtOnly) {
          return {
            ...m,
            ptStatus: 'ended',
            ptEndedAt: new Date().toISOString(),
            ptEndReason: reason,
            status: 'active',
            active: true,
            previousPtPlanName: m.ptPlanName || '1-on-1 PT'
          };
        }
        return {
          ...m,
          status: 'ended',
          ptStatus: 'ended',
          active: false,
          endReason: reason,
          endedAt: new Date().toISOString()
        };
      })
    );
  };

  const handleRestartPT = async (m) => {
    try {
      await updateMember(gymId || 'univo_main', m.id, {
        ptStatus: 'active',
        status: 'active',
        active: true,
        ptRestartedAt: new Date().toISOString()
      });

      setMembers((prev) =>
        prev.map((item) =>
          item.id === m.id
            ? { ...item, ptStatus: 'active', status: 'active', active: true }
            : item
        )
      );

      toast.success(`${m.name || m.fullName} PT package reactivated!`);
    } catch (err) {
      toast.error('Failed to reactivate PT package');
    }
  };

  const handleReactivate = async (m) => {
    try {
      const now = new Date();
      const currentExp = toDate(m.expiryDate);
      const newExp = (!currentExp || currentExp < now)
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : m.expiryDate;

      await updateMember(gymId || 'univo_main', m.id, {
        status: 'active',
        active: true,
        expiryDate: newExp,
        ptStatus: m.ptStatus === 'ended' ? 'active' : m.ptStatus,
        reactivatedAt: new Date().toISOString()
      });

      setMembers((prev) =>
        prev.map((item) =>
          item.id === m.id
            ? { ...item, status: 'active', active: true, expiryDate: newExp, ptStatus: m.ptStatus === 'ended' ? 'active' : m.ptStatus }
            : item
        )
      );

      toast.success(`${m.name || m.fullName} reactivated as Active!`);
    } catch (err) {
      toast.error('Failed to reactivate member');
    }
  };

  const handleDeleteSuccess = (memberId) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleMemberReminderSent = async (memberId) => {
    const nowIso = new Date().toISOString();
    setMembers((prev) =>
      prev.map((item) =>
        item.id === memberId ? { ...item, lastReminderSent: nowIso } : item
      )
    );
    try {
      await updateMember(memberId, { lastReminderSent: nowIso });
    } catch (e) {
      console.warn("Failed to persist lastReminderSent to firestore:", e);
    }
  };

  const handleSendIndividualReminder = (m) => {
    const rawNum = (m.phone || '').replace(/\D/g, '');
    if (!rawNum) {
      toast.error('No valid phone number for ' + (m.name || m.fullName));
      return;
    }

    const stat = getMemberStatus(m);
    let message = '';
    const expiry = toDate(m.expiryDate);
    const diff = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : 0;
    const daysOverdue = Math.abs(diff);

    const planTitle = m.ptPlanName
      ? `${m.planName || 'Gym'} + 1-on-1 PT (${m.ptPlanName})`
      : (m.planName || 'Gym Plan');

    const totalPlanAmount = (Number(m.planPrice || 0) + Number(m.ptPlanPrice || 0)) || '2,500';

    if (Number(m.dueAmount || 0) > 0 && !!m.lastPaymentDate) {
      message = generatePartialDueReminderMessage(
        m.name || m.fullName,
        m.dueAmount,
        planTitle
      );
    } else if (isPtMember(m) && (!m.planName || m.ptPlanName)) {
      message = generatePtRenewalReminderMessage(
        m.name || m.fullName,
        m.ptPlanName || '1-on-1 PT Plan',
        m.trainerName || 'Assigned Coach',
        formatDate(m.expiryDate),
        totalPlanAmount
      );
    } else if (stat === 'due' || stat === 'overdue') {
      message = generateOverdueReminderMessage(
        m.name || m.fullName,
        planTitle,
        daysOverdue,
        totalPlanAmount
      );
    } else {
      message = generateRenewalReminderMessage(
        m.name || m.fullName,
        planTitle,
        formatDate(m.expiryDate),
        totalPlanAmount
      );
    }

    openWhatsApp(rawNum, message);
    handleMemberReminderSent(m.id);
    toast.success(`WhatsApp reminder opened for ${m.name || m.fullName}`);
  };

  // Status counts
  const isPaid = (m) => Number(m.dueAmount || 0) <= 0 && !!m.lastPaymentDate;
  const isPartial = (m) => Number(m.dueAmount || 0) > 0 && !!m.lastPaymentDate;
  const isPtMember = (m) => !!m.isPt || !!m.ptPlanName || (m.trainerName && m.trainerName !== 'Unassigned' && m.trainerName !== 'General Floor Trainer (Included)' && m.trainerName !== 'No Trainer');
  const isPtActive = (m) => isPtMember(m) && m.ptStatus !== 'ended';
  const isLeftMember = (m) => m.status === 'left';
  const isFullyEndedMember = (m) => m.status === 'ended' || (m.status === 'pt_ended' && !m.planName && m.status !== 'active');
  const isEndedMember = (m) => isFullyEndedMember(m) || m.ptStatus === 'ended';
  const isInactiveMember = (m) => isLeftMember(m) || isFullyEndedMember(m);

  const paidCount = members.filter((m) => isPaid(m) && !isInactiveMember(m)).length;
  const partialCount = members.filter((m) => isPartial(m) && !isInactiveMember(m)).length;
  const ptCount = members.filter((m) => isPtActive(m) && !isInactiveMember(m)).length;
  const activeCount = members.filter((m) => getMemberStatus(m) === 'active' && !isInactiveMember(m)).length;
  const endingSoonCount = members.filter((m) => getMemberStatus(m) === 'ending_soon' && !isInactiveMember(m)).length;
  const expiredCount = members.filter((m) => getMemberStatus(m) === 'expired' && !isInactiveMember(m)).length;
  const dueCount = members.filter((m) => (getMemberStatus(m) === 'due' || getMemberStatus(m) === 'overdue') && !isInactiveMember(m)).length;
  const leftCount = members.filter((m) => isLeftMember(m)).length;
  const endedCount = members.filter((m) => isFullyEndedMember(m) || m.ptStatus === 'ended').length;

  // Due breakdown for Gym vs PT
  const dueMembersList = members.filter((m) => (getMemberStatus(m) === 'due' || getMemberStatus(m) === 'overdue') && !isInactiveMember(m));
  const gymDueCount = dueMembersList.filter((m) => !m.ptPlanName || m.ptStatus === 'ended').length;
  const ptDueCount = dueMembersList.filter((m) => isPtActive(m)).length;

  const totalRemindersDue = members.filter(
    (m) => !isInactiveMember(m) && (isPartial(m) || ['ending_soon', 'expired', 'due', 'overdue'].includes(getMemberStatus(m)))
  ).length;

  const FILTER_TABS = [
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'pt', label: `🏋️ PT Members (${ptCount})` },
    { key: 'paid', label: `Paid (${paidCount})` },
    { key: 'ending_soon', label: `Ending Soon (${endingSoonCount})` },
    { key: 'expired', label: `Expired (${expiredCount})` },
    { key: 'due', label: `⚠️ Due (${dueCount})` },
    { key: 'partial', label: `Partial Fee (${partialCount})` },
    { key: 'left', label: `🚪 Left (${leftCount})` },
    { key: 'ended', label: `🛑 End (${endedCount})` },
    { key: 'all', label: `All (${members.length})` },
  ];

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      (m.name || m.fullName || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q);
    const status = getMemberStatus(m);
    const isLeft = isLeftMember(m);
    const isEnded = isFullyEndedMember(m) || m.ptStatus === 'ended';
    const isInactive = isInactiveMember(m);
    
    let matchTab = false;
    if (filterTab === 'all') {
      matchTab = true;
    } else if (filterTab === 'left') {
      matchTab = isLeft;
    } else if (filterTab === 'ended') {
      matchTab = isEnded;
    } else if (filterTab === 'pt') {
      matchTab = isPtActive(m) && !isInactive;
    } else if (filterTab === 'paid') {
      matchTab = isPaid(m) && !isInactive;
    } else if (filterTab === 'partial') {
      matchTab = isPartial(m) && !isInactive;
    } else if (filterTab === 'due') {
      const isDue = (status === 'due' || status === 'overdue') && !isInactive;
      if (!isDue) {
        matchTab = false;
      } else if (dueSubFilter === 'gym') {
        matchTab = !m.ptPlanName || m.ptStatus === 'ended';
      } else if (dueSubFilter === 'pt') {
        matchTab = isPtActive(m);
      } else {
        matchTab = true;
      }
    } else {
      matchTab = status === filterTab && !isInactive;
    }

    return matchSearch && matchTab;
  });

  return (
    <div className='space-y-6'>
      {/* Header & Quick Actions */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-bold text-slate-900'>Member Directory</h1>
            <span className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200'>
              {members.length} Total
            </span>
          </div>
          <p className='text-xs text-slate-500 mt-1'>
            Manage member admissions, membership plans, extensions, shift timings & profiles
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <button
            onClick={() => setShowInvite(true)}
            className='flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm'
          >
            <Share2 className='w-4 h-4 text-emerald-600' /> Share 10-Min Link
          </button>
          <button
            onClick={() => setShowDirectAdd(true)}
            className='flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-sm'
          >
            <UserPlus className='w-4 h-4' /> + Add Member
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3'>
        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0'>
            <CheckCircle className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Fully Paid</p>
            <p className='text-base font-bold text-slate-900'>{paidCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0'>
            <Clock className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Ending Soon (≤3d)</p>
            <p className='text-base font-bold text-amber-700'>{endingSoonCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0'>
            <AlertTriangle className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Expired (1-2d)</p>
            <p className='text-base font-bold text-rose-600'>{expiredCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0'>
            <AlertTriangle className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Due (2d+ Overdue)</p>
            <p className='text-base font-bold text-red-700'>{dueCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0'>
            <IndianRupee className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-amber-800 font-medium truncate'>Partial Due</p>
            <p className='text-base font-bold text-amber-700'>{partialCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0'>
            <LogOut className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Gym Left</p>
            <p className='text-base font-bold text-slate-900'>{leftCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0'>
            <UserX className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-purple-800 font-medium truncate'>PT Ended</p>
            <p className='text-base font-bold text-purple-900'>{endedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar (Responsive PC & Mobile) */}
      <div className='p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between'>
        {/* Horizontal scrollable tab pills for mobile, wrapped on desktop */}
        <div className='flex items-center gap-1.5 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none -mx-1 px-1'>
          {FILTER_TABS.map((tab) => {
            const isActive = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className='flex items-center gap-2 w-full md:w-auto shrink-0'>
          <div className='relative flex-1 md:w-64'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search by name, phone...'
              className='w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 md:py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition'
            />
          </div>

          <div className='flex bg-slate-100 p-1 rounded-xl shrink-0'>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-lg transition ${view === 'table' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
              title='Table View (Desktop)'
            >
              <LayoutList className='w-4 h-4' />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-lg transition ${view === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
              title='Card / Mobile View'
            >
              <LayoutGrid className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Due Category Sub-Filter (Gym vs PT Due) */}
      {filterTab === 'due' && (
        <div className='p-3 rounded-2xl bg-red-50/90 border border-red-200/90 flex flex-wrap items-center justify-between gap-2.5 text-xs'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
            <div>
              <span className='font-bold text-red-950'>Overdue Renewal Filter:</span>
              <span className='text-[11px] text-red-800/90 ml-1.5 hidden sm:inline'>
                Membership expired over 2 days ago. Check whether Gym or PT plan is due:
              </span>
            </div>
          </div>
          <div className='flex items-center gap-1.5 shrink-0'>
            <button
              onClick={() => setDueSubFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                dueSubFilter === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-red-100/60 border border-red-200'
              }`}
            >
              All Due ({dueCount})
            </button>
            <button
              onClick={() => setDueSubFilter('gym')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                dueSubFilter === 'gym'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              🏋️ Gym Due ({gymDueCount})
            </button>
            <button
              onClick={() => setDueSubFilter('pt')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                dueSubFilter === 'pt'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-purple-50 border border-slate-200'
              }`}
            >
              ✨ PT Due ({ptDueCount})
            </button>
          </div>
        </div>
      )}

      {/* Member Directory Table */}
      {view === 'table' ? (
        <div className='overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm'>
          <table className='w-full text-left text-xs text-slate-600'>
            <thead className='bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200'>
              <tr>
                <th className='px-5 py-3.5'>Member</th>
                <th className='px-5 py-3.5'>Slot & Trainer</th>
                <th className='px-5 py-3.5'>Plan & Fee</th>
                <th className='px-5 py-3.5'>Status</th>
                <th className='px-5 py-3.5 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-slate-400'>
                    No members found in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const status = getMemberStatus(m);
                  const daysInfo = getMemberDaysInfo(m);
                  const isLeft = isLeftMember(m);
                  const isEnded = isEndedMember(m);
                  const membershipDetails = getMembershipEndingDetails(m);

                  return (
                    <tr key={m.id} className='hover:bg-slate-50/70 transition items-center'>
                      {/* Column 1: Member Name & Phone */}
                      <td className='px-5 py-3.5'>
                        <div className='flex items-center gap-3'>
                          <Avatar member={m} size='sm' />
                          <div>
                            <p className='font-bold text-slate-900 text-sm leading-tight'>
                              {m.name || m.fullName}
                            </p>
                            <p className='text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5'>
                              <span>{m.phone || 'No phone'}</span>
                              <span>•</span>
                              <span>{formatDate(m.createdAt)}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Slot & Trainer Pill */}
                      <td className='px-5 py-3.5'>
                        <div className='space-y-1'>
                          <div className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100'>
                            <Sun className='w-3 h-3 text-indigo-500' />
                            <span>{m.slot || m.workoutSlot || 'General Shift'}</span>
                          </div>
                          <p className='text-[11px] text-slate-700 pl-0.5 font-bold flex items-center gap-1'>
                            <span>{m.trainerName ? `🏋️ Coach ${m.trainerName}` : 'No Trainer'}</span>
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Plan & Fee with Days Left Pill & Combined Total */}
                      <td className='px-5 py-3.5'>
                        <div className='space-y-1.5'>
                          <div className='flex items-center gap-1.5 flex-wrap'>
                            <p className='font-bold text-slate-900 text-xs'>
                              {m.planName || 'Standard Plan'} {m.planPrice ? `(₹${Number(m.planPrice).toLocaleString('en-IN')})` : ''}
                            </p>
                            {/* Gym vs PT Indicator */}
                            {membershipDetails.category === 'both' ? (
                              <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200'>
                                🏋️ Gym + ✨ PT
                              </span>
                            ) : membershipDetails.category === 'both_pt_ended' ? (
                              <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200'>
                                🏋️ Gym Active (PT Ended)
                              </span>
                            ) : membershipDetails.category === 'pt' ? (
                              <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200'>
                                ✨ 1-on-1 PT
                              </span>
                            ) : membershipDetails.category === 'pt_ended' ? (
                              <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300'>
                                🛑 PT Ended
                              </span>
                            ) : (
                              <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200'>
                                🏋️ Gym Plan
                              </span>
                            )}
                          </div>
                          {m.ptPlanName && (
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                              m.ptStatus === 'ended'
                                ? 'bg-slate-100 text-slate-500 border-slate-300 line-through opacity-85'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {m.ptStatus === 'ended' ? '🛑 PT Ended: ' : '✨ PT: '} {m.ptPlanName} {m.ptPlanPrice && m.ptStatus !== 'ended' ? `(+₹${Number(m.ptPlanPrice).toLocaleString('en-IN')})` : ''}
                            </div>
                          )}
                          <div className='flex items-center gap-2 pt-0.5 flex-wrap'>
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${daysInfo.cls}`}>
                              {daysInfo.text}
                            </span>
                            {m.ptPlanName && (
                              <span className='text-[10px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200'>
                                Total: ₹{(Number(m.planPrice || 0) + Number(m.ptPlanPrice || 0)).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Current Status Pill */}
                      <td className='px-5 py-3.5'>
                        <StatusBadge status={status} dueAmount={m.dueAmount} member={m} />
                      </td>

                      {/* Column 5: Action Pill Buttons: View, Extend, Plan, Edit, Left, Delete */}
                      <td className='px-5 py-3.5 text-right'>
                        <div className='inline-flex items-center gap-1.5 justify-end'>
                          {/* 1. View Button */}
                          <button
                            onClick={() => navigate(`/owner/members/${m.id}`)}
                            className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition shadow-sm'
                            title='View Full Member Profile'
                          >
                            <Eye className='w-3.5 h-3.5 text-slate-500' />
                            <span>View</span>
                          </button>

                          {/* 2. Extend Button */}
                          <button
                            onClick={() => setExtendMember(m)}
                            className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition shadow-sm'
                            title='Extend membership date (+10 days / custom)'
                          >
                            <CalendarPlus className='w-3.5 h-3.5 text-emerald-600' />
                            <span>Extend</span>
                          </button>

                          {/* 3. Collect / Due / Renew / Paid Dynamic Status Button */}
                          {(() => {
                            const due = Number(m.dueAmount ?? (m.lastPaymentDate ? 0 : (m.planPrice || 0)));
                            const hasPaidAtLeastOnce = !!m.lastPaymentDate;
                            const isFullyPaid = hasPaidAtLeastOnce && due <= 0;
                            const isPartialDue = hasPaidAtLeastOnce && due > 0;
                            const memberStat = getMemberStatus(m);
                            const needsRenewal = ['ending_soon', 'expired', 'due', 'overdue'].includes(memberStat);

                            // Case 1: Needs Renewal (Ending Soon, Expired, or Due) -> Show "⚡ Renew"
                            if (needsRenewal) {
                              return (
                                <button
                                  onClick={() => setPlanMember(m)}
                                  className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs transition shadow-sm animate-pulse'
                                  title={`Membership ${memberStat === 'ending_soon' ? 'Ending Soon' : memberStat === 'expired' ? 'Expired' : 'Due'} - Click to Renew Plan`}
                                >
                                  <RotateCcw className='w-3.5 h-3.5 text-white' />
                                  <span>Renew</span>
                                </button>
                              );
                            }

                            // Case 2: Has Partial Due balance
                            if (isPartialDue) {
                              return (
                                <button
                                  onClick={() => setPlanMember(m)}
                                  className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs border border-amber-400 transition shadow-xs'
                                  title={`Partial Payment - Click to Collect Remaining Due: ₹${due}`}
                                >
                                  <IndianRupee className='w-3.5 h-3.5 text-amber-700' />
                                  <span>Due: ₹{due}</span>
                                </button>
                              );
                            }

                            // Case 3: Fully Paid active member
                            if (isFullyPaid) {
                              return (
                                <button
                                  disabled
                                  className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-300 cursor-default opacity-90'
                                  title='Membership Fee Fully Paid'
                                >
                                  <CheckCircle className='w-3.5 h-3.5 text-emerald-600' />
                                  <span>Paid</span>
                                </button>
                              );
                            }

                            // Case 4: Unpaid or New Member
                            return (
                              <button
                                onClick={() => setPlanMember(m)}
                                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition shadow-sm'
                                title='Collect Membership Fee & Activate Plan'
                              >
                                <IndianRupee className='w-3.5 h-3.5 text-indigo-600' />
                                <span>Collect</span>
                              </button>
                            );
                          })()}

                          {/* 4. Edit Button */}
                          <button
                            onClick={() => setEditMember(m)}
                            className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition shadow-sm'
                            title='Edit Member Details (Name, Phone, Slot, Trainer, Aadhar)'
                          >
                            <Edit className='w-3.5 h-3.5 text-amber-600' />
                            <span>Edit</span>
                          </button>

                          {/* 5. Left for Gym Members, End for PT Members, Both for Gym+PT */}
                          {isLeft ? (
                            <button
                              onClick={() => handleReactivate(m)}
                              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition shadow-sm'
                              title='Reactivate member back to active status'
                            >
                              <RotateCcw className='w-3.5 h-3.5 text-emerald-600' />
                              <span>Return</span>
                            </button>
                          ) : isFullyEndedMember(m) ? (
                            <button
                              onClick={() => handleReactivate(m)}
                              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition shadow-sm'
                              title='Restart PT membership back to active status'
                            >
                              <RotateCcw className='w-3.5 h-3.5 text-purple-600' />
                              <span>Restart PT</span>
                            </button>
                          ) : m.ptStatus === 'ended' ? (
                            <>
                              <button
                                onClick={() => setLeftMember(m)}
                                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition shadow-sm'
                                title='Mark gym membership as left'
                              >
                                <LogOut className='w-3.5 h-3.5 text-rose-600' />
                                <span>Left</span>
                              </button>
                              <button
                                onClick={() => handleRestartPT(m)}
                                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition shadow-sm'
                                title='Restart 1-on-1 PT package for this member'
                              >
                                <RotateCcw className='w-3.5 h-3.5 text-purple-600' />
                                <span>Restart PT</span>
                              </button>
                            </>
                          ) : membershipDetails.category === 'both' ? (
                            <>
                              <button
                                onClick={() => setLeftMember(m)}
                                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition shadow-sm'
                                title='Mark gym membership as left'
                              >
                                <LogOut className='w-3.5 h-3.5 text-rose-600' />
                                <span>Left</span>
                              </button>
                              <button
                                onClick={() => setEndMember(m)}
                                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition shadow-sm'
                                title='End PT Membership (Inka PT package khatam karein)'
                              >
                                <UserX className='w-3.5 h-3.5 text-purple-600' />
                                <span>End</span>
                              </button>
                            </>
                          ) : isPtMember(m) ? (
                            <button
                              onClick={() => setEndMember(m)}
                              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition shadow-sm'
                              title='End PT Membership (Inka PT package khatam karein)'
                            >
                              <UserX className='w-3.5 h-3.5 text-purple-600' />
                              <span>End</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditMemberTab?.('membership') || setEditMemberInitialTab('membership');
                                  setEditMember(m);
                                }}
                                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition shadow-sm'
                                title='Bich month me 1-on-1 PT package aur coach add karein'
                              >
                                <Sparkles className='w-3.5 h-3.5 text-purple-600' />
                                <span>+ PT</span>
                              </button>
                              <button
                                onClick={() => setLeftMember(m)}
                                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition shadow-sm'
                                title='Mark gym member as left'
                              >
                                <LogOut className='w-3.5 h-3.5 text-rose-600' />
                                <span>Left</span>
                              </button>
                            </>
                          )}

                          {/* 6. Delete Button */}
                          <button
                            onClick={() => setDeleteTargetMember(m)}
                            className='inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition shadow-sm'
                            title='Delete Member'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card View */
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {filtered.map((m) => {
            const status = getMemberStatus(m);
            const daysInfo = getMemberDaysInfo(m);
            const isLeft = isLeftMember(m);
            const isEnded = isEndedMember(m);
            const membershipDetails = getMembershipEndingDetails(m);

            return (
              <div key={m.id} className='p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5 hover:border-emerald-300 transition flex flex-col justify-between'>
                <div>
                  <div className='flex items-center justify-between'>
                    <Avatar member={m} size='md' />
                    <StatusBadge status={status} dueAmount={m.dueAmount} member={m} />
                  </div>
                  <div className='mt-3'>
                    <h4 className='font-bold text-slate-900 text-sm leading-tight'>{m.name || m.fullName}</h4>
                    <p className='text-xs text-slate-400 mt-0.5'>{m.phone || 'No phone'}</p>
                  </div>
                  <div className='mt-3 space-y-1.5'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <p className='text-xs font-semibold text-slate-800'>{m.planName || 'Standard Plan'}</p>
                      {membershipDetails.category === 'both' ? (
                        <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200'>
                          Gym + PT
                        </span>
                      ) : membershipDetails.category === 'both_pt_ended' ? (
                        <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200'>
                          Gym Active (PT Ended)
                        </span>
                      ) : membershipDetails.category === 'pt' ? (
                        <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200'>
                          1-on-1 PT
                        </span>
                      ) : membershipDetails.category === 'pt_ended' ? (
                        <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300'>
                          PT Ended
                        </span>
                      ) : (
                        <span className='px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200'>
                          Gym Plan
                        </span>
                      )}
                    </div>
                    {m.ptPlanName && (
                      <p className={`text-[10px] font-bold px-2 py-0.5 rounded-md border truncate ${
                        m.ptStatus === 'ended'
                          ? 'text-slate-500 bg-slate-100 border-slate-200 line-through opacity-85'
                          : 'text-purple-700 bg-purple-50 border-purple-200'
                      }`}>
                        {m.ptStatus === 'ended' ? '🛑 PT Ended: ' : '✨ PT: '} {m.ptPlanName} {m.ptPlanPrice && m.ptStatus !== 'ended' ? `(+₹{m.ptPlanPrice})` : ''}
                      </p>
                    )}
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${daysInfo.cls}`}>
                      {daysInfo.text}
                    </span>
                  </div>
                </div>

                <div className='pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5'>
                  <button
                    onClick={() => navigate(`/owner/members/${m.id}`)}
                    className='px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition'
                  >
                    View
                  </button>

                  <button
                    onClick={() => setExtendMember(m)}
                    className='px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition'
                  >
                    Extend
                  </button>

                  {/* Dynamic Collect / Due / Renew / Paid Button */}
                  {(() => {
                    const due = Number(m.dueAmount ?? (m.lastPaymentDate ? 0 : (m.planPrice || 0)));
                    const hasPaidAtLeastOnce = !!m.lastPaymentDate;
                    const isFullyPaid = hasPaidAtLeastOnce && due <= 0;
                    const isPartialDue = hasPaidAtLeastOnce && due > 0;
                    const memberStat = getMemberStatus(m);
                    const needsRenewal = ['ending_soon', 'expired', 'due', 'overdue'].includes(memberStat);

                    // Case 1: Needs Renewal
                    if (needsRenewal) {
                      return (
                        <button
                          onClick={() => setPlanMember(m)}
                          className='px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-500 text-xs font-black hover:from-emerald-700 hover:to-teal-700 transition shadow-xs animate-pulse'
                          title={`Membership ${memberStat === 'ending_soon' ? 'Ending Soon' : memberStat === 'expired' ? 'Expired' : 'Due'} - Click to Renew`}
                        >
                          ⚡ Renew
                        </button>
                      );
                    }

                    // Case 2: Partial Due
                    if (isPartialDue) {
                      return (
                        <button
                          onClick={() => setPlanMember(m)}
                          className='px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-400 text-xs font-extrabold hover:bg-amber-200 transition shadow-xs'
                          title={`Click to collect remaining balance: ₹${due}`}
                        >
                          Due: ₹{due}
                        </button>
                      );
                    }

                    // Case 3: Fully Paid
                    if (isFullyPaid) {
                      return (
                        <button
                          disabled
                          className='px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold cursor-default opacity-90'
                          title='Membership Fee Fully Paid'
                        >
                          ✓ Paid
                        </button>
                      );
                    }

                    // Case 4: Unpaid
                    return (
                      <button
                        onClick={() => setPlanMember(m)}
                        className='px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition'
                        title='Collect Fee & Activate Plan'
                      >
                        Collect
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => setEditMember(m)}
                    className='px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition'
                  >
                    Edit
                  </button>

                  {isLeft ? (
                    <button
                      onClick={() => handleReactivate(m)}
                      className='px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition'
                      title='Reactivate member back to active'
                    >
                      Return
                    </button>
                  ) : isFullyEndedMember(m) ? (
                    <button
                      onClick={() => handleReactivate(m)}
                      className='px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition'
                      title='Restart PT membership back to active'
                    >
                      Restart PT
                    </button>
                  ) : m.ptStatus === 'ended' ? (
                    <>
                      <button
                        onClick={() => setLeftMember(m)}
                        className='px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition'
                        title='Mark gym member as left'
                      >
                        Left
                      </button>
                      <button
                        onClick={() => handleRestartPT(m)}
                        className='px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition'
                        title='Restart 1-on-1 PT package'
                      >
                        Restart PT
                      </button>
                    </>
                  ) : membershipDetails.category === 'both' ? (
                    <>
                      <button
                        onClick={() => setLeftMember(m)}
                        className='px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition'
                        title='Mark gym member as left'
                      >
                        Left
                      </button>
                      <button
                        onClick={() => setEndMember(m)}
                        className='px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition'
                        title='End PT Membership (Inka PT package khatam karein)'
                      >
                        End
                      </button>
                    </>
                  ) : isPtMember(m) ? (
                    <button
                      onClick={() => setEndMember(m)}
                      className='px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition'
                      title='End PT Membership (Inka PT package khatam karein)'
                    >
                      End
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditMemberInitialTab('membership');
                          setEditMember(m);
                        }}
                        className='px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1'
                        title='Bich month me 1-on-1 PT package aur coach add karein'
                      >
                        <Sparkles className='w-3 h-3 text-purple-600' />
                        <span>+ PT</span>
                      </button>
                      <button
                        onClick={() => setLeftMember(m)}
                        className='px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition'
                        title='Mark gym member as left'
                      >
                        Left
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extend Membership Modal */}
      {extendMember && (
        <ExtendModal
          member={extendMember}
          gymId={gymId}
          onClose={() => setExtendMember(null)}
          onSave={handleExtendSuccess}
        />
      )}

      {/* Collect Fee & Renew Modal */}
      {planMember && (
        <CollectFeeModal
          member={planMember}
          gymId={gymId}
          trainers={trainers}
          plans={plans}
          onClose={() => setPlanMember(null)}
          onSave={handlePlanSuccess}
        />
      )}

      {/* Edit Member Details Modal */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          initialTab={editMemberInitialTab}
          trainers={trainers}
          plans={plans}
          existingMembers={members}
          onClose={() => {
            setEditMember(null);
            setEditMemberInitialTab('personal');
          }}
          onSave={handleEditSuccess}
        />
      )}

      {/* Left Member Modal (Gym) */}
      {leftMember && (
        <LeftModal
          member={leftMember}
          onClose={() => setLeftMember(null)}
          onSave={handleLeftSuccess}
        />
      )}

      {/* End PT Membership Modal */}
      {endMember && (
        <EndMembershipModal
          member={endMember}
          gymId={gymId}
          onClose={() => setEndMember(null)}
          onSave={handleEndSuccess}
        />
      )}

      {/* Delete Member Modal */}
      {deleteTargetMember && (
        <DeleteConfirmModal
          member={deleteTargetMember}
          onClose={() => setDeleteTargetMember(null)}
          onConfirm={handleDeleteSuccess}
        />
      )}

      {/* 10-Minute WhatsApp Invite Modal */}
      {showInvite && (
        <InviteLinkModal
          gymId={gymId}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Direct Add Member Modal */}
      <DirectAddMemberModal
        isOpen={showDirectAdd}
        onClose={() => setShowDirectAdd(false)}
        onSuccess={(newMem) => setMembers([newMem, ...members])}
        plans={plans}
        trainers={trainers}
        existingMembers={members}
      />
    </div>
  );
}