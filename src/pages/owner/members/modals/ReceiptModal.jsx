import React, { useRef } from 'react';
import {
  Printer,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  User,
  Phone,
  Clock,
  Dumbbell,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import { getGymSettings } from '../../../../utils/settings';
import { generatePaymentReceipt } from '../../../../utils/pdf';
import { openWhatsApp } from '../../../../utils/whatsapp';
import { formatDate, toIndianDate, hasPt } from '../memberUtils';

export default function ReceiptModal({ isOpen, onClose, payment, member }) {
  const receiptPrintRef = useRef(null);
  const settings = getGymSettings();

  if (!isOpen || !payment) return null;

  const gymName = settings.gymName || 'UNIVO FITNESS & GYM';
  const gymTagline = settings.tagline || 'Stronger Today, Healthier Tomorrow';
  const gymPhone = settings.phone || '+91 9196302375';
  const gymAddress = settings.address || 'Main Branch, Near City Center';
  const gymLogo = settings.logoUrl || '';

  const memberName = payment.memberName || member?.name || member?.fullName || 'Athlete';
  const memberPhone = payment.phone || member?.phone || '—';
  const memberSlot = payment.slot || member?.slot || member?.preferredTime || 'General Shift';

  const receiptNo = payment.receiptNo || payment.receiptNumber || payment.id || `REC-${Date.now().toString().slice(-6)}`;
  const payDate = payment.date || (payment.createdAt ? formatDate(payment.createdAt) : toIndianDate(new Date()));

  const planTitle = payment.planName || payment.plan || member?.planName || 'Gym Membership Plan';
  const validityText = (payment.validityStart && payment.validityEnd)
    ? `${payment.validityStart} to ${payment.validityEnd}`
    : (payment.validity || (member?.expiryDate ? `Till ${formatDate(member.expiryDate)}` : 'Active Validity'));

  // --- Financial Amounts ---
  const totalPlanPrice = Number(payment.amount || payment.planPrice || member?.totalAmount || 0);
  const paidAmount = Number(payment.paidAmount ?? (payment.amount || member?.paidAmount || 0));
  const dueAmount = Number(payment.dueAmount ?? member?.dueAmount ?? 0);
  const discountAmount = Number(payment.discount || payment.discountAmount || 0);
  const isPartial = payment.status === 'partial' || dueAmount > 0;

  // --- Itemized Breakdown: Base Gym, PT, Services ---
  let ptPlanName = payment.ptPlanName || member?.ptPlanName;
  let ptPrice = Number(payment.ptPlanPrice || payment.ptFee || member?.ptPlanPrice || 0);

  // Fallback: If ptPrice is 0 and planName contains "+ PT", extract details
  if (ptPrice === 0 && payment.planName && payment.planName.includes('+ PT')) {
    const ptMatch = payment.planName.match(/\+\s*PT\s*\((.*?)\)/i);
    if (ptMatch && ptMatch[1]) {
      ptPlanName = ptPlanName || ptMatch[1].trim();
      const ptCatalog = {
        '1 Month 1-on-1 PT': 4500,
        '3 Months Transformation PT': 12000,
        '6 Months Elite PT': 21000,
        'Annual Pro VIP PT': 36000
      };
      if (ptCatalog[ptPlanName]) {
        ptPrice = ptCatalog[ptPlanName];
      }
    }
  }

  let servicesPrice = Number(payment.servicesPrice || payment.servicesTotalPrice || 0);
  const selectedServices = Array.isArray(payment.selectedServices) ? payment.selectedServices : [];
  if (servicesPrice === 0 && selectedServices.length > 0) {
    servicesPrice = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  }

  // Base plan price fallback
  let basePrice = Number(payment.planPrice || member?.planPrice || 0);
  if (basePrice === 0 && payment.planName) {
    const basePlanPart = payment.planName.split('+')[0].trim();
    const baseCatalog = {
      '1-Month Basic': 2500,
      '3-Month Pro': 6500,
      '6-Month Transformation': 11000,
      'Annual Elite Plan': 18000
    };
    if (baseCatalog[basePlanPart]) {
      basePrice = baseCatalog[basePlanPart];
    }
  }

  const finalBasePrice = basePrice > 0
    ? basePrice
    : (ptPrice > 0 || servicesPrice > 0 ? Math.max(0, totalPlanPrice - ptPrice - servicesPrice) : totalPlanPrice);

  const baseTitle = payment.planName
    ? payment.planName.split('+')[0].trim()
    : (member?.planName || 'Gym Membership Base Fee');

  // Build itemized list of particulars
  const items = [];

  // 1. Base Membership Item
  items.push({
    id: 'base_plan',
    icon: Dumbbell,
    desc: `Base Membership: ${baseTitle}`,
    period: validityText,
    amount: finalBasePrice
  });

  // 2. Personal Training (PT) Item
  if (ptPrice > 0 || ptPlanName || hasPt(member)) {
    const ptAmount = ptPrice > 0 ? ptPrice : Math.max(0, totalPlanPrice - finalBasePrice - servicesPrice);
    if (ptAmount > 0 || ptPlanName) {
      items.push({
        id: 'pt_package',
        icon: Sparkles,
        desc: `Personal Training (PT)${ptPlanName ? ` - ${ptPlanName}` : ''}`,
        period: (payment.validityStart && payment.validityEnd)
          ? `${payment.validityStart} to ${payment.validityEnd}`
          : (member?.ptEndDate ? `Till ${formatDate(member?.ptEndDate)}` : validityText),
        amount: ptAmount
      });
    }
  }

  // 3. Add-on Services Items
  if (selectedServices.length > 0) {
    selectedServices.forEach((s, idx) => {
      items.push({
        id: `service_${idx}`,
        icon: Layers,
        desc: `Add-on Service: ${s.name}${s.billingType ? ` (${s.billingType})` : ''}`,
        period: validityText,
        amount: Number(s.price || 0)
      });
    });
  } else if (servicesPrice > 0 || (payment.planName && payment.planName.includes('Services ('))) {
    const sMatch = payment.planName ? payment.planName.match(/\+\s*Services\s*\((.*?)\)/i) : null;
    const sName = sMatch && sMatch[1] ? sMatch[1].trim() : 'Add-on Gym Services';
    items.push({
      id: 'service_bundle',
      icon: Layers,
      desc: `Add-on Service: ${sName}`,
      period: validityText,
      amount: servicesPrice
    });
  }

  const modeLabel = payment.paymentMode === 'split'
    ? `SPLIT (Cash: ₹${payment.cashAmount || 0} + Online: ₹${payment.onlineAmount || 0})`
    : (payment.paymentMode || payment.mode || 'CASH').toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      generatePaymentReceipt({
        ...payment,
        memberName,
        phone: memberPhone,
        slot: memberSlot,
        receiptNo,
        date: payDate,
        validityStart: payment.validityStart,
        validityEnd: payment.validityEnd,
        planName: planTitle,
        planPrice: finalBasePrice,
        ptPlanPrice: ptPrice,
        ptPlanName: ptPlanName,
        servicesPrice,
        amount: totalPlanPrice,
        paidAmount,
        dueAmount,
        discount: discountAmount,
        paymentMode: payment.paymentMode || payment.mode || 'cash',
        cashAmount: payment.cashAmount,
        onlineAmount: payment.onlineAmount,
        selectedServices: payment.selectedServices,
        remarks: payment.remarks || payment.notes,
      }, settings);
    } catch (e) {
      console.error('PDF generation error:', e);
      window.print();
    }
  };

  const handleWhatsApp = () => {
    if (!memberPhone || memberPhone === '—') return;
    const msg = `🧾 *Official Gym Fee Receipt - ${gymName}*\n\nHello *${memberName}*,\nThank you for your payment! Here are your membership billing details:\n\n📋 *Receipt No:* ${receiptNo}\n🗓️ *Date:* ${payDate}\n🏋️ *Base Plan:* ${baseTitle} (₹${finalBasePrice.toLocaleString('en-IN')})\n${ptPrice > 0 ? `✨ *Personal Training (PT):* ${ptPlanName || '1-on-1 PT'} (+₹${ptPrice.toLocaleString('en-IN')})\n` : ''}${servicesPrice > 0 ? `🛠️ *Add-on Services:* +₹${servicesPrice.toLocaleString('en-IN')}\n` : ''}📅 *Validity:* ${validityText}\n💰 *Total Package Fee:* ₹${totalPlanPrice.toLocaleString('en-IN')}\n✅ *Amount Paid:* ₹${paidAmount.toLocaleString('en-IN')} (${modeLabel})\n${dueAmount > 0 ? `⚠️ *Remaining Due:* ₹${dueAmount.toLocaleString('en-IN')}\n` : '✨ *Status:* FULLY CLEARED & PAID\n'}\nThank you for choosing ${gymName}! Stay fit, stay strong! 💪🏋️`;
    openWhatsApp(memberPhone, msg);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Fee Receipt"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Printable Receipt Paper Container */}
        <div
          ref={receiptPrintRef}
          id="receipt-print-area"
          className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm text-slate-800 font-sans"
        >
          {/* Header Banner */}
          <div className="border-b-2 border-emerald-500/80 pb-4 mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {gymLogo ? (
                <img src={gymLogo} alt={gymName} className="w-14 h-14 object-contain rounded-xl border border-slate-200" />
              ) : (
                <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-xs">
                  <Dumbbell className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="font-black text-slate-900 text-xl tracking-tight uppercase leading-tight">
                  {gymName}
                </h2>
                <p className="text-xs text-emerald-700 font-bold mt-0.5">
                  {gymTagline}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  📍 {gymAddress} {gymPhone && `• 📞 ${gymPhone}`}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black uppercase tracking-wider">
                Tax Invoice
              </span>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Receipt: <span className="font-extrabold text-slate-900">{receiptNo}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Date: <span className="font-medium text-slate-700">{payDate}</span>
              </p>
            </div>
          </div>

          {/* Member Details & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Member Details
              </span>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{memberName}</span>
              </p>
              <p className="text-slate-600 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{memberPhone}</span>
              </p>
              <p className="text-slate-500 mt-0.5 flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Slot: {memberSlot}</span>
              </p>
            </div>

            <div className="sm:text-right flex flex-col sm:items-end justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Payment Status
                </span>
                <div className="mt-1">
                  {isPartial ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                      Partial Payment (Due Pending)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Full Payment (Cleared)
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 text-slate-600 text-[11px]">
                Mode: <span className="font-bold text-slate-800">{modeLabel}</span>
              </div>
            </div>
          </div>

          {/* Particulars Table (Itemized breakdown) */}
          <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Service Description / Plan</th>
                  <th className="px-4 py-2.5">Validity Period</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.map((item) => {
                  const ItemIcon = item.icon || Dumbbell;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <ItemIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{item.desc}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                        {item.period}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
                {payment.notes && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-[10px] text-slate-400 font-normal bg-slate-50/40">
                      Note: {payment.notes}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Billing Summary & Signatory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-1">
            {/* Stamp & Verification */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 text-emerald-900">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-emerald-600 flex items-center justify-center font-black text-[9px] text-emerald-700 uppercase tracking-tighter shrink-0 text-center leading-tight">
                  PAID<br />VERIFIED
                </div>
                <div className="text-[11px]">
                  <p className="font-extrabold">{gymName}</p>
                  <p className="text-[10px] text-emerald-700">Official Computer-Generated Receipt</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                * Note: Fees once deposited are non-refundable and non-transferable.
              </p>
            </div>

            {/* Financial Totals Calculation Box (Itemized Summary matching PDF) */}
            <div className="space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Plan Base Fee:</span>
                <span className="font-semibold">₹{finalBasePrice.toLocaleString('en-IN')}</span>
              </div>
              {ptPrice > 0 && (
                <div className="flex justify-between text-purple-700 font-semibold">
                  <span>Personal Training (PT):</span>
                  <span>+₹{ptPrice.toLocaleString('en-IN')}</span>
                </div>
              )}
              {servicesPrice > 0 && (
                <div className="flex justify-between text-indigo-700 font-semibold">
                  <span>Add-on Services:</span>
                  <span>+₹{servicesPrice.toLocaleString('en-IN')}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Special Discount:</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-extrabold pt-1 border-t border-slate-200 text-xs">
                <span>Total Package Bill:</span>
                <span>₹{totalPlanPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-black text-sm bg-emerald-100/60 p-1.5 rounded-lg">
                <span>Amount Paid:</span>
                <span>₹{paidAmount.toLocaleString('en-IN')}</span>
              </div>
              {dueAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                  <span>Pending Balance Due:</span>
                  <span>₹{dueAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Download PDF</span>
            </button>
            {memberPhone && memberPhone !== '—' && (
              <button
                onClick={handleWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Send WhatsApp</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
