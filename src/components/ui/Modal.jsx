import React from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-xl" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-hidden">
      <div className={`relative w-full ${maxWidth} max-h-[94vh] flex flex-col bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200`}>
        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 shrink-0 bg-white rounded-t-2xl sm:rounded-t-3xl">
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto px-3.5 sm:px-6 py-3.5 sm:py-5 custom-scrollbar flex-1 -webkit-overflow-scrolling-touch">
          {children}
        </div>
      </div>
    </div>
  );
}
