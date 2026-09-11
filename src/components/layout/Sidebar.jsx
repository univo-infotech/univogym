import React, { useState } from "react";
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
  User,
  X,
  Menu
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getGymSettings } from "../../utils/settings";

export default function Sidebar({ role = "owner", isOpen = false, onClose }) {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();
  const settings = getGymSettings();

  const ownerLinks = [
    { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/owner/members", label: "Members", icon: Users },
    { to: "/owner/payments", label: "Fees & Receipts", icon: Receipt },
    { to: "/owner/trainers", label: "Trainers", icon: Dumbbell },
    { to: "/owner/staff", label: "Staff", icon: UserCheck },
    { to: "/owner/memberships", label: "Memberships & Plans", icon: CreditCard },
    { to: "/owner/services", label: "Services", icon: Star },
    { to: "/owner/stock", label: "Stock & Equipment", icon: Package },
    { to: "/owner/expenses", label: "Expenses & Utility", icon: DollarSign },
    { to: "/owner/reports", label: "Reports (Daily/Monthly)", icon: BarChart2 },
    { to: "/owner/visits", label: "Visit & Demo", icon: CalendarCheck },
    { to: "/owner/offers", label: "Offer & Broadcast", icon: Tag },
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
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={settings.logoUrl || "/logo-icon.png"}
              alt="Gym Logo"
              className="w-10 h-10 object-contain rounded-xl"
            />
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-slate-900 text-sm tracking-wider truncate">
                {settings.gymName || "UNIVO GYM"}
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Management</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
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
                onClick={onClose}
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
    </>
  );
}
