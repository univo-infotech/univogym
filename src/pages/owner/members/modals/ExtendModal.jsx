import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../../components/ui/Modal';
import { updateMember } from '../../../../firebase/members';
import { addPayment } from '../../../../firebase/payments';
import { toDate, formatDate } from '../memberUtils';

export default function ExtendModal({ member, onClose, onSave, gymId }) {
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
