import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, Sparkles, Calendar, Clock, CreditCard, Smartphone, Banknote, Building2, Split, Receipt, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { updateMember } from '../../../../firebase/members';
import { addPayment } from '../../../../firebase/payments';
import { getGymSettings } from '../../../../utils/settings';
import { openWhatsApp, generatePtAddonReceiptMessage } from '../../../../utils/whatsapp';
import Modal from '../../../../components/ui/Modal';
import { invalidateCache } from '../../../../utils/dataCache';
import { toDate, formatDate, getName, getPhone, hasPt, toIndianDate } from '../memberUtils';

export default function AddPtPackageModal({ member, gymId, onClose, onSave, trainers = [], plans = [] }) {
  const settings = getGymSettings();

  const DEFAULT_PT_PACKAGES = [
    { id: "pt_1m", name: "1 Month 1-on-1 PT", durationDays: 30, durationMonths: 1, price: 3500 },
    { id: "pt_2m", name: "2 Months Transformation PT", durationDays: 60, durationMonths: 2, price: 6500 },
    { id: "pt_3m", name: "3 Months Pro PT", durationDays: 90, durationMonths: 3, price: 9500 },
    { id: "pt_6m", name: "6 Months Elite PT", durationDays: 180, durationMonths: 6, price: 17000 },
    { id: "pt_custom", name: "Custom PT Package", durationDays: 30, durationMonths: 1, price: 3000 },
  ];

  // Merge with any custom PT plans from Firestore plans
  const ptCatalog = useMemo(() => {
    const list = [...DEFAULT_PT_PACKAGES];
    if (plans && plans.length > 0) {
      plans.forEach(p => {
        if (p.isPt || p.ptAddon || (p.name && p.name.toLowerCase().includes('pt'))) {
          if (!list.some(item => item.name.toLowerCase() === p.name.toLowerCase())) {
            list.unshift({
              id: p.id,
              name: p.name,
              durationDays: Number(p.duration || (p.durationMonths ? p.durationMonths * 30 : 30)),
              durationMonths: Number(p.durationMonths || 1),
              price: Number(p.price || 3500)
            });
          }
        }
      });
    }
    return list;
  }, [plans]);

  const isPtRenewal = !!(member?.isPt || member?.ptPlanName || member?.ptEndDate);

  const initialPkg = useMemo(() => {
    if (member?.ptPlanName) {
      const found = ptCatalog.find(p => p.name.toLowerCase() === member.ptPlanName.toLowerCase());
      if (found) return found;
    }
    return ptCatalog[0];
  }, [member?.ptPlanName, ptCatalog]);

  const initialStartDate = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (member?.ptEndDate && member.ptEndDate >= todayStr) {
      // Seamless renewal: start directly when the ongoing PT expires so member loses no days
      return member.ptEndDate;
    }
    return todayStr;
  }, [member?.ptEndDate]);

  const [selectedPackageId, setSelectedPackageId] = useState(initialPkg?.id || "pt_1m");
  const [ptPackageName, setPtPackageName] = useState(member?.ptPlanName || initialPkg?.name || "1 Month 1-on-1 PT");
  const [selectedTrainerId, setSelectedTrainerId] = useState(member.trainerId || trainers[0]?.id || "");
  const [ptStartDate, setPtStartDate] = useState(initialStartDate);
  const [durationDays, setDurationDays] = useState(initialPkg?.durationDays || 30);
  const [customDays, setCustomDays] = useState(String(initialPkg?.durationDays || 30));
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [totalFee, setTotalFee] = useState(String(member?.ptPlanPrice || initialPkg?.price || 3500));
  const [payingNow, setPayingNow] = useState(String(member?.ptPlanPrice || initialPkg?.price || 3500));
  const [paymentMode, setPaymentMode] = useState("online"); // 'online' | 'cash' | 'bank' | 'split'
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [hasCommission, setHasCommission] = useState(false);
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionValue, setCommissionValue] = useState("30");
  const [loading, setLoading] = useState(false);

  // Selected trainer object
  const selectedTrainerObj = useMemo(() => {
    return trainers.find(t => t.id === selectedTrainerId) || trainers[0] || null;
  }, [trainers, selectedTrainerId]);

  const trainerName = selectedTrainerObj ? getName(selectedTrainerObj) : (member.trainerName || "Assigned Coach");

  // Handle package selection
  const handleSelectPackage = (pkg) => {
    setSelectedPackageId(pkg.id);
    setPtPackageName(pkg.name);
    setDurationDays(pkg.durationDays || 30);
    setIsCustomDays(pkg.id === "pt_custom");
    setTotalFee(String(pkg.price || 3500));
    setPayingNow(String(pkg.price || 3500));
  };

  // Helper to compute end date
  const computedPtEndDate = useMemo(() => {
    if (!ptStartDate) return "";
    const parts = ptStartDate.split("-").map(Number);
    if (parts.length !== 3) return "";
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const daysToAdd = isCustomDays ? (Number(customDays) || 30) : Number(durationDays || 30);
    d.setDate(d.getDate() + daysToAdd);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${da}`;
  }, [ptStartDate, durationDays, isCustomDays, customDays]);

  // Sync split payment amounts
  useEffect(() => {
    if (paymentMode === "split") {
      const total = Number(payingNow || 0);
      const half = Math.floor(total / 2);
      setCashAmount(String(half));
      setOnlineAmount(String(total - half));
    }
  }, [paymentMode, payingNow]);

  const activeDurationDays = isCustomDays ? (Number(customDays) || 30) : Number(durationDays || 30);
  const remainingDue = Math.max(0, (Number(totalFee) || 0) - (Number(payingNow) || 0));

  const handleActivatePT = async (withWhatsApp = true) => {
    const feeNum = Number(totalFee) || 0;
    const paidNum = Number(payingNow) || 0;

    if (feeNum <= 0) {
      toast.error("Please enter a valid PT package fee");
      return;
    }

    if (!selectedTrainerId && trainers.length > 0) {
      toast.error("Please select a Personal Coach for this member");
      return;
    }

    setLoading(true);
    const memberName = getName(member) || "Member";
    const phone = getPhone(member) || "";
    const billId = "bill_pt_" + Date.now();

    // 1. Construct Transaction Record (Dedicated PT-only bill)
    const newPaymentRecord = {
      id: billId,
      receiptNo: "REC-PT-" + Date.now().toString().slice(-6),
      memberId: member.id,
      memberName,
      phone,
      slot: member.slot || member.workoutSlot || "General Shift",
      batch: member.batch || "Alpha Gym",
      planName: `Personal Training (PT) - ${ptPackageName}`,
      planType: "PT",
      isPtOnly: true,
      ptPlanId: selectedPackageId,
      ptPlanName: ptPackageName,
      ptPlanPrice: feeNum,
      planPrice: 0,
      servicesPrice: 0,
      trainerId: selectedTrainerObj?.id || "",
      trainerName,
      amount: feeNum,
      paidAmount: paidNum,
      dueAmount: remainingDue,
      paymentMode,
      cashAmount: paymentMode === "cash" ? paidNum : (paymentMode === "split" ? Number(cashAmount || 0) : 0),
      onlineAmount: paymentMode === "online" ? paidNum : (paymentMode === "split" ? Number(onlineAmount || 0) : 0),
      bankAmount: paymentMode === "bank" ? paidNum : 0,
      reference: referenceId || "",
      validityStart: toIndianDate(ptStartDate),
      validityEnd: toIndianDate(computedPtEndDate),
      dueDate: toIndianDate(computedPtEndDate),
      date: toIndianDate(new Date().toISOString().split("T")[0]),
      status: remainingDue > 0 ? "partial" : "paid",
      remarks: remarks || `1-on-1 PT package (${activeDurationDays} Days) with Coach ${trainerName}`,
      createdAt: new Date().toISOString(),
    };

    try {
      // 2. Save Payment Transaction to Ledger
      await addPayment(gymId || "univo_main", newPaymentRecord);

      // 3. Update Member Document (PT Active, dates set, gym floor membership untouched)
      const updatedFields = {
        isPt: true,
        isPTMember: true,
        hasPersonalCoach: true,
        ptStatus: "active",
        status: "active",
        active: true,
        ptEndedAt: null,
        ptEndReason: null,
        ...(member.ptStatus === 'ended' ? { ptRestartedAt: new Date().toISOString() } : {}),
        trainerId: selectedTrainerObj?.id || "",
        trainerName,
        ptPlanId: selectedPackageId,
        ptPlanName: ptPackageName,
        ptPlanPrice: feeNum,
        ptStartDate,
        ptEndDate: computedPtEndDate,
        ptDurationDays: activeDurationDays,
        ptCommissionType: hasCommission ? commissionType : null,
        ptCommissionValue: hasCommission ? Number(commissionValue || 0) : 0,
        dueAmount: Number(member.dueAmount || 0) + remainingDue,
        paidAmount: Number(member.paidAmount || 0) + paidNum,
        lastPaymentDate: new Date().toISOString(),
        loginEmail: member.loginEmail || member.email || phone,
        loginPassword: member.loginPassword || member.password || "Member@123",
        password: member.password || member.loginPassword || "Member@123",
      };

      await updateMember(member.id, updatedFields);

      // 4. Invalidate caches so other pages reflect instantly
      invalidateCache("payments");
      invalidateCache("members");

      // 5. Update local state in Members table/grid and trigger receipt
      onSave(member.id, updatedFields, newPaymentRecord);

      toast.success(`PT Package activated for ${memberName}! ₹${paidNum} transaction recorded.`);

      // 6. Share on WhatsApp if selected
      const receiptLink = `${window.location.origin}/#/receipt/${billId}`;
      if (withWhatsApp && phone) {
        const msg = generatePtAddonReceiptMessage({
          memberName,
          gymName: settings.gymName,
          ptPlanName: ptPackageName,
          trainerName,
          startDate: toIndianDate(ptStartDate),
          expiryDate: toIndianDate(computedPtEndDate),
          durationDays: activeDurationDays,
          amount: feeNum,
          paidAmount: paidNum,
          dueAmount: remainingDue,
          paymentMode,
          billId,
          receiptLink,
        });
        openWhatsApp(phone, msg);
      }

      onClose();
    } catch (err) {
      console.error("Error activating PT package:", err);
      toast.error("Failed to activate PT package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isPtRenewal ? `⚡ Renew PT Package & Bill — ${getName(member)}` : `✨ Add PT Package & Bill — ${getName(member)}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-slate-800 text-xs">
        {/* Member Context & Dual-Status Reassurance Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/5 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {isPtRenewal ? "⚡" : "🏋️"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-extrabold text-xs text-purple-950">{getName(member)}</p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                  Gym: {member.planName || "Floor Membership"} (Till {formatDate(member.expiryDate)})
                </span>
                {member.ptEndDate && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] border border-purple-300">
                    Current PT till: {formatDate(member.ptEndDate)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-purple-800 font-medium mt-0.5">
                {isPtRenewal
                  ? `PT cycle start date: ${formatDate(ptStartDate)}. Gym membership safe rahegi, aur ₹${totalFee} transaction ledger me add hogi.`
                  : `Floor access safe till ${formatDate(member.expiryDate)}. Naya PT package issi date se start hoga aur transaction count hogi!`}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-extrabold text-[11px] self-start sm:self-center shadow-xs">
            {isPtRenewal ? "PT Renewal" : "1-on-1 PT Add-on"}
          </span>
        </div>

        {/* Coach / Trainer Selector */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            Select Personal Coach / Trainer <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
          >
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {getName(t)} {t.specialization ? `(${t.specialization})` : ''} — {getPhone(t) || ''}
              </option>
            ))}
          </select>
        </div>

        {/* Quick PT Package Selection */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            Select PT Package / Duration
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ptCatalog.map((pkg) => {
              const isSel = selectedPackageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handleSelectPackage(pkg)}
                  className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    isSel
                      ? 'border-purple-500 bg-purple-50/80 ring-2 ring-purple-400 shadow-xs'
                      : 'border-slate-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <p className={`font-extrabold text-xs truncate ${isSel ? 'text-purple-950' : 'text-slate-800'}`}>
                    {pkg.name}
                  </p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold">{pkg.durationDays} Days</span>
                    <span className="text-xs font-black text-purple-700">₹{Number(pkg.price).toLocaleString("en-IN")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PT Start Date & Duration Calculator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <label className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              PT Start Date (Date of Taking PT)
            </label>
            <input
              type="date"
              value={ptStartDate}
              onChange={(e) => setPtStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Defaulted to today. Change if member started earlier.
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              PT Duration (Days)
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[15, 30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDurationDays(d);
                    setIsCustomDays(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    !isCustomDays && durationDays === d
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-300'
                  }`}
                >
                  {d >= 30 ? `${d / 30}M` : `${d}d`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomDays(true)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  isCustomDays
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-300'
                }`}
              >
                Custom
              </button>
            </div>
            {isCustomDays && (
              <input
                type="number"
                min="1"
                max="730"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Enter days (e.g. 45)"
                className="w-full mt-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            )}
          </div>
        </div>

        {/* Live Computed Validity Card */}
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <div>
              <p className="text-[11px] font-bold text-purple-900">
                PT Validity: <b className="text-purple-950 font-black">{toIndianDate(ptStartDate)}</b> to <b className="text-purple-950 font-black">{toIndianDate(computedPtEndDate)}</b>
              </p>
              <p className="text-[10px] text-purple-700">
                Total Coaching Period: {activeDurationDays} Days ({Math.round(activeDurationDays / 30)} Month(s))
              </p>
            </div>
          </div>
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-purple-200 text-purple-900">
            Auto-calculated
          </span>
        </div>

        {/* Financial Billing & Ledger Transaction Section */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Financial Transaction & Ledger Entry
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Counts in Revenue & Reports
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                Total PT Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={totalFee}
                onChange={(e) => {
                  setTotalFee(e.target.value);
                  setPayingNow(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                Amount Paying Now (₹)
              </label>
              <input
                type="number"
                min="0"
                value={payingNow}
                onChange={(e) => setPayingNow(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-emerald-50/60 border border-emerald-300 font-black text-sm text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                Remaining Due (₹)
              </label>
              <div className={`w-full px-3 py-2 rounded-xl border font-black text-sm flex items-center justify-between ${
                remainingDue > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span>₹{remainingDue}</span>
                {remainingDue > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">DUE</span>}
              </div>
            </div>
          </div>

          {/* Payment Mode Selection */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-slate-700">Payment Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "online", label: "UPI / Online", icon: Smartphone },
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "bank", label: "Bank Transfer", icon: Building2 },
                { id: "split", label: "Split (Cash+Online)", icon: Split },
              ].map((mode) => {
                const isSel = paymentMode === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      isSel
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Online Reference ID */}
          {(paymentMode === "online" || paymentMode === "bank") && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                UPI Reference / UTR Number / Transaction ID (Optional)
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. 627192837492 or PhonePe Ref"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          )}

          {/* Split Inputs */}
          {paymentMode === "split" && (
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="font-bold text-slate-600 block text-[11px] mb-1">Cash Part (₹)</label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block text-[11px] mb-1">Online Part (₹)</label>
                <input
                  type="number"
                  value={onlineAmount}
                  onChange={(e) => setOnlineAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Trainer Commission Deal (Optional) */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
            <input
              type="checkbox"
              checked={hasCommission}
              onChange={(e) => setHasCommission(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
            />
            <span>Set Trainer Commission / Deal for Coach {trainerName}</span>
          </label>
          {hasCommission && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <select
                value={commissionType}
                onChange={(e) => setCommissionType(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
              >
                <option value="percentage">Percentage (%) of PT Fee</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
              <input
                type="number"
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
                placeholder={commissionType === 'percentage' ? 'e.g. 30%' : 'e.g. 1000'}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
              />
            </div>
          )}
        </div>

        {/* Footer Actions & WhatsApp Share */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleActivatePT(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Receipt className="w-3.5 h-3.5 text-purple-400" />
              {loading ? "Processing..." : `Record ₹${payingNow} Only`}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleActivatePT(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-extrabold text-xs flex items-center gap-2 transition shadow-md shadow-purple-600/25 disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4 text-emerald-300" />
              {loading ? "Processing..." : `Activate PT & WhatsApp Bill (₹${payingNow})`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
