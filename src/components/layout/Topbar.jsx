import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Menu,
  Check,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  X,
  IndianRupee,
  Calendar,
  Sparkles,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMembers, updateMember } from "../../firebase/members";
import { useAuth } from "../../contexts/AuthContext";
import {
  openWhatsApp,
  generateRenewalReminderMessage,
  generatePtRenewalReminderMessage,
  generatePartialDueReminderMessage,
  generateOverdueReminderMessage
} from "../../utils/whatsapp";

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

function getMemberStatus(member) {
  if (member.status === 'left') return 'left';
  if (member.active === false) return 'inactive';

  const expiry = toDate(member.expiryDate);
  if (!expiry) return member.status || 'active';
  const now = new Date();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (diffDays < -3) return 'overdue';
  if (diffDays <= 0) return 'expired';
  if (diffDays <= 3) return 'ending_soon';
  return 'active';
}

function formatDate(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Topbar({ title = "Dashboard", onOpenSidebar }) {
  const { gymId, role, user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'partial', 'ending_soon', 'expired', 'overdue'
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    localStorage.removeItem("univo_trainer_session");
    localStorage.removeItem("univo_member_session");
    if (logoutUser) await logoutUser();
    navigate("/login", { replace: true });
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch members to calculate live notices
  useEffect(() => {
    async function load() {
      try {
        const data = await getMembers(gymId || "univo_main");
        setMembers(data || []);
      } catch (e) {
        console.warn("Topbar notifications load warning:", e);
      }
    }
    load();
  }, [gymId, notificationsOpen]);

  // Helper to check if member is PT
  const isPtMember = (m) =>
    (!!m.isPt ||
      !!m.ptPlanName ||
      (m.trainerName &&
        m.trainerName !== 'Unassigned' &&
        m.trainerName !== 'General Floor Trainer (Included)' &&
        m.trainerName !== 'No Trainer')) &&
    m.ptStatus !== 'ended';

  // Candidates for reminder
  const isPartial = (m) => Number(m.dueAmount || 0) > 0 && m.status !== 'left' && m.status !== 'ended';
  const isEndingSoon = (m) => getMemberStatus(m) === 'ending_soon';
  const isExpired = (m) => getMemberStatus(m) === 'expired';
  const isOverdue = (m) => getMemberStatus(m) === 'overdue';
  const isActionable = (m) => m.status !== 'left' && m.status !== 'ended' && (isPartial(m) || isEndingSoon(m) || isExpired(m) || isOverdue(m));

  const totalActionCount = members.filter(isActionable).length;
  const gymActionCount = members.filter((m) => isActionable(m) && (!m.ptPlanName || m.ptStatus === 'ended')).length;
  const ptActionCount = members.filter((m) => isActionable(m) && isPtMember(m)).length;

  const notificationList = members.filter((m) => {
    if (m.status === 'left' || m.status === 'ended') return false;
    if (activeTab === 'gym') return (!m.ptPlanName || m.ptStatus === 'ended') && isActionable(m);
    if (activeTab === 'pt') return isPtMember(m) && isActionable(m);
    if (activeTab === 'partial') return isPartial(m);
    if (activeTab === 'ending_soon') return isEndingSoon(m);
    if (activeTab === 'expired') return isExpired(m);
    if (activeTab === 'overdue') return isOverdue(m);
    return isActionable(m);
  });

  const sentCount = notificationList.filter((m) => !!m.lastReminderSent).length;
  const pendingCount = notificationList.length - sentCount;

  const handleSendReminder = async (m) => {
    const rawNum = (m.phone || '').replace(/\D/g, '');
    if (!rawNum) {
      toast.error(`Phone number missing for ${m.name || m.fullName}`);
      return;
    }

    const stat = getMemberStatus(m);
    let msg = '';
    const expiry = toDate(m.expiryDate);
    const diff = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    if (Number(m.dueAmount || 0) > 0) {
      msg = generatePartialDueReminderMessage(
        m.name || m.fullName,
        m.dueAmount,
        m.ptPlanName ? `${m.planName || 'Gym'} + PT (${m.ptPlanName})` : (m.planName || 'Gym Plan')
      );
    } else if (isPtMember(m) && (activeTab === 'pt' || !m.planName || m.ptPlanName)) {
      // PT-specific WhatsApp reminder template
      msg = generatePtRenewalReminderMessage(
        m.name || m.fullName,
        m.ptPlanName || '1-on-1 PT Plan',
        m.trainerName || 'Assigned Coach',
        formatDate(m.expiryDate),
        m.ptPlanPrice || (Number(m.planPrice || 0) + Number(m.ptPlanPrice || 0)) || '2,500'
      );
    } else if (stat === 'overdue') {
      msg = generateOverdueReminderMessage(
        m.name || m.fullName,
        m.planName || 'Gym Plan',
        Math.abs(diff),
        m.planPrice || '2,500'
      );
    } else {
      msg = generateRenewalReminderMessage(
        m.name || m.fullName,
        m.planName || 'Gym Plan',
        formatDate(m.expiryDate),
        m.planPrice || '2,500'
      );
    }

    openWhatsApp(rawNum, msg);

    const nowIso = new Date().toISOString();
    setMembers((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, lastReminderSent: nowIso } : item))
    );
    try {
      await updateMember(m.id, { lastReminderSent: nowIso });
    } catch (e) {
      console.warn("Could not save lastReminderSent:", e);
    }

    toast.success(`WhatsApp reminder opened for ${m.name || m.fullName}!`);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm relative z-30">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu on Mobile */}
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden border border-slate-200"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-wide">{title}</h2>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Top Notification Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className={`p-2 rounded-xl transition relative border ${
              notificationsOpen
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
            }`}
            title="Membership Renewals & Dues Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalActionCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-xs">
                {totalActionCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications & Reminder Dropdown Panel */}
          {notificationsOpen && (
            <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-16px)] max-w-sm sm:max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">Reminders & Notices</h3>
                    <p className="text-[11px] text-slate-400">Due payments & upcoming plan expiries</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sent vs Pending status bar */}
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-semibold text-slate-700">Delivery Status:</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    ✓ Sent: {sentCount}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                    ⏳ Pending: {pendingCount}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { key: "all", label: `All (${totalActionCount})` },
                  { key: "gym", label: `🏋️ Gym (${gymActionCount})` },
                  { key: "pt", label: `✨ PT (${ptActionCount})` },
                  { key: "partial", label: "Partial Due" },
                  { key: "ending_soon", label: "Ending Soon" },
                  { key: "expired", label: "Expired" },
                  { key: "overdue", label: "Overdue" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition ${
                      activeTab === t.key
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* List of members with Send WhatsApp & Delivery status */}
              <div className="mt-3 divide-y divide-slate-100 max-h-[320px] overflow-y-auto pr-1">
                {notificationList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    🎉 Sabhi members up-to-date hain! Koi reminder pending nahi hai.
                  </div>
                ) : (
                  notificationList.map((m) => {
                    const stat = getMemberStatus(m);
                    const isDue = Number(m.dueAmount || 0) > 0;
                    const sentTime = m.lastReminderSent ? new Date(m.lastReminderSent) : null;
                    const hasPt = !!m.ptPlanName || isPtMember(m);
                    const hasBoth = !!m.ptPlanName && !!m.planName;

                    return (
                      <div key={m.id} className="py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/70 px-1 rounded-lg transition">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {m.name || m.fullName}
                            </span>
                            {/* Gym vs PT Membership Pill */}
                            {hasBoth ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
                                Gym + PT
                              </span>
                            ) : hasPt ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                                ✨ PT Plan
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                                🏋️ Gym
                              </span>
                            )}
                            {/* Live Delivery Status Indicator */}
                            {m.lastReminderSent ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                Sent {sentTime ? sentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                Not Sent
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>{m.phone || "No phone"}</span>
                            <span>•</span>
                            {isDue ? (
                              <span className="font-bold text-amber-700">Due: ₹{m.dueAmount}</span>
                            ) : (
                              <span className={stat === 'overdue' ? 'font-bold text-red-600' : 'font-semibold text-amber-700'}>
                                {stat === 'overdue' ? 'Overdue Plan' : `Exp: ${formatDate(m.expiryDate)}`}
                              </span>
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() => handleSendReminder(m)}
                          className={`shrink-0 px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs ${
                            m.lastReminderSent
                              ? "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                          }`}
                          title={m.lastReminderSent ? "Click to resend reminder on WhatsApp" : "Send reminder on WhatsApp"}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{m.lastReminderSent ? "Resend" : "WhatsApp"}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Quick Responsive Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {(user?.displayName || role || "U").charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[110px]">
              {user?.displayName || (role === "trainer" ? "Trainer" : role === "member" ? "Member" : "Gym Admin")}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase">
              {role || "UNIVO"}
            </p>
          </div>

          {/* Direct Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition flex items-center gap-1 text-xs font-bold shadow-xs active:scale-95 ml-1"
            title="Log Out of your account"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
