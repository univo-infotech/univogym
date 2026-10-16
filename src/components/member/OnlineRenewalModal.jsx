import React, { useState, useEffect } from "react";
import {
  CreditCard,
  QrCode,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Upload,
  AlertCircle,
  Clock,
  Sparkles,
  Dumbbell,
  User,
  ArrowRight,
  ShieldCheck,
  Info,
  ChevronRight,
  X
} from "lucide-react";
import Modal from "../ui/Modal";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { getGymSettings } from "../../utils/settings";
import { getPlans } from "../../firebase/plans";
import { getTrainers } from "../../firebase/trainers";
import { submitRenewalRequest } from "../../firebase/renewalRequests";

const DEFAULT_MEMBERSHIP_PLANS = [
  { id: "p1", name: "1 Month Standard", durationMonths: 1, durationDays: 30, price: 599, badge: "Monthly" },
  { id: "p2", name: "3 Months Pro Transformation", durationMonths: 3, durationDays: 90, price: 1499, badge: "Popular • Save 15%" },
  { id: "p3", name: "6 Months Fitness Pass", durationMonths: 6, durationDays: 180, price: 2799, badge: "Best Value • Save 25%" },
  { id: "p4", name: "12 Months Annual Elite", durationMonths: 12, durationDays: 365, price: 4999, badge: "Ultimate • Save 40%" },
];

const DEFAULT_PT_PACKAGES = [
  { id: "pt_1m", name: "1 Month 1-on-1 PT (24 Sessions)", durationMonths: 1, durationDays: 30, price: 4500, sessions: 24, desc: "Personalized split, daily form checks & macro diet plan" },
  { id: "pt_2m", name: "2 Months Transformation PT (48 Sessions)", durationMonths: 2, durationDays: 60, price: 6500, sessions: 48, desc: "Intense body recomposition, weekly weight audits & direct coach chat" },
  { id: "pt_3m", name: "3 Months Elite Transformation PT (72 Sessions)", durationMonths: 3, durationDays: 90, price: 11000, sessions: 72, desc: "Complete lifestyle overhaul, contest/strength conditioning" },
];

export default function OnlineRenewalModal({ isOpen, onClose, member, gymId = "univo_main", initialCategory = "membership", onSuccess }) {
  const [step, setStep] = useState(1); // 1: Select Plan, 2: Scan QR & Pay, 3: UTR Submission & Success
  const [category, setCategory] = useState(initialCategory || "membership"); // "membership" | "pt"
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selections
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  // Payment form
  const [utr, setUtr] = useState("");
  const [remarks, setRemarks] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedReq, setSubmittedReq] = useState(null);

  const settings = getGymSettings();
  const upiId = settings.upiId || "9196302375@okbizaxis";
  const upiName = settings.upiName || settings.gymName || "UNIVO GYM MANAGEMENT";

  // Load plans & trainers
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setUtr("");
      setRemarks("");
      setScreenshot("");
      setSubmittedReq(null);
      return;
    }

    const startCat = initialCategory || "membership";
    setCategory(startCat);

    async function loadCatalog() {
      setLoadingData(true);
      try {
        const [pList, tList] = await Promise.all([
          getPlans(gymId).catch(() => []),
          getTrainers(gymId).catch(() => []),
        ]);

        const mergedPlans = (pList && pList.length > 0)
          ? pList.map((p) => ({
              id: p.id,
              name: p.name,
              durationMonths: Number(p.durationMonths || p.duration || 1),
              durationDays: Number(p.durationDays || (Number(p.durationMonths || 1) * 30)),
              price: Number(p.price || 599),
              badge: p.badge || `${p.durationMonths || 1} Month(s)`,
            }))
          : DEFAULT_MEMBERSHIP_PLANS;

        setPlans(mergedPlans);
        if (startCat === "pt") {
          setSelectedPlan(DEFAULT_PT_PACKAGES[1] || DEFAULT_PT_PACKAGES[0]);
        } else {
          setSelectedPlan(mergedPlans[1] || mergedPlans[0]);
        }

        const activeTrainers = Array.isArray(tList) ? tList : [];
        setTrainers(activeTrainers);
        if (activeTrainers.length > 0) {
          setSelectedTrainer(activeTrainers[0]);
        }
      } catch (err) {
        setPlans(DEFAULT_MEMBERSHIP_PLANS);
        setSelectedPlan(startCat === "pt" ? DEFAULT_PT_PACKAGES[1] : DEFAULT_MEMBERSHIP_PLANS[1]);
      } finally {
        setLoadingData(false);
      }
    }

    loadCatalog();
  }, [isOpen, gymId, initialCategory]);

  if (!isOpen) return null;

  const currentPrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const currentPlanName = selectedPlan ? selectedPlan.name : "Gym Plan";

  // Construct standard dynamic UPI payment URL
  const noteText = encodeURIComponent(`Renew ${currentPlanName} - ${member?.name || "Member"}`);
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${currentPrice}&cu=INR&tn=${noteText}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied to clipboard!");
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Screenshot file must be under 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result);
      toast.success("Payment screenshot attached!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRequest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanUtr = utr.trim().replace(/\s+/g, "");

    if (!cleanUtr) {
      toast.error("Please enter the 12-digit UPI Transaction / UTR number");
      return;
    }

    if (cleanUtr.length < 8) {
      toast.error("UTR number must be at least 8 to 12 digits from your UPI payment receipt");
      return;
    }

    setSubmitting(true);
    try {
      const isPt = category === "pt";
      const requestData = {
        memberId: member.id,
        memberName: member.name || member.fullName || "Athlete",
        memberPhone: member.phone || "",
        memberPhoto: member.photoURL || member.photoUrl || "",
        currentPlanName: member.planName || "Floor Membership",
        currentExpiryDate: member.expiryDate || "",
        requestType: isPt ? "pt_activation" : "membership_renewal",
        planId: selectedPlan.id,
        planName: currentPlanName,
        planPrice: currentPrice,
        durationMonths: selectedPlan.durationMonths || 1,
        durationDays: selectedPlan.durationDays || 30,
        isPt,
        trainerId: isPt ? (selectedTrainer?.id || "") : "",
        trainerName: isPt ? (selectedTrainer?.name || "") : "",
        amount: currentPrice,
        amountPaid: currentPrice,
        paymentMode: "upi",
        utr: cleanUtr,
        utrNumber: cleanUtr,
        screenshotUrl: screenshot || "",
        memberRemarks: remarks.trim(),
        createdAt: new Date().toISOString(),
      };

      const result = await submitRenewalRequest(gymId, requestData);
      setSubmittedReq(result);
      setStep(3); // Success step
      toast.success("Payment request submitted successfully!");
      if (onSuccess) onSuccess(result);
    } catch (err) {
      console.error("Renewal request submission error:", err);
      toast.error("Failed to submit request: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <CreditCard className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                {step === 3 ? "Payment Submitted!" : "Renew Plan / Upgrade via UPI QR"}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Member: <span className="font-bold text-slate-800">{member?.name || member?.fullName}</span> • Current Plan: <span className="font-medium text-slate-700">{member?.planName || "Floor Member"}</span>
            </p>
          </div>

          {/* Stepper Pill */}
          {step < 3 && (
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1 text-xs font-bold text-slate-600">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}`}>1</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}`}>2</span>
            </div>
          )}
        </div>

        {/* ================= STEP 1: SELECT PLAN / PT ================= */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Category Toggle: Gym Membership vs 1-on-1 PT */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setCategory("membership");
                  setSelectedPlan(plans[1] || plans[0]);
                }}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                  category === "membership"
                    ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Dumbbell className="w-4 h-4" /> Gym Floor Membership
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory("pt");
                  setSelectedPlan(DEFAULT_PT_PACKAGES[1] || DEFAULT_PT_PACKAGES[0]);
                }}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                  category === "pt"
                    ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-4 h-4" /> ⭐ 1-on-1 Personal Training (PT)
              </button>
            </div>

            {/* If 1-on-1 PT is chosen: select trainer */}
            {category === "pt" && (
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-700" /> Select Your Dedicated Coach
                  </h4>
                  <span className="text-[11px] text-purple-700 font-medium">
                    {trainers.length} Certified Trainers Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {trainers.map((t) => {
                    const isSelected = selectedTrainer?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTrainer(t)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : "bg-white text-slate-800 border-slate-200 hover:border-purple-300"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs shrink-0">
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            t.name?.slice(0, 2).toUpperCase() || "TR"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                            Coach {t.name}
                          </p>
                          <p className={`text-[10px] truncate ${isSelected ? "text-purple-200" : "text-slate-500"}`}>
                            {t.specialization || "Strength & Hypertrophy"}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plans Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Subscription Duration & Tier
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(category === "membership" ? plans : DEFAULT_PT_PACKAGES).map((p) => {
                  const isSelected = selectedPlan?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlan(p)}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? category === "pt"
                            ? "border-purple-600 bg-purple-50/40 shadow-sm"
                            : "border-emerald-600 bg-emerald-50/40 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {p.badge && (
                        <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${
                          category === "pt" ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {p.badge}
                        </span>
                      )}

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{p.name}</h4>
                        {p.desc && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{p.desc}</p>}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 font-medium">Total: </span>
                          <span className="text-lg font-black text-slate-900">₹{p.price.toLocaleString("en-IN")}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? category === "pt" ? "bg-purple-600 border-purple-600 text-white" : "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Payable Amount</p>
                <p className="text-2xl font-black text-emerald-600">₹{currentPrice.toLocaleString("en-IN")}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedPlan}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
                >
                  <span>Proceed to UPI QR</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SCAN QR & PAY ================= */}
        {step === 2 && (
          <form onSubmit={handleSubmitRequest} className="space-y-5 animate-in fade-in duration-200">
            {/* Payment Summary Header */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  {category === "pt" ? "1-on-1 PT Coaching Package" : "Gym Membership Plan"}
                </p>
                <h4 className="text-sm font-extrabold text-slate-900">{currentPlanName}</h4>
                {category === "pt" && selectedTrainer && (
                  <p className="text-xs text-purple-700 font-semibold mt-0.5">Assigned Coach: {selectedTrainer.name}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Scan & Pay</span>
                <p className="text-2xl font-black text-emerald-600">₹{currentPrice.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* QR Card & Deeplinks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Left: Dynamic QR Box */}
              <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col items-center justify-center text-center shadow-md">
                <div className="p-3 bg-white rounded-2xl shadow-inner mb-3">
                  {settings.upiQrCodeUrl ? (
                    <img src={settings.upiQrCodeUrl} alt="Gym UPI QR" className="w-36 h-36 object-contain rounded-lg" />
                  ) : (
                    <QRCodeSVG
                      value={upiUrl}
                      size={144}
                      level="H"
                      includeMargin={false}
                    />
                  )}
                </div>

                <p className="text-xs font-bold text-slate-200">{upiName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-emerald-400 font-bold">{upiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Copy UPI ID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Scan using Google Pay, PhonePe, Paytm, or BHIM
                </p>
              </div>

              {/* Right: Payment Instructions & Mobile Deeplink */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600" /> Payment Instructions
                  </h4>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Scan the QR code with any UPI app on your phone.</li>
                    <li>Verify the amount is <strong className="text-slate-900 font-bold">₹{currentPrice}</strong> and complete payment.</li>
                    <li>Copy the <strong className="text-slate-900 font-bold">12-digit UTR / UPI Ref ID</strong> from the payment receipt.</li>
                    <li>Paste the UTR number below and click Submit.</li>
                  </ol>
                </div>

                {/* Direct Mobile UPI Deeplink */}
                <a
                  href={upiUrl}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-200"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span>Open directly in UPI App (Mobile Only)</span>
                </a>

                {/* Input 1: UTR Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    12-Digit UPI Ref / UTR Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 427819827361 or 123456789012"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Shown as "UPI Transaction ID" or "UTR" in Google Pay/PhonePe/Paytm history.
                  </p>
                </div>
              </div>
            </div>

            {/* Optional screenshot upload & remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Screenshot (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    id="member-ss-upload"
                    className="hidden"
                  />
                  <label
                    htmlFor="member-ss-upload"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{screenshot ? "Screenshot Attached" : "Upload Receipt Photo"}</span>
                  </label>
                  {screenshot && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Morning 7 AM shift, Paid via PhonePe"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                &larr; Change Plan
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Payment & Request Approval</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: SUBMITTED SUCCESS ================= */}
        {step === 3 && (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-slate-900">Payment Request Submitted!</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your payment of <strong className="text-slate-900">₹{submittedReq?.amountPaid || currentPrice}</strong> (UTR: <span className="font-mono font-bold text-slate-900">{submittedReq?.utrNumber || utr}</span>) for <strong className="text-slate-900">{currentPlanName}</strong> has been sent to gym management.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 max-w-md mx-auto text-left flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-bold">Pending Owner Verification</p>
                <p className="mt-0.5 text-amber-800">
                  The gym owner will verify the UTR reference in the gym account. Once approved, your membership validity and coaching features will be instantly updated!
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
              >
                Done / Back to My Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
