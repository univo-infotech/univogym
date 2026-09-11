import React from "react";
import clsx from "clsx";

export default function StatCard({ title, value, change, changeType = "up", icon, color = "green" }) {
  const colorMap = {
    green: "from-green-500/20 to-emerald-500/5 text-green-400 border-green-500/30",
    teal: "from-teal-500/20 to-cyan-500/5 text-teal-400 border-teal-500/30",
    blue: "from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/30",
    purple: "from-purple-500/20 to-pink-500/5 text-purple-400 border-purple-500/30",
    orange: "from-orange-500/20 to-amber-500/5 text-orange-400 border-orange-500/30",
    red: "from-red-500/20 to-rose-500/5 text-red-400 border-red-500/30",
  };

  return (
    <div className={clsx("p-5 rounded-2xl border bg-gradient-to-br backdrop-blur-sm", colorMap[color] || colorMap.green)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        {icon && <div className="p-2 rounded-xl bg-slate-800/80">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {change && (
        <span className={clsx("text-xs font-medium", changeType === "up" ? "text-green-400" : "text-red-400")}>
          {change}
        </span>
      )}
    </div>
  );
}
