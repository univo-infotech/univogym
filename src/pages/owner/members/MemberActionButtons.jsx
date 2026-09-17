import React from 'react';
import {
  Eye,
  CalendarPlus,
  RotateCcw,
  Sparkles,
  IndianRupee,
  CheckCircle,
  Edit,
  LogOut,
  UserX,
  Trash2
} from 'lucide-react';
import {
  getGymStatus,
  getPtStatus,
  getMembershipDetails,
  hasPt,
  isLeft,
  isEnded
} from './memberUtils';

/**
 * MemberActionButtons
 * Single Source of Truth for all action buttons across Table and Grid views.
 */
export default function MemberActionButtons({
  member,
  variant = 'table',
  onView,
  onExtend,
  onGymRenew,
  onPtRenew,
  onCollect,
  onEdit,
  onLeft,
  onEnd,
  onAddPt,
  onRestartPt,
  onReturn,
  onDelete
}) {
  const gStatus = getGymStatus(member);
  const pStatus = getPtStatus(member);
  const due = Number(member.dueAmount ?? (member.lastPaymentDate ? 0 : (member.planPrice || 0)));
  const hasPaidAtLeastOnce = !!member.lastPaymentDate;
  const isFullyPaid = hasPaidAtLeastOnce && due <= 0;
  const isPartialDue = hasPaidAtLeastOnce && due > 0;

  const gymNeedsRenewal = ['ending_soon', 'expired', 'due'].includes(gStatus);
  const ptNeedsRenewal = ['ending_soon', 'expired', 'due', 'ended'].includes(pStatus);
  const memberHasPt = hasPt(member);
  const isLeftMember = isLeft(member);
  const isFullyEnded = isEnded(member);
  const membershipDetails = getMembershipDetails(member);

  const isGrid = variant === 'grid';
  const btnBase = isGrid ? 'px-2.5 py-1 text-xs' : 'px-2 py-1 text-xs';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${isGrid ? 'w-full justify-between' : 'justify-end'}`}>
      {/* 1. View Button */}
      {onView && (
        <button
          onClick={() => onView(member)}
          className={`inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition shadow-xs ${btnBase}`}
          title="View Full Profile"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>View</span>
        </button>
      )}

      {/* 2. Extend Days Button (for active/ending members) */}
      {onExtend && !isLeftMember && !isFullyEnded && (
        <button
          onClick={() => onExtend(member)}
          className={`inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 transition shadow-xs ${btnBase}`}
          title="Extend membership (+10 days / custom)"
        >
          <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
          <span>Extend</span>
        </button>
      )}

      {/* 3. Dynamic Fee / Renew / Collect Status Button */}
      {(() => {
        if (isLeftMember || isFullyEnded) return null;

        // Renewal State: Gym Renew and/or PT Renew
        if (gymNeedsRenewal || ptNeedsRenewal) {
          return (
            <div className="inline-flex items-center gap-1 flex-wrap">
              {/* Gym Renew */}
              {(!memberHasPt || gymNeedsRenewal || (memberHasPt && ptNeedsRenewal)) && onGymRenew && (
                <button
                  onClick={() => onGymRenew(member)}
                  className={`inline-flex items-center gap-1 rounded-lg text-white font-black transition shadow-xs ${btnBase} ${
                    gymNeedsRenewal
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 animate-pulse ring-1 ring-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 opacity-90'
                  }`}
                  title={`Gym (${gStatus}) - Click to Renew Gym Plan`}
                >
                  <RotateCcw className="w-3 h-3 text-white" />
                  <span>Gym Renew</span>
                </button>
              )}

              {/* PT Renew */}
              {memberHasPt && (ptNeedsRenewal || gymNeedsRenewal) && onPtRenew && (
                <button
                  onClick={() => onPtRenew(member)}
                  className={`inline-flex items-center gap-1 rounded-lg text-white font-black transition shadow-xs ${btnBase} ${
                    ptNeedsRenewal
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 animate-pulse ring-1 ring-purple-300'
                      : 'bg-purple-600 hover:bg-purple-700 opacity-90'
                  }`}
                  title={`PT (${pStatus}) - Click to Renew PT Package`}
                >
                  <Sparkles className="w-3 h-3 text-purple-200" />
                  <span>PT Renew</span>
                </button>
              )}
            </div>
          );
        }

        // Partial Due Payment
        if (isPartialDue && onCollect) {
          return (
            <button
              onClick={() => onCollect(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold border border-amber-400 transition shadow-xs ${btnBase}`}
              title={`Collect Due Balance: ₹${due}`}
            >
              <IndianRupee className="w-3 h-3 text-amber-700" />
              <span>{memberHasPt ? 'Due: ' : 'Gym Due: '}₹{due}</span>
            </button>
          );
        }

        // Fully Paid
        if (isFullyPaid) {
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-300 cursor-default opacity-90 select-none ${btnBase}`}
              title="Membership Fee Fully Paid"
            >
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>Paid</span>
            </span>
          );
        }

        // Unpaid / New Member
        if (onCollect) {
          return (
            <button
              onClick={() => onCollect(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition shadow-xs ${btnBase}`}
              title="Collect Fee & Activate"
            >
              <IndianRupee className="w-3 h-3 text-indigo-600" />
              <span>Collect</span>
            </button>
          );
        }

        return null;
      })()}

      {/* 4. Edit Button */}
      {onEdit && (
        <button
          onClick={() => onEdit(member)}
          className={`inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold border border-amber-200 transition shadow-xs ${btnBase}`}
          title="Edit Member Details"
        >
          <Edit className="w-3.5 h-3.5 text-amber-600" />
          <span>Edit</span>
        </button>
      )}

      {/* 5. Lifecycle Actions (Left / Return / End / +PT) */}
      {isLeftMember ? (
        onGymRenew && (
          <button
            onClick={() => onGymRenew(member)}
            className={`inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black transition shadow-xs ${btnBase}`}
            title="Rejoin & Renew - Naya plan chunein aur fee collect karein"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Rejoin & Renew</span>
          </button>
        )
      ) : isFullyEnded ? (
        <div className="inline-flex items-center gap-1 flex-wrap">
          {onGymRenew && (
            <button
              onClick={() => onGymRenew(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black transition shadow-xs ${btnBase}`}
              title="Rejoin & Renew - Nayi membership shuru karein aur fee collect karein"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Rejoin & Renew</span>
            </button>
          )}
          {memberHasPt && onPtRenew && (
            <button
              onClick={() => onPtRenew(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black transition shadow-xs ${btnBase}`}
              title="Renew PT - Naya PT package lein"
            >
              <Sparkles className="w-3 h-3 text-purple-200" />
              <span>Renew PT</span>
            </button>
          )}
        </div>
      ) : member.ptStatus === 'ended' ? (
        /* Note: PT Renew is already rendered in Section 3 above, so only Left is needed here */
        onLeft && (
          <button
            onClick={() => onLeft(member)}
            className={`inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition shadow-xs ${btnBase}`}
            title="Mark gym membership as left"
          >
            <LogOut className="w-3 h-3 text-rose-600" />
            <span>Left</span>
          </button>
        )
      ) : membershipDetails.category === 'both' ? (
        <>
          {onLeft && (
            <button
              onClick={() => onLeft(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition shadow-xs ${btnBase}`}
              title="Mark gym membership as left"
            >
              <LogOut className="w-3 h-3 text-rose-600" />
              <span>Left</span>
            </button>
          )}
          {onEnd && (
            <button
              onClick={() => onEnd(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200 transition shadow-xs ${btnBase}`}
              title="End PT Membership (Keep Gym active)"
            >
              <UserX className="w-3 h-3 text-purple-600" />
              <span>End</span>
            </button>
          )}
        </>
      ) : memberHasPt ? (
        onEnd && (
          <button
            onClick={() => onEnd(member)}
            className={`inline-flex items-center gap-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200 transition shadow-xs ${btnBase}`}
            title="End PT Membership"
          >
            <UserX className="w-3 h-3 text-purple-600" />
            <span>End</span>
          </button>
        )
      ) : (
        <>
          {onAddPt && (
            <button
              onClick={() => onAddPt(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 transition shadow-xs ${btnBase}`}
              title="Add 1-on-1 PT package mid-month"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>+ PT</span>
            </button>
          )}
          {onLeft && (
            <button
              onClick={() => onLeft(member)}
              className={`inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition shadow-xs ${btnBase}`}
              title="Mark gym member as left"
            >
              <LogOut className="w-3 h-3 text-rose-600" />
              <span>Left</span>
            </button>
          )}
        </>
      )}

      {/* 7. Delete Button - Always available */}
      {onDelete && (
        <button
          onClick={() => onDelete(member)}
          className={`inline-flex items-center justify-center rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition shadow-xs ${isGrid ? 'p-1.5' : 'p-1'}`}
          title="Delete Member"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
