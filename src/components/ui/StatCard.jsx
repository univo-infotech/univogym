import React from "react";
import clsx from "clsx";

export default function StatCard({ title, value, change, changeType = "up", icon, color = "green" }) {
  const colorMap = {
    green: "bg-emerald-50/50 text-emerald-700 border-emerald-200/80 shadow-emerald-500/5",
    teal: "bg-teal-50/50 text-teal-700 border-teal-200/80 shadow-teal-500/5",
    blue: "bg-blue-50/50 text-blue-700 border-blue-200/80 shadow-blue-500/5",
    purple: "bg-purple-50/50 text-purple-700 border-purple-200/80 shadow-purple-500/5",
    orange: "bg-amber-50/50 text-amber-700 border-amber-200/80 shadow-amber-500/5",
    red: "bg-rose-50/50 text-rose-700 border-rose-200/80 shadow-rose-500/5",
  };

  const iconBgMap = {
    green: "bg-emerald-100 text-emerald-700",
    teal: "bg-teal-100 text-teal-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
  };

  return (
    <div className={clsx("p-5 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md", colorMap[color] || colorMap.green)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {icon && <div className={clsx("p-2.5 rounded-xl", iconBgMap[color] || "bg-slate-100 text-slate-700")}>{icon}</div>}
      </div>
      <div className="text-2xl font-extrabold text-slate-900 mb-1">{value}</div>
      {change && (
        <span className={clsx("text-xs font-semibold", changeType === "up" ? "text-emerald-600" : "text-rose-600")}>
          {change}
        </span>
      )}
    </div>
  );
}
