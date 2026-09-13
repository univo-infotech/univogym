import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getMembers, generateInviteToken, addMember, updateMember, deleteMember } from '../../firebase/members';
import { getTrainers } from '../../firebase/trainers';
import { getPlans } from '../../firebase/plans';
import { addPayment } from '../../firebase/payments';
import { useAuth } from '../../contexts/AuthContext';
import { getGymSettings } from '../../utils/settings';
import { generatePaymentReceipt } from '../../utils/pdf';
import { openWhatsApp } from '../../utils/whatsapp';
import Modal from '../../components/ui/Modal';
import DirectAddMemberModal from '../../components/shared/DirectAddMemberModal';

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

function getMemberStatus(member) {
  if (member.status === 'left') return 'left';
  if (member.active === false) return 'inactive';

  const expiry = toDate(member.expiryDate);
  if (!expiry) return member.status || 'active';
  const now = new Date();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  // 1. Expired conditions:
  // If plan expired more than 3 days ago -> overdue
  if (diffDays < -3) return 'overdue';
  // If plan expired within last 1, 2, or 3 days -> expired
  if (diffDays <= 0) return 'expired';

  // 2. Active conditions:
  // If plan ending in 1, 2, or 3 days (or today) -> ending_soon
  if (diffDays <= 3) return 'ending_soon';

  // 3. Normal active
  return 'active';
}

function getMemberDaysInfo(member) {
  const status = getMemberStatus(member);
  if (status === 'left') {
    return { text: 'Left / Discontinued', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  const expiry = toDate(member.expiryDate);
  if (!expiry) return { text: 'No Expiry Set', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  
  if (diff < -3) {
    return { text: `Overdue (${Math.abs(diff)} days ago)`, cls: 'bg-red-100 text-red-800 border-red-300 font-extrabold' };
  }
  if (diff <= 0) {
    const daysAgo = Math.abs(diff) === 0 ? 'Today' : `${Math.abs(diff)}d ago`;
    return { text: `Expired (${daysAgo})`, cls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
  }
  if (diff <= 3) {
    return { text: `Ending Soon (${diff}d left)`, cls: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse' };
  }
  return { text: `Active (${diff} days left)`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
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
  ending_soon: { label: 'Ending Soon', dot: 'bg-amber-500', cls: 'bg-amber-100 text-amber-900 border border-amber-300' },
  expired: { label: 'Expired', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  overdue: { label: 'Overdue (3+ Days)', dot: 'bg-red-600', cls: 'bg-red-100 text-red-800 border border-red-300' },
  left: { label: 'Left', dot: 'bg-slate-500', cls: 'bg-slate-100 text-slate-700 border border-slate-300' },
  inactive: { label: 'Inactive', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

function StatusBadge({ status, dueAmount }) {
  if (Number(dueAmount) > 0 && status !== 'left') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Due: ₹{dueAmount}
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
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef(null);

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
      const url = await generateInviteToken(gymId || 'univo_main', {
        memberName: memberName.trim(),
        phone: phone.trim(),
      });
      setLink(url);
      startTimer();
      toast.success('10-Minute Invite Link Ready!');
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
    const msg = encodeURIComponent(
      `💪 *Welcome to UNIVO GYM MANAGEMENT!*\n\nHi ${memberName || 'Athlete'},\nPlease complete your gym registration form, choose your membership plan & trainer, and sign your liability waiver using this direct link:\n\n🔗 ${link}\n\n⚠️ *Important:* This secure registration link expires in 10 minutes.`
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
              onChange={(e) => setPhone(e.target.value)}
              placeholder='9876543210'
              className='w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white'
            />
          </div>
        </div>

        {!link ? (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className='w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold transition shadow-md disabled:opacity-50'
          >
            {generating ? 'Generating...' : '⚡ Generate 10-Minute Link & QR Code'}
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

/**
 * Modal to Collect Fee & Renew Membership (Matching User's Design & Screenshots)
 */
function CollectFeeModal({ member, gymId, onClose, onSave, trainers = [] }) {
  const settings = getGymSettings();

  const PLANS_CATALOG = [
    { id: "p1", name: "1 Month Standard", durationMonths: 1, durationDays: 30, price: 599, label: "1 Month Standard — ₹599" },
    { id: "p2", name: "1 Month with Locker", durationMonths: 1, durationDays: 30, price: 699, label: "1 Month + Locker — ₹699" },
    { id: "p3", name: "3 Months Pro Transformation", durationMonths: 3, durationDays: 90, price: 1499, label: "3 Months Pro — ₹1,499" },
    { id: "p4", name: "6 Months Fitness Pass", durationMonths: 6, durationDays: 180, price: 2799, label: "6 Months — ₹2,799" },
    { id: "p5", name: "12 Months Annual Elite", durationMonths: 12, durationDays: 365, price: 4999, label: "12 Months / Annual — ₹4,999" },
  ];

  // Check if member already has remaining dues from previous partial payment
  const hasExistingDue = Number(member.dueAmount || 0) > 0 && !!member.lastPaymentDate;
  const existingDueAmount = Number(member.dueAmount || 0);

  // Check if member is renewing an ending soon, expired, or overdue plan
  const memberStatus = getMemberStatus(member);
  const isRenewing = ['ending_soon', 'expired', 'overdue'].includes(memberStatus) || (member.lastPaymentDate && hasExistingDue === false);

  // Match initial plan from member or default to first
  const initialPlan = PLANS_CATALOG.find((p) =>
    (member.planName || "").toLowerCase().includes(p.name.toLowerCase())
  ) || PLANS_CATALOG[0];

  const [selectedPlanId, setSelectedPlanId] = useState(initialPlan.id);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Smart validity start: if member's current plan is ending soon in the future, start the new plan from their current expiry date!
  // If already expired or no expiry, start from today.
  const getSmartValidityStart = () => {
    if (member.expiryDate) {
      const expDate = toDate(member.expiryDate);
      const now = new Date();
      if (expDate && expDate > now) {
        // Future expiry (Ending Soon) -> Start next day after current expiry
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
  const [payingNow, setPayingNow] = useState(hasExistingDue ? existingDueAmount : initialPlan.price);
  const [paymentMode, setPaymentMode] = useState("cash"); // "cash", "online", "bank", "split"
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const currentPlan = PLANS_CATALOG.find((p) => p.id === selectedPlanId) || PLANS_CATALOG[0];
  const targetPayableTotal = hasExistingDue ? existingDueAmount : Math.max(0, currentPlan.price - Number(discountAmount || 0));
  const calculatedTotal = targetPayableTotal;

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
    if (hasExistingDue && member.expiryDate) {
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
      planName: hasExistingDue ? `${member.planName || currentPlan.name} (Due Balance Settlement)` : currentPlan.name,
      validityStart: toIndianDate(validityStart),
      validityEnd: hasExistingDue && member.expiryDate ? toIndianDate(member.expiryDate) : validityEnd,
      dueDate: validityEnd,
      planPrice: currentPlan.price,
      discount: Number(discountAmount || 0),
      amount: calculatedTotal,
      paidAmount: Number(payingNow),
      dueAmount: remainingDue,
      paymentMode,
      paymentType,
      remarks: remarks || (paymentMode === "split" ? `Cash: ₹${cashAmount}, Online: ₹${onlineAmount}` : (hasExistingDue ? "Balance Due Payment" : "")),
      date: toIndianDate(new Date()),
      status: remainingDue > 0 ? "partial" : "paid",
    };

    try {
      // 1. Update Member in Firestore & UI
      const updatedFields = {
        ...(hasExistingDue ? {} : { planName: currentPlan.name, planPrice: calculatedTotal }),
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

      // 4. Generate & Download Bill PDF Receipt
      generatePaymentReceipt(newPaymentRecord, settings);

      // 5. Generate Online Receipt Web Link (Matching study-point live link)
      const receiptLink = `${window.location.origin}/#/receipt/${newPaymentRecord.id}`;

      // 6. If WhatsApp requested, open WhatsApp with receipt link & details
      if (sendWhatsApp && phone) {
        const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName || 'UNIVO GYM'}*\n\nHello *${memberName}*,\nThank you for your payment! Here are your membership billing details:\n\n📋 *Plan:* ${currentPlan.name}\n📅 *Validity:* ${newPaymentRecord.validityStart} to ${newPaymentRecord.validityEnd}\n💰 *Total Plan Fee:* ₹${calculatedTotal}\n✅ *Amount Paid:* ₹${payingNow} (${paymentMode.toUpperCase()})\n${remainingDue > 0 ? `⚠️ *Remaining Due:* ₹${remainingDue}\n` : "✨ *Status:* FULLY PAID\n"}\n🔗 *View & Download Official Receipt Online:*\n${receiptLink}\n\nStay fit and keep crushing your workouts! 💪`;
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
        hasExistingDue
          ? `Collect Remaining Due — ${member.name || member.fullName}`
          : isRenewing
          ? `⚡ Renew Membership & Plan — ${member.name || member.fullName}`
          : "Collect Fee & Membership Billing"
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-slate-800 text-xs">
        {/* Renewal Banner if Member's plan is ending soon or expired */}
        {isRenewing && !hasExistingDue && (
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

        {/* Due Balance Alert Banner if Member has pending dues */}
        {hasExistingDue && (
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${hasExistingDue ? 'opacity-60 pointer-events-none' : ''}`}>
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
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">
              {currentPlan.name} ({currentPlan.durationMonths} Month)
            </span>
            {discountAmount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                Discount -₹{discountAmount}
              </span>
            )}
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-bold mr-2">TOTAL PLAN FEE:</span>
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
                  onClick={() => setPaymentMode(m.key)}
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
            <div className="p-3.5 bg-amber-500/10 border border-amber-300 rounded-xl grid grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
              <div>
                <label className="font-bold text-amber-950 block mb-1">💵 Cash Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-white border border-amber-400 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-amber-950 block mb-1">📱 UPI Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1799"
                  value={onlineAmount}
                  onChange={(e) => setOnlineAmount(e.target.value)}
                  className="w-full bg-white border border-amber-400 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                />
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

/**
 * Modal to Edit Member Personal Information
 */
function EditMemberModal({ member, onClose, onSave, trainers = [] }) {
  const [name, setName] = useState(member.name || member.fullName || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [email, setEmail] = useState(member.email || '');
  const [aadharNumber, setAadharNumber] = useState(member.aadharNumber || member.aadharNo || '');
  const [gender, setGender] = useState(member.gender || 'Male');
  const [slot, setSlot] = useState(member.slot || member.workoutSlot || 'General Shift');
  const [trainerName, setTrainerName] = useState(member.trainerName || 'Unassigned');
  const [weight, setWeight] = useState(member.weight || '');
  const [heightFeet, setHeightFeet] = useState(member.heightFeet || '5');
  const [heightInches, setHeightInches] = useState(member.heightInches || '8');
  const [address, setAddress] = useState(member.address || '');
  const [healthNotes, setHealthNotes] = useState(member.healthNotes || member.medicalHistory || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Member name is required');
      return;
    }
    setLoading(true);

    const ft = parseFloat(heightFeet);
    const inch = parseFloat(heightInches || 0);
    const w = parseFloat(weight);
    let calculatedBmi = member.bmi || '';
    if (w > 0 && ft > 0) {
      const hM = (ft * 12 + inch) * 0.0254;
      calculatedBmi = parseFloat((w / (hM * hM)).toFixed(1));
    }

    const payload = {
      name: name.trim(),
      fullName: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      aadharNumber: aadharNumber.trim(),
      gender,
      slot,
      workoutSlot: slot,
      trainerName,
      weight: weight ? String(weight) : '',
      height: heightFeet ? `${heightFeet} ft ${heightInches || 0} in` : '',
      heightFeet: heightFeet || '',
      heightInches: heightInches || '',
      bmi: calculatedBmi ? String(calculatedBmi) : '',
      address: address.trim(),
      healthNotes: healthNotes.trim()
    };

    try {
      await updateMember(member.id, payload);
      toast.success('Member details updated successfully!');
      onSave(member.id, payload);
      onClose();
    } catch (err) {
      console.error('Error updating member:', err);
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="✏️ Edit Member Details"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className='space-y-4 text-slate-800'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Full Name *</label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
              required
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Phone Number</label>
            <input
              type='text'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Email Address</label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Aadhar Card Number</label>
            <input
              type='text'
              maxLength={14}
              placeholder='XXXX-XXXX-XXXX'
              value={aadharNumber}
              onChange={(e) => setAadharNumber(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            />
          </div>
        </div>

        <div className='grid grid-cols-3 gap-3'>
          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            >
              <option value='Male'>Male</option>
              <option value='Female'>Female</option>
              <option value='Other'>Other</option>
            </select>
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Shift / Slot</label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            >
              <option value='Morning (6am-9am)'>Morning</option>
              <option value='Afternoon (12pm-3pm)'>Afternoon</option>
              <option value='Evening (4pm-7pm)'>Evening</option>
              <option value='Night (7pm-10pm)'>Night</option>
              <option value='General Shift'>General Shift</option>
            </select>
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Trainer</label>
            <select
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            >
              <option value='Unassigned'>None</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.name || t.fullName}>
                  {t.name || t.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BMI Assessment: Weight (kg) & Height (ft & in) */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200'>
          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Weight (kg)</label>
            <input
              type='number'
              step='0.1'
              placeholder='e.g. 72'
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-700 mb-1'>Height (ft & in)</label>
            <div className='grid grid-cols-2 gap-1.5'>
              <div className='relative'>
                <input
                  type='number'
                  min='3'
                  max='8'
                  placeholder='5'
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(e.target.value)}
                  className='w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:outline-none focus:border-amber-500'
                />
                <span className='absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400'>ft</span>
              </div>
              <div className='relative'>
                <input
                  type='number'
                  min='0'
                  max='11'
                  placeholder='8'
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
                  className='w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 pr-6 focus:outline-none focus:border-amber-500'
                />
                <span className='absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400'>in</span>
              </div>
            </div>
            <span className='text-[10px] text-slate-400 mt-0.5 block'>
              {heightFeet ? `${heightFeet} ft ${heightInches || 0} in` : 'e.g. 5 ft 8 in'}
            </span>
          </div>
        </div>

        <div>
          <label className='block text-xs font-semibold text-slate-700 mb-1'>Address</label>
          <input
            type='text'
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className='w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            placeholder='Full address / city'
          />
        </div>

        <div>
          <label className='block text-xs font-semibold text-slate-700 mb-1'>Health Notes / Medical Conditions</label>
          <textarea
            rows={2}
            value={healthNotes}
            onChange={(e) => setHealthNotes(e.target.value)}
            className='w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500'
            placeholder='Any past injuries, blood pressure, asthma etc.'
          />
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
            className='flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50'
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Modal to mark a member as Left / Discontinued
 */
function LeftModal({ member, onClose, onSave }) {
  const [reason, setReason] = useState('Stopped coming / Gym left');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const presetReasons = [
    'Stopped coming / Gym left',
    'Relocated / Out of town',
    'Personal / Family reason',
    'Health / Injury break',
    'Membership expired & did not renew',
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
      title="🚪 Mark Member as Left"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className='space-y-4 text-slate-800'>
        <div className='p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5'>
          <LogOut className='w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5' />
          <div className='text-xs'>
            <p className='font-bold text-rose-950'>Mark {member.name || member.fullName} as Left?</p>
            <p className='text-rose-800/80 mt-0.5 leading-relaxed'>
              Yeh member Active list se hat kar <strong>Left / Inactive</strong> filter tab me chala jayega. Aap jab chahe isse wapas reactivate kar sakte hain.
            </p>
          </div>
        </div>

        <div>
          <label className='block text-xs font-bold text-slate-700 mb-1.5'>Reason for Leaving</label>
          <div className='space-y-1.5'>
            {presetReasons.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                  reason === r
                    ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type='radio'
                  name='leftReason'
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className='accent-rose-600'
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
              className='mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500'
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
            className='flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md disabled:opacity-50'
          >
            {loading ? 'Marking...' : 'Confirm Mark as Left'}
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
  const { gymId } = useAuth();
  const navigate = useNavigate();
  const settings = getGymSettings();

  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('active');
  const [showInvite, setShowInvite] = useState(false);
  const [showDirectAdd, setShowDirectAdd] = useState(false);

  // Modals for table actions
  const [extendMember, setExtendMember] = useState(null);
  const [planMember, setPlanMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [leftMember, setLeftMember] = useState(null);
  const [deleteTargetMember, setDeleteTargetMember] = useState(null);

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
        const [m, t] = await Promise.all([
          getMembers(gymId || 'univo_main'),
          getTrainers(gymId || 'univo_main'),
        ]);
        if (m && m.length > 0) {
          const realPhoneSet = new Set(m.map((rm) => (rm.phone || '').replace(/\D/g, '')));
          const remainingDummy = dummyMembers.filter((dm) => !realPhoneSet.has((dm.phone || '').replace(/\D/g, '')));
          setMembers([...m, ...remainingDummy]);
        } else {
          setMembers(dummyMembers);
        }
        setTrainers(t || []);
      } catch (err) {
        setMembers(dummyMembers);
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

  const handleReactivate = async (m) => {
    try {
      const now = new Date();
      const currentExp = toDate(m.expiryDate);
      const newExp = (!currentExp || currentExp < now)
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : m.expiryDate;

      await updateMember(m.id, {
        status: 'active',
        active: true,
        expiryDate: newExp,
        reactivatedAt: new Date().toISOString()
      });

      setMembers((prev) =>
        prev.map((item) =>
          item.id === m.id
            ? { ...item, status: 'active', active: true, expiryDate: newExp }
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

  // Status counts
  const isPaid = (m) => Number(m.dueAmount || 0) <= 0 && !!m.lastPaymentDate;
  const isPartial = (m) => Number(m.dueAmount || 0) > 0;
  const paidCount = members.filter((m) => isPaid(m) && m.status !== 'left').length;
  const partialCount = members.filter((m) => isPartial(m) && m.status !== 'left').length;
  const activeCount = members.filter((m) => getMemberStatus(m) === 'active').length;
  const endingSoonCount = members.filter((m) => getMemberStatus(m) === 'ending_soon').length;
  const expiredCount = members.filter((m) => getMemberStatus(m) === 'expired').length;
  const overdueCount = members.filter((m) => getMemberStatus(m) === 'overdue').length;
  const leftCount = members.filter((m) => getMemberStatus(m) === 'left').length;

  const FILTER_TABS = [
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'paid', label: `Paid (${paidCount})` },
    { key: 'partial', label: `Partial / Due (${partialCount})` },
    { key: 'ending_soon', label: `Ending Soon (${endingSoonCount})` },
    { key: 'expired', label: `Expired (${expiredCount})` },
    { key: 'overdue', label: `Overdue (${overdueCount})` },
    { key: 'left', label: `Left / Inactive (${leftCount})` },
    { key: 'all', label: `All (${members.length})` },
  ];

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      (m.name || m.fullName || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q);
    const status = getMemberStatus(m);
    
    let matchTab = false;
    if (filterTab === 'all') {
      matchTab = true;
    } else if (filterTab === 'paid') {
      matchTab = isPaid(m) && m.status !== 'left';
    } else if (filterTab === 'partial') {
      matchTab = isPartial(m) && m.status !== 'left';
    } else {
      matchTab = status === filterTab;
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
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'>
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
          <div className='w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0'>
            <IndianRupee className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-amber-800 font-medium truncate'>Partial Due</p>
            <p className='text-base font-bold text-amber-700'>{partialCount}</p>
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
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Expired (1-3d)</p>
            <p className='text-base font-bold text-rose-600'>{expiredCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0'>
            <UserX className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Overdue (&gt;3d)</p>
            <p className='text-base font-bold text-red-700'>{overdueCount}</p>
          </div>
        </div>

        <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2.5'>
          <div className='w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0'>
            <LogOut className='w-4.5 h-4.5' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10.5px] text-slate-500 font-medium truncate'>Left / Inactive</p>
            <p className='text-base font-bold text-slate-900'>{leftCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between'>
        <div className='flex flex-wrap gap-1.5 w-full sm:w-auto'>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                filterTab === tab.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className='flex items-center gap-2.5 w-full sm:w-auto'>
          <div className='relative flex-1 sm:w-64'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search by name, phone...'
              className='w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white'
            />
          </div>

          <div className='flex bg-slate-100 p-1 rounded-xl'>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-lg transition ${view === 'table' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
              title='Table View'
            >
              <LayoutList className='w-4 h-4' />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-lg transition ${view === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
              title='Card View'
            >
              <LayoutGrid className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

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
                  const isLeft = status === 'left';

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
                          <p className='text-[11px] text-slate-500 pl-0.5'>
                            {m.trainerName ? `🏋️ ${m.trainerName}` : 'No Trainer'}
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Plan & Fee with Days Left Pill */}
                      <td className='px-5 py-3.5'>
                        <div className='space-y-1'>
                          <p className='font-bold text-slate-900 text-xs'>
                            {m.planName || 'Standard Plan'} {m.planPrice ? `(₹${Number(m.planPrice).toLocaleString('en-IN')})` : ''}
                          </p>
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${daysInfo.cls}`}>
                            {daysInfo.text}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Current Status Pill */}
                      <td className='px-5 py-3.5'>
                        <StatusBadge status={status} dueAmount={m.dueAmount} />
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
                            const needsRenewal = ['ending_soon', 'expired', 'overdue'].includes(memberStat);

                            // Case 1: Needs Renewal (Ending Soon, Expired, or Overdue) -> Show "⚡ Renew"
                            if (needsRenewal) {
                              return (
                                <button
                                  onClick={() => setPlanMember(m)}
                                  className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs transition shadow-sm animate-pulse'
                                  title={`Membership ${memberStat === 'ending_soon' ? 'Ending Soon' : 'Expired/Overdue'} - Click to Renew Plan`}
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

                          {/* 5. Left or Return Button */}
                          {isLeft ? (
                            <button
                              onClick={() => handleReactivate(m)}
                              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition shadow-sm'
                              title='Reactivate member back to active status'
                            >
                              <RotateCcw className='w-3.5 h-3.5 text-emerald-600' />
                              <span>Return</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setLeftMember(m)}
                              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition shadow-sm'
                              title='Mark member as left / discontinued'
                            >
                              <UserMinus className='w-3.5 h-3.5 text-rose-600' />
                              <span>Left</span>
                            </button>
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
            const isLeft = status === 'left';

            return (
              <div key={m.id} className='p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5 hover:border-emerald-300 transition flex flex-col justify-between'>
                <div>
                  <div className='flex items-center justify-between'>
                    <Avatar member={m} size='md' />
                    <StatusBadge status={status} dueAmount={m.dueAmount} />
                  </div>
                  <div className='mt-3'>
                    <h4 className='font-bold text-slate-900 text-sm leading-tight'>{m.name || m.fullName}</h4>
                    <p className='text-xs text-slate-400 mt-0.5'>{m.phone || 'No phone'}</p>
                  </div>
                  <div className='mt-3 space-y-1'>
                    <p className='text-xs font-semibold text-slate-800'>{m.planName || 'Standard Plan'}</p>
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
                    const needsRenewal = ['ending_soon', 'expired', 'overdue'].includes(memberStat);

                    // Case 1: Needs Renewal
                    if (needsRenewal) {
                      return (
                        <button
                          onClick={() => setPlanMember(m)}
                          className='px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-500 text-xs font-black hover:from-emerald-700 hover:to-teal-700 transition shadow-xs animate-pulse'
                          title={`Membership ${memberStat === 'ending_soon' ? 'Ending Soon' : 'Expired/Overdue'} - Click to Renew`}
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
                    >
                      Return
                    </button>
                  ) : (
                    <button
                      onClick={() => setLeftMember(m)}
                      className='px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition'
                    >
                      Left
                    </button>
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
          onClose={() => setPlanMember(null)}
          onSave={handlePlanSuccess}
        />
      )}

      {/* Edit Member Details Modal */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          trainers={trainers}
          onClose={() => setEditMember(null)}
          onSave={handleEditSuccess}
        />
      )}

      {/* Left Member Modal */}
      {leftMember && (
        <LeftModal
          member={leftMember}
          onClose={() => setLeftMember(null)}
          onSave={handleLeftSuccess}
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
        trainers={trainers}
      />
    </div>
  );
}