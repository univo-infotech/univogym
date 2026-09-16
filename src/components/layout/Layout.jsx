import React, { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, DollarSign, Package } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut } from "lucide-react";

export default function Layout({ children, role = "owner" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const handleLogout = async () => {
    localStorage.removeItem("univo_trainer_session");
    localStorage.removeItem("univo_member_session");
    if (logoutUser) await logoutUser();
    navigate("/login", { replace: true });
  };

  const getMobileNav = () => {
    if (role === "trainer") {
      return [
        { to: "/trainer/dashboard", label: "Home", icon: LayoutDashboard },
        { to: "/trainer/members", label: "Athletes", icon: Users },
        { to: "/trainer/attendance", label: "Attendance", icon: CreditCard },
      ];
    }
    if (role === "member") {
      return [
        { to: "/member/dashboard", label: "Home", icon: LayoutDashboard },
        { to: "/member/plan", label: "My Plan", icon: CreditCard },
        { to: "/member/trainer", label: "Coach", icon: Users },
      ];
    }
    return [
      { to: "/owner/dashboard", label: "Home", icon: LayoutDashboard },
      { to: "/owner/members", label: "Members", icon: Users },
      { to: "/owner/memberships", label: "Plans", icon: CreditCard },
      { to: "/owner/stock", label: "Stock", icon: Package },
    ];
  };

  const mobileNav = getMobileNav();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/60">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (App-like Feel) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex justify-around items-center shadow-xl">
          {mobileNav.map((tab) => {
            const Icon = tab.icon;
            const active = location.pathname.startsWith(tab.to);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all ${
                  active ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{tab.label}</span>
              </NavLink>
            );
          })}

          {/* Direct Logout Button on Mobile Nav */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-rose-600 hover:text-rose-700 font-bold transition-all active:scale-95"
            title="Log Out of your account"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[10px]">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
