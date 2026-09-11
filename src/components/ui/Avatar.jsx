import React from "react";
import clsx from "clsx";

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
  "2xl": "h-28 w-28 text-3xl",
};

const gradients = [
  "from-green-500 to-teal-500",
  "from-blue-500 to-purple-500",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-500",
  "from-teal-500 to-green-500",
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name) {
  if (!name) return gradients[0];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

export default function Avatar({ src, name, size = "md", className = "", status }) {
  return (
    <div className={clsx("relative inline-flex shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={name || "Avatar"}
          className={clsx(sizeClasses[size], "rounded-full object-cover")}
        />
      ) : (
        <div
          className={clsx(
            sizeClasses[size],
            "rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white",
            getGradient(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          className={clsx(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900",
            status === "active" ? "bg-green-500" : "bg-slate-500"
          )}
        />
      )}
    </div>
  );
}
