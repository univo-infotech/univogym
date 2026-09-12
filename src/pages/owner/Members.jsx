import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Download,
  LayoutGrid,
  LayoutList,
  Eye,
  MessageCircle,
  Link2,
  MoreVertical,
  X,
  Copy,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  UserX,
  UserCheck,
  TrendingUp,
  Edit,
  UserMinus,
  Share2,
  Sparkles,
  CheckCircle2,
  QrCode,
  CalendarPlus,
  RotateCcw,
  Trash2,
  Check,
  Sun,
  Moon,
  Dumbbell,
  Receipt,
  IndianRupee,
  LogOut,
  Calendar
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getMembers, generateInviteToken, addMember, updateMember, deleteMember } from '../../firebase/members';
import { getTrainers } from '../../firebase/trainers';
import { addPayment } from '../../firebase/payments';
import { useAuth } from '../../contexts/AuthContext';
import { generatePaymentReceipt } from '../../utils/pdf';
import { getGymSettings } from '../../utils/settings';
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
  if (member.status === 'expired') return 'expired';
  if (member.status === 'expiring') return 'expiring';
  if (member.active === false) return 'inactive';

  const expiry = toDate(member.expiryDate);
  if (!expiry) return member.status || 'active';
  const now = new Date();
  const diff = (expiry - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff <= 7) return 'expiring';
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
  if (diff < 0) {
    return { text: `Expired (${Math.abs(diff)} days ago)`, cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (diff <= 7) {
    return { text: `Expiring (${diff} days left)`, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
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
  active: { label: 'Active', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  left: { label: 'Left', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  expired: { label: 'Expired', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  expiring: { label: 'Expiring Soon', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  inactive: { label: 'Inactive', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

function StatusBadge({ status }) {
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
                    <MessageCircle className='w-4 h-4' /> Send via WhatsApp
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
  const [daysPreset, setDaysPreset] = useState(10); // Default 10 days as highlighted by user
  const [customDays, setCustomDays] = useState('');
  const [fee, setFee] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveDays = daysPreset === 'custom' ? Number(customDays) || 0 : Number(daysPreset);

  const currentExpiry = toDate(member?.expiryDate);
  const now = new Date();
  // If expired, extension starts from today; if active, extension adds to current expiry date
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

      // If fee was charged, record payment
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
        {/* Member Preview Banner */}
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

        {/* Quick Days Selector */}
        <div>
          <label className='block text-xs font-bold text-slate-700 mb-2'>
            Select Extension Days <span className='text-emerald-600'>(10 Days popular)</span>
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
                {d === 10 && <span className='text-[9px] opacity-90'>Recommended</span>}
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

        {/* New Expiry Date Card */}
        <div className='p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between'>
          <span className='text-xs font-medium text-slate-600 flex items-center gap-1.5'>
            <Calendar className='w-4 h-4 text-emerald-600' /> New Expiry Date:
          </span>
          <span className='text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg'>
            {formatDate(targetDate)} (+{effectiveDays}d)
          </span>
        </div>

        {/* Fee Collection Section */}
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

        {/* Action Buttons */}
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
 * Modal to mark a member as Left / Discontinued
 */
function LeftModal({ member, onClose, onSave }) {
  const [reason, setReason] = useState('Stopped coming');
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
      slot: 'Morning (6am-9am)',
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
      planPrice: 6500,
      slot: 'Evening (4pm-7pm)',
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
      planPrice: 14999,
      slot: 'Morning (6am-9am)',
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
      planPrice: 8500,
      slot: 'Evening (4pm-7pm)',
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
      planPrice: 1500,
      slot: 'Morning (6am-9am)',
      trainerName: 'Unassigned',
      status: 'expiring',
      createdAt: '2026-08-14',
      expiryDate: '2026-09-16'
    },
    {
      id: 'm6',
      name: 'Karan Johar',
      fullName: 'Karan Johar',
      phone: '+91 9711003322',
      email: 'karan@gmail.com',
      planName: '3 Months Pro',
      planPrice: 6500,
      slot: 'Night (7pm-10pm)',
      trainerName: 'Coach Amit Sharma',
      status: 'expired',
      createdAt: '2026-05-10',
      expiryDate: '2026-08-10'
    },
    {
      id: 'm7',
      name: 'Sandesh Sharma',
      fullName: 'Sandesh Sharma',
      phone: '+91 9685215724',
      email: 'sandesh@gmail.com',
      planName: '2 Month (Special)',
      planPrice: 999,
      slot: 'Morning (6am-9am)',
      trainerName: 'Coach Rohan Deshmukh',
      status: 'active',
      createdAt: '2026-09-03',
      expiryDate: '2026-11-03'
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

  // Handlers for Extend, Left, Reactivate, Delete
  const handleExtendSuccess = (memberId, newExpiryIso) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, expiryDate: newExpiryIso, status: 'active', active: true }
          : m
      )
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
      // Re-activating: give fresh 30 days if already expired, otherwise keep active
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
  const activeCount = members.filter((m) => getMemberStatus(m) === 'active').length;
  const leftCount = members.filter((m) => getMemberStatus(m) === 'left').length;
  const expiringCount = members.filter((m) => getMemberStatus(m) === 'expiring').length;
  const expiredCount = members.filter((m) => getMemberStatus(m) === 'expired').length;

  const FILTER_TABS = [
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'left', label: `Left / Inactive (${leftCount})` },
    { key: 'expiring', label: `Expiring (${expiringCount})` },
    { key: 'expired', label: `Expired (${expiredCount})` },
    { key: 'all', label: `All (${members.length})` },
  ];

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      (m.name || m.fullName || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q);
    const status = getMemberStatus(m);
    const matchTab = filterTab === 'all' || status === filterTab;
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
            Manage member admissions, membership extensions, shift timings & profiles
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
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3.5'>
        <div className='p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center'>
            <UserCheck className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-slate-500 font-medium'>Active Members</p>
            <p className='text-lg font-bold text-slate-900'>{activeCount}</p>
          </div>
        </div>

        <div className='p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center'>
            <LogOut className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-slate-500 font-medium'>Left / Discontinued</p>
            <p className='text-lg font-bold text-slate-900'>{leftCount}</p>
          </div>
        </div>

        <div className='p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center'>
            <AlertTriangle className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-slate-500 font-medium'>Expiring This Week</p>
            <p className='text-lg font-bold text-slate-900'>{expiringCount}</p>
          </div>
        </div>

        <div className='p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center'>
            <UserX className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-slate-500 font-medium'>Expired Plans</p>
            <p className='text-lg font-bold text-slate-900'>{expiredCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar (styled directly like reference software) */}
      <div className='p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between'>
        {/* Status Pill Tabs */}
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

        {/* Right side Search & View Toggle */}
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

      {/* Member Directory Table matching Reference UI */}
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
                        <StatusBadge status={status} />
                      </td>

                      {/* Column 5: Action Pill Buttons (Matching Reference Design) */}
                      <td className='px-5 py-3.5 text-right'>
                        <div className='inline-flex items-center gap-1.5 justify-end'>
                          {/* Profile Button */}
                          <button
                            onClick={() => navigate(`/owner/members/${m.id}`)}
                            className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80 transition shadow-sm'
                            title='View Full Member Profile'
                          >
                            <Eye className='w-3.5 h-3.5 text-slate-500' />
                            <span>Profile</span>
                          </button>

                          {/* Extend Date Button */}
                          <button
                            onClick={() => setExtendMember(m)}
                            className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition shadow-sm'
                            title='Extend membership by 10 days or custom days'
                          >
                            <CalendarPlus className='w-3.5 h-3.5 text-emerald-600' />
                            <span>Extend</span>
                          </button>

                          {/* Left or Reactivate Button */}
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

                          {/* Bill Receipt Download */}
                          <button
                            onClick={() => {
                              generatePaymentReceipt({
                                memberName: m.name || m.fullName,
                                planName: m.planName || "Gym Membership",
                                paidAmount: m.planPrice || 2500,
                                dueAmount: 0,
                                paymentMode: "Online",
                                date: formatDate(m.createdAt)
                              });
                              toast.success("Downloading official bill receipt...");
                            }}
                            className='p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition'
                            title='Download Bill Receipt PDF'
                          >
                            <Download className='w-3.5 h-3.5' />
                          </button>

                          {/* WhatsApp Action */}
                          <button
                            onClick={() => {
                              const waPhone = (m.phone || '').replace(/\D/g, '');
                              window.open(`https://wa.me/${waPhone}?text=Hi%20${m.name || m.fullName},%20Greetings%20from%20${settings.gymName}!`, '_blank');
                            }}
                            className='p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition'
                            title='Message on WhatsApp'
                          >
                            <MessageCircle className='w-3.5 h-3.5' />
                          </button>

                          {/* Delete Member */}
                          <button
                            onClick={() => setDeleteTargetMember(m)}
                            className='p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition'
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
                    <StatusBadge status={status} />
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

                <div className='pt-3 border-t border-slate-100 flex items-center justify-between gap-1'>
                  <button
                    onClick={() => navigate(`/owner/members/${m.id}`)}
                    className='px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition'
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => setExtendMember(m)}
                    className='px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition'
                  >
                    Extend
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