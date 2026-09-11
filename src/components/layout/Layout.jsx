import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, role = "owner" }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
