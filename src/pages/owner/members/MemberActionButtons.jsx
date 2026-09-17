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

  const gymNeedsRenewal = ['ending_soon', 'expired', 'due'].includes(gStatus);
  const ptNeedsRenewal = ['ending_soon', 'expired', 'due', 'ended'].includes(pStatus);
  const isLeftMember = isLeft(member);
  const isFullyEnded = isEnded(member);

  const isGrid = variant === 'grid';
  const btnBase = isGrid ? 'px-2.5 py-1 text-xs' : 'px-2 py-1 text-xs';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${isGrid ? 'w-full justify-between' : 'justify-end'}`}>
      {/* 1. Profile / View */}
      {onView && (
        <button
          onClick={() => onView(member)}
          className={`inline-flex items-center gap-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 transition shadow-xs ${btnBase}`}
          title="View Member Profile"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Profile</span>
        </button>
      )}

      {/* 2. Extend Validity */}
      {onExtend && !isLeftMember && !isFullyEnded && (
        <button
          onClick={() => onExtend(member)}
          className={`inline-flex items-center gap-1 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-700 font-bold border border-emerald-200 transition shadow-xs ${btnBase}`}
          title="Extend membership validity"
        >
          <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
          <span>Extend</span>
        </button>
      )}

      {/* 3. Fee Pill / Collect Button */}
      {(() => {
        if (isLeftMember || isFullyEnded) return null;

        // Needs renewal or has due balance -> Green "Fee" button (or opens CollectFee modal)
        if (due > 0 || gymNeedsRenewal || ptNeedsRenewal || !hasPaidAtLeastOnce) {
          return (
            <button
              onClick={() => {
                if (ptNeedsRenewal && !gymNeedsRenewal && onPtRenew) {
                  onPtRenew(member);
                } else if (onGymRenew) {
                  onGymRenew(member);
                } else if (onCollect) {
                  onCollect(member);
                }
              }}
              className={`inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs ${btnBase}`}
              title={due > 0 ? `Collect Due Balance: ₹${due}` : 'Collect Fee & Renew'}
            >
              <IndianRupee className="w-3 h-3 text-emerald-100" />
              <span>Fee</span>
            </button>
          );
        }

        // Fully Paid -> Clean subtle badge
        if (isFullyPaid) {
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-lg bg-slate-50 text-slate-500 font-bold border border-slate-200 cursor-default select-none ${btnBase}`}
              title="Membership Fee Fully Paid"
            >
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>Paid</span>
            </span>
          );
        }

        return null;
      })()}

      {/* 4. Edit */}
      {onEdit && (
        <button
          onClick={() => onEdit(member)}
          className={`inline-flex items-center gap-1 rounded-lg bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition shadow-xs ${btnBase}`}
          title="Edit Member Details"
        >
          <Edit className="w-3.5 h-3.5 text-indigo-500" />
          <span>Edit</span>
        </button>
      )}

      {/* 5. Left / Rejoin */}
      {isLeftMember ? (
        onGymRenew && (
          <button
            onClick={() => onGymRenew(member)}
            className={`inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs ${btnBase}`}
            title="Rejoin & Renew Membership"
          >
            <RotateCcw className="w-3 h-3 text-white" />
            <span>Rejoin</span>
          </button>
        )
      ) : isFullyEnded ? (
        onGymRenew && (
          <button
            onClick={() => onGymRenew(member)}
            className={`inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs ${btnBase}`}
            title="Rejoin & Renew Membership"
          >
            <RotateCcw className="w-3 h-3 text-white" />
            <span>Rejoin</span>
          </button>
        )
      ) : (
        onLeft && (
          <button
            onClick={() => onLeft(member)}
            className={`inline-flex items-center gap-1 rounded-lg bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition shadow-xs ${btnBase}`}
            title="Mark member as left"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Left</span>
          </button>
        )
      )}

      {/* 6. Delete */}
      {onDelete && (
        <button
          onClick={() => onDelete(member)}
          className={`inline-flex items-center justify-center rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition shadow-xs ${isGrid ? 'p-1.5' : 'p-1'}`}
          title="Delete Member"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
