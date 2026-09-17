import React from 'react';
import {
  Eye,
  CalendarPlus,
  IndianRupee,
  CheckCircle,
  Edit,
  UserX,
  RotateCcw,
  Trash2
} from 'lucide-react';
import {
  getDaysRemaining,
  isLeft,
  isEnded
} from './memberUtils';

/**
 * MemberActionButtons
 * Single Source of Truth for all action buttons across Table and Grid views,
 * designed directly after studypoint's student actions.
 */
export default function MemberActionButtons({
  member,
  variant = 'table',
  onView,
  onExtend,
  onCollect,
  onGymRenew,
  onEdit,
  onLeft,
  onDelete
}) {
  const isLeftMember = isLeft(member);
  const isFullyEnded = isEnded(member);

  // Check validity & dues
  const remainingDays = getDaysRemaining(member?.expiryDate);
  const isExpired = remainingDays !== null && remainingDays < 0;
  const due = Number(member?.dueAmount || 0);
  const hasPaid = !!member?.lastPaymentDate || Number(member?.paidAmount || 0) > 0;

  // Exact definition matching studypoint:
  // Paid = not expired, no remaining dues, and has payment recorded
  const isPaid = !isLeftMember && !isFullyEnded && !isExpired && due <= 0 && hasPaid;
  const hasPartialDue = !isLeftMember && !isFullyEnded && due > 0;

  const isGrid = variant === 'grid';
  const btnStyle = isGrid
    ? 'px-2.5 py-1 text-xs rounded-lg font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer shrink-0 whitespace-nowrap'
    : 'px-2 py-1 text-[11px] rounded-lg font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer shrink-0 whitespace-nowrap';

  const handleOpenFeeModal = () => {
    if (onCollect) {
      onCollect(member);
    } else if (onGymRenew) {
      onGymRenew(member);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1 whitespace-nowrap ${isGrid ? 'w-full justify-between flex-wrap pt-2' : 'justify-end'}`}
      style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
    >
      {/* 1. Profile */}
      {onView && (
        <button
          type="button"
          onClick={() => onView(member)}
          className={`bg-slate-100 hover:bg-slate-200 text-slate-700 ${btnStyle}`}
          title="View Member Profile & Fee History"
        >
          <Eye size={12} className="text-slate-600" />
          <span>Profile</span>
        </button>
      )}

      {/* 2. Extend Validity (Active members only) */}
      {!isLeftMember && !isFullyEnded && onExtend && (
        <button
          type="button"
          onClick={() => onExtend(member)}
          className={`bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 ${btnStyle}`}
          title="Extend Membership Validity (+दिन आगे बढ़ाएं)"
        >
          <CalendarPlus size={12} className="text-emerald-600" />
          <span>Extend</span>
        </button>
      )}

      {/* 3. Fee Button (Paid / Due / Fee) */}
      {!isLeftMember && !isFullyEnded && (
        isPaid ? (
          <button
            type="button"
            disabled
            className={`bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-85 ${btnStyle}`}
            title="Fee already paid and active (फीस जमा है)"
          >
            <CheckCircle size={12} className="text-emerald-600" />
            <span>Paid</span>
          </button>
        ) : hasPartialDue ? (
          <button
            type="button"
            onClick={handleOpenFeeModal}
            className={`bg-amber-600 hover:bg-amber-700 text-white ${btnStyle}`}
            title={`Collect Remaining Due Fee (बाकी ₹${due} जमा करें)`}
          >
            <IndianRupee size={12} />
            <span>Due ₹{due.toLocaleString('en-IN')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenFeeModal}
            className={`bg-emerald-600 hover:bg-emerald-700 text-white ${btnStyle}`}
            title="Collect Fee / Record Payment (फीस जमा करें)"
          >
            <IndianRupee size={12} />
            <span>Fee</span>
          </button>
        )
      )}

      {!isGrid && <div className="h-3.5 w-px bg-slate-200 mx-0.5 shrink-0" />}

      {/* 4. Edit */}
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(member)}
          className={`bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 ${btnStyle}`}
          title="Edit Member Information"
        >
          <Edit size={12} className="text-indigo-600" />
          <span>Edit</span>
        </button>
      )}

      {/* 5. Left or Rejoin */}
      {isLeftMember || isFullyEnded ? (
        (onGymRenew || onCollect) && (
          <button
            type="button"
            onClick={() => (onGymRenew ? onGymRenew(member) : onCollect(member))}
            className={`bg-emerald-600 hover:bg-emerald-700 text-white ${btnStyle}`}
            title="Rejoin Member & Renew Membership (वापसी पर दोबारा शुरू करें)"
          >
            <RotateCcw size={12} />
            <span>Rejoin</span>
          </button>
        )
      ) : (
        onLeft && (
          <button
            type="button"
            onClick={() => onLeft(member)}
            className={`bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 ${btnStyle}`}
            title="Mark Member as Left (छोड़ दिया)"
          >
            <UserX size={12} className="text-rose-600" />
            <span>Left</span>
          </button>
        )
      )}

      {/* 6. Delete */}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(member)}
          className="p-1 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-bold inline-flex items-center justify-center cursor-pointer transition shrink-0"
          title="Delete Member Record"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
