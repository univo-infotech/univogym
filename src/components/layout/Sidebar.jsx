import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UserCheck,
  CreditCard,
  Star,
  Package,
  DollarSign,
  Receipt,
  BarChart2,
  CalendarCheck,
  Tag,
  Settings,
  LogOut,
  ClipboardList,
  Camera,
  CheckSquare,
  User
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function Sidebar({ role = "owner" }) {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const ownerLinks = [
    { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/owner/members", label: "Members", icon: Users },
    { to: "/owner/trainers", label: "Trainers", icon: Dumbbell },
    { to: "/owner/staff", label: "Staff", icon: UserCheck },
    { to: "/owner/memberships", label: "Memberships", icon: CreditCard },
    { to: "/owner/services", label: "Services", icon: Star },
    { to: "/owner/stock", label: "Stock & Equipment", icon: Package },
    { to: "/owner/payments", label: "Payments", icon: DollarSign },
    { to: "/owner/expenses", label: "Expenses", icon: Receipt },
    { to: "/owner/reports", label: "Reports", icon: BarChart2 },
    { to: "/owner/visits", label: "Visits & Demo", icon: CalendarCheck },
    { to: "/owner/offers", label: "Offers & Broadcast", icon: Tag },
    { to: "/owner/settings", label: "Settings", icon: Settings },
  ];

  const trainerLinks = [
    { to: "/trainer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/trainer/members", label: "My Members", icon: Users },
    { to: "/trainer/plans", label: "Workout Plans", icon: ClipboardList },
    { to: "/trainer/before-after", label: "Before & After", icon: Camera },
    { to: "/trainer/attendance", label: "Attendance", icon: CheckSquare },
  ];

  const memberLinks = [
    { to: "/member/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/member/profile", label: "My Profile", icon: User },
    { to: "/member/plan", label: "My Plan", icon: CreditCard },
    { to: "/member/trainer", label: "My Trainer", icon: Dumbbell },
    { to: "/member/payments", label: "My Payments", icon: DollarSign },
  ];

  const links = role === "trainer" ? trainerLinks : role === "member" ? memberLinks : ownerLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 shadow-sm">
      {/* Brand */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <img src="/logo-icon.png" alt="Univo Logo" className="w-10 h-10 object-contain" />
        <div>
          <h1 className="font-extrabold text-slate-900 text-sm tracking-wider">UNIVO GYM</h1>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Management</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile / Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={() => {
            logoutUser?.();
            navigate("/login");
          }}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
