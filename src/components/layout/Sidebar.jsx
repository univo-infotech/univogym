import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  Menu,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  Megaphone,
  SlidersHorizontal,
  QrCode
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getGymSettings } from "../../utils/settings";
import { getRenewalRequests } from "../../firebase/renewalRequests";

export default function Sidebar({ role = "owner", isOpen = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser, permissions, gymId } = useAuth();
  const settings = getGymSettings();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingUpiCount, setPendingUpiCount] = useState(0);

  useEffect(() => {
    if (role !== "owner" && role !== "staff") return;

    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const reqs = await getRenewalRequests(gymId || "univo_main");
        if (isMounted) {
          const pending = (reqs || []).filter((r) => r.status === "pending");
          setPendingUpiCount(pending.length);
        }
      } catch (e) {}
    };

    fetchPendingCount();

    const handleRenewalChange = () => fetchPendingCount();
    window.addEventListener("univo_renewal_changed", handleRenewalChange);
    window.addEventListener("storage", handleRenewalChange);
    const interval = setInterval(fetchPendingCount, 15000);

    return () => {
      isMounted = false;
      window.removeEventListener("univo_renewal_changed", handleRenewalChange);
      window.removeEventListener("storage", handleRenewalChange);
      clearInterval(interval);
    };
  }, [role, gymId]);

  const ownerLinks = [
    { id: "dashboard", to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "members", to: "/owner/members", label: "Members", icon: Users },
    { id: "attendance", to: "/owner/attendance", label: "Attendance", icon: CheckSquare },
    { id: "payments", to: "/owner/payments", label: "Fee Collections", icon: DollarSign },
    {
      id: "upi_approvals",
      to: "/owner/upi-approvals",
      label: "Online UPI Approvals",
      icon: QrCode,
      badge: pendingUpiCount > 0 ? pendingUpiCount : null,
      badgeColor: "bg-red-500 text-white animate-pulse shadow-sm shadow-red-500/30",
    },
    { id: "trainers", to: "/owner/trainers", label: "Trainers", icon: Dumbbell },
    { id: "staff", to: "/owner/staff", label: "Staff & Salary Manage", icon: UserCheck },
    { id: "memberships", to: "/owner/memberships", label: "Memberships & Plans", icon: CreditCard },
    { id: "services", to: "/owner/services", label: "Services", icon: Star },
    { id: "stock", to: "/owner/stock", label: "Stock & Equipment", icon: Package },
    { id: "expenses", to: "/owner/expenses", label: "Expenses & Utility", icon: Receipt },
    { id: "reports", to: "/owner/reports", label: "Reports (Daily/Monthly)", icon: BarChart2 },
    { id: "visits", to: "/owner/visits", label: "Visit & Demo", icon: CalendarCheck },
    { id: "offers", to: "/owner/offers", label: "Offers & Broadcast", icon: Megaphone },
    { id: "complaints", to: "/owner/complaints", label: "Complaints", icon: ShieldAlert },
    { id: "customization", to: "/owner/customization", label: "Customization", icon: SlidersHorizontal },
    { id: "settings", to: "/owner/settings", label: "Settings", icon: Settings },
    { id: "roles", to: "/owner/roles", label: "Roles & Permissions", icon: ShieldCheck },
  ];

  const trainerLinks = [
    { to: "/trainer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/trainer/members", label: "My Members", icon: Users },
    { to: "/trainer/reports", label: "Earnings & Reports", icon: BarChart2 },
    { to: "/trainer/profile", label: "My Profile", icon: User },
    { to: "/trainer/attendance", label: "Attendance", icon: CheckSquare },
  ];

  const memberLinks = [
    { to: "/member/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/member/profile", label: "My Profile", icon: User },
    { to: "/member/plan", label: "My Plan", icon: CreditCard },
    { to: "/member/store", label: "Gym Store & Nutrition", icon: ShoppingBag },
    { to: "/member/trainer", label: "My Trainer", icon: Dumbbell },
    { to: "/member/complain", label: "Trainer Complain", icon: ShieldAlert },
    { to: "/member/payments", label: "My Payments", icon: DollarSign },
  ];

  let links = ownerLinks;
  if (role === "trainer") links = trainerLinks;
  else if (role === "member") links = memberLinks;
  else if (role === "staff") {
    // Support both old array and new object format
    links = ownerLinks.filter(link => {
      const permKey = link.id === "upi_approvals" ? "payments" : link.id;
      if (Array.isArray(permissions)) return permissions.includes(link.id) || permissions.includes(permKey);
      return permissions?.[link.id]?.view || permissions?.[permKey]?.view;
    });
  } else if (role === "owner") {
    links = ownerLinks;
  }

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
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col h-[100dvh] max-h-[100dvh] lg:h-screen shrink-0 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
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
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 overscroll-contain">
          {links.map((link) => {
            const Icon = link.icon;
            const isUpiActive = link.id === "upi_approvals" && (
              location.pathname === "/owner/upi-approvals" ||
              (location.pathname === "/owner/payments" && location.search.includes("online_requests"))
            );
            const isPaymentsActive = link.id === "payments" && (
              location.pathname === "/owner/payments" && !location.search.includes("online_requests")
            );

            return (
              <NavLink
                key={link.id || link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive: navActive }) => {
                  const active = isUpiActive || isPaymentsActive || (navActive && link.id !== "payments" && link.id !== "upi_approvals");
                  return `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                    active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`;
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate">{link.label}</span>
                </div>
                {link.badge ? (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-wide shrink-0 ${
                      link.badgeColor || "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {link.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Profile / Logout - Fixed at bottom */}
        <div className="p-3.5 border-t border-slate-200 bg-white shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center justify-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:text-white bg-rose-50/80 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition shadow-xs cursor-pointer active:scale-98"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Validation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Confirm Logout
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to end your session?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              You will need to re-enter your login credentials to access your account again.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  onClose?.();
                  try {
                    if (logoutUser) await logoutUser();
                  } catch (e) {
                    console.warn("Logout error:", e);
                  }
                  navigate("/login", { replace: true });
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
