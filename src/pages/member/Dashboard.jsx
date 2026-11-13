import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Dumbbell,
  Calendar,
  Flame,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  QrCode,
  Download,
  Copy,
  Check,
  Clock,
  Shield,
  Zap,
  ShoppingBag,
  User,
  Heart,
  ChevronRight,
  Sparkles,
  Layers,
  FileText,
  AlertTriangle,
  Receipt
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../contexts/AuthContext";
import { getMember } from "../../firebase/members";
import { getMemberPayments } from "../../firebase/payments";
import { formatDate } from "../../utils/dateUtils";
import { hasPt, isNonPtTrainer, getDaysRemaining } from "../owner/members/memberUtils";
import { getDisplayMemberId } from "../../utils/idGenerator";
import { getGymSettings } from "../../utils/settings";
import { generatePaymentReceipt } from "../../utils/pdf";
import toast from "react-hot-toast";
import Modal from "../../components/ui/Modal";

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";
  const settings = getGymSettings();

  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        let m = null;
        const targetId = profileId || user?.uid;
        if (targetId) {
          try {
            m = await getMember(GID, targetId);
          } catch (e) {}
        }
        const saved = localStorage.getItem("univo_member_session");
        let savedObj = null;
        if (saved) {
          try {
            savedObj = JSON.parse(saved);
          } catch (e) {}
        }
        if (!m && savedObj?.id) {
          try {
            m = await getMember(GID, savedObj.id);
          } catch (e) {}
        }
        if (!m && savedObj) {
          m = savedObj;
        }

        if (m) {
          setMember(m);
          try {
            const currentSess = savedObj || {};
            localStorage.setItem("univo_member_session", JSON.stringify({ ...currentSess, ...m }));
          } catch (e) {}

          // Load payment history
          try {
            const payList = await getMemberPayments(GID, m.id);
            if (payList && payList.length > 0) {
              setPayments(payList);
            } else {
              // Synthetic invoice from active plan if no ledger entries
              const planFee = Number(m.planPrice || m.totalAmount || 0);
              const paid = Number(m.paidAmount) || planFee;
              const due = Number(m.dueAmount) || Math.max(0, planFee - paid);
              setPayments([
                {
                  id: m.id || "inv_curr",
                  memberName: m.name || m.fullName || "Athlete",
                  planName: m.planName || "Gym Membership",
                  amount: planFee || paid,
                  paidAmount: paid,
                  dueAmount: due,
                  paymentMode: m.paymentMode || "Online UPI",
                  date: m.joinDate || new Date().toISOString().split("T")[0],
                  status: due > 0 ? "partial" : "paid",
                },
              ]);
            }
          } catch (pErr) {
            console.warn("Payment fetch note:", pErr);
          }
        }
      } catch (err) {
        console.warn("Member load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gymId, profileId, user]);

  const athleteName = member?.fullName || member?.name || "Athlete";
  const displayMemberId = getDisplayMemberId(member);
  const rawCoachName = member?.personalTrainer || member?.trainerName || member?.trainer || "";
  const hasPtMember = hasPt(member) && !isNonPtTrainer(rawCoachName);
  const coachName = hasPtMember ? rawCoachName : "Floor Coach (Included)";
  const planName = member?.planName || member?.ptPlanName || "Gym Floor Membership";
  const daysRemaining = getDaysRemaining(member?.expiryDate);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayMemberId);
    setCopiedId(true);
    toast.success("Member ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const latestPayment = payments[0] || null;

  return (
    <div className="space-y-6 pb-12 text-slate-800 max-w-6xl mx-auto">
      {/* =========================================================================
          HERO: DIGITAL GYM MEMBERSHIP ID PASS CARD (PREMIUM ATHLETE PASS)
      ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity Details */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1">
            {member?.photoURL ? (
              <img
                src={member.photoURL}
                alt={athleteName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-2xl sm:text-3xl shadow-lg ring-2 ring-emerald-500/30 shrink-0">
                {athleteName.charAt(0)}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                  OFFICIAL ATHLETE PASS
                </span>
                <span
                  className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${
                    isExpired
                      ? "bg-rose-950/80 text-rose-300 border-rose-500/40"
                      : isExpiringSoon
                      ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                      : "bg-teal-950/80 text-teal-300 border-teal-500/40"
                  }`}
                >
                  {isExpired ? "MEMBERSHIP EXPIRED" : isExpiringSoon ? "EXPIRING SOON" : "ACTIVE ACCESS"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {athleteName}
              </h1>

              {/* Universal Unique Member ID Strip */}
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Member Login ID:</span>
                <span className="font-mono font-black text-sm text-emerald-400 bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                  {displayMemberId}
                </span>
                <button
                  onClick={handleCopyId}
                  className="text-slate-400 hover:text-white transition p-1 text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy Unique Member ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Copied</span>
                    </>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 pt-0.5">
                Plan: <strong className="text-white">{planName}</strong> • {settings.gymName}
              </p>
            </div>
          </div>

          {/* Right: Quick Action Buttons & Entry QR Modal Button */}
          <div className="flex flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 w-full lg:w-auto shrink-0">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" /> Gym Entry QR
            </button>
            <Link
              to="/member/plan"
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" /> Manage Plan
            </Link>
          </div>
        </div>

        {/* Card Footer Strip: Expiry Countdown & Workout Shift */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Workout Slot:</span>
            <span className="font-bold text-white flex items-center gap-1 mt-0.5 truncate">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {member?.slot || member?.preferredTime || "Morning Shift (6-9 AM)"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">Plan Validity:</span>
            <span className="font-bold text-white flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              {member?.expiryDate ? formatDate(member.expiryDate) : "Active"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">Days Remaining:</span>
            <span
              className={`font-black text-sm flex items-center gap-1 mt-0.5 ${
                isExpired
                  ? "text-rose-400"
                  : isExpiringSoon
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              {daysRemaining !== null
                ? daysRemaining > 0
                  ? `${daysRemaining} Days Left`
                  : daysRemaining === 0
                  ? "Expires Today!"
                  : "Expired"
                : "Active"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">Assigned Coach:</span>
            <span className="font-bold text-white flex items-center gap-1 mt-0.5 truncate">
              <Dumbbell className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {coachName}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KEY SYSTEMATIC KPI TILES
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Streak */}
        <div
          onClick={() => navigate("/member/profile")}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Attendance Streak</span>
            <Flame className="w-4 h-4 text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {member?.attendanceStreak ? `${member.attendanceStreak} Days` : "Active"}
          </div>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 inline-block">
            Regular Gym Access
          </span>
        </div>

        {/* Days Left */}
        <div
          onClick={() => navigate("/member/plan")}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Remaining Days</span>
            <Calendar className="w-4 h-4 text-teal-600 group-hover:scale-110 transition" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              isExpired
                ? "text-rose-600"
                : isExpiringSoon
                ? "text-amber-600"
                : "text-slate-900"
            }`}
          >
            {daysRemaining !== null
              ? daysRemaining > 0
                ? `${daysRemaining} Days`
                : daysRemaining === 0
                ? "Today"
                : "Expired"
              : "Active"}
          </div>
          <span className="text-[11px] font-bold text-teal-600 mt-1 inline-block">
            {member?.expiryDate ? formatDate(member.expiryDate) : "Full Validity"}
          </span>
        </div>

        {/* Workout Shift */}
        <div
          onClick={() => navigate("/member/profile")}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Gym Workout Shift</span>
            <Clock className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {member?.slot || member?.preferredTime || "Morning Shift"}
          </div>
          <span className="text-[11px] font-bold text-indigo-600 mt-1 inline-block">
            Floor Access Open
          </span>
        </div>

        {/* Dedicated Coach */}
        <div
          onClick={() => navigate(hasPtMember ? "/member/trainer" : "/member/plan")}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600">Assigned Coach</span>
            <Dumbbell className="w-4 h-4 text-blue-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {coachName}
          </div>
          <span className="text-[11px] font-bold text-blue-600 mt-1 inline-block">
            {hasPtMember ? "1-on-1 PT Active" : "Floor Coach Included"}
          </span>
        </div>
      </div>

      {/* =========================================================================
          QUICK ACCESS SHORTCUTS (4 CLEAN TILES)
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/member/plan"
          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/70 hover:border-emerald-400 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">My Membership</h4>
            <p className="text-[10px] text-emerald-700 font-medium">Renew & Services</p>
          </div>
        </Link>

        <Link
          to="/member/trainer"
          className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50/50 border border-indigo-200/70 hover:border-indigo-400 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">Diet & Workout</h4>
            <p className="text-[10px] text-indigo-700 font-medium">Daily Meal Routine</p>
          </div>
        </Link>

        <Link
          to="/member/payments"
          className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/70 hover:border-amber-400 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">Fee Receipts</h4>
            <p className="text-[10px] text-amber-700 font-medium">Download Invoices</p>
          </div>
        </Link>

        <Link
          to="/member/store"
          className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50/50 border border-teal-200/70 hover:border-teal-400 hover:shadow-sm transition flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">Gym Store</h4>
            <p className="text-[10px] text-teal-700 font-medium">Whey & Supplements</p>
          </div>
        </Link>
      </div>

      {/* =========================================================================
          MIDDLE TWO COLUMNS: MEMBERSHIP DETAILS & COACH SPOTLIGHT
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Membership & Included Amenities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Plan Detail Box */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Active Membership Plan
              </h3>
              <Link
                to="/member/plan"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View Full Details <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-lg font-extrabold text-slate-900">{planName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enrolled at: {settings.gymName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Subscription Status</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                  </span>
                </div>
              </div>

              {/* Inclusions pills */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Included Amenities & Privileges
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> All Gym Machines & Weights
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Locker Room Access
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Floor Trainer Guidance
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Free Filtered Water & WiFi
                  </span>
                </div>
              </div>

              {/* Validity timeline */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1 bg-white p-3 rounded-xl border border-slate-200/80">
                <span>
                  Start Date: <strong>{member?.joinDate ? formatDate(member.joinDate) : "Enrolled"}</strong>
                </span>
                <span>
                  Valid Till: <strong>{member?.expiryDate ? formatDate(member.expiryDate) : "Active"}</strong>
                </span>
                <span className="text-emerald-700 font-bold">
                  {daysRemaining !== null ? `${daysRemaining} Days Left` : "Active Pass"}
                </span>
              </div>
            </div>
          </div>

          {/* Latest Payment Receipt Download Strip */}
          {latestPayment && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Latest Fee Payment Invoice ({latestPayment.planName})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Amount Paid: <strong className="text-emerald-700 font-bold">₹{latestPayment.paidAmount}</strong> via {latestPayment.paymentMode} on {formatDate(latestPayment.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  onClick={() => generatePaymentReceipt(latestPayment)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> Download PDF Receipt
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Dedicated Coach & Physical Target */}
        <div className="space-y-6">
          {/* Coach Spotlight */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-teal-600" /> {hasPtMember ? "1-on-1 PT Coach" : "Floor Training"}
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                {hasPtMember ? "PT Athlete" : "Included"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {coachName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{coachName}</h4>
                  <p className="text-xs text-slate-500">
                    {hasPtMember ? "Personal Certified Coach" : "Floor Trainer Team"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {hasPtMember
                  ? "Assigned for form correction, customized workout routines, body transformation tracking, and nutrition guidance."
                  : "Floor trainers are available in your shift to assist with setups, heavy lift spotting, and workout guidance."}
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/member/trainer"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> View Diet & Workout Routine
                </Link>
              </div>
            </div>
          </div>

          {/* Physical Goals & Target Assessment */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" /> Fitness Target
              </h3>
              <Link to="/member/profile" className="text-xs font-bold text-emerald-700 hover:underline">
                Edit Profile
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Primary Goal:</span>
                <span className="font-bold text-slate-900">
                  {member?.fitnessGoal || "Fat Loss & Muscle Building"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Recorded Weight:</span>
                <span className="font-bold text-slate-900">
                  {member?.weight ? `${member.weight} kg` : "Not recorded"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Height:</span>
                <span className="font-bold text-slate-900">
                  {member?.height || "Not recorded"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Target Timeline:</span>
                <span className="font-bold text-emerald-700">
                  {member?.targetTimeline || "90 Days"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          GYM ENTRY SCANNER QR CODE MODAL
      ========================================================================= */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Official Gym Entry QR Pass"
      >
        <div className="p-6 text-center space-y-5">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase border border-emerald-200">
              UNIVO GYM ENTRY PASS
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-2">{athleteName}</h3>
            <p className="text-xs text-slate-500 font-mono">
              Universal Member ID: <strong>{displayMemberId}</strong>
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-inner inline-block mx-auto">
            <QRCodeSVG
              value={`UNIVO-MEMBER-${displayMemberId}-${member?.id || ""}`}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold text-slate-900">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Workout Shift:</span>
              <span className="font-bold text-slate-900">
                {member?.slot || member?.preferredTime || "Morning (6-9 AM)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-700">
                {daysRemaining !== null ? `${daysRemaining} Days Remaining` : "Active Member"}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Show this QR code at the gym reception desk or scanner device for instant attendance check-in.
          </p>

          <button
            onClick={() => setShowQrModal(false)}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            Close Pass
          </button>
        </div>
      </Modal>
    </div>
  );
}
