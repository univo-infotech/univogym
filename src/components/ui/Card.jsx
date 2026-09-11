import React from "react";
import clsx from "clsx";

export function Card({ children, className = "", hover = false, gradient = false }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200",
        gradient
          ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50"
          : "bg-slate-800/60 backdrop-blur-sm border-slate-700/50",
        hover && "hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/5 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={clsx("px-6 pt-6 pb-4 border-b border-slate-700/50", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={clsx("p-6", className)}>{children}</div>;
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={clsx("px-6 pb-6 pt-4 border-t border-slate-700/50", className)}>
      {children}
    </div>
  );
}

export default Card;
