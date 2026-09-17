import React from 'react';
import { Avatar, StatusBadge } from './MemberStatusBadge';
import MemberActionButtons from './MemberActionButtons';
import {
  getName,
  getPhone,
  getSlot,
  getMemberStatus,
  getMemberDaysInfo,
  getMembershipDetails
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {members.map((m) => {
        const status = getMemberStatus(m);
        const daysInfo = getMemberDaysInfo(m);
        const membershipDetails = getMembershipDetails(m);
        const name = getName(m);
        const phone = getPhone(m);
        const slot = getSlot(m);

        return (
          <div
            key={m.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5 hover:border-emerald-300 transition flex flex-col justify-between"
          >
            <div>
              {/* Header: Avatar + StatusBadge */}
              <div className="flex items-center justify-between">
                <Avatar member={m} size="md" />
                <StatusBadge status={status} dueAmount={m.dueAmount} member={m} />
              </div>

              {/* Identity */}
              <div className="mt-3">
                <h4 className="font-bold text-slate-900 text-sm leading-tight">{name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{phone || 'No phone'}</p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">{slot}</span>
                  {m.trainerName && (
                    <span className="font-semibold text-slate-600 truncate">
                      Coach: {m.trainerName}
                    </span>
                  )}
                </div>
              </div>

              {/* Plan & Validity Info */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-slate-800">{m.planName || 'Standard Plan'}</p>
                  {membershipDetails.category === 'both' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
                      Gym + PT
                    </span>
                  ) : membershipDetails.category === 'both_pt_ended' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Gym Active (PT Ended)
                    </span>
                  ) : membershipDetails.category === 'pt' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                      1-on-1 PT
                    </span>
                  ) : membershipDetails.category === 'pt_ended' ? (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                      PT Ended
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                      Gym Plan
                    </span>
                  )}
                </div>

                {m.ptPlanName && (
                  <p className={`text-[10px] font-bold px-2 py-0.5 rounded-md border truncate ${
                    m.ptStatus === 'ended'
                      ? 'text-slate-500 bg-slate-100 border-slate-200 line-through opacity-85'
                      : 'text-purple-700 bg-purple-50 border-purple-200'
                  }`}>
                    {m.ptStatus === 'ended' ? '🛑 PT Ended: ' : '✨ PT: '} {m.ptPlanName} {m.ptPlanPrice && m.ptStatus !== 'ended' ? `(+₹${m.ptPlanPrice})` : ''}
                  </p>
                )}

                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${daysInfo.cls}`}>
                  {daysInfo.text}
                </span>
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
