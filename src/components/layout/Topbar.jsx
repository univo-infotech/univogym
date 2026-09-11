import React from "react";
import { Bell, Search, User } from "lucide-react";

export default function Topbar({ title = "Dashboard" }) {
  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white tracking-wide">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-green-500 w-56"
          />
        </div>

        <button className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
            U
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-white leading-tight">Gym Admin</p>
            <p className="text-[10px] text-green-400">UNIVO GYM</p>
          </div>
        </div>
      </div>
    </header>
  );
}
