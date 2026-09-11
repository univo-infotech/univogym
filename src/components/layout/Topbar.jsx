import React from "react";
import { Bell, Search } from "lucide-react";

export default function Topbar({ title = "Dashboard" }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800 tracking-wide">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search members, billing, staff..."
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white w-64 transition-all"
          />
        </div>

        <button className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition relative border border-slate-200">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            U
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">Gym Admin</p>
            <p className="text-[10px] text-emerald-600 font-semibold">UNIVO GYM</p>
          </div>
        </div>
      </div>
    </header>
  );
}
