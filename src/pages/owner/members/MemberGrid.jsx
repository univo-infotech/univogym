import React from 'react';
import { Sun, Sunrise, Sunset, Clock, UserCheck } from 'lucide-react';
import { Avatar } from './MemberStatusBadge';
import MemberActionButtons from './MemberActionButtons';
import {
  getName,
  getPhone,
  getSlot,
  formatDate,
  getMembershipRemainingDays,
  isLeft
} from './memberUtils';

export default function MemberGrid({
  members = [],
  actionHandlers = {}
}) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {members.map((m) => {
        const memberIsLeft = isLeft(m);
        const remainingInfo = getMembershipRemainingDays(m.expiryDate);
        const name = getName(m);
        const phone = getPhone(m);
        const slot = getSlot(m);
        const planPrice = Number(m.planPrice || 0);
        const discount = Number(m.discount || m.discountAmount || 0);
        const netFee = Math.max(0, planPrice - discount);

        return (
          <div
            key={m.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5 hover:border-emerald-300 transition flex flex-col justify-between"
          >
            <div>
              {/* Header: Avatar + Status */}
              <div className="flex items-center justify-between">
                <Avatar member={m} size="md" />
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                    memberIsLeft
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {memberIsLeft ? '🔴 Left' : '🟢 Active'}
                </span>
              </div>

              {/* Identity */}
              <div className="mt-3">
                <h4 className="font-bold text-slate-900 text-sm leading-tight">{name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{phone || 'No phone'}</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-100">
                    {getSlotIcon(slot)}
                    <span>{slot}</span>
                  </span>
                  <span className="text-slate-600 font-medium truncate flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-400" />
                    <span>{m.trainerName && m.trainerName !== 'No Trainer' ? m.trainerName : 'General Floor'}</span>
                  </span>
                </div>
              </div>

              {/* Plan & Validity Info */}
              <div className="mt-3.5 space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="font-bold text-slate-900">{m.planName || 'Standard Plan'}</span>
                  <span className="font-extrabold text-indigo-700">
                    (₹{netFee.toLocaleString('en-IN')})
                  </span>
                  {discount > 0 && (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      -₹{discount}
                    </span>
                  )}
                </div>

                {m.expiryDate && (
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${remainingInfo.color}`}
                      title={`Valid till ${formatDate(m.expiryDate)}`}
                    >
                      {remainingInfo.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions: Unified MemberActionButtons */}
            <div className="pt-3 border-t border-slate-100">
              <MemberActionButtons
                member={m}
                variant="grid"
                {...actionHandlers}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
