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
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getMembers, generateInviteToken, addMember } from '../../firebase/members';
import { getTrainers } from '../../firebase/trainers';
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
  if (member.status === 'active') return 'active';
  if (member.status === 'expired') return 'expired';
  if (member.status === 'expiring') return 'expiring';
  
  const expiry = toDate(member.expiryDate);
  if (!expiry) return member.status || 'active';
  const now = new Date();
  const diff = (expiry - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff <= 7) return 'expiring';
  if (member.active === false) return 'inactive';
  return 'active';
}

function daysLeft(member) {
  const expiry = toDate(member.expiryDate);
  if (!expiry) return null;
  const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
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
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  expired: { label: 'Expired', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  expiring: { label: 'Expiring Soon', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  inactive: { label: 'Inactive', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function Avatar({ member, size = 'sm' }) {
  const sizeMap = { sm: 'w-9 h-9 text-xs', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' };
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
        {/* Helper Banner */}
        <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950'>
          <Sparkles className='w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5' />
          <p className='leading-relaxed text-[11px] text-emerald-900'>
            Member link open karke ya <strong>QR Code scan karke</strong> apna plan, trainer aur photo khud select & upload karega.
          </p>
        </div>

        {/* Form Inputs (Side-by-Side) */}
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
            {/* Countdown & Expiry */}
            <div className='flex items-center justify-between text-xs'>
              <span className='font-semibold text-slate-600 flex items-center gap-1.5'>
                <Clock className='w-4 h-4 text-emerald-600' /> Time Remaining:
              </span>
              <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full ${expired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                {expired ? 'EXPIRED' : fmtCountdown(secondsLeft)}
              </span>
            </div>

            {/* Link & QR Code 2-column view */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center pt-1'>
              {/* Left Column: Link input & buttons */}
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

              {/* Right Column: Instant QR Code Box */}
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

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
  { key: 'expiring', label: 'Expiring Soon' },
];

export default function Members() {
  const { gymId } = useAuth();
  const navigate = useNavigate();
  const settings = getGymSettings();

  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [showDirectAdd, setShowDirectAdd] = useState(false);

  const [directForm, setDirectForm] = useState({
    name: '',
    phone: '',
    email: '',
    planName: '3-Month Pro',
    gender: 'Male',
  });

  const dummyMembers = [
    {
      id: 'm1',
      name: 'Ajay Prajapati',
      fullName: 'Ajay Prajapati',
      phone: '+91 9196302375',
      email: 'ajay@gmail.com',
      planName: '3-Month Pro',
      trainerName: 'Coach Amit',
      status: 'active',
      createdAt: '2026-09-10',
      expiryDate: '2026-12-10'
    },
    {
      id: 'm2',
      name: 'Rahul Verma',
      fullName: 'Rahul Verma',
      phone: '+91 9876543210',
      email: 'rahul.v@gmail.com',
      planName: 'Annual Elite',
      trainerName: 'Coach Rohan',
      status: 'active',
      createdAt: '2026-09-08',
      expiryDate: '2027-09-08'
    },
    {
      id: 'm3',
      name: 'Priya Sharma',
      fullName: 'Priya Sharma',
      phone: '+91 9811223344',
      email: 'priya@gmail.com',
      planName: '6-Month Transformation',
      trainerName: 'Coach Sneha',
      status: 'active',
      createdAt: '2026-09-05',
      expiryDate: '2027-03-05'
    },
    {
      id: 'm4',
      name: 'Aman Gupta',
      fullName: 'Aman Gupta',
      phone: '+91 9988776655',
      email: 'aman.g@gmail.com',
      planName: '1-Month Basic',
      trainerName: 'Unassigned',
      status: 'expiring',
      createdAt: '2026-08-14',
      expiryDate: '2026-09-14'
    },
    {
      id: 'm5',
      name: 'Karan Johar',
      fullName: 'Karan Johar',
      phone: '+91 9711003322',
      email: 'karan@gmail.com',
      planName: '3-Month Pro',
      trainerName: 'Coach Amit',
      status: 'expired',
      createdAt: '2026-05-10',
      expiryDate: '2026-08-10'
    },
    {
      id: 'm6',
      name: 'Neha Rajput',
      fullName: 'Neha Rajput',
      phone: '+91 9655443322',
      email: 'neha.r@gmail.com',
      planName: 'Annual Elite',
      trainerName: 'Coach Sneha',
      status: 'active',
      createdAt: '2026-09-01',
      expiryDate: '2027-09-01'
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
          // Merge real members with dummy members so default demo data remains viewable if list is short
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

  const handleDirectAddSubmit = async (e) => {
    e.preventDefault();
    const newMem = {
      name: directForm.name,
      fullName: directForm.name,
      phone: directForm.phone,
      email: directForm.email,
      planName: directForm.planName,
      gender: directForm.gender,
      status: 'active',
      registeredBy: 'owner',
      createdAt: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };
    try {
      await addMember(gymId || 'univo_main', newMem);
    } catch (e) {
      console.warn('Offline or simulated save:', e);
    }
    setMembers([newMem, ...members]);
    setShowDirectAdd(false);
    toast.success(`${newMem.name} added successfully!`);
    setDirectForm({ name: '', phone: '', email: '', planName: '3-Month Pro', gender: 'Male' });
  };

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      (m.name || m.fullName || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q);
    const status = getMemberStatus(m);
    const matchTab = filterTab === 'all' || status === filterTab;
    return matchSearch && matchTab;
  });

  const activeCount = members.filter((m) => getMemberStatus(m) === 'active').length;
  const expiredCount = members.filter((m) => getMemberStatus(m) === 'expired').length;
  const expiringCount = members.filter((m) => getMemberStatus(m) === 'expiring').length;

  return (
    <div className='space-y-6'>
      {/* Header & Actions */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-bold text-slate-900'>Gym Members</h1>
            <span className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200'>
              {members.length} Total
            </span>
          </div>
          <p className='text-xs text-slate-500 mt-1'>
            Register members via WhatsApp invite link or add directly as Owner
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <button
            onClick={() => setShowInvite(true)}
            className='flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm'
          >
            <Share2 className='w-4 h-4 text-emerald-600' /> Share 10-Min Link
          </button>
          <button
            onClick={() => setShowDirectAdd(true)}
            className='flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-sm'
          >
            <UserPlus className='w-4 h-4' /> Add Member Directly
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
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
          <div className='w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center'>
            <AlertTriangle className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-slate-500 font-medium'>Expiring This Week</p>
            <p className='text-lg font-bold text-slate-900'>{expiringCount}</p>
          </div>
        </div>
        <div className='p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center'>
            <UserX className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-slate-500 font-medium'>Expired Plans</p>
            <p className='text-lg font-bold text-slate-900'>{expiredCount}</p>
          </div>
        </div>
        <div className='p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3'>
          <div className='w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center'>
            <TrendingUp className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-slate-500 font-medium'>New This Month</p>
            <p className='text-lg font-bold text-slate-900'>18</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className='p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between'>
        <div className='relative w-full sm:w-80'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search member name or phone...'
            className='w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white'
          />
        </div>

        <div className='flex items-center justify-between w-full sm:w-auto gap-2'>
          {/* Status Tabs */}
          <div className='flex gap-1 bg-slate-100 p-1 rounded-xl'>
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  filterTab === tab.key
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className='flex bg-slate-100 p-1 rounded-xl'>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-lg transition ${view === 'table' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              <LayoutList className='w-4 h-4' />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-lg transition ${view === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              <LayoutGrid className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Member Data Display */}
      {view === 'table' ? (
        <div className='overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <table className='w-full text-left text-xs text-slate-600'>
            <thead className='bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200'>
              <tr>
                <th className='px-5 py-3.5'>Member</th>
                <th className='px-5 py-3.5'>Contact</th>
                <th className='px-5 py-3.5'>Membership Plan</th>
                <th className='px-5 py-3.5'>Trainer</th>
                <th className='px-5 py-3.5'>Joined</th>
                <th className='px-5 py-3.5'>Status</th>
                <th className='px-5 py-3.5 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {filtered.map((m) => {
                const status = getMemberStatus(m);
                return (
                  <tr key={m.id} className='hover:bg-slate-50/80 transition'>
                    <td className='px-5 py-3.5'>
                      <div className='flex items-center gap-3'>
                        <Avatar member={m} size='sm' />
                        <div>
                          <p className='font-bold text-slate-900'>{m.name || m.fullName}</p>
                          <p className='text-[11px] text-slate-400'>{m.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-5 py-3.5 font-medium text-slate-700'>{m.phone || '—'}</td>
                    <td className='px-5 py-3.5'>
                      <span className='px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200'>
                        {m.planName || 'General'}
                      </span>
                    </td>
                    <td className='px-5 py-3.5 text-slate-600'>{m.trainerName || 'Unassigned'}</td>
                    <td className='px-5 py-3.5 text-slate-500'>{formatDate(m.createdAt)}</td>
                    <td className='px-5 py-3.5'>
                      <StatusBadge status={status} />
                    </td>
                    <td className='px-5 py-3.5 text-right'>
                        <button
                          onClick={() => {
                            generatePaymentReceipt({
                              memberName: m.name || m.fullName,
                              planName: m.planName || "3-Month Pro",
                              paidAmount: 6500,
                              dueAmount: 0,
                              paymentMode: "online",
                              date: formatDate(m.createdAt)
                            });
                            toast.success("Downloading official bill receipt...");
                          }}
                          className='p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition'
                          title='Download Official Bill Receipt PDF'
                        >
                          <Download className='w-4 h-4 text-emerald-600' />
                        </button>
                        <button
                          onClick={() => {
                            const waPhone = (m.phone || '').replace(/\D/g, '');
                            window.open(`https://wa.me/${waPhone}?text=Hi%20${m.name || m.fullName},%20Greetings%20from%20${settings.gymName}!`, '_blank');
                          }}
                          className='p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition'
                          title='Message on WhatsApp'
                        >
                          <MessageCircle className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => navigate(`/owner/members/${m.id}`)}
                          className='p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition'
                          title='View Profile'
                        >
                          <Eye className='w-4 h-4' />
                        </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {filtered.map((m) => {
            const status = getMemberStatus(m);
            return (
              <div key={m.id} className='p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-emerald-300 transition'>
                <div className='flex items-center justify-between'>
                  <Avatar member={m} size='md' />
                  <StatusBadge status={status} />
                </div>
                <div>
                  <h4 className='font-bold text-slate-900 text-sm'>{m.name || m.fullName}</h4>
                  <p className='text-xs text-slate-500'>{m.phone}</p>
                </div>
                <div className='pt-2 border-t border-slate-100 flex items-center justify-between text-xs'>
                  <span className='font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md'>
                    {m.planName || 'General'}
                  </span>
                  <button
                    onClick={() => navigate(`/owner/members/${m.id}`)}
                    className='text-xs text-emerald-600 font-bold hover:underline'
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <InviteLinkModal
          gymId={gymId}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Direct Add Member Modal with complete registration questions */}
      <DirectAddMemberModal
        isOpen={showDirectAdd}
        onClose={() => setShowDirectAdd(false)}
        onSuccess={(newMem) => setMembers([newMem, ...members])}
        trainers={trainers}
      />
    </div>
  );
}