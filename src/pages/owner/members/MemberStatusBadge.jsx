import React from 'react';
import { getGymStatus, getPtStatus, STATUS_CONFIG, getName, getMemberDaysInfo } from './memberUtils';

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function getBadgePill(type, state) {
  let cls = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  let dot = 'bg-emerald-500';
  if (state === 'ending_soon') {
    cls = 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse';
    dot = 'bg-amber-500';
  } else if (state === 'expired') {
    cls = 'bg-rose-50 text-rose-700 border-rose-200';
    dot = 'bg-rose-500';
  } else if (state === 'due') {
    cls = 'bg-red-100 text-red-800 border-red-300 font-extrabold animate-pulse';
    dot = 'bg-red-600';
  }
  const labels = { active: 'Active', ending_soon: 'Ending Soon (≤3d)', expired: 'Expired', due: 'Due' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {type}: {labels[state] || state}
    </span>
  );
}

export function StatusBadge({ status, dueAmount, member }) {
  // Left member
  if (status === 'left' || member?.status === 'left') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        Left
      </span>
    );
  }

  const gStatus = member ? getGymStatus(member) : status;
  const pStatus = member ? getPtStatus(member) : null;

  // PT ended but gym still active → dual badge
  if (member?.ptStatus === 'ended' && member?.status !== 'ended' && member?.status !== 'left') {
    return (
      <div className="flex flex-col gap-1 items-start">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Gym Active
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          PT Ended
        </span>
      </div>
    );
  }

  // Fully ended
  if (status === 'ended' || member?.status === 'ended' || member?.status === 'pt_ended') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
        <span className="w-2 h-2 rounded-full bg-purple-600" />
        PT Ended
      </span>
    );
  }

  // Dual Gym + PT badges (both active or mixed states)
  if (pStatus !== null && pStatus !== 'ended') {
    return (
      <div className="flex flex-col gap-1 items-start">
        {getBadgePill('🏋️ Gym', gStatus)}
        {getBadgePill('✨ PT', pStatus)}
      </div>
    );
  }

  // Fully paid & active
  const isFullyPaid = !!member?.lastPaymentDate && Number(member?.dueAmount ?? dueAmount ?? 0) <= 0;
  if (isFullyPaid && gStatus === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Paid
      </span>
    );
  }

  // Partial due
  const hasPartialDue = Number(member?.dueAmount ?? dueAmount) > 0 && !!member?.lastPaymentDate;
  if (hasPartialDue && gStatus === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Due: ₹{member?.dueAmount ?? dueAmount}
      </span>
    );
  }

  // Default single status
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({ member, size = 'md', className = '' }) {
  const sizeMap = {
    xs: 'w-8 h-8 text-[11px]',
    sm: 'w-10 h-10 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 text-base',
    xl: 'w-20 h-20 text-xl'
  };
  const name = getName(member);
  const photo = member.photoURL || member.photo || member.photoUrl || member.avatar || member.image;

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`${sizeMap[size] || size} rounded-2xl object-cover ring-2 ring-slate-200/80 shadow-sm flex-shrink-0 ${className}`}
      />
    );
  }

  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'M';
  const colors = [
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-amber-500 to-orange-600'
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;

  return (
    <div className={`${sizeMap[size] || size} rounded-2xl bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

// ─── DaysCountdownPill ────────────────────────────────────────────────────────

export function DaysCountdownPill({ member }) {
  const info = getMemberDaysInfo(member);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${info.cls}`}>
      {info.text}
    </span>
  );
}
