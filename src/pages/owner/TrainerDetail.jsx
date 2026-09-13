import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  MessageCircle,
  Users,
  Star,
  Briefcase,
  Calendar,
  DollarSign,
  Loader2,
  UserCircle,
  Dumbbell,
  ImagePlus,
  ClipboardList,
  ChevronRight,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  HandCoins,
  Percent,
  TrendingUp,
  IndianRupee,
  Award,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTrainer,
  getTrainerMembers,
  getTrainerBeforeAfter,
  getTrainerPlans,
} from "../../firebase/trainers";

// ─── Constants ────────────────────────────────────────────────────────────────
const SPEC_COLORS = {
  "Weight Training": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Cardio: "bg-red-500/20 text-red-300 border-red-500/30",
  Yoga: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Nutrition: "bg-green-500/20 text-green-300 border-green-500/30",
  CrossFit: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  HIIT: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  Pilates: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  Zumba: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  Boxing: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  Calisthenics: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const TABS = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "commission", label: "PT Commission & Earnings", icon: HandCoins },
  { id: "members", label: "My Members", icon: Users },
  { id: "beforeafter", label: "Before & After", icon: ImagePlus },
  { id: "plans", label: "Plans", icon: ClipboardList },
];

// ─── Tab: Profile ─────────────────────────────────────────────────────────────
function ProfileTab({ trainer }) {
  const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      {/* Bio */}
      {trainer.bio && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Bio
          </h3>
          <p className="text-slate-200 leading-relaxed">{trainer.bio}</p>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainer.salary && (
          <InfoCard
            icon={DollarSign}
            label="Monthly Salary"
            value={`₹${Number(trainer.salary).toLocaleString("en-IN")}`}
            color="green"
          />
        )}
        {trainer.experience && (
          <InfoCard
            icon={Briefcase}
            label="Experience"
            value={`${trainer.experience} year${trainer.experience !== 1 ? "s" : ""}`}
            color="teal"
          />
        )}
        {trainer.joinDate && (
          <InfoCard
            icon={Calendar}
            label="Joined"
            value={new Date(trainer.joinDate).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            color="purple"
          />
        )}
        {trainer.phone && (
          <InfoCard icon={Phone} label="Phone" value={trainer.phone} color="blue" />
        )}
        {trainer.email && (
          <InfoCard icon={Mail} label="Email" value={trainer.email} color="orange" />
        )}
      </div>

      {/* Schedule Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Weekly Schedule
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {SCHEDULE_DAYS.map((d) => (
                  <th key={d} className="text-center text-slate-400 font-medium pb-3 px-2">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {SCHEDULE_DAYS.map((d) => {
                  const slot = trainer.schedule?.[d];
                  return (
                    <td key={d} className="text-center px-2 pb-2">
                      <div
                        className={`rounded-lg py-2 px-1 text-xs ${
                          slot
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                            : "bg-slate-700/30 text-slate-600 border border-slate-700/30"
                        }`}
                      >
                        {slot || "Off"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color = "teal" }) {
  const colors = {
    teal: "text-teal-400 bg-teal-500/10",
    green: "text-green-400 bg-green-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    orange: "text-orange-400 bg-orange-500/10",
  };
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Tab: PT Commission & Earnings ──────────────────────────────────────────
function CommissionTab({ trainer, members, loading }) {
  if (loading) return <TabLoader />;

  // Filter members who bought a PT package with this trainer
  const ptMembers = members.filter(
    (m) =>
      Number(m.ptPlanPrice || m.ptPrice || m.ptFee || 0) > 0 ||
      Boolean(m.ptPlanName) ||
      Boolean(m.ptPackageName) ||
      Boolean(m.hasPt)
  );

  const commType = trainer?.commissionType || "percentage";
  const commVal = Number(trainer?.commissionValue ?? 30);

  // Compute metrics across all PT members
  let totalPtRevenue = 0;
  let totalGymCut = 0;
  let totalTrainerPayout = 0;

  const rows = ptMembers.map((m) => {
    const fee = Number(m.ptPlanPrice || m.ptPrice || m.ptFee || 0);
    totalPtRevenue += fee;

    let gymCut = 0;
    let trainerCut = 0;

    if (m.ptOwnerCommission !== undefined && m.ptTrainerPayout !== undefined) {
      gymCut = Number(m.ptOwnerCommission || 0);
      trainerCut = Number(m.ptTrainerPayout || 0);
    } else {
      // Historical fallback calculation using trainer's active deal
      if (commType === "percentage") {
        gymCut = Math.round((fee * commVal) / 100);
        trainerCut = Math.max(0, fee - gymCut);
      } else {
        gymCut = Math.min(fee, commVal);
        trainerCut = Math.max(0, fee - gymCut);
      }
    }

    totalGymCut += gymCut;
    totalTrainerPayout += trainerCut;

    return {
      ...m,
      computedFee: fee,
      computedGymCut: gymCut,
      computedTrainerCut: trainerCut,
    };
  });

  const baseSalary = Number(trainer?.salary || 0);
  const grandTrainerEarnings = baseSalary + totalTrainerPayout;

  return (
    <div className="space-y-6">
      {/* ── Active Deal Agreement Card ── */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Active PT Revenue Share Deal</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  {commType === "percentage" ? "Percentage Share" : "Fixed Cut Per Sale"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Commission deal agreed between Gym Owner and {trainer?.name || "Trainer"} on all PT package sales.
              </p>
            </div>
          </div>

          {/* Deal Pill Summary */}
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Gym Commission</p>
              <p className="text-sm font-bold text-emerald-400">
                {commType === "percentage" ? `${commVal}% of Fee` : `₹${commVal.toLocaleString("en-IN")} Flat / sale`}
              </p>
            </div>
            <div className="h-7 w-px bg-slate-700" />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Trainer Share</p>
              <p className="text-sm font-bold text-teal-400">
                {commType === "percentage" ? `${100 - commVal}% of Fee` : "Remaining Balance"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Financial Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">PT Clients Enrolled</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white">{ptMembers.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Total personal training buyers</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total PT Sales Volume</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">₹{totalPtRevenue.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-slate-500 mt-1">Gross PT revenue generated</p>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-400 font-medium">Gym Owner Cut</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">₹{totalGymCut.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-emerald-300/70 mt-1">Total gym profit retained</p>
        </div>

        <div className="bg-teal-950/20 border border-teal-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-teal-300 font-medium">Trainer Net PT Payout</span>
            <HandCoins className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-teal-300">₹{totalTrainerPayout.toLocaleString("en-IN")}</p>
          {baseSalary > 0 ? (
            <p className="text-[11px] text-teal-300/70 mt-1">
              + ₹{baseSalary.toLocaleString("en-IN")} Base = ₹{grandTrainerEarnings.toLocaleString("en-IN")} Total
            </p>
          ) : (
            <p className="text-[11px] text-teal-300/70 mt-1">Total payout to coach</p>
          )}
        </div>
      </div>

      {/* ── Detailed PT Sales & Commission Ledger Table ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-semibold text-white">PT Sales Ledger & Commission Breakdown</h4>
            <p className="text-xs text-slate-400">
              Individual PT member package bookings and owner/trainer revenue split
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-slate-700/60 text-slate-300 rounded-lg">
            {rows.length} {rows.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <HandCoins className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">No PT sales recorded for this trainer yet</p>
            <p className="text-slate-500 text-xs mt-1">
              When members choose this trainer and select a PT membership, the commission will automatically calculate and appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/40 text-slate-400 font-medium">
                  <th className="text-left py-3.5 px-5">Member</th>
                  <th className="text-left py-3.5 px-5">PT Package</th>
                  <th className="text-right py-3.5 px-5">PT Fee</th>
                  <th className="text-center py-3.5 px-5">Deal Type</th>
                  <th className="text-right py-3.5 px-5 text-emerald-400">Gym Share</th>
                  <th className="text-right py-3.5 px-5 text-teal-400">Trainer Payout</th>
                  <th className="text-center py-3.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {rows.map((m) => {
                  const dealLabel =
                    m.ptCommissionType === "fixed"
                      ? `Flat ₹${m.ptCommissionValue || commVal}`
                      : `${m.ptCommissionValue || commVal}% Gym`;
                  const isActive = m.status === "active";

                  return (
                    <tr key={m.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {m.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-white">{m.name}</p>
                            <p className="text-slate-500 text-xs">{m.phone || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-medium text-slate-200">
                          {m.ptPlanName || m.ptPackageName || m.selectedPtPackage || "Personal Training"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-white">
                        ₹{m.computedFee.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700/80 text-slate-300 font-mono">
                          {dealLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-emerald-400">
                        +₹{m.computedGymCut.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-teal-300">
                        ₹{m.computedTrainerCut.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                            isActive
                              ? "bg-green-500/15 text-green-400 border-green-500/30"
                              : "bg-slate-700/50 text-slate-400 border-slate-600"
                          }`}
                        >
                          {isActive ? "Active" : "Completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-900/60 font-semibold text-white">
                  <td colSpan={2} className="py-3.5 px-5 text-slate-300">
                    Total PT Revenue & Distribution
                  </td>
                  <td className="py-3.5 px-5 text-right text-white">
                    ₹{totalPtRevenue.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-5" />
                  <td className="py-3.5 px-5 text-right text-emerald-400">
                    ₹{totalGymCut.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-5 text-right text-teal-300">
                    ₹{totalTrainerPayout.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 px-5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Members ─────────────────────────────────────────────────────────────
function MembersTab({ members, loading }) {
  if (loading) return <TabLoader />;

  if (members.length === 0) {
    return (
      <EmptyState icon={Users} message="No members assigned to this trainer yet" />
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left text-slate-400 font-medium py-4 px-5">Member</th>
            <th className="text-left text-slate-400 font-medium py-4 px-5">Plan</th>
            <th className="text-left text-slate-400 font-medium py-4 px-5">Expiry</th>
            <th className="text-left text-slate-400 font-medium py-4 px-5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {members.map((m) => {
            const isActive = m.status === "active";
            const expiry = m.expiryDate
              ? new Date(m.expiryDate?.seconds * 1000 || m.expiryDate).toLocaleDateString(
                  "en-IN"
                )
              : "—";
            return (
              <tr key={m.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {m.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-white">{m.name}</p>
                      <p className="text-slate-500 text-xs">{m.phone || ""}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-slate-300">{m.planName || "—"}</td>
                <td className="py-3.5 px-5 text-slate-300">{expiry}</td>
                <td className="py-3.5 px-5">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
                      isActive
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : "bg-red-500/15 text-red-400 border-red-500/30"
                    }`}
                  >
                    {isActive ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {isActive ? "Active" : "Expired"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Before & After ──────────────────────────────────────────────────────
function BeforeAfterTab({ photos, loading }) {
  if (loading) return <TabLoader />;

  if (photos.length === 0) {
    return (
      <EmptyState icon={ImagePlus} message="No before & after photos uploaded yet" />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {photos.map((p) => (
        <div
          key={p.id}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden group"
        >
          <div className="grid grid-cols-2 h-44">
            <div className="relative overflow-hidden border-r border-slate-700/50">
              <span className="absolute top-2 left-2 z-10 bg-slate-900/80 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                Before
              </span>
              {p.beforeURL ? (
                <img
                  src={p.beforeURL}
                  alt="Before"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-slate-700/50 flex items-center justify-center">
                  <ImagePlus className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>
            <div className="relative overflow-hidden">
              <span className="absolute top-2 right-2 z-10 bg-green-500/80 text-white text-xs px-2 py-0.5 rounded-full">
                After
              </span>
              {p.afterURL ? (
                <img
                  src={p.afterURL}
                  alt="After"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-slate-700/50 flex items-center justify-center">
                  <ImagePlus className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-white text-sm">{p.memberName || "Member"}</p>
              {p.date && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(p.date?.seconds * 1000 || p.date).toLocaleDateString("en-IN")}
                </span>
              )}
            </div>
            {p.notes && (
              <p className="text-slate-400 text-xs line-clamp-2">{p.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Plans ───────────────────────────────────────────────────────────────
function PlansTab({ plans, loading }) {
  if (loading) return <TabLoader />;

  if (plans.length === 0) {
    return (
      <EmptyState icon={ClipboardList} message="No workout plans created by this trainer yet" />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="bg-slate-800/50 border border-slate-700/50 hover:border-teal-500/30 rounded-2xl p-5 transition-all group cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-green-500/20 border border-teal-500/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-teal-400" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
          </div>
          <h3 className="font-bold text-white mb-1">{plan.name}</h3>
          {plan.description && (
            <p className="text-slate-400 text-sm line-clamp-2 mb-3">{plan.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {plan.duration && (
              <span className="text-xs px-2 py-0.5 bg-teal-500/15 text-teal-400 rounded-full border border-teal-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {plan.duration} weeks
              </span>
            )}
            {plan.memberCount !== undefined && (
              <span className="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-300 rounded-full border border-slate-600/50 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {plan.memberCount} members
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TabLoader() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3">
      <div className="w-14 h-14 rounded-full bg-slate-800/60 flex items-center justify-center">
        <Icon className="w-7 h-7 text-slate-600" />
      </div>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrainerDetail() {
  const { trainerId } = useParams();
  const navigate = useNavigate();
  const { gymId } = useAuth();

  const [trainer, setTrainer] = useState(null);
  const [members, setMembers] = useState([]);
  const [beforeAfter, setBeforeAfter] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);

  // Load trainer
  useEffect(() => {
    if (!gymId || !trainerId) return;
    (async () => {
      setLoadingMain(true);
      try {
        const data = await getTrainer(gymId, trainerId);
        if (!data) {
          toast.error("Trainer not found");
          navigate("/owner/trainers");
          return;
        }
        setTrainer(data);
      } catch {
        toast.error("Failed to load trainer");
      } finally {
        setLoadingMain(false);
      }
    })();
  }, [gymId, trainerId, navigate]);

  // Load tab data on tab change
  useEffect(() => {
    if (!gymId || !trainerId || activeTab === "profile") return;
    (async () => {
      setLoadingTab(true);
      try {
        if ((activeTab === "members" || activeTab === "commission") && members.length === 0) {
          const data = await getTrainerMembers(gymId, trainerId);
          setMembers(data);
        } else if (activeTab === "beforeafter" && beforeAfter.length === 0) {
          const data = await getTrainerBeforeAfter(gymId, trainerId);
          setBeforeAfter(data);
        } else if (activeTab === "plans" && plans.length === 0) {
          const data = await getTrainerPlans(gymId, trainerId);
          setPlans(data);
        }
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoadingTab(false);
      }
    })();
  }, [activeTab, gymId, trainerId]);

  if (loadingMain) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!trainer) return null;

  const initials = trainer.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleWhatsApp = () => {
    if (trainer.phone) {
      const num = trainer.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${num}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="fixed top-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <Link
          to="/owner/trainers"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Trainers
        </Link>

        {/* ── Header Card ── */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {trainer.photoURL ? (
                <img
                  src={trainer.photoURL}
                  alt={trainer.name}
                  className="w-24 h-24 rounded-2xl object-cover shadow-xl ring-2 ring-teal-500/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-teal-500/25">
                  {initials || <UserCircle className="w-12 h-12" />}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center shadow-lg">
                <Dumbbell className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white mb-1">{trainer.name}</h1>
              {/* Specializations */}
              {trainer.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {trainer.specializations.map((s) => (
                    <span
                      key={s}
                      className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                        SPEC_COLORS[s] || "bg-slate-700 text-slate-300 border-slate-600"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Users className="w-4 h-4 text-teal-400" />
                  <span className="text-white font-medium">{trainer.memberCount || 0}</span> Members
                </span>
                {trainer.experience && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Briefcase className="w-4 h-4 text-green-400" />
                    <span className="text-white font-medium">{trainer.experience}</span> yrs experience
                  </span>
                )}
                {trainer.rating > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-medium">{trainer.rating.toFixed(1)}</span> rating
                  </span>
                )}
              </div>
            </div>

            {/* WhatsApp button */}
            <button
              onClick={handleWhatsApp}
              disabled={!trainer.phone}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-gradient-to-r from-teal-500/20 to-green-500/20 text-teal-400 border border-teal-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div>
          {activeTab === "profile" && <ProfileTab trainer={trainer} />}
          {activeTab === "commission" && (
            <CommissionTab
              trainer={trainer}
              members={members}
              loading={loadingTab}
            />
          )}
          {activeTab === "members" && (
            <MembersTab members={members} loading={loadingTab} />
          )}
          {activeTab === "beforeafter" && (
            <BeforeAfterTab photos={beforeAfter} loading={loadingTab} />
          )}
          {activeTab === "plans" && (
            <PlansTab plans={plans} loading={loadingTab} />
          )}
        </div>
      </div>
    </div>
  );
}
