import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Sparkles, Calendar, Clock, CreditCard, Smartphone,
  Banknote, Building2, Split, Receipt, MessageCircle, AlertCircle,
  CheckCircle2, Plus, Info, X, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { updateMember } from '../../../../firebase/members';
import { addPayment } from '../../../../firebase/payments';
import { getServices, DEFAULT_SERVICES, isServiceIncludedInPlan, getPlanDurationMonths, calculateServiceEndDate } from '../../../../firebase/services';
import { getGymSettings } from '../../../../utils/settings';
import { openWhatsApp, generateServiceAddonReceiptMessage } from '../../../../utils/whatsapp';
import Modal from '../../../../components/ui/Modal';
import { invalidateCache } from '../../../../utils/dataCache';
import { getName, getPhone, toIndianDate, formatDate } from '../memberUtils';

export default function AddServiceModal({ isOpen, onClose, member, gymId, onSave, plans = [] }) {
  if (!isOpen || !member) return null;

  const settings = getGymSettings();
  const GID = gymId || "univo_main";

  // 1. Fetch available services
  const [dbServices, setDbServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getServices(GID)
      .then((srvs) => {
        if (!isMounted) return;
        if (srvs && srvs.length > 0) {
          setDbServices(srvs.filter(s => s.status !== "inactive"));
        } else {
          setDbServices(DEFAULT_SERVICES);
        }
      })
      .catch((err) => {
        console.warn("Could not load services:", err);
        if (isMounted) setDbServices(DEFAULT_SERVICES);
      })
      .finally(() => {
        if (isMounted) setLoadingServices(false);
      });
    return () => { isMounted = false; };
  }, [GID]);

  // Member's current membership plan
  const memberPlan = useMemo(() => {
    if (!member) return null;
    const planName = member.planName || member.plan || "";
    if (plans && plans.length > 0) {
      const found = plans.find(p => p.id === member.planId || p.name?.toLowerCase() === planName.toLowerCase());
      if (found) return found;
    }
    return { name: planName || "Standard Membership", price: member.planPrice || 0 };
  }, [member, plans]);

  // Compute remaining months on membership plan if available
  const remainingMembershipMonths = useMemo(() => {
    if (!member?.expiryDate) return 1;
    const exp = new Date(member.expiryDate);
    const now = new Date();
    const diffTime = exp.getTime() - now.getTime();
    if (diffTime <= 0) return 1;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 30));
  }, [member?.expiryDate]);

  // Current active services of this member
  const currentMemberServices = useMemo(() => {
    const list = Array.isArray(member.selectedServices) ? member.selectedServices : (Array.isArray(member.services) ? member.services : []);
    return list;
  }, [member]);

  // Selected Service to add
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const selectedService = useMemo(() => {
    return dbServices.find(s => s.id === selectedServiceId) || dbServices[0] || null;
  }, [dbServices, selectedServiceId]);

  // Auto-select first service when loaded
  useEffect(() => {
    if (dbServices.length > 0 && !selectedServiceId) {
      setSelectedServiceId(dbServices[0].id);
    }
  }, [dbServices, selectedServiceId]);

  // Duration in months
  const [months, setMonths] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Check if member already has this service active
  const existingActiveMatch = useMemo(() => {
    if (!selectedService) return null;
    return currentMemberServices.find(s => s.id === selectedService.id || s.name?.toLowerCase() === selectedService.name?.toLowerCase());
  }, [currentMemberServices, selectedService]);

  // Auto-set start date if renewing an existing service
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (existingActiveMatch?.endDate && existingActiveMatch.endDate >= today) {
      setStartDate(existingActiveMatch.endDate);
    } else {
      setStartDate(today);
    }
  }, [existingActiveMatch]);

  const isIncludedInPlan = Boolean(selectedService && isServiceIncludedInPlan(selectedService, memberPlan));
  const isMonthly = Boolean((selectedService?.billingType || "Per Month").toLowerCase().includes("month"));
  const monthlyRate = Number(selectedService?.price || 0);

  // Computed total price
  const computedPrice = useMemo(() => {
    if (isIncludedInPlan) return 0;
    return isMonthly ? monthlyRate * months : monthlyRate;
  }, [isIncludedInPlan, isMonthly, monthlyRate, months]);

  // Pricing & Payment state
  const [totalFee, setTotalFee] = useState(String(computedPrice));
  const [payingNow, setPayingNow] = useState(String(computedPrice));
  const [paymentMode, setPaymentMode] = useState("online"); // online | cash | bank | split
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync fee when service or duration changes
  useEffect(() => {
    setTotalFee(String(computedPrice));
    setPayingNow(String(computedPrice));
  }, [computedPrice]);

  // Auto-calculate split payment halves
  useEffect(() => {
    if (paymentMode === "split") {
      const tot = Number(payingNow) || 0;
      const half = Math.floor(tot / 2);
      setCashAmount(String(half));
      setOnlineAmount(String(tot - half));
    }
  }, [paymentMode, payingNow]);

  const feeNum = Number(totalFee) || 0;
  const paidNum = Number(payingNow) || 0;
  const remainingDue = Math.max(0, feeNum - paidNum);

  // Computed End Date
  const computedEndDate = useMemo(() => {
    return calculateServiceEndDate(startDate, isMonthly ? months : 1);
  }, [startDate, isMonthly, months]);

  // Handle Save
  const handleSaveService = async (withWhatsApp = true) => {
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    if (feeNum < 0 || paidNum < 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setSaving(true);
    const memberName = getName(member) || "Member";
    const phone = getPhone(member) || "";
    const billId = "bill_srv_" + Date.now();
    const todayStr = new Date().toISOString().split("T")[0];

    try {
      // 1. Record payment in Firestore payments collection (Service-only invoice)
      const paymentRecord = {
        id: billId,
        receiptNo: "REC-SRV-" + Date.now().toString().slice(-6),
        memberId: member.id,
        memberName,
        phone,
        slot: member.preferredSlot || member.slot || "General Floor",
        batch: member.batch || "Service Subscription",
        planName: `Facility & Service: ${selectedService.name} (${isMonthly ? `${months} Month${months > 1 ? "s" : ""}` : "One-Time"})`,
        planType: "Service",
        isServiceOnly: true,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceMonths: isMonthly ? months : 1,
        monthlyRate,
        planPrice: 0,
        ptPlanPrice: 0,
        servicesPrice: feeNum,
        amount: feeNum,
        paidAmount: paidNum,
        dueAmount: remainingDue,
        paymentMode,
        cashAmount: paymentMode === "cash" ? paidNum : (paymentMode === "split" ? Number(cashAmount || 0) : 0),
        onlineAmount: paymentMode === "online" ? paidNum : (paymentMode === "split" ? Number(onlineAmount || 0) : 0),
        bankAmount: paymentMode === "bank" ? paidNum : 0,
        reference: referenceId || "",
        validityStart: toIndianDate(startDate),
        validityEnd: toIndianDate(computedEndDate),
        dueDate: toIndianDate(computedEndDate),
        date: toIndianDate(todayStr),
        status: remainingDue > 0 ? "partial" : "paid",
        remarks: remarks || `Subscribed to ${selectedService.name} for ${months} Mo (@ ₹${monthlyRate}/mo)`,
        createdAt: new Date().toISOString(),
      };

      await addPayment(GID, paymentRecord);

      // 2. Prepare new service entry for member document
      const newServiceEntry = {
        id: selectedService.id,
        name: selectedService.name,
        category: selectedService.category || "General",
        billingType: selectedService.billingType || "Per Month",
        monthlyRate,
        months: isMonthly ? months : 1,
        price: feeNum,
        originalPrice: monthlyRate,
        isIncluded: isIncludedInPlan,
        startDate,
        endDate: computedEndDate,
        status: "active",
        addedAt: new Date().toISOString()
      };

      // Merge into existing member services (replace if same service already existed, else append)
      const existingList = Array.isArray(member.selectedServices) ? [...member.selectedServices] : (Array.isArray(member.services) ? [...member.services] : []);
      const matchIndex = existingList.findIndex(s => s.id === selectedService.id || s.name?.toLowerCase() === selectedService.name?.toLowerCase());

      if (matchIndex >= 0) {
        existingList[matchIndex] = newServiceEntry;
      } else {
        existingList.push(newServiceEntry);
      }

      // 3. Update member document in Firestore
      const memberUpdates = {
        selectedServices: existingList,
        services: existingList,
        dueAmount: Number(member.dueAmount || 0) + remainingDue,
        paidAmount: Number(member.paidAmount || 0) + paidNum,
        lastPaymentDate: new Date().toISOString()
      };

      await updateMember(member.id, memberUpdates);
      invalidateCache("members");

      toast.success(`"${selectedService.name}" activated for ${memberName}!`);

      // 4. Send WhatsApp Receipt if requested
      if (withWhatsApp && phone && phone !== "—") {
        const waMsg = generateServiceAddonReceiptMessage({
          memberName,
          gymName: settings.gymName,
          serviceName: selectedService.name,
          category: selectedService.category || "Gym Amenity",
          months,
          monthlyRate,
          startDate: toIndianDate(startDate),
          endDate: toIndianDate(computedEndDate),
          amount: feeNum,
          paidAmount: paidNum,
          dueAmount: remainingDue,
          paymentMode,
          billId: paymentRecord.receiptNo
        });
        openWhatsApp(phone, waMsg);
      }

      if (onSave) {
        onSave({ ...member, ...memberUpdates });
      }
      onClose();
    } catch (err) {
      console.error("Error activating service:", err);
      toast.error("Failed to add service. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Header Banner */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                Add Facility & Service Add-on
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                  Mid-Plan Add-on
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Locker, Steam, Diet consultation ya koi bhi extra facility add karein. Dedicated service bill banega.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Context Card */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3.5 rounded-2xl text-white shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/30 text-teal-300 flex items-center justify-center font-bold text-sm border border-teal-400/40">
              {getName(member)?.charAt(0) || "M"}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {getName(member)}
                <span className="text-[10px] font-medium text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  {getPhone(member) || "No Phone"}
                </span>
              </div>
              <div className="text-[11px] text-teal-300 flex items-center gap-1.5 mt-0.5">
                <span>Plan: <strong>{memberPlan?.name}</strong></span>
                <span>•</span>
                <span>Valid Till: <strong>{member.expiryDate ? formatDate(member.expiryDate) : "—"}</strong></span>
                {remainingMembershipMonths > 0 && (
                  <span className="text-[10px] font-black bg-teal-400/20 text-teal-200 px-1.5 py-0.2 rounded">
                    ~{remainingMembershipMonths} Mo Left
                  </span>
                )}
              </div>
            </div>
          </div>

          {currentMemberServices.length > 0 && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Services
              </span>
              <div className="flex items-center gap-1 mt-1 flex-wrap justify-end">
                {currentMemberServices.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-black bg-white/10 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-400/30"
                  >
                    {s.name} ({s.months || 1}M)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 1: Select Service from Available Catalog */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-600" />
            1. Select Gym Facility / Service *
          </label>

          {loadingServices ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading gym services...</div>
          ) : dbServices.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              No services configured in settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
              {dbServices.map((srv) => {
                const isSelected = selectedService?.id === srv.id;
                const isInc = isServiceIncludedInPlan(srv, memberPlan);
                const price = Number(srv.price || 0);
                const isMo = (srv.billingType || "Per Month").toLowerCase().includes("month");

                return (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setSelectedServiceId(srv.id);
                    }}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between gap-2.5 select-none ${
                      isSelected
                        ? "bg-teal-50 border-teal-600 shadow-xs ring-1 ring-teal-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {srv.name}
                        </span>
                        {isInc && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Included in Plan
                          </span>
                        )}
                      </div>
                      {srv.desc && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{srv.desc}</p>
                      )}
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                        {srv.category || "Service"}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-black block ${isSelected ? "text-teal-700" : "text-slate-900"}`}>
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold block">
                        /{isMo ? "month" : "one-time"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Existing Service Renewal Banner */}
        {existingActiveMatch && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-2 text-amber-950 text-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong>Member already has {existingActiveMatch.name}!</strong> Current subscription valid till{" "}
              <strong>{formatDate(existingActiveMatch.endDate || todayStr)}</strong>. New subscription will seamlessly start from expiry date.
            </div>
          </div>
        )}

        {/* Step 2: Duration Multiplier Selection & Dates */}
        {isMonthly && (
          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                2. Choose Service Duration:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, remainingMembershipMonths].filter((v, idx, arr) => arr.indexOf(v) === idx && v > 0).map((mVal) => (
                  <button
                    key={mVal}
                    type="button"
                    onClick={() => setMonths(mVal)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      months === mVal
                        ? "bg-teal-600 text-white border-teal-600 shadow-2xs scale-105"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    {mVal === remainingMembershipMonths && mVal > 3 ? `${mVal} Mo (Remaining Plan)` : `${mVal} Month${mVal > 1 ? "s" : ""}`}
                  </button>
                ))}
                {/* Custom Month input */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={months}
                    onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))}
                    className="w-8 text-center text-xs font-bold text-teal-950 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold">Mo</span>
                </div>
              </div>
            </div>

            {/* Live Calculation Formula Display */}
            <div className="bg-white p-2.5 rounded-xl border border-teal-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Billing Formula: <strong className="text-teal-950">₹{monthlyRate.toLocaleString("en-IN")}/mo</strong> × <strong className="text-teal-950">{months} Month{months > 1 ? "s" : ""}</strong>
              </span>
              <span className="text-sm font-black text-teal-700">
                = ₹{computedPrice.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Date range picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Service Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Service Valid Till (Auto-computed)
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-teal-900 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  {formatDate(computedEndDate)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment & Billing Section */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-3">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-600" />
            3. Service Payment Collection & Receipt
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Service Fee (₹)
              </label>
              <input
                type="number"
                value={totalFee}
                onChange={(e) => {
                  setTotalFee(e.target.value);
                  setPayingNow(e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Paying Now (₹) *
              </label>
              <input
                type="number"
                value={payingNow}
                onChange={(e) => setPayingNow(e.target.value)}
                className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Balance Due (₹)
              </label>
              <div className={`w-full rounded-xl px-3 py-2 text-xs font-black border ${remainingDue > 0 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                ₹{remainingDue.toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="online">Online / UPI</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="split">Split (Cash + UPI)</option>
              </select>
            </div>
          </div>

          {/* Split payment inputs */}
          {paymentMode === "split" && (
            <div className="grid grid-cols-2 gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Cash (₹)</label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => {
                    setCashAmount(e.target.value);
                    const tot = Number(payingNow) || 0;
                    setOnlineAmount(String(Math.max(0, tot - (Number(e.target.value) || 0))));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Online / UPI (₹)</label>
                <input
                  type="number"
                  value={onlineAmount}
                  onChange={(e) => {
                    setOnlineAmount(e.target.value);
                    const tot = Number(payingNow) || 0;
                    setCashAmount(String(Math.max(0, tot - (Number(e.target.value) || 0))));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                UPI / Txn Reference (Optional)
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. UPI Ref / Receipt # / Locker #12"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Internal Remarks / Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Assigned locker #14, deposit collected"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveService(false)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Bill Only
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveService(true)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              Save & Send WhatsApp Bill
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
