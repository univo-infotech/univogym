import React from 'react';
import { Sun } from 'lucide-react';
import { Avatar, StatusBadge } from './MemberStatusBadge';
import MemberActionButtons from './MemberActionButtons';
import {
  getName,
  getPhone,
  getSlot,
  formatDate,
  getMemberStatus,
  getMemberDaysInfo,
  getMembershipDetails
} from './memberUtils';

export default function MemberTable({
  members = [],
  actionHandlers = {}
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200">
          <tr>
            <th className="px-5 py-3.5">Member</th>
            <th className="px-5 py-3.5">Slot & Trainer</th>
            <th className="px-5 py-3.5">Plan & Fee</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-500">No members found in this view.</p>
                <p className="text-xs text-slate-400 mt-1">Try changing your search query or selected filter tab.</p>
              </td>
            </tr>
          ) : (
            members.map((m) => {
              const status = getMemberStatus(m);
              const daysInfo = getMemberDaysInfo(m);
              const membershipDetails = getMembershipDetails(m);
              const name = getName(m);
              const phone = getPhone(m);
              const slot = getSlot(m);
              const joinDate = formatDate(m.createdAt || m.joiningDate || m.joinDate);

              return (
                <tr key={m.id} className="hover:bg-slate-50/70 transition items-center">
                  {/* Column 1: Member Name & Phone */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar member={m} size="sm" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">
                          {name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{phone || 'No phone'}</span>
                          <span>•</span>
                          <span>{joinDate}</span>
                        </p>
                        {m.email && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {m.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Slot & Trainer */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                        <Sun className="w-3 h-3 text-indigo-500" />
                        <span>{slot}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 pl-0.5 font-bold flex items-center gap-1">
                        <span>{m.trainerName ? `🏋️ Coach ${m.trainerName}` : 'No Trainer'}</span>
                      </p>
                    </div>
                  </td>

                  {/* Column 3: Plan & Fee with Days Left & Combined Total */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 text-xs">
                          {m.planName || 'Standard Plan'} {m.planPrice ? `(₹${Number(m.planPrice).toLocaleString('en-IN')})` : ''}
                        </p>

                        {/* Gym vs PT Indicator */}
                        {membershipDetails.category === 'both' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
                            🏋️ Gym + ✨ PT
                          </span>
                        ) : membershipDetails.category === 'both_pt_ended' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            🏋️ Gym Active (PT Ended)
                          </span>
                        ) : membershipDetails.category === 'pt' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                            ✨ 1-on-1 PT
                          </span>
                        ) : membershipDetails.category === 'pt_ended' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                            🛑 PT Ended
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                            🏋️ Gym Plan
                          </span>
                        )}
                      </div>

                      {/* PT Plan Pill if present */}
                      {m.ptPlanName && (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                          m.ptStatus === 'ended'
                            ? 'bg-slate-100 text-slate-500 border-slate-300 line-through opacity-85'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {m.ptStatus === 'ended' ? '🛑 PT Ended: ' : '✨ PT: '} {m.ptPlanName} {m.ptPlanPrice && m.ptStatus !== 'ended' ? `(+₹${Number(m.ptPlanPrice).toLocaleString('en-IN')})` : ''}
                        </div>
                      )}

                      {/* Days remaining countdown & total sum */}
                      <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${daysInfo.cls}`}>
                          {daysInfo.text}
                        </span>
                        {m.ptPlanName && (
                          <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Total: ₹{(Number(m.planPrice || 0) + Number(m.ptPlanPrice || 0)).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Column 4: Status Badge */}
                  <td className="px-5 py-3.5">
                    <StatusBadge status={status} dueAmount={m.dueAmount} member={m} />
                  </td>

                  {/* Column 5: Unified Action Buttons */}
                  <td className="px-5 py-3.5 text-right">
                    <MemberActionButtons
                      member={m}
                      variant="table"
                      {...actionHandlers}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
