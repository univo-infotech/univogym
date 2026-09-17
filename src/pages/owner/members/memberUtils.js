/**
 * memberUtils.js ΓÇö Single Source of Truth for all Member lifecycle, status, and field helpers.
 * Every component in the Members section imports from here. No duplication.
 */

// ΓöÇΓöÇΓöÇ Date Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Convert Firestore Timestamp / ISO string / Date to native JS Date. Returns null if falsy. */
export function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate(); // Firestore Timestamp
  if (val instanceof Date) return val;
  return new Date(val);
}

/** Days from today (positive = future, negative = past). null if no date. */
export function getDaysRemaining(dateVal) {
  const d = toDate(dateVal);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

/** Format date as '15 Sep 2026'. Returns 'ΓÇö' if invalid. */
export function formatDate(val) {
  const d = toDate(val);
  if (!d) return 'ΓÇö';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format seconds as MM:SS for countdown timer. */
export function fmtCountdown(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** Format Indian date string DD/MM/YYYY from Date, Timestamp, or String. */
export function toIndianDate(val) {
  if (!val) return '';
  // 1. Handle Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${String(val.getDate()).padStart(2, '0')}/${String(val.getMonth() + 1).padStart(2, '0')}/${val.getFullYear()}`;
  }
  // 2. Handle Firestore Timestamp or object
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      const d = val.toDate();
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    if (val.seconds) {
      const d = new Date(val.seconds * 1000);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
  }
  // 3. Handle string
  const str = String(val).trim();
  if (!str) return '';
  if (str.includes('/')) return str;
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return str;
}

// ΓöÇΓöÇΓöÇ Field Normalizers (handle inconsistent field names in one place) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Get member display name. */
export function getName(m) {
  return m?.name || m?.fullName || 'Member';
}

/** Get member phone number. */
export function getPhone(m) {
  return m?.phone || '';
}

/** Get workout slot. */
export function getSlot(m) {
  return m?.slot || m?.workoutSlot || m?.preferredTime || 'General Shift';
}

/** Get join date string. */
export function getJoinDate(m) {
  return m?.joiningDate || m?.joinDate || m?.createdAt || '';
}

/** Get Aadhaar number (handles all variant field names). */
export function getAadhaar(m) {
  return m?.aadharNumber || m?.aadharNo || m?.aadhaar || '';
}

// ΓöÇΓöÇΓöÇ PT Detection ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const NON_PT_TRAINERS = ['Unassigned', 'General Floor Trainer (Included)', 'No Trainer', 'Unassigned (General Floor)'];

/** Check if member has/had a PT package. */
export function hasPt(m) {
  if (!m) return false;
  return !!m.isPt || !!m.ptPlanName || !!m.ptEndDate || (
    m.trainerName && !NON_PT_TRAINERS.includes(m.trainerName)
  );
}

/** Check if member's PT is currently active (not ended). */
export function isPtActive(m) {
  return hasPt(m) && m.ptStatus !== 'ended';
}

// ΓöÇΓöÇΓöÇ Status Computation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Get Gym floor membership status.
 * @returns {'active'|'ending_soon'|'expired'|'due'|'left'|'inactive'}
 */
export function getGymStatus(member) {
  if (member.status === 'left') return 'left';
  if (member.active === false && member.status !== 'ended') return 'inactive';
  const diff = getDaysRemaining(member.expiryDate);
  if (diff === null) return 'active';
  if (diff < -2) return 'due';
  if (diff <= 0) return 'expired';
  if (diff <= 3) return 'ending_soon';
  return 'active';
}

/**
 * Get 1-on-1 PT package status.
 * @returns {null|'active'|'ending_soon'|'expired'|'due'|'ended'}
 */
export function getPtStatus(member) {
  if (!hasPt(member)) return null;
  if (member.ptStatus === 'ended') return 'ended';

  const ptDate = member.ptEndDate || member.ptExpiryDate;
  const diff = ptDate
    ? getDaysRemaining(ptDate)
    : (member.isPt && member.expiryDate ? getDaysRemaining(member.expiryDate) : null);

  if (diff === null) return 'active';
  if (diff < -2) return 'due';
  if (diff <= 0) return 'expired';
  if (diff <= 3) return 'ending_soon';
  return 'active';
}

/**
 * Unified composite member status (for tab filtering & KPI counting).
 * Priority: left > ended > due > expired > ending_soon > active.
 */
export function getMemberStatus(member) {
  if (member.status === 'left') return 'left';
  if (member.status === 'ended') return 'ended';

  const gStatus = getGymStatus(member);
  const pStatus = getPtStatus(member);

  if (gStatus === 'due' || pStatus === 'due') return 'due';
  if (gStatus === 'expired' || pStatus === 'expired') return 'expired';
  if (gStatus === 'ending_soon' || pStatus === 'ending_soon') return 'ending_soon';
  if (pStatus === 'ended') return gStatus === 'active' ? 'active' : 'ended';
  if (member.active === false) return 'inactive';
  return 'active';
}

// ΓöÇΓöÇΓöÇ Renewal / Payment Booleans ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Does this member need Gym renewal? (ending_soon, expired, or due) */
export function needsGymRenewal(m) {
  return ['ending_soon', 'expired', 'due'].includes(getGymStatus(m));
}

/** Does this member need PT renewal? (ending_soon, expired, due, or ended) */
export function needsPtRenewal(m) {
  const ps = getPtStatus(m);
  return ['ending_soon', 'expired', 'due', 'ended'].includes(ps);
}

/** Is member fully paid? */
export function isPaid(m) {
  return Number(m?.dueAmount || 0) <= 0 && !!m?.lastPaymentDate;
}

/** Does member have a partial payment due? */
export function isPartial(m) {
  return Number(m?.dueAmount || 0) > 0 && !!m?.lastPaymentDate;
}

/** Is member marked as Left? */
export function isLeft(m) {
  return m?.status === 'left';
}

/** Is member fully ended (both gym and PT)? */
export function isEnded(m) {
  return m?.status === 'ended' || (m?.status === 'pt_ended' && !m?.planName && m?.status !== 'active');
}

/** Is member inactive (left or fully ended)? */
export function isInactive(m) {
  return isLeft(m) || isEnded(m);
}

// ΓöÇΓöÇΓöÇ Days Info (for countdown pills in table/grid) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns { text, cls } for displaying days remaining pill.
 * Handles single gym, dual gym+pt, and all status combinations.
 */
export function getMemberDaysInfo(member) {
  const gStatus = getGymStatus(member);
  const pStatus = getPtStatus(member);

  if (gStatus === 'left') {
    return { text: 'Gym Left', cls: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold' };
  }

  const gymDiff = getDaysRemaining(member.expiryDate);
  const ptDiff = getDaysRemaining(member.ptEndDate || member.ptExpiryDate);

  // Member has both Gym and PT
  if (pStatus !== null && gymDiff !== null) {
    if (pStatus === 'ended') {
      if (gymDiff < -2) return { text: `Gym Due (${Math.abs(gymDiff)}d) ΓÇó PT Ended`, cls: 'bg-red-100 text-red-800 border-red-300 font-extrabold' };
      if (gymDiff <= 0) return { text: `Gym Expired ΓÇó PT Ended`, cls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
      if (gymDiff <= 3) return { text: `Gym Ending Soon (${gymDiff}d) ΓÇó PT Ended`, cls: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' };
      return { text: `Gym Active (${gymDiff}d left) ΓÇó PT Ended`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' };
    }

    if (ptDiff !== null) {
      const gTxt = gymDiff < -2 ? `Gym Due (${Math.abs(gymDiff)}d)` : gymDiff <= 0 ? 'Gym Expired' : `Gym ${gymDiff}d`;
      const pTxt = ptDiff < -2 ? `PT Due (${Math.abs(ptDiff)}d)` : ptDiff <= 0 ? 'PT Expired' : `PT ${ptDiff}d`;

      if (gymDiff < -2 || ptDiff < -2) {
        return { text: `${gTxt} ΓÇó ${pTxt}`, cls: 'bg-red-100 text-red-800 border-red-300 font-extrabold animate-pulse' };
      }
      if (gymDiff <= 0 || ptDiff <= 0) {
        return { text: `${gTxt} ΓÇó ${pTxt}`, cls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
      }
      if (gymDiff <= 3 || ptDiff <= 3) {
        return { text: `Ending Soon: ${gTxt} ΓÇó ${pTxt}`, cls: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse' };
      }
      return { text: `Active: Gym (${gymDiff}d) ΓÇó PT (${ptDiff}d)`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' };
    }
  }

  // Single Gym member
  if (gymDiff !== null) {
    if (gymDiff < -2) return { text: `≡ƒö┤ Overdue (${Math.abs(gymDiff)}d ago)`, cls: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
    if (gymDiff < 0) return { text: `≡ƒƒí Expired (${Math.abs(gymDiff)}d Grace)`, cls: 'bg-amber-50 text-amber-900 border-amber-200 font-bold' };
    if (gymDiff === 0) return { text: 'ΓÜá∩╕Å Ending Today', cls: 'bg-amber-50 text-amber-900 border-amber-200 font-bold' };
    if (gymDiff <= 3) return { text: `ΓÅ│ In ${gymDiff} day${gymDiff > 1 ? 's' : ''}`, cls: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' };
    return { text: `Active (${gymDiff} days left)`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' };
  }

  return { text: 'No Expiry Set', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

/**
 * Direct matching implementation of studypoint's getMembershipRemainingDays
 */
export function getMembershipRemainingDays(membershipEnd) {
  if (!membershipEnd) return { diffDays: 0, isExpired: false, isEndingToday: false, label: 'ΓÇö', color: 'bg-slate-50 text-slate-500 border-slate-200' };
  const end = toDate(membershipEnd);
  if (!end || isNaN(end.getTime())) return { diffDays: 0, isExpired: false, isEndingToday: false, label: 'ΓÇö', color: 'bg-slate-50 text-slate-500 border-slate-200' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(end);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -2) {
    return {
      diffDays,
      isExpired: true,
      isOverdue: true,
      isEndingToday: false,
      label: `≡ƒö┤ Overdue (${Math.abs(diffDays)}d ago)`,
      shortLabel: `${Math.abs(diffDays)}d Overdue`,
      color: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    };
  } else if (diffDays < 0) {
    return {
      diffDays,
      isExpired: true,
      isGrace: true,
      isEndingToday: false,
      label: `≡ƒƒí Expired (${Math.abs(diffDays)}d Grace)`,
      shortLabel: `${Math.abs(diffDays)}d Grace`,
      color: 'bg-amber-50 text-amber-900 border-amber-200 font-bold',
    };
  } else if (diffDays === 0) {
    return {
      diffDays: 0,
      isExpired: false,
      isEndingToday: true,
      label: 'ΓÜá∩╕Å Ending Today',
      shortLabel: 'Today',
      color: 'bg-amber-50 text-amber-900 border-amber-200 font-bold',
    };
  } else if (diffDays <= 3) {
    return {
      diffDays,
      isExpired: false,
      isEndingToday: false,
      isEndingSoon: true,
      label: `ΓÅ│ In ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      shortLabel: `${diffDays}d left`,
      color: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    };
  } else {
    return {
      diffDays,
      isExpired: false,
      isEndingToday: false,
      label: `Active (${diffDays} days left)`,
      shortLabel: `${diffDays}d left`,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    };
  }
}

// ΓöÇΓöÇΓöÇ Membership Category Details ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns { category, badgeText, shortText, badgeCls, tagText }
 * Categories: 'both', 'both_pt_ended', 'pt', 'pt_ended', 'gym'
 */
export function getMembershipDetails(member) {
  const hasP = hasPt(member);
  const gymPlan = member.planName || 'Standard Gym';
  const ptPlan = member.ptPlanName || (hasP ? '1-on-1 PT' : null);

  if (ptPlan && gymPlan) {
    if (member.ptStatus === 'ended') {
      return {
        category: 'both_pt_ended',
        badgeText: '≡ƒÅï∩╕Å Gym Active (PT Ended)',
        shortText: 'Gym Active (PT Ended)',
        badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        tagText: 'Gym Active ΓÇó PT Completed'
      };
    }
    return {
      category: 'both',
      badgeText: '≡ƒÅï∩╕Å Gym + Γ£¿ PT',
      shortText: 'Gym & PT',
      badgeCls: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300',
      tagText: 'Both Gym & PT Plan'
    };
  }
  if (ptPlan) {
    if (member.ptStatus === 'ended') {
      return {
        category: 'pt_ended',
        badgeText: '≡ƒ¢æ PT Ended',
        shortText: 'PT Ended',
        badgeCls: 'bg-purple-50 text-purple-800 border-purple-300',
        tagText: '1-on-1 PT Ended'
      };
    }
    return {
      category: 'pt',
      badgeText: 'Γ£¿ 1-on-1 PT Membership',
      shortText: 'PT Only',
      badgeCls: 'bg-purple-50 text-purple-800 border-purple-300',
      tagText: '1-on-1 PT Plan'
    };
  }
  return {
    category: 'gym',
    badgeText: '≡ƒÅï∩╕Å Gym Membership',
    shortText: 'Gym Only',
    badgeCls: 'bg-blue-50 text-blue-800 border-blue-300',
    tagText: 'Gym Plan'
  };
}

// ΓöÇΓöÇΓöÇ Status Styling Config ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const STATUS_CONFIG = {
  paid:        { label: 'Paid',               dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  active:      { label: 'Active',             dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  ending_soon: { label: 'Ending Soon (Γëñ3d)',  dot: 'bg-amber-500',   cls: 'bg-amber-100 text-amber-900 border border-amber-300' },
  expired:     { label: 'Expired (1-2d)',     dot: 'bg-rose-500',    cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
  due:         { label: 'Renewal Due (2d+)',  dot: 'bg-red-600',     cls: 'bg-red-100 text-red-800 border border-red-300 font-extrabold' },
  overdue:     { label: 'Renewal Due (2d+)',  dot: 'bg-red-600',     cls: 'bg-red-100 text-red-800 border border-red-300 font-extrabold' },
  left:        { label: 'Left',              dot: 'bg-slate-500',   cls: 'bg-slate-100 text-slate-700 border border-slate-300 font-bold' },
  ended:       { label: 'PT Ended',          dot: 'bg-purple-500',  cls: 'bg-purple-100 text-purple-800 border border-purple-300 font-bold' },
  inactive:    { label: 'Inactive',          dot: 'bg-slate-400',   cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
};
