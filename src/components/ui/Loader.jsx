import React from "react";

export default function Loader({ fullScreen = true, size = "md" }) {
  const sizes = { sm: "h-6 w-6", md: "h-12 w-12", lg: "h-20 w-20" };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-4 border-slate-700`}></div>
        <div
          className={`${sizes[size]} rounded-full border-4 border-transparent border-t-green-500 animate-spin absolute top-0 left-0`}
        ></div>
      </div>
      <div className="flex items-center gap-2">
        <img src="/logo-icon.png" alt="Univo" className="h-6 w-6 object-contain" />
        <span className="text-slate-400 text-sm font-medium">Loading...</span>
      </div>
    </div>
  );

  if (!fullScreen) return spinner;

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
      {spinner}
    </div>
  );
}
