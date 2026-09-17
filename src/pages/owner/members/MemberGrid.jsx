import React from 'react';
import {
  Sun,
  Sunrise,
  Sunset,
  Clock,
  Sparkles,
  RotateCcw,
  IndianRupee,
  CalendarPlus,
  LogOut,
  UserX,
  PlusCircle,
  Receipt,
  Eye,
  Edit,
  Trash2,
  Dumbbell
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
  getPtStatus
} from './memberUtils';

export default function MemberGrid({
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
    onReactivate
  } = actionHandlers;

  if (members.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-400">
        <p className="text-sm font-semibold text-slate-500">No members found in this view.</p>
        <p className="text-xs text-slate-400 mt-1">Try changing your search query or selected filter tab.</p>
      </div>
    );
  }

  const getSlotIcon = (slotStr = '') => {
    const s = String(slotStr).toLowerCase();
    if (s.includes('morn')) return <Sunrise className="w-3 h-3 text-amber-500" />;
    if (s.includes('even') || s.includes('night')) return <Sunset className="w-3 h-3 text-indigo-500" />;
    if (s.includes('noon') || s.includes('after')) return <Sun className="w-3 h-3 text-orange-500" />;
    return <Clock className="w-3 h-3 text-teal-500" />;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {members.map((m) => {
        const name = getName(m);
        const phone = getPhone(m);
        const slot = getSlot(m);
        const isMemberLeft = isLeft(m);

        // ─── 1. GYM MEMBERSHIP ───────────────────────────────────────────────
        const gymDays = getDaysRemaining(m.expiryDate);
        const gymDue = Number(m.dueAmount || 0);
        const gymStatus = getGymStatus(m);
        const gymPlanPrice = Number(m.planPrice || m.totalAmount || 2500);
        const gymPlanName = m.planName || 'Standard Gym Plan';

        // ─── 2. PT MEMBERSHIP ────────────────────────────────────────────────
        const memberHasPt = hasPt(m);
        const isPtEnded = m.ptStatus === 'ended';
        const ptEndDate = m.ptEndDate || m.ptExpiryDate || (m.isPt ? m.expiryDate : null);
        const ptDays = ptEndDate ? getDaysRemaining(ptEndDate) : null;
        const trainerName = m.trainerName && !['Unassigned', 'General Floor Trainer (Included)', 'No Trainer'].includes(m.trainerName)
          ? m.trainerName
          : null;
        const ptPlanName = m.ptPlanName || (memberHasPt ? '1-on-1 PT' : null);

        return (
          <div
            key={m.id}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between space-y-3"
          >
            {/* Top Identity Header */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Avatar member={m} size="md" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1">
                      {name}
                      {isMemberLeft && (
                        <span className="px-1 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-bold">
                          LEFT
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{phone || 'No phone'}</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100 shrink-0">
                  {getSlotIcon(slot)}
                  <span className="truncate max-w-[90px]">{slot}</span>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  BOX 1: GYM MEMBERSHIP
              ───────────────────────────────────────────────────────────── */}
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/25 border border-emerald-100/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 font-bold text-slate-900 truncate">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{gymPlanName}</span>
                  </div>
                  <span className="font-extrabold text-emerald-700 shrink-0">
                    ₹{gymPlanPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Valid: <strong className="text-slate-700">{formatDate(m.expiryDate)}</strong>
                  </span>
                  {isMemberLeft ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      Left
                    </span>
                  ) : gymDue > 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-red-100 text-red-800">
                      Due: ₹{gymDue.toLocaleString('en-IN')}
                    </span>
                  ) : gymDays !== null && gymDays < 0 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">
                      Expired
                    </span>
                  ) : gymDays !== null && gymDays <= 3 ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900">
                      {gymDays === 0 ? 'Today!' : `${gymDays}d left`}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {gymDays !== null ? `${gymDays}d left` : 'Paid'}
                    </span>
                  )}
                </div>

                {/* Gym Action Buttons */}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-emerald-100/60">
                  {isMemberLeft ? (
                    <button
                      type="button"
                      onClick={() => (onReactivate ? onReactivate(m) : onGymRenew(m))}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 transition"
                    >
                      <RotateCcw size={10} /> Rejoin Gym
                    </button>
                  ) : (
                    <>
                      {gymDue > 0 && (
                        <button
                          type="button"
                          onClick={() => onCollect(m)}
                          className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] inline-flex items-center gap-1 transition"
                        >
                          <IndianRupee size={10} /> Collect Due
                        </button>
                      )}
                      {(gymStatus === 'ending_soon' || gymStatus === 'expired' || gymStatus === 'due' || (gymDays !== null && gymDays <= 3)) && (
                        <button
                          type="button"
                          onClick={() => onGymRenew(m)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 transition"
                        >
                          <RotateCcw size={10} /> Renew Gym
                        </button>
                      )}
                      {gymDays !== null && gymDays > 3 && (
                        <button
                          type="button"
                          onClick={() => onExtend(m)}
                          className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] inline-flex items-center gap-1 transition"
                        >
                          <CalendarPlus size={10} /> Extend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onLeft(m)}
                        className="px-1.5 py-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 text-[10px] font-bold inline-flex items-center gap-1 transition"
                        title="Mark as Left Gym"
                      >
                        <LogOut size={10} /> Left
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  BOX 2: PERSONAL TRAINING (PT)
              ───────────────────────────────────────────────────────────── */}
              <div className="mt-2 p-2.5 rounded-xl bg-purple-50/25 border border-purple-100/80 space-y-1.5">
                {memberHasPt && !isPtEnded ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 font-extrabold text-purple-900 truncate">
                        <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">{trainerName || 'Coach Assigned'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">
                        {ptPlanName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        PT End: <strong className="text-slate-700">{formatDate(ptEndDate)}</strong>
                      </span>
                      {ptDays !== null && ptDays < 0 ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          PT Expired
                        </span>
                      ) : ptDays !== null && ptDays <= 3 ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900">
                          {ptDays === 0 ? 'Today!' : `${ptDays}d left`}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800">
                          PT Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-1 border-t border-purple-100/60">
                      <button
                        type="button"
                        onClick={() => onPtRenew(m)}
                        className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] inline-flex items-center gap-1 transition"
                      >
                        <RotateCcw size={10} /> Renew PT
                      </button>
                      <button
                        type="button"
                        onClick={() => onEnd(m)}
                        className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] inline-flex items-center gap-1 transition"
                        title="End PT (Coach released, Gym active)"
                      >
                        <UserX size={10} /> End PT
                      </button>
                    </div>
                  </>
                ) : isPtEnded ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded">
                        PT Ended
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5">Floor access active</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPtRenew(m)}
                      className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[10px] inline-flex items-center gap-1 transition"
                    >
                      <PlusCircle size={10} /> Re-enroll
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        No PT (Floor)
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5">General workout only</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPtRenew(m)}
                      className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] inline-flex items-center gap-1 transition"
                    >
                      <PlusCircle size={10} /> + Add PT
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => onReceipt && onReceipt(m)}
                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] inline-flex items-center gap-1 transition"
                title="View & Print Receipt"
              >
                <Receipt size={12} /> Receipt
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onView(m)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                  title="View Profile"
                >
                  <Eye size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(m)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                  title="Edit"
                >
                  <Edit size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(m)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
