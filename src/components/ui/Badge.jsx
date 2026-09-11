import React from "react";
import clsx from "clsx";

const variants = {
  success: "bg-green-500/20 text-green-400 border border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  danger: "bg-red-500/20 text-red-400 border border-red-500/30",
  info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  purple: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  teal: "bg-teal-500/20 text-teal-400 border border-teal-500/30",
  neutral: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  orange: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
};

const sizes = {
  xs: "text-xs px-1.5 py-0.5 rounded",
  sm: "text-xs px-2 py-0.5 rounded",
  md: "text-xs px-2.5 py-1 rounded-md",
  lg: "text-sm px-3 py-1 rounded-md",
};

export default function Badge({ children, variant = "neutral", size = "md", className = "", dot = false }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 font-medium", variants[variant], sizes[size], className)}>
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full", {
        "bg-green-400": variant === "success",
        "bg-yellow-400": variant === "warning",
        "bg-red-400": variant === "danger",
        "bg-blue-400": variant === "info",
        "bg-slate-400": variant === "neutral",
        "bg-orange-400": variant === "orange",
      })} />}
      {children}
    </span>
  );
}
