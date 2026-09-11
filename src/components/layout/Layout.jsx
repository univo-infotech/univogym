import React, { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, DollarSign, Package } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, role = "owner" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const mobileNav = [
    { to: "/owner/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/owner/members", label: "Members", icon: Users },
    { to: "/owner/payments", label: "Billing", icon: DollarSign },
    { to: "/owner/memberships", label: "Plans", icon: CreditCard },
    { to: "/owner/stock", label: "Stock", icon: Package },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/60">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (App-like Feel) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-3 py-2 flex justify-around items-center shadow-lg">
          {mobileNav.map((tab) => {
            const Icon = tab.icon;
            const active = location.pathname.startsWith(tab.to);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  active ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
