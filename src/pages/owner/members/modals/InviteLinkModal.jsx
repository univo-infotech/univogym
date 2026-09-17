import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Clock, Copy, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { generateInviteToken } from '../../../../firebase/members';
import { getTrainers } from '../../../../firebase/trainers';
import { openWhatsApp } from '../../../../utils/whatsapp';
import Modal from '../../../../components/ui/Modal';
import { fmtCountdown, toDate, formatDate, getName } from '../memberUtils';

const TIMER_SECONDS = 600;

export default function InviteLinkModal({ gymId, onClose }) {
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
