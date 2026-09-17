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

export default function MemberTable({
  members = [],
  actionHandlers = {}
}) {
  const getSlotIcon = (slotStr = '') => {
    const s = String(slotStr).toLowerCase();
    if (s.includes('morn')) return <Sunrise className="w-3 h-3 text-amber-500" />;
    if (s.includes('even') || s.includes('night')) return <Sunset className="w-3 h-3 text-indigo-500" />;
    if (s.includes('noon') || s.includes('after')) return <Sun className="w-3 h-3 text-orange-500" />;
    return <Clock className="w-3 h-3 text-teal-500" />;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200">
          <tr>
            <th className="px-5 py-3.5">Member</th>
            <th className="px-5 py-3.5">Slot & Trainer</th>
            <th className="px-5 py-3.5">Plan & Fee</th>
            <th className="px-5 py-3.5 text-center">Status</th>
            <th className="px-5 py-3.5 text-right" style={{ width: '350px', minWidth: '350px' }}>Actions</th>
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
              const memberIsLeft = isLeft(m);
              const remainingInfo = getMembershipRemainingDays(m.expiryDate);
              const name = getName(m);
              const phone = getPhone(m);
              const slot = getSlot(m);
              const joinDate = formatDate(m.createdAt || m.joiningDate || m.joinDate);
              const planPrice = Number(m.planPrice || 0);
              const discount = Number(m.discount || m.discountAmount || 0);
              const netFee = Math.max(0, planPrice - discount);

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
                          <span>Joined {joinDate}</span>
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
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[11px] border border-indigo-100">
                        {getSlotIcon(slot)}
                        <span>{slot}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-0.5 font-medium flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>{m.trainerName && m.trainerName !== 'No Trainer' ? m.trainerName : 'General Floor'}</span>
                      </p>
                    </div>
                  </td>

                  {/* Column 3: Plan & Fee with Days Left */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs flex-wrap">
                        <span className="font-bold text-slate-900">{m.planName || 'Standard Plan'}</span>
                        <span className="font-extrabold text-indigo-700">
                          (₹{netFee.toLocaleString('en-IN')})
                        </span>
                        {discount > 0 && (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
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
                  </td>

                  {/* Column 4: Status Badge */}
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                        memberIsLeft
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {memberIsLeft ? '🔴 Left' : '🟢 Active'}
                    </span>
                  </td>

                  {/* Column 5: Unified Action Buttons */}
                  <td className="px-4 py-3 text-right whitespace-nowrap" style={{ width: '350px', minWidth: '350px', whiteSpace: 'nowrap' }}>
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
