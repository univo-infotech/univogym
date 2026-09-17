import React, { useState, useEffect } from 'react';
import { Calendar, CalendarPlus, Sparkles, IndianRupee, CheckCircle2, Split } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../../components/ui/Modal';
import { updateMember } from '../../../../firebase/members';
import { addPayment } from '../../../../firebase/payments';
import { toDate, formatDate, toIndianDate, getMembershipRemainingDays } from '../memberUtils';
import { getGymSettings } from '../../../../utils/settings';
import { openWhatsApp } from '../../../../utils/whatsapp';

export default function ExtendModal({ member, onClose, onSave, gymId }) {
  const [extraDays, setExtraDays] = useState(10);
  const [feeAmount, setFeeAmount] = useState('');
  const [isFreeExtension, setIsFreeExtension] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'online' | 'bank' | 'split' | 'pay_later'
  const [splitCash, setSplitCash] = useState('');
  const [splitOnline, setSplitOnline] = useState('');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [loading, setLoading] = useState(false);

  const settings = getGymSettings();

  // Compute daily rate and suggested fee based on plan
  const planPrice = Number(member?.planPrice || 2500);
  const durationDays = Number(member?.durationDays || 30);
  const dailyRate = durationDays > 0 ? planPrice / durationDays : (planPrice / 30 || 25);
  const suggestedFee = Math.round(dailyRate * (Number(extraDays) || 0));

  useEffect(() => {
    if (isFreeExtension) {
      setFeeAmount('0');
      return;
    }
    setFeeAmount(suggestedFee > 0 ? suggestedFee.toString() : '0');
  }, [extraDays, isFreeExtension, suggestedFee]);

  if (!member) return null;

  const currentEnd = toDate(member.expiryDate);
  const remainingInfo = getMembershipRemainingDays(member.expiryDate);
  const isAlreadyExpired = remainingInfo.isExpired;

  // New Expiry Date calculation
  // If active with days remaining, add to current expiry. If already expired, add to today.
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let newEndDate = new Date();
  if (!isAlreadyExpired && currentEnd && currentEnd.getTime() > today.getTime()) {
    newEndDate = new Date(currentEnd.getTime() + (Number(extraDays) || 0) * 86400000);
  } else {
    newEndDate = new Date(today.getTime() + (Number(extraDays) || 0) * 86400000);
  }

  const quickPillOptions = [3, 5, 7, 10, 15, 20, 30];

  const handleFeeAmountChange = (val) => {
    setFeeAmount(val);
    const num = Number(val) || 0;
    if (num <= 0) {
      setIsFreeExtension(true);
      return;
    }
    setIsFreeExtension(false);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!extraDays || Number(extraDays) <= 0) {
      toast.error('Please enter at least 1 day to extend');
      return;
    }

    const totalFee = Number(feeAmount) || 0;
    const isPayLater = paymentMode === 'pay_later';
    const finalPaidNow = isPayLater ? 0 : totalFee;
    const finalDueAmount = isPayLater ? totalFee : 0;

    setLoading(true);
    try {
      const newExpiryIso = newEndDate.toISOString();
      const newExpiryFormatted = toIndianDate(newEndDate);
      const receiptNum = `EXT-${Date.now().toString().slice(-6)}`;
      const memberName = member.name || member.fullName || 'Member';
      const phone = member.phone || '';

      // 1. Prepare payment record if fee > 0
      let createdPayment = null;
      if (totalFee > 0) {
        createdPayment = {
          id: receiptNum,
          receiptNo: receiptNum,
          receiptNumber: receiptNum,
          memberId: member.id,
          memberName,
          phone,
          gymId: gymId || 'univo_main',
          planName: `${member.planName || 'Gym Membership'} (Extended +${extraDays} Days)`,
          isExtension: true,
          amount: totalFee,
          planPrice: totalFee,
          paidAmount: finalPaidNow,
          dueAmount: finalDueAmount,
          discount: 0,
          paymentMode: isPayLater ? 'due' : paymentMode,
          cashAmount: paymentMode === 'split' ? Number(splitCash || 0) : (paymentMode === 'cash' ? finalPaidNow : 0),
          onlineAmount: paymentMode === 'split' ? Number(splitOnline || 0) : (paymentMode === 'online' ? finalPaidNow : 0),
          validityStart: currentEnd ? toIndianDate(currentEnd) : toIndianDate(new Date()),
          validityEnd: newExpiryFormatted,
          dueDate: newExpiryFormatted,
          date: toIndianDate(new Date()),
          status: isPayLater ? 'pending' : (finalDueAmount > 0 ? 'partial' : 'paid'),
          notes: notes ? `Extension: ${notes}` : `Membership validity extended by ${extraDays} days`,
          createdAt: new Date().toISOString()
        };

        try {
          await addPayment(gymId || 'univo_main', createdPayment);
        } catch (payErr) {
          console.warn('Payment record warning:', payErr);
        }
      }

      // 2. Update Member in Firestore
      const updatedMemberFields = {
        expiryDate: newExpiryIso,
        status: 'active',
        active: true,
        leftReason: null,
        endReason: null,
        lastExtendedDays: Number(extraDays),
        lastExtendedAt: new Date().toISOString(),
        ...(finalDueAmount > 0 ? { dueAmount: Number(member.dueAmount || 0) + finalDueAmount } : {}),
        ...(finalPaidNow > 0 ? {
          paidAmount: Number(member.paidAmount || 0) + finalPaidNow,
          lastPaymentDate: new Date().toISOString()
        } : {})
      };

      await updateMember(member.id, updatedMemberFields);

      toast.success(`Membership extended by ${extraDays} days till ${formatDate(newEndDate)}!`);

      // 3. WhatsApp notification
      if (sendWhatsApp && phone) {
        const msg = `📅 *Gym Membership Extended - ${settings.gymName || 'UNIVO GYM'}*\n\nHello *${memberName}*,\nYour gym membership has been extended by *+${extraDays} Days*!\n\n🗓️ *New Expiry Date:* ${newExpiryFormatted}\n💰 *Extension Fee:* ₹${totalFee} ${isPayLater ? '(Pay Later)' : `(Paid via ${paymentMode.toUpperCase()})`}\n\nKeep up the fitness momentum! Stay active and fit! 💪🏋️`;
        openWhatsApp(phone, msg);
      }

      // 4. Pass updated data & payment record to parent
      onSave(member.id, updatedMemberFields, createdPayment);
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
      title="Extend Membership Validity (दिन आगे बढ़ाएं)"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className="space-y-4 text-slate-800 text-xs">
        {/* Member & Expiry Summary Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3.5 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
          <div>
            <p className="font-extrabold text-slate-900 text-sm">{member.name || member.fullName}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              📞 {member.phone} • {member.planName || 'General Plan'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Current Validity</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border mt-0.5 ${remainingInfo.color}`}>
              {remainingInfo.label}
            </span>
          </div>
        </div>

        {/* Quick Days Selector Pills */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Select Extra Days to Add (अतिरिक्त दिन चुनें)</span>
            <span className="text-emerald-700 font-extrabold text-[11px]">Popular: +10 Days</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {quickPillOptions.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setExtraDays(d)}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition flex flex-col items-center justify-center cursor-pointer ${
                  Number(extraDays) === d
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>+{d} Days</span>
                {d === 10 && <span className="text-[9px] opacity-90 font-medium">Standard</span>}
              </button>
            ))}
          </div>

          {/* Custom Days Input */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-slate-500 font-medium whitespace-nowrap">Or Custom Days:</span>
            <input
              type="number"
              min="1"
              max="365"
              placeholder="Days (e.g. 12)"
              value={extraDays}
              onChange={(e) => setExtraDays(e.target.value)}
              className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* New Computed Expiry Display */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <span className="font-medium text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" /> New Expiry Date:
          </span>
          <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
            {formatDate(newEndDate)} (+{extraDays} days)
          </span>
        </div>

        {/* Fee & Payment Section */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700">
              Extension Fee (फीस राशि)
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFreeExtension}
                onChange={(e) => {
                  setIsFreeExtension(e.target.checked);
                  if (e.target.checked) setFeeAmount('0');
                  else setFeeAmount(suggestedFee > 0 ? suggestedFee.toString() : '0');
                }}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Free Extension (₹0 निशुल्क)</span>
            </label>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
            <input
              type="number"
              min="0"
              disabled={isFreeExtension}
              value={feeAmount}
              onChange={(e) => handleFeeAmountChange(e.target.value)}
              placeholder="0"
              className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          {/* Payment Mode (only if fee > 0) */}
          {Number(feeAmount) > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Payment Mode</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'online', label: 'UPI / Online' },
                  { id: 'split', label: 'Split' },
                  { id: 'pay_later', label: 'Pay Later' }
                ].map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => setPaymentMode(mode.id)}
                    className={`py-1.5 px-1 text-center font-bold rounded-lg border text-[11px] transition cursor-pointer ${
                      paymentMode === mode.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Split Details inputs */}
              {paymentMode === 'split' && (
                <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Cash Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Cash"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Online Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="UPI/Online"
                      value={splitOnline}
                      onChange={(e) => setSplitOnline(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Exam leave extension, Festival gift"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* WhatsApp Toggle */}
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-medium">Send confirmation & receipt via WhatsApp</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>{loading ? 'Extending...' : `Extend +${extraDays} Days`}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
