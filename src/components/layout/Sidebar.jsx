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
  const { logoutUser, setRole } = useAuth();

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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0">
      {/* Brand */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <img src="/logo-icon.png" alt="Univo Logo" className="w-9 h-9 object-contain" />
        <div>
          <h1 className="font-bold text-white text-sm tracking-wider">UNIVO GYM</h1>
          <p className="text-[10px] text-green-400 font-medium">MANAGEMENT</p>
        </div>
      </div>

      {/* Role switcher preview for testing */}
      <div className="px-4 py-2 border-b border-slate-800/60 flex gap-1">
        <button 
          onClick={() => { setRole?.("owner"); navigate("/owner/dashboard"); }} 
          className={`text-[10px] px-2 py-1 rounded ${role === "owner" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "text-slate-400"}`}>
          Owner
        </button>
        <button 
          onClick={() => { setRole?.("trainer"); navigate("/trainer/dashboard"); }} 
          className={`text-[10px] px-2 py-1 rounded ${role === "trainer" ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "text-slate-400"}`}>
          Trainer
        </button>
        <button 
          onClick={() => { setRole?.("member"); navigate("/member/dashboard"); }} 
          className={`text-[10px] px-2 py-1 rounded ${role === "member" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-400"}`}>
          Member
        </button>
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
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
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
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => {
            logoutUser?.();
            navigate("/login");
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
