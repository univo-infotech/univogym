import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  RotateCcw,
  X
} from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import { getGymSettings } from '../../../../utils/settings';
import { generatePaymentReceipt } from '../../../../utils/pdf';
import { openWhatsApp } from '../../../../utils/whatsapp';
import { formatDate, toIndianDate, hasPt } from '../memberUtils';

export default function ReceiptModal({
  isOpen,
  onClose,
  payment,
  member,
  allPayments = [],
  onSelectPayment
}) {
  const receiptPrintRef = useRef(null);
  const settings = getGymSettings();

  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    setSelectedPayment(payment);
  }, [payment]);

  const currentPayment = selectedPayment || payment;

  // Filter all payments belonging to this member (for bill switcher)
  const memberPayments = useMemo(() => {
    if (!allPayments || allPayments.length === 0 || (!member && !currentPayment?.memberId)) return [];
    const targetId = member?.id || currentPayment?.memberId;
    const targetPhone = member?.phone || currentPayment?.phone;
    return allPayments.filter(
      (p) => (targetId && p.memberId === targetId) || (targetPhone && p.phone === targetPhone)
    );
  }, [allPayments, member, currentPayment]);

  if (!isOpen || !currentPayment) return null;

  const gymName = settings.gymName || 'UNIVO FITNESS & GYM';
  const gymTagline = settings.tagline || 'Stronger Today, Healthier Tomorrow';
  const gymPhone = settings.phone || '+91 9196302375';
  const gymAddress = settings.address || 'Main Branch, Near City Center';
  const gymLogo = settings.logoUrl || '';

  const memberName = currentPayment.memberName || member?.name || member?.fullName || 'Athlete';
  const memberPhone = currentPayment.phone || member?.phone || '—';
  const memberSlot = currentPayment.slot || member?.slot || member?.preferredTime || 'General Shift';

  const receiptNo = currentPayment.receiptNo || currentPayment.receiptNumber || currentPayment.id || `REC-${Date.now().toString().slice(-6)}`;
  const payDate = currentPayment.date || (currentPayment.createdAt ? formatDate(currentPayment.createdAt) : toIndianDate(new Date()));

  // Bill Classification
  const isPtBill = Boolean(
    currentPayment.isPtOnly ||
    currentPayment.planType === 'PT' ||
    (Number(currentPayment.ptPlanPrice || 0) > 0 && Number(currentPayment.planPrice || 0) === 0) ||
    (currentPayment.planName && currentPayment.planName.toLowerCase().startsWith('personal training') && !currentPayment.planName.includes('+'))
  );

  const isExtensionBill = Boolean(
    currentPayment.isExtension ||
    (currentPayment.planName && currentPayment.planName.includes('Extended'))
  );

  const isDueBill = Boolean(
    currentPayment.isDueSettlement ||
    (currentPayment.planName && currentPayment.planName.includes('Due Balance Settlement'))
  );

  const isRenewalBill = Boolean(
    currentPayment.isRenewal ||
    (currentPayment.planName && currentPayment.planName.includes('Renewal'))
  );

  const coachName = currentPayment.trainerName || member?.trainerName || '';

  const planTitle = currentPayment.planName || (isPtBill ? `Personal Training (PT) - ${currentPayment.ptPlanName || member?.ptPlanName || '1-on-1 PT'}` : (member?.planName || 'Gym Membership Plan'));
  const validityText = (currentPayment.validityStart && currentPayment.validityEnd)
    ? `${currentPayment.validityStart} to ${currentPayment.validityEnd}`
    : (currentPayment.validity || (member?.expiryDate ? `Till ${formatDate(member.expiryDate)}` : 'Active Validity'));

  // Financial Amounts
  const totalPlanPrice = Number(currentPayment.amount || currentPayment.planPrice || member?.totalAmount || 0);
  const paidAmount = Number(currentPayment.paidAmount ?? (currentPayment.amount || member?.paidAmount || 0));
  const dueAmount = Number(currentPayment.dueAmount ?? member?.dueAmount ?? 0);
  const discountAmount = Number(currentPayment.discount || currentPayment.discountAmount || 0);
  const isPartial = currentPayment.status === 'partial' || dueAmount > 0;

  // Itemized Breakdown: Base Gym, PT, Services
  let ptPlanName = currentPayment.ptPlanName || member?.ptPlanName;
  let ptPrice = Number(currentPayment.ptPlanPrice || currentPayment.ptFee || (isPtBill ? totalPlanPrice : (member?.ptPlanPrice || 0)));

  if (ptPrice === 0 && currentPayment.planName && currentPayment.planName.includes('+ PT')) {
    const ptMatch = currentPayment.planName.match(/\+\s*PT\s*\((.*?)\)/i);
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

  let servicesPrice = Number(currentPayment.servicesPrice || currentPayment.servicesTotalPrice || 0);
  const selectedServices = Array.isArray(currentPayment.selectedServices) ? currentPayment.selectedServices : [];
  if (servicesPrice === 0 && selectedServices.length > 0) {
    servicesPrice = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  }

  // Base plan price
  let basePrice = Number(currentPayment.planPrice || ((isPtBill || isExtensionBill || isDueBill) ? 0 : (member?.planPrice || 0)));
  if (basePrice === 0 && currentPayment.planName && !isPtBill && !isExtensionBill && !isDueBill) {
    const basePlanPart = currentPayment.planName.split('+')[0].replace('Gym Membership Renewal - ', '').trim();
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

  const finalBasePrice = (isPtBill || isExtensionBill || isDueBill)
    ? 0
    : (basePrice > 0
        ? basePrice
        : (ptPrice > 0 || servicesPrice > 0 ? Math.max(0, totalPlanPrice - ptPrice - servicesPrice) : totalPlanPrice));

  const baseTitle = currentPayment.planName
    ? currentPayment.planName.split('+')[0].replace('Gym Membership Renewal - ', '').trim()
    : (member?.planName || 'Gym Membership Base Fee');

  // Build itemized list of particulars
  const items = [];

  if (isPtBill) {
    items.push({
      id: 'pt_package',
      icon: Sparkles,
      desc: `Personal Training (PT) - ${currentPayment.ptPlanName || ptPlanName || currentPayment.planName?.replace(/^Personal Training \(PT\) - /i, '') || '1-on-1 PT'}${coachName ? ` (Coach: ${coachName})` : ''}`,
      period: validityText,
      amount: totalPlanPrice
    });
  } else if (isExtensionBill) {
    items.push({
      id: 'extension_item',
      icon: Calendar,
      desc: `Validity Extension - ${currentPayment.planName || 'Membership Extended'}`,
      period: validityText,
      amount: totalPlanPrice
    });
  } else if (isDueBill) {
    items.push({
      id: 'due_item',
      icon: CreditCard,
      desc: `Due Balance Settlement - ${currentPayment.planName?.replace('Due Balance Settlement - ', '') || member?.planName || 'Gym Membership'}`,
      period: validityText,
      amount: totalPlanPrice
    });
  } else {
    // Standard Gym Admission or Renewal
    items.push({
      id: 'base_plan',
      icon: isRenewalBill ? RotateCcw : Dumbbell,
      desc: `${isRenewalBill ? 'Gym Renewal' : 'Base Membership'}: ${baseTitle}`,
      period: validityText,
      amount: finalBasePrice
    });

    if (ptPrice > 0 || ptPlanName || hasPt(member)) {
      const ptAmount = ptPrice > 0 ? ptPrice : Math.max(0, totalPlanPrice - finalBasePrice - servicesPrice);
      if (ptAmount > 0 || ptPlanName) {
        items.push({
          id: 'pt_package',
          icon: Sparkles,
          desc: `Personal Training (PT)${ptPlanName ? ` - ${ptPlanName}` : ''}${coachName ? ` (Coach: ${coachName})` : ''}`,
          period: (currentPayment.validityStart && currentPayment.validityEnd)
            ? `${currentPayment.validityStart} to ${currentPayment.validityEnd}`
            : (member?.ptEndDate ? `Till ${formatDate(member?.ptEndDate)}` : validityText),
          amount: ptAmount
        });
      }
    }
  }

  // Add-on Services Items
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
  } else if (servicesPrice > 0 || (currentPayment.planName && currentPayment.planName.includes('Services ('))) {
    const sMatch = currentPayment.planName ? currentPayment.planName.match(/\+\s*Services\s*\((.*?)\)/i) : null;
    const sName = sMatch && sMatch[1] ? sMatch[1].trim() : 'Add-on Gym Services';
    items.push({
      id: 'service_bundle',
      icon: Layers,
      desc: `Add-on Service: ${sName}`,
      period: validityText,
      amount: servicesPrice
    });
  }

  const modeLabel = currentPayment.paymentMode === 'split'
    ? `SPLIT (Cash: ₹${currentPayment.cashAmount || 0} + Online: ₹${currentPayment.onlineAmount || 0})`
    : (currentPayment.paymentMode || currentPayment.mode || 'CASH').toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      generatePaymentReceipt({
        ...currentPayment,
        memberName,
        phone: memberPhone,
        slot: memberSlot,
        receiptNo,
        date: payDate,
        validityStart: currentPayment.validityStart,
        validityEnd: currentPayment.validityEnd,
        planName: planTitle,
        planPrice: (isPtBill || isExtensionBill || isDueBill) ? 0 : finalBasePrice,
        ptPlanPrice: isPtBill ? totalPlanPrice : ptPrice,
        ptPlanName: currentPayment.ptPlanName || ptPlanName,
        trainerName: coachName,
        isPtOnly: isPtBill,
        isExtension: isExtensionBill,
        isDueSettlement: isDueBill,
        isRenewal: isRenewalBill,
        planType: isPtBill ? 'PT' : (currentPayment.planType || 'Gym'),
        servicesPrice,
        amount: totalPlanPrice,
        paidAmount,
        dueAmount,
        discount: discountAmount,
        paymentMode: currentPayment.paymentMode || currentPayment.mode || 'cash',
        cashAmount: currentPayment.cashAmount,
        onlineAmount: currentPayment.onlineAmount,
        selectedServices: currentPayment.selectedServices,
        remarks: currentPayment.remarks || currentPayment.notes,
      }, settings);
    } catch (e) {
      console.error('PDF generation error:', e);
      window.print();
    }
  };

  const handleWhatsApp = () => {
    if (!memberPhone || memberPhone === '—') return;
    let msg = '';
    if (isPtBill) {
      msg = `🧾 *Official Personal Training (PT) Receipt - ${gymName}*\n\nHello *${memberName}*,\nThank you for enrolling in Personal Training! Here are your PT billing details:\n\n📋 *Receipt No:* ${receiptNo}\n🗓️ *Date:* ${payDate}\n✨ *PT Package:* ${currentPayment.ptPlanName || ptPlanName || planTitle}\n🏋️ *Personal Coach:* ${coachName || 'Assigned Coach'}\n📅 *PT Validity:* ${validityText}\n💰 *PT Package Fee:* ₹${totalPlanPrice.toLocaleString('en-IN')}\n✅ *Amount Paid:* ₹${paidAmount.toLocaleString('en-IN')} (${modeLabel})\n${dueAmount > 0 ? `⚠️ *Remaining Due:* ₹${dueAmount.toLocaleString('en-IN')}\n` : '✨ *Status:* FULLY CLEARED & PAID\n'}\nThank you for choosing ${gymName}! Stay fit, stay strong! 💪🏋️`;
    } else if (isExtensionBill) {
      msg = `🧾 *Official Membership Extension Receipt - ${gymName}*\n\nHello *${memberName}*,\nYour gym membership has been extended! Here are your extension billing details:\n\n📋 *Receipt No:* ${receiptNo}\n🗓️ *Date:* ${payDate}\n📅 *New Extended Validity:* ${validityText}\n💰 *Extension Fee:* ₹${totalPlanPrice.toLocaleString('en-IN')}\n✅ *Amount Paid:* ₹${paidAmount.toLocaleString('en-IN')} (${modeLabel})\n${dueAmount > 0 ? `⚠️ *Remaining Due:* ₹${dueAmount.toLocaleString('en-IN')}\n` : '✨ *Status:* FULLY CLEARED & PAID\n'}\nThank you for training with ${gymName}! 💪`;
    } else if (isDueBill) {
      msg = `🧾 *Official Due Payment Receipt - ${gymName}*\n\nHello *${memberName}*,\nThank you for clearing your pending dues! Here are your payment details:\n\n📋 *Receipt No:* ${receiptNo}\n🗓️ *Date:* ${payDate}\n💳 *Particulars:* Due Balance Settlement\n💰 *Amount Settled:* ₹${paidAmount.toLocaleString('en-IN')} (${modeLabel})\n${dueAmount > 0 ? `⚠️ *Remaining Balance:* ₹${dueAmount.toLocaleString('en-IN')}\n` : '✨ *Status:* ALL DUES FULLY CLEARED\n'}\nThank you for choosing ${gymName}! 💪`;
    } else {
      msg = `🧾 *Official Gym Fee Receipt - ${gymName}*\n\nHello *${memberName}*,\nThank you for your payment! Here are your membership billing details:\n\n📋 *Receipt No:* ${receiptNo}\n🗓️ *Date:* ${payDate}\n🏋️ *Plan:* ${isRenewalBill ? 'Gym Renewal: ' : ''}${baseTitle} (₹${finalBasePrice.toLocaleString('en-IN')})\n${ptPrice > 0 ? `✨ *Personal Training (PT):* ${ptPlanName || '1-on-1 PT'} (+₹${ptPrice.toLocaleString('en-IN')})\n` : ''}${servicesPrice > 0 ? `🛠️ *Add-on Services:* +₹${servicesPrice.toLocaleString('en-IN')}\n` : ''}📅 *Validity:* ${validityText}\n💰 *Total Package Fee:* ₹${totalPlanPrice.toLocaleString('en-IN')}\n✅ *Amount Paid:* ₹${paidAmount.toLocaleString('en-IN')} (${modeLabel})\n${dueAmount > 0 ? `⚠️ *Remaining Due:* ₹${dueAmount.toLocaleString('en-IN')}\n` : '✨ *Status:* FULLY CLEARED & PAID\n'}\nThank you for choosing ${gymName}! Stay fit, stay strong! 💪🏋️`;
    }
    openWhatsApp(memberPhone, msg);
  };

  // Header Title & Badge
  let badgeText = 'Tax Invoice';
  let badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let headerBorder = 'border-emerald-500/80';
  let headerIconBg = 'bg-gradient-to-br from-emerald-600 to-teal-500';
  let HeaderIcon = Dumbbell;

  if (isPtBill) {
    badgeText = 'PT Invoice';
    badgeClasses = 'bg-purple-50 text-purple-800 border-purple-200';
    headerBorder = 'border-purple-500/80';
    headerIconBg = 'bg-gradient-to-br from-purple-600 to-indigo-600';
    HeaderIcon = Sparkles;
  } else if (isExtensionBill) {
    badgeText = 'Extension Invoice';
    badgeClasses = 'bg-teal-50 text-teal-800 border-teal-200';
    headerBorder = 'border-teal-500/80';
    headerIconBg = 'bg-gradient-to-br from-teal-600 to-emerald-500';
    HeaderIcon = Calendar;
  } else if (isDueBill) {
    badgeText = 'Due Settlement';
    badgeClasses = 'bg-amber-50 text-amber-900 border-amber-200';
    headerBorder = 'border-amber-500/80';
    headerIconBg = 'bg-gradient-to-br from-amber-500 to-orange-500';
    HeaderIcon = CreditCard;
  } else if (isRenewalBill) {
    badgeText = 'Renewal Invoice';
    badgeClasses = 'bg-blue-50 text-blue-800 border-blue-200';
    headerBorder = 'border-blue-500/80';
    headerIconBg = 'bg-gradient-to-br from-blue-600 to-indigo-600';
    HeaderIcon = RotateCcw;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPtBill ? 'Personal Training (PT) Fee Receipt' : (isExtensionBill ? 'Membership Extension Receipt' : (isDueBill ? 'Due Balance Receipt' : 'Official Fee Receipt'))}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Bill Switcher (Shown if member has multiple bills) */}
        {memberPayments.length > 1 && (
          <div className="flex items-center gap-2 p-2 bg-slate-100/90 rounded-xl overflow-x-auto text-xs border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Member Bills ({memberPayments.length}):</span>
            {memberPayments.map((p, idx) => {
              const thisIsPt = Boolean(
                p.isPtOnly || p.planType === 'PT' || (p.planName && p.planName.toLowerCase().startsWith('personal training'))
              );
              const thisIsExt = Boolean(p.isExtension || (p.planName && p.planName.includes('Extended')));
              const thisIsDue = Boolean(p.isDueSettlement || (p.planName && p.planName.includes('Due Balance Settlement')));
              const thisIsRen = Boolean(p.isRenewal || (p.planName && p.planName.includes('Renewal')));

              const isSelected = p.id === currentPayment.id;

              let typeLabel = 'Gym Bill';
              let badgeColor = isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-800 border-emerald-200';
              let IconComp = Dumbbell;

              if (thisIsPt) {
                typeLabel = 'PT Bill';
                badgeColor = isSelected ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-purple-800 border-purple-200';
                IconComp = Sparkles;
              } else if (thisIsExt) {
                typeLabel = 'Extension';
                badgeColor = isSelected ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-teal-800 border-teal-200';
                IconComp = Calendar;
              } else if (thisIsDue) {
                typeLabel = 'Due Settlement';
                badgeColor = isSelected ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-amber-800 border-amber-200';
                IconComp = CreditCard;
              } else if (thisIsRen) {
                typeLabel = 'Renewal';
                badgeColor = isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-800 border-blue-200';
                IconComp = RotateCcw;
              }

              const shortTitle = thisIsPt
                ? (p.ptPlanName || '1-on-1 PT')
                : (p.planName ? p.planName.split('+')[0].replace('Gym Membership Renewal - ', '').replace('Due Balance Settlement - ', '').trim() : 'Membership');

              return (
                <button
                  key={p.id || idx}
                  type="button"
                  onClick={() => {
                    setSelectedPayment(p);
                    if (onSelectPayment) onSelectPayment(p);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${badgeColor}`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{typeLabel}: {shortTitle} (₹{Number(p.paidAmount || p.amount || 0).toLocaleString('en-IN')})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Printable Receipt Paper Container */}
        <div
          ref={receiptPrintRef}
          id="receipt-print-area"
          className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm text-slate-800 font-sans"
        >
          {/* Header Banner */}
          <div className={`border-b-2 ${headerBorder} pb-4 mb-4 flex items-start justify-between gap-4`}>
            <div className="flex items-center gap-3">
              {gymLogo ? (
                <img src={gymLogo} alt={gymName} className="w-14 h-14 object-contain rounded-xl border border-slate-200" />
              ) : (
                <div className={`w-13 h-13 rounded-xl ${headerIconBg} text-white flex items-center justify-center font-black text-xl shadow-xs`}>
                  <HeaderIcon className="w-7 h-7" />
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
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${badgeClasses}`}>
                {badgeText}
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
              {coachName && (
                <p className="text-purple-900 mt-0.5 flex items-center gap-1.5 text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Coach: {coachName}</span>
                </p>
              )}
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
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      isPtBill ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    } border`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isPtBill ? 'text-purple-700' : 'text-emerald-700'}`} />
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
                          <ItemIcon className={`w-3.5 h-3.5 ${isPtBill ? 'text-purple-600' : 'text-emerald-600'} shrink-0`} />
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
                {currentPayment.remarks && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-[10px] text-slate-400 font-normal bg-slate-50/40">
                      Note: {currentPayment.remarks}
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
              <div className={`inline-flex items-center gap-2 p-2.5 rounded-xl border ${
                isPtBill
                  ? 'bg-purple-50/70 border-purple-200/90 text-purple-900'
                  : 'bg-emerald-50/70 border-emerald-200/90 text-emerald-900'
              }`}>
                <div className={`w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center font-black text-[9px] uppercase tracking-tighter shrink-0 text-center leading-tight ${
                  isPtBill ? 'border-purple-600 text-purple-700' : 'border-emerald-600 text-emerald-700'
                }`}>
                  PAID<br />VERIFIED
                </div>
                <div className="text-[11px]">
                  <p className="font-extrabold">{gymName}</p>
                  <p className={`text-[10px] ${isPtBill ? 'text-purple-700' : 'text-emerald-700'}`}>
                    Official Computer-Generated Receipt
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                * Note: Fees once deposited are non-refundable and non-transferable.
              </p>
            </div>

            {/* Financial Totals Calculation Box */}
            <div className="space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {isPtBill ? (
                <div className="flex justify-between text-purple-900 font-bold">
                  <span>PT Package Fee:</span>
                  <span className="font-extrabold text-purple-950">₹{totalPlanPrice.toLocaleString('en-IN')}</span>
                </div>
              ) : isExtensionBill ? (
                <div className="flex justify-between text-teal-900 font-bold">
                  <span>Extension Fee:</span>
                  <span className="font-extrabold text-teal-950">₹{totalPlanPrice.toLocaleString('en-IN')}</span>
                </div>
              ) : isDueBill ? (
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>Settled Due Balance:</span>
                  <span className="font-extrabold text-amber-950">₹{totalPlanPrice.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>{isRenewalBill ? 'Renewal Base Fee:' : 'Plan Base Fee:'}</span>
                  <span className="font-semibold">₹{finalBasePrice.toLocaleString('en-IN')}</span>
                </div>
              )}

              {!isPtBill && !isExtensionBill && !isDueBill && ptPrice > 0 && (
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

              <div className={`flex justify-between ${isPtBill ? 'text-purple-900 bg-purple-100/70' : 'text-emerald-700 bg-emerald-100/60'} font-black text-sm p-1.5 rounded-lg`}>
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
