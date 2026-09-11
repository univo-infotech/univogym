import React, { forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef(function Input(
  { label, error, icon, className = "", helperText, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-10",
            error ? "border-red-500/50" : "border-slate-600/50 hover:border-slate-500",
            className
          )}
          {...rest}
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {helperText && !error && <p className="text-slate-500 text-xs">{helperText}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, className = "", rows = 3, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        className={clsx(
          "w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm transition-colors resize-none",
          "focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500",
          error ? "border-red-500/50" : "border-slate-600/50 hover:border-slate-500",
          className
        )}
        {...rest}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, className = "", children, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          "w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "[&>option]:bg-slate-800",
          error ? "border-red-500/50" : "border-slate-600/50 hover:border-slate-500",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
});

export default Input;
