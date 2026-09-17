import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  IndianRupee,
  LogOut,
  UserX
} from 'lucide-react';

/**
 * MemberKpiBar
 * Renders the 7 KPI metrics at the top of the Members directory.
 * Clicking any KPI card filters to the matching tab!
 */
export default function MemberKpiBar({
  paidCount = 0,
  endingSoonCount = 0,
  expiredCount = 0,
  dueCount = 0,
  partialCount = 0,
  leftCount = 0,
  endedCount = 0,
  activeTab,
  onSelectTab
}) {
  const cards = [
    {
      key: 'paid',
      label: 'Fully Paid',
      count: paidCount,
      icon: CheckCircle,
      bgIcon: 'bg-emerald-50 text-emerald-600',
      textCount: 'text-slate-900',
      borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20'
    },
    {
      key: 'ending_soon',
      label: 'Ending Soon (≤3d)',
      count: endingSoonCount,
      icon: Clock,
      bgIcon: 'bg-amber-50 text-amber-600',
      textCount: 'text-amber-700 font-bold',
      borderActive: 'border-amber-500 ring-2 ring-amber-500/20'
    },
    {
      key: 'expired',
      label: 'Expired (1-2d)',
      count: expiredCount,
      icon: AlertTriangle,
      bgIcon: 'bg-rose-50 text-rose-600',
      textCount: 'text-rose-600 font-bold',
      borderActive: 'border-rose-500 ring-2 ring-rose-500/20'
    },
    {
      key: 'due',
      label: 'Due (2d+ Overdue)',
      count: dueCount,
      icon: AlertTriangle,
      bgIcon: 'bg-red-100 text-red-700',
      textCount: 'text-red-700 font-extrabold',
      borderActive: 'border-red-500 ring-2 ring-red-500/20'
    },
    {
      key: 'partial',
      label: 'Partial Due',
      count: partialCount,
      icon: IndianRupee,
      bgIcon: 'bg-amber-50 text-amber-700',
      textCount: 'text-amber-700 font-bold',
      borderActive: 'border-amber-500 ring-2 ring-amber-500/20'
    },
    {
      key: 'left',
      label: 'Gym Left',
      count: leftCount,
      icon: LogOut,
      bgIcon: 'bg-slate-100 text-slate-600',
      textCount: 'text-slate-900 font-bold',
      borderActive: 'border-slate-500 ring-2 ring-slate-500/20'
    },
    {
      key: 'ended',
      label: 'PT Ended',
      count: endedCount,
      icon: UserX,
      bgIcon: 'bg-purple-100 text-purple-700',
      textCount: 'text-purple-900 font-bold',
      borderActive: 'border-purple-500 ring-2 ring-purple-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const isActive = activeTab === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelectTab && onSelectTab(c.key)}
            className={`p-3.5 rounded-2xl bg-white border text-left transition shadow-xs flex items-center gap-2.5 hover:shadow-sm ${
              isActive ? c.borderActive : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl ${c.bgIcon} flex items-center justify-center shrink-0`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] text-slate-500 font-medium truncate">{c.label}</p>
              <p className={`text-base font-bold ${c.textCount}`}>{c.count}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
