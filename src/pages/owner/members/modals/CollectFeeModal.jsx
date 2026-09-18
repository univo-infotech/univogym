import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Smartphone, Clock, CreditCard, Tag, Dumbbell, 
  Sparkles, Calendar, CheckCircle, Split, Banknote, 
  Building2, Receipt, Share2, ChevronDown 
} from 'lucide-react';

// Components
import Modal from '../../../../components/ui/Modal';

// Firebase
import { updateMember } from '../../../../firebase/members';
import { addPayment } from '../../../../firebase/payments';
import { getServices, DEFAULT_SERVICES } from '../../../../firebase/services';

// Utilities
import { getGymSettings } from '../../../../utils/settings';
import { generatePaymentReceipt } from '../../../../utils/pdf';
import { openWhatsApp } from '../../../../utils/whatsapp';
import { 
  toDate, 
  formatDate, 
  getName, 
  getPhone, 
  getGymStatus, 
  getPtStatus, 
  hasPt, 
  toIndianDate 
} from '../memberUtils';

export default function CollectFeeModal({ member, gymId, onClose, onSave, trainers = [], plans = [] }) {
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
  const memberStatus = getGymStatus(member);
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

  // Smart validity start: if member left or ended, start TODAY. If new, start from joining date or today!
  const getSmartValidityStart = () => {
    if (member.status === 'left' || member.status === 'ended') {
      return new Date().toISOString().split("T")[0];
    }

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
  }, [validityStart, selectedPlanId, currentPlan.durationMonths]);

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

  const handleCollect = async (sendWhatsApp = false) => {
    setLoading(true);
    const memberName = getName(member) || "Member";
    const phone = getPhone(member) || "";
    const memberSlot = member.slot || member.workoutSlot || "General Shift";

    // Target expiry ISO for member doc (keep existing expiry if collecting remaining balance)
    let newExpiryIso;
    if (hasPartialPaymentDue && member.expiryDate) {
      newExpiryIso = member.expiryDate;
    } else if (validityEnd && typeof validityEnd === "string" && validityEnd.includes("/")) {
      const [d, m, y] = validityEnd.split("/");
      newExpiryIso = new Date(`${y}-${m}-${d}T23:59:59.000Z`).toISOString();
    } else if (validityEnd) {
      const d = new Date(validityEnd);
      newExpiryIso = !isNaN(d.getTime()) ? d.toISOString() : new Date(Date.now() + currentPlan.durationDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      newExpiryIso = new Date(Date.now() + currentPlan.durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const isInitialAdmission = !member.lastPaymentDate && Number(member.paidAmount || 0) === 0;
    const isRenewal = !isInitialAdmission && !hasPartialPaymentDue;
    const receiptNum = hasPartialPaymentDue
      ? `REC-DUE-${Date.now().toString().slice(-6)}`
      : (isRenewal ? `REC-REN-${Date.now().toString().slice(-6)}` : `REC-${Date.now().toString().slice(-6)}`);

    let billPlanName = `${currentPlan.name}${selectedPtPlanName ? ` + PT (${selectedPtPlanName})` : ''}${servicesTotal > 0 ? ` + Services (${selectedServices.map((s) => s.name).join(', ')})` : ''}`;
    if (hasPartialPaymentDue) {
      billPlanName = `Due Balance Settlement - ${member.planName || currentPlan.name}`;
    } else if (isRenewal) {
      billPlanName = `Gym Membership Renewal - ${currentPlan.name}${selectedPtPlanName ? ` + PT (${selectedPtPlanName})` : ''}${servicesTotal > 0 ? ` + Services (${selectedServices.map((s) => s.name).join(', ')})` : ''}`;
    }

    const newPaymentRecord = {
      id: "bill_" + Date.now(),
      receiptNo: receiptNum,
      receiptNumber: receiptNum,
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
      planName: billPlanName,
      isRenewal,
      isDueSettlement: hasPartialPaymentDue,
      validityStart: toIndianDate(validityStart),
      validityEnd: hasPartialPaymentDue && member.expiryDate ? toIndianDate(member.expiryDate) : validityEnd,
      dueDate: validityEnd,
      planPrice: hasPartialPaymentDue ? 0 : currentPlan.price,
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
      remarks: remarks || (paymentMode === "split" ? `Cash: ₹${cashAmount}, Online: ₹${onlineAmount}` : (hasPartialPaymentDue ? "Balance Due Payment" : (isRenewal ? "Membership Plan Renewal" : "Membership Admission Fee"))),
      date: toIndianDate(new Date()),
      status: remainingDue > 0 ? "partial" : "paid",
      createdAt: new Date().toISOString()
    };

    try {
      const isPTNow = isTrainerSelected && Number(selectedPtPrice) > 0;
      // 1. Update Member in Firestore & UI
      const updatedFields = {
        ...(hasPartialPaymentDue ? {} : { 
          planName: currentPlan.name, 
          planPrice: currentPlan.price,
          trainerName: selectedTrainerName,
          trainerId: selectedTrainerObj?.id || member.trainerId || '',
          hasPersonalCoach: isPTNow,
          isPt: isPTNow || Boolean(member.isPt),
          isPTMember: isPTNow || Boolean(member.isPTMember),
          ...(isPTNow ? {
            ptStatus: "active",
            ptPlanId: selectedPtPlanId,
            ptPlanName: selectedPtPlanName,
            ptPlanPrice: Number(selectedPtPrice || 0),
            loginEmail: member.loginEmail || member.email || phone,
            loginPassword: member.loginPassword || member.password || "Member@123",
            password: member.password || member.loginPassword || "Member@123",
          } : {}),
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
        leftReason: null,
        endReason: null,
        ...(member.status === 'left' || member.status === 'ended' ? { rejoinedAt: new Date().toISOString() } : {}),
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

      // 3. Update parent list and trigger receipt
      onSave(member.id, updatedFields, newPaymentRecord);

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
          ? `Collect Remaining Due — ${getName(member)}`
          : isRenewing
          ? `⚡ Renew Membership & Plan — ${getName(member)}`
          : `Collect Admission & Plan Fee — ${getName(member)}`
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-slate-800 text-xs">
        {/* Rejoin / Welcome Back Banner if Member previously Left or was Ended */}
        {(member.status === 'left' || member.status === 'ended') && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                🎉
              </div>
              <div>
                <p className="font-bold text-xs text-emerald-950">
                  {member.status === 'left' ? 'Member Rejoining' : 'New Membership Rejoin'}
                </p>
                <p className="text-[11px] text-emerald-800 font-medium">
                  {member.name || member.fullName} gym me wapas shuru kar rahe hain. Naya plan chunein aur fee collect karke fresh validity start karein.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-xs tracking-wide">
                Rejoin & Bill
              </span>
            </div>
          </div>
        )}

        {/* Renewal Banner if Member's plan is ending soon or expired */}
        {isRenewing && !hasPartialPaymentDue && member.status !== 'left' && member.status !== 'ended' && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ⚡
              </div>
              <div>
                <p className="font-bold text-xs text-emerald-950">Membership Renewal</p>
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
                <p className="font-bold text-xs text-amber-950">Pending Balance Due</p>
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
                {(getName(member) || "M")[0]?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {getName(member)}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                    Active Member
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300 text-[11px] mt-1">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Smartphone className="w-3 h-3 text-indigo-400" />
                    {getPhone(member) || "No phone"}
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
              SELECT MEMBERSHIP PLAN *
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
              SPECIAL DISCOUNT (₹)
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
                Add-on Gym Services & Facilities
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
                Validity Start Date *
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
                Validity End / Due Date *
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
            PAYMENT TYPE
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
              Full Payment (₹{calculatedTotal})
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
              Partial / Installment
            </button>
          </div>

          {/* If Partial is selected, show Amount Paying Now input */}
          {paymentType === "partial" && (
            <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-xl space-y-1.5 animate-in fade-in duration-150">
              <label className="text-[11px] font-black text-amber-950 uppercase block">
                Amount Paying Now *
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
                REMAINING DUE
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
            PAYMENT MODE *
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
