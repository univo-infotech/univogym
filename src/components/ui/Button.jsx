import React from "react";
import clsx from "clsx";

const variants = {
  primary: "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20",
  secondary: "bg-slate-700 hover:bg-slate-600 text-white",
  danger: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
  ghost: "bg-transparent hover:bg-slate-700/50 text-slate-300",
  outline: "bg-transparent border border-slate-600 hover:border-green-500 text-slate-300 hover:text-green-400",
  teal: "bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20",
  whatsapp: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20",
};

const sizes = {
  xs: "text-xs px-2 py-1 rounded gap-1",
  sm: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2 rounded-xl gap-2",
  lg: "text-base px-6 py-3 rounded-xl gap-2",
  xl: "text-lg px-8 py-4 rounded-2xl gap-3",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  loading = false,
  icon,
  className = "",
  type = "button",
  fullWidth = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
