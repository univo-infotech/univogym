import React from 'react';
import {
  Sunrise,
  Sunset,
  Sun,
  Clock,
  UserCheck,
  RotateCcw,
  IndianRupee,
  CalendarPlus,
  LogOut,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Eye,
  Edit,
  Trash2,
  UserX,
  PlusCircle,
  Dumbbell,
  Phone,
  Layers
} from 'lucide-react';
import { Avatar } from './MemberStatusBadge';
import {
  getName,
  getPhone,
  getSlot,
  formatDate,
  getDaysRemaining,
  isLeft,
  hasPt,
  getGymStatus,
  getPtStatus,
  isPartial,
  toIndianDate
} from './memberUtils';

export default function MemberTable({
  members = [],
  actionHandlers = {}
}) {
  const {
    onView,
    onExtend,
    onGymRenew,
    onPtRenew,
    onCollect,
    onEdit,
    onLeft,
    onEnd,
    onReceipt,
    onDelete,
    onReactivate,
    onAddService
  } = actionHandlers;

  const getSlotIcon = (slotStr = '') => {
    const s = String(slotStr).toLowerCase();
    if (s.includes('morn')) return <Sunrise className="w-3 h-3 text-amber-500" />;
    if (s.includes('even') || s.includes('night')) return <Sunset className="w-3 h-3 text-indigo-500" />;
    if (s.includes('noon') || s.includes('after')) return <Sun className="w-3 h-3 text-orange-500" />;
    return <Clock className="w-3 h-3 text-teal-500" />;
  };

  if (members.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-400">
        <p className="text-sm font-semibold text-slate-500">No members found in this view.</p>
        <p className="text-xs text-slate-400 mt-1">Try changing your search query or selected filter tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* MOBILE RESPONSIVE CARDS (Screens < 768px) */}
      <div className="block md:hidden space-y-3.5">
        {members.map((m, idx) => {
          const name = getName(m);
          const phone = getPhone(m);
          const slot = getSlot(m);
          const isMemberLeft = isLeft(m);
          const gymDays = getDaysRemaining(m.expiryDate);
          const gymDue = Number(m.dueAmount || 0);
          const isPartialMember = isPartial(m);
          const gymStatus = getGymStatus(m);
          const gymPlanPrice = Number(m.planPrice || m.totalAmount || 2500);
          const gymPlanName = m.planName || 'Standard Gym Plan';

          const memberHasPt = hasPt(m);
          const isPtEnded = m.ptStatus === 'ended';
          const ptEndDate = m.ptEndDate || m.ptExpiryDate || (m.isPt ? m.expiryDate : null);
          const ptDays = ptEndDate ? getDaysRemaining(ptEndDate) : null;
          const ptStatus = getPtStatus(m);
          const trainerName = m.trainerName && !['Unassigned', 'General Floor Trainer (Included)', 'No Trainer'].includes(m.trainerName)
            ? m.trainerName
            : null;
          const ptPlanName = m.ptPlanName || (memberHasPt ? '1-on-1 PT' : null);

          return (
            <div
              key={m.id || idx}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3"
            >
              {/* Top Identity Header */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar member={m} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                        {name}
                      </h4>
                      {isMemberLeft && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-extrabold shrink-0">
                          LEFT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap mt-0.5">
                      {phone || 'No phone'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                    {getSlotIcon(slot)}
                    <span>{slot}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-slate-100 text-slate-700 border border-slate-200">
                    🖐️ #{m.biometricId || m.machineId || `10${idx + 1}`}
                  </span>
                </div>
              </div>

              {/* Box 1: Gym Membership */}
              <div className="p-3 rounded-xl bg-emerald-50/25 border border-emerald-100/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{gymPlanName}</span>
                  </div>
                  <span className="font-extrabold text-emerald-700">
                    ₹{gymPlanPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Valid: <strong className="text-slate-700">{formatDate(m.expiryDate)}</strong>
                  </span>
                  {isMemberLeft ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Left
                    </span>
                  ) : gymDue > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">
                      Due: ₹{gymDue.toLocaleString('en-IN')}
                    </span>
                  ) : gymDays !== null && gymDays < 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                      Expired
                    </span>
                  ) : gymDays !== null && gymDays <= 3 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                      {gymDays === 0 ? 'Expires Today!' : `${gymDays}d left`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {gymDays !== null ? `${gymDays}d left` : 'Active'}
                    </span>
                  )}
                </div>

                {/* Quick Gym Actions Buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-emerald-100/60 flex-wrap">
                  {isMemberLeft ? (
                    <button
                      type="button"
                      onClick={() => (onReactivate ? onReactivate(m) : onGymRenew(m))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-xs"
                    >
                      <RotateCcw size={11} /> Rejoin Gym
                    </button>
                  ) : (
                    <>
                      {(gymStatus === 'ending_soon' || gymStatus === 'expired' || gymStatus === 'due' || (gymDays !== null && gymDays <= 3)) && (
                        <button
                          type="button"
                          onClick={() => onGymRenew(m)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-xs"
                        >
                          <RotateCcw size={11} /> Renew Gym
                        </button>
                      )}
                      {gymDays !== null && gymDays > 3 && (
                        <button
                          type="button"
                          onClick={() => onExtend(m)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1 transition"
                        >
                          <CalendarPlus size={11} /> Extend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onLeft(m)}
                        className="px-2 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 text-xs font-bold inline-flex items-center gap-1 transition"
                      >
                        <LogOut size={11} /> Left
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Box 2: Personal Training (PT) Section */}
              <div className="p-3 rounded-xl bg-purple-50/25 border border-purple-100/80 space-y-2">
                {memberHasPt && !isPtEnded ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-extrabold text-purple-900">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Coach: {trainerName || 'Assigned Coach'}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {ptPlanName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        PT End: <strong className="text-slate-700">{formatDate(ptEndDate)}</strong>
                      </span>
                      {ptDays !== null && ptDays < 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          PT Expired
                        </span>
                      ) : ptDays !== null && ptDays <= 3 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                          {ptDays === 0 ? 'Expires Today!' : `${ptDays}d left`}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                          PT Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-purple-100/60 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onReceipt && onReceipt(m, 'pt')}
                        className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 font-bold text-xs inline-flex items-center gap-1 transition"
                      >
                        <Receipt size={11} className="text-purple-600" /> PT Bill
                      </button>
                      {(ptStatus === 'ending_soon' || ptStatus === 'expired' || ptStatus === 'due' || (ptDays !== null && ptDays <= 3)) && (
                        <button
                          type="button"
                          onClick={() => onPtRenew(m)}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-xs"
                        >
                          <RotateCcw size={11} /> Renew PT
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEnd(m)}
                        className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs inline-flex items-center gap-1 transition"
                      >
                        <UserX size={11} /> End PT
                      </button>
                    </div>
                  </>
                ) : isPtEnded ? (
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                        PT Ended
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Floor access active</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPtRenew(m)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs inline-flex items-center gap-1 transition"
                    >
                      <PlusCircle size={11} /> Re-enroll
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">
                        No PT (Floor)
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">General workout floor</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPtRenew(m)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs inline-flex items-center gap-1 transition"
                    >
                      <PlusCircle size={11} /> Add PT
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Actions Row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                {isPartialMember ? (
                  <button
                    type="button"
                    onClick={() => onCollect(m)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs"
                  >
                    <IndianRupee size={13} /> Collect Due (₹{gymDue.toLocaleString('en-IN')})
                  </button>
                ) : gymDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => onCollect(m)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs"
                  >
                    <IndianRupee size={13} /> Collect Fee
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onReceipt && onReceipt(m)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <Receipt size={13} /> Receipt PDF
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onView(m)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                    title="View Profile"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                    title="Edit Member"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                    title="Delete Member"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE (Screens >= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <table className="w-full text-left text-xs text-slate-600">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
          <tr>
            <th className="px-5 py-3.5 w-1/4 min-w-[220px]">MEMBER PROFILE</th>
            <th className="px-5 py-3.5 w-1/4 min-w-[260px] bg-emerald-50/30">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                <span>GYM MEMBERSHIP</span>
              </span>
            </th>
            <th className="px-5 py-3.5 w-1/4 min-w-[260px] bg-purple-50/30">
              <span className="flex items-center gap-1.5 text-purple-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>PERSONAL TRAINING (PT)</span>
              </span>
            </th>
            <th className="px-5 py-3.5 text-right min-w-[150px]">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-500">No members found in this view.</p>
                <p className="text-xs text-slate-400 mt-1">Try changing your search query or selected filter tab.</p>
              </td>
            </tr>
          ) : (
            members.map((m, idx) => {
              const name = getName(m);
              const phone = getPhone(m);
              const slot = getSlot(m);
              const joinDate = formatDate(m.createdAt || m.joiningDate || m.joinDate);
              const isMemberLeft = isLeft(m);

              // --- 1. GYM MEMBERSHIP DETAILS & STATUS ---
              const gymDays = getDaysRemaining(m.expiryDate);
              const gymDue = Number(m.dueAmount || 0);
              const isPartialMember = isPartial(m);
              const gymStatus = getGymStatus(m);
              const gymPlanPrice = Number(m.planPrice || m.totalAmount || 2500);
              const gymPlanName = m.planName || 'Standard Gym Plan';

              // --- 2. PT MEMBERSHIP DETAILS & STATUS ---
              const memberHasPt = hasPt(m);
              const isPtEnded = m.ptStatus === 'ended';
              const ptEndDate = m.ptEndDate || m.ptExpiryDate || (m.isPt ? m.expiryDate : null);
              const ptDays = ptEndDate ? getDaysRemaining(ptEndDate) : null;
              const ptStatus = getPtStatus(m);
              const trainerName = m.trainerName && !['Unassigned', 'General Floor Trainer (Included)', 'No Trainer'].includes(m.trainerName)
                ? m.trainerName
                : null;
              const ptPlanName = m.ptPlanName || (memberHasPt ? '1-on-1 Personal Training' : null);

              return (
                <tr key={m.id} className="hover:bg-slate-50/70 transition items-start">
                  {/* =========================================================
                      COLUMN 1: MEMBER PROFILE (Identity, Shift, Joined)
                  ========================================================= */}
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-3.5">
                      <Avatar member={m} size="lg" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-extrabold text-slate-900 text-sm leading-tight">
                            {name}
                          </p>
                          {isMemberLeft && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                              LEFT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>{phone || 'No phone'}</span>
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                            {getSlotIcon(slot)}
                            <span className="truncate max-w-[130px]">{slot}</span>
                          </div>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-slate-100 text-slate-700 border border-slate-200" title="Machine Biometric ID">
                            🖐️ #{m.biometricId || m.machineId || `10${idx + 1}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Joined: {joinDate}
                        </p>
                        {((m.selectedServices || m.services || []).length > 0) && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {(m.selectedServices || m.services || []).slice(0, 2).map((s, si) => (
                              <span key={si} className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200" title={`${s.name} (${s.months || 1}M)`}>
                                🛎️ {s.name} ({s.months || 1}M)
                              </span>
                            ))}
                            {(m.selectedServices || m.services || []).length > 2 && (
                              <span className="text-[9.5px] font-bold text-teal-700">
                                +{(m.selectedServices || m.services || []).length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* =========================================================
                      COLUMN 2: GYM MEMBERSHIP (Plan, Validity, Status & Renew/Left)
                  ========================================================= */}
                  <td className="px-5 py-4 align-top bg-emerald-50/15">
                    <div className="space-y-2">
                      {/* Plan Name & Price */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {gymPlanName}
                          </span>
                          <span className="text-[11px] font-black text-emerald-700">
                            ₹{gymPlanPrice.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Valid: <strong className="text-slate-700">{formatDate(m.expiryDate)}</strong>
                        </p>
                      </div>

                      {/* Gym Status Badge */}
                      <div>
                        {isMemberLeft ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                            Left Gym
                          </span>
                        ) : gymDue > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Remaining: ₹{gymDue.toLocaleString('en-IN')}
                          </span>
                        ) : gymDays !== null && gymDays < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                            Expired ({Math.abs(gymDays)}d ago)
                          </span>
                        ) : gymDays !== null && gymDays <= 3 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            Ending Soon ({gymDays === 0 ? 'Today!' : `${gymDays}d left`})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Gym Paid ({gymDays !== null ? `${gymDays}d left` : 'Active'})
                          </span>
                        )}
                      </div>

                      {/* Dedicated Gym Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-emerald-100">
                        {isMemberLeft ? (
                          <button
                            type="button"
                            onClick={() => (onReactivate ? onReactivate(m) : onGymRenew(m))}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            title="Rejoin Gym & Renew Membership"
                          >
                            <RotateCcw size={11} />
                            <span>Rejoin Gym</span>
                          </button>
                        ) : (
                          <>
                            {/* Show Renew Gym when ending soon, expired, or due */}
                            {(gymStatus === 'ending_soon' || gymStatus === 'expired' || gymStatus === 'due' || (gymDays !== null && gymDays <= 3)) && (
                              <button
                                type="button"
                                onClick={() => onGymRenew(m)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Renew Gym Membership Plan"
                              >
                                <RotateCcw size={11} />
                                <span>Renew Gym</span>
                              </button>
                            )}

                            {/* Extend active validity */}
                            {gymDays !== null && gymDays > 3 && (
                              <button
                                type="button"
                                onClick={() => onExtend(m)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                title="Extend Validity by Days"
                              >
                                <CalendarPlus size={11} className="text-emerald-600" />
                                <span>Extend</span>
                              </button>
                            )}

                            {/* Mark Left Gym */}
                            <button
                              type="button"
                              onClick={() => onLeft(m)}
                              className="px-1.5 py-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              title="Mark Member as Left Gym"
                            >
                              <LogOut size={11} />
                              <span>Left</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* =========================================================
                      COLUMN 3: PERSONAL TRAINING (Coach, Package, Validity & Renew/End)
                  ========================================================= */}
                  <td className="px-5 py-4 align-top bg-purple-50/15">
                    <div className="space-y-2">
                      {memberHasPt && !isPtEnded ? (
                        <>
                          {/* Trainer Name & PT Plan */}
                          <div>
                            <div className="flex items-center gap-1 font-extrabold text-purple-900 text-xs">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span className="truncate">{trainerName || 'Coach Assigned'}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              {ptPlanName}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              PT Valid: <strong className="text-slate-700">{formatDate(ptEndDate)}</strong>
                            </p>
                          </div>

                          {/* PT Status Badge */}
                          <div>
                            {ptDays !== null && ptDays < 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                PT Expired
                              </span>
                            ) : ptDays !== null && ptDays <= 3 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                PT Ending Soon ({ptDays === 0 ? 'Today!' : `${ptDays}d left`})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                                ⭐ PT Active ({ptDays !== null ? `${ptDays}d left` : 'Active'})
                              </span>
                            )}
                          </div>

                          {/* Dedicated PT Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-purple-100">
                            {/* Dedicated PT Bill Receipt */}
                            <button
                              type="button"
                              onClick={() => onReceipt && onReceipt(m, 'pt')}
                              className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="View Dedicated PT Fee Receipt & WhatsApp"
                            >
                              <Receipt size={11} className="text-purple-600" />
                              <span>PT Bill</span>
                            </button>

                            {/* Renew PT (Only shown when ending soon, expired, or due) */}
                            {(ptStatus === 'ending_soon' || ptStatus === 'expired' || ptStatus === 'due' || (ptDays !== null && ptDays <= 3)) && (
                              <button
                                type="button"
                                onClick={() => onPtRenew(m)}
                                className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Renew Personal Training Package"
                              >
                                <RotateCcw size={11} />
                                <span>Renew PT</span>
                              </button>
                            )}

                            {/* End PT (releases trainer while gym stays active) */}
                            <button
                              type="button"
                              onClick={() => onEnd(m)}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="End PT Package (Coach freed up, Member stays Active in Gym)"
                            >
                              <UserX size={11} className="text-rose-600" />
                              <span>End PT</span>
                            </button>
                          </div>
                        </>
                      ) : isPtEnded ? (
                        <>
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                              PT Ended (Floor Member)
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Previous: {trainerName || m.previousPtPlanName || 'Coach'}
                            </p>
                          </div>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => onPtRenew(m)}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="Re-enroll in Personal Training"
                            >
                              <PlusCircle size={11} className="text-purple-600" />
                              <span>Re-enroll PT</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Floor Only (No PT)
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">
                              General gym access without personal coach
                            </p>
                          </div>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => onPtRenew(m)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="Assign Coach & Add Personal Training Package"
                            >
                              <PlusCircle size={11} className="text-indigo-600" />
                              <span>Add PT</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>

                  {/* =========================================================
                      COLUMN 4: ACTIONS (Receipt, Profile, Edit, Delete)
                  ========================================================= */}
                  <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {/* Billing Action: Collect (Start/Unpaid), Due (Partial), Receipt (Fully Paid) */}
                      {isPartialMember ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onCollect(m)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                            title={`Collect Remaining Fee: ₹${gymDue.toLocaleString('en-IN')}`}
                          >
                            <IndianRupee size={13} />
                            <span className="hidden sm:inline">Remaining</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onReceipt && onReceipt(m)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs inline-flex items-center transition shadow-xs cursor-pointer"
                            title="View Official Fee Receipt & WhatsApp"
                          >
                            <Receipt size={13} className="text-indigo-600" />
                          </button>
                        </div>
                      ) : gymDue > 0 ? (
                        <button
                          type="button"
                          onClick={() => onCollect(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                          title="Collect Member Fee"
                        >
                          <IndianRupee size={13} />
                          <span className="hidden sm:inline">Collect</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReceipt && onReceipt(m)}
                          className="px-2 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                          title="View Official Fee Receipt & WhatsApp"
                        >
                          <Receipt size={13} className="text-indigo-600" />
                          <span className="hidden sm:inline">Receipt</span>
                        </button>
                      )}

                      {/* Add Gym Facility / Service Add-on */}
                      <button
                        type="button"
                        onClick={() => onAddService && onAddService(m)}
                        className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs inline-flex items-center transition shadow-2xs cursor-pointer"
                        title="Add Gym Service / Facility (Locker, Steam, Diet)"
                      >
                        <Layers size={14} className="text-teal-600" />
                      </button>

                      {/* Profile 360 View */}
                      <button
                        type="button"
                        onClick={() => onView(m)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center transition cursor-pointer"
                        title="View Full Member Profile"
                      >
                        <Eye size={14} className="text-slate-600" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => onEdit(m)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center transition cursor-pointer"
                        title="Edit Member Information"
                      >
                        <Edit size={14} className="text-slate-600" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDelete(m)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                        title="Delete Member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);
}
