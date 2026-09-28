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
import { getVisits, updateVisit } from "../../firebase/visits";
import { useAuth } from "../../contexts/AuthContext";
import {
  openWhatsApp,
  generateRenewalReminderMessage,
  generatePtRenewalReminderMessage,
  generateExpiredMessage,
  generatePtExpiredMessage,
  generateOverdueReminderMessage,
  generatePtOverdueReminderMessage,
  generatePartialDueReminderMessage,
  generateDemoEndingTodayMessage,
  generateDemoEndedMessage,
  generateVisitFollowupMessage,
  generateBirthdayMessage,
  generateInactiveMemberMessage
} from "../../utils/whatsapp";
import { parseToDate, formatDate } from "../../utils/dateUtils";

function getDayDiff(dateVal) {
  const d = parseToDate(dateVal);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

// Helper to check if member is PT
const isPtMember = (m) =>
  (!!m.isPt ||
    !!m.ptPlanName ||
    (m.trainerName &&
      m.trainerName !== 'Unassigned' &&
      m.trainerName !== 'General Floor Trainer (Included)' &&
      m.trainerName !== 'No Trainer')) &&
  m.ptStatus !== 'ended';

// Detailed notice calculation for Gym and PT
function getMemberNotice(m) {
  const isPt = isPtMember(m);
  const gymDiff = m.expiryDate ? getDayDiff(m.expiryDate) : null;
  const ptDate = m.ptEndDate || m.ptExpiryDate || (isPt ? m.expiryDate : null);
  const ptDiff = ptDate ? getDayDiff(ptDate) : null;
  const due = Number(m.dueAmount || 0);

  // Ending soon: 3 days, 2 days, 1 day, 0 days (today)
  const isGymEndingSoon = gymDiff !== null && gymDiff >= 0 && gymDiff <= 3;
  const isPtEndingSoon = isPt && ptDiff !== null && ptDiff >= 0 && ptDiff <= 3;
  const isEndingSoon = isGymEndingSoon || isPtEndingSoon;

  // Expired: Day 1 (-1) and Day 2 (-2)
  const isGymExpired = gymDiff !== null && gymDiff >= -2 && gymDiff < 0;
  const isPtExpired = isPt && ptDiff !== null && ptDiff >= -2 && ptDiff < 0;
  const isExpired = isGymExpired || isPtExpired;

  // Overdue: Day 3+ (<= -3)
  const isGymOverdue = gymDiff !== null && gymDiff <= -3;
  const isPtOverdue = isPt && ptDiff !== null && ptDiff <= -3;
  const isOverdue = isGymOverdue || isPtOverdue;

  const isPartial = due > 0;

  // Birthday Check (dob / dateOfBirth / birthDate)
  let isBirthday = false;
  const bDateStr = m.dob || m.dateOfBirth || m.birthDate;
  if (bDateStr) {
    const bDate = parseToDate(bDateStr);
    if (bDate) {
      const today = new Date();
      isBirthday = bDate.getDate() === today.getDate() && bDate.getMonth() === today.getMonth();
    }
  }

  // Inactive 7+ Days Check (Only for active athletes)
  let daysAbsent = null;
  if (m.status !== 'left' && m.status !== 'ended') {
    const lastSeen = m.lastAttendanceDate || m.lastVisitDate || m.lastCheckIn || m.joinDate;
    if (lastSeen) {
      const d = parseToDate(lastSeen);
      if (d) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(d);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.round((now - target) / (1000 * 60 * 60 * 24));
        if (diffDays >= 7) {
          daysAbsent = diffDays;
        }
      }
    }
  }
  const isInactive = daysAbsent !== null;

  const isActionable =
    m.status !== 'left' &&
    m.status !== 'ended' &&
    (isPartial || isEndingSoon || isExpired || isOverdue || isBirthday || isInactive);

  return {
    isPt,
    gymDiff,
    ptDiff,
    due,
    isGymEndingSoon,
    isPtEndingSoon,
    isEndingSoon,
    isGymExpired,
    isPtExpired,
    isExpired,
    isGymOverdue,
    isPtOverdue,
    isOverdue,
    isPartial,
    isBirthday,
    isInactive,
    daysAbsent,
    isActionable
  };
}

function getDemoNotice(v) {
  const todayStr = new Date().toISOString().split("T")[0];
  const targetDate = v.demoEndDate || v.demoDate;
  const diff = targetDate ? getDayDiff(targetDate) : null;
  const isEndingToday = diff === 0 || (v.demoEndDate === todayStr) || (v.demoDate === todayStr && !v.demoEndDate);
  const isEnded = v.status === "demo_done" || (diff !== null && diff < 0);
  const isActionable = isEndingToday || isEnded;
  return {
    isEndingToday,
    isEnded,
    isActionable,
    diff
  };
}

export default function Topbar({ title = "Dashboard", onOpenSidebar }) {
  const { gymId, role, user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'ending_soon', 'expired', 'overdue', 'birthday', 'inactive', 'demo', 'gym', 'pt', 'partial'
  const dropdownRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
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

  // Fetch members and visits to calculate live notices
  useEffect(() => {
    async function load() {
      try {
        const [mData, vData] = await Promise.all([
          getMembers(gymId || "univo_main"),
          getVisits(gymId || "univo_main")
        ]);
        setMembers(mData || []);
        setVisits(vData || []);
      } catch (e) {
        console.warn("Topbar notifications load warning:", e);
      }
    }
    load();
  }, [gymId, notificationsOpen]);

  // Demo Action List
  const demoActionList = visits
    .filter((v) => v.status !== "converted" && v.status !== "lost")
    .map((v) => ({ ...v, demoNotice: getDemoNotice(v), isDemo: true }))
    .filter((v) => v.demoNotice.isActionable);

  // Candidates & Counts
  const memberActionList = members.filter((m) => getMemberNotice(m).isActionable);
  const totalActionCount = memberActionList.length + demoActionList.length;
  const endingSoonCount = members.filter((m) => getMemberNotice(m).isEndingSoon && m.status !== 'left' && m.status !== 'ended').length;
  const expiredCount = members.filter((m) => getMemberNotice(m).isExpired && m.status !== 'left' && m.status !== 'ended').length;
  const overdueCount = members.filter((m) => getMemberNotice(m).isOverdue && m.status !== 'left' && m.status !== 'ended').length;
  const birthdayCount = members.filter((m) => getMemberNotice(m).isBirthday && m.status !== 'left' && m.status !== 'ended').length;
  const inactiveCount = members.filter((m) => getMemberNotice(m).isInactive && m.status !== 'left' && m.status !== 'ended').length;
  const demoCount = demoActionList.length;
  const gymActionCount = members.filter((m) => {
    const n = getMemberNotice(m);
    return n.isActionable && (!m.ptPlanName || m.ptStatus === 'ended');
  }).length;
  const ptActionCount = members.filter((m) => {
    const n = getMemberNotice(m);
    return n.isActionable && n.isPt;
  }).length;
  const partialCount = members.filter((m) => getMemberNotice(m).isPartial && m.status !== 'left' && m.status !== 'ended').length;

  let notificationList = [];
  if (activeTab === "demo") {
    notificationList = demoActionList;
  } else if (activeTab === "all") {
    notificationList = [...memberActionList, ...demoActionList];
  } else {
    notificationList = members.filter((m) => {
      const n = getMemberNotice(m);
      if (!n.isActionable) return false;
      if (activeTab === 'ending_soon') return n.isEndingSoon;
      if (activeTab === 'expired') return n.isExpired;
      if (activeTab === 'overdue') return n.isOverdue;
      if (activeTab === 'birthday') return n.isBirthday;
      if (activeTab === 'inactive') return n.isInactive;
      if (activeTab === 'gym') return (!m.ptPlanName || m.ptStatus === 'ended');
      if (activeTab === 'pt') return n.isPt;
      if (activeTab === 'partial') return n.isPartial;
      return true;
    });
  }

  const sentCount = notificationList.filter((m) => !!m.lastReminderSent).length;
  const pendingCount = notificationList.length - sentCount;

  const handleSendReminder = async (m) => {
    // If Demo Lead
    if (m.isDemo) {
      const rawNum = (m.phone || '').replace(/\D/g, '');
      if (!rawNum) {
        toast.error(`Phone number missing for ${m.name}`);
        return;
      }
      let msg = '';
      if (m.demoNotice.isEndingToday) {
        msg = generateDemoEndingTodayMessage(m.name, m.interestedIn);
      } else if (m.demoNotice.isEnded) {
        msg = generateDemoEndedMessage(m.name, m.interestedIn, m.assignedTrainer);
      } else {
        msg = generateVisitFollowupMessage(m.name, m.interestedIn);
      }
      openWhatsApp(rawNum, msg);
      const nowIso = new Date().toISOString();
      setVisits((prev) =>
        prev.map((item) => (item.id === m.id ? { ...item, lastReminderSent: nowIso } : item))
      );
      try {
        await updateVisit(gymId || "univo_main", m.id, { lastReminderSent: nowIso });
      } catch (e) {
        console.warn("Could not save lastReminderSent for visit:", e);
      }
      toast.success(`WhatsApp reminder sent to ${m.name}!`);
      return;
    }

    const rawNum = (m.phone || '').replace(/\D/g, '');
    if (!rawNum) {
      toast.error(`Phone number missing for ${m.name || m.fullName}`);
      return;
    }

    const n = getMemberNotice(m);
    let msg = '';

    // 0. Birthday Greeting
    if (n.isBirthday && (activeTab === 'birthday' || (!n.isEndingSoon && !n.isExpired && !n.isOverdue && !n.isPartial))) {
      msg = generateBirthdayMessage(m.name || m.fullName);
    }
    // 0.1 Inactive Member Follow-up
    else if (n.isInactive && (activeTab === 'inactive' || (!n.isEndingSoon && !n.isExpired && !n.isOverdue && !n.isPartial))) {
      msg = generateInactiveMemberMessage(m.name || m.fullName, n.daysAbsent, m.planName);
    }
    // 1. Partial Due
    else if (n.isPartial && (activeTab === 'partial' || (!n.isEndingSoon && !n.isExpired && !n.isOverdue))) {
      msg = generatePartialDueReminderMessage(
        m.name || m.fullName,
        m.dueAmount,
        m.ptPlanName ? `${m.planName || 'Gym'} + PT (${m.ptPlanName})` : (m.planName || 'Gym Plan')
      );
    }
    // 2. Ending Soon (PT)
    else if (n.isPtEndingSoon && (activeTab === 'pt' || !n.isGymEndingSoon || !m.planName)) {
      msg = generatePtRenewalReminderMessage(
        m.name || m.fullName,
        m.ptPlanName || '1-on-1 PT Plan',
        m.trainerName || 'Assigned Coach',
        formatDate(m.ptEndDate || m.ptExpiryDate || m.expiryDate),
        m.ptPlanPrice || '2,500',
        n.ptDiff
      );
    }
    // 3. Ending Soon (Gym)
    else if (n.isGymEndingSoon) {
      msg = generateRenewalReminderMessage(
        m.name || m.fullName,
        m.planName || 'Gym Plan',
        formatDate(m.expiryDate),
        m.planPrice || '2,500',
        n.gymDiff
      );
    }
    // 4. Expired Day 1 & 2 (PT)
    else if (n.isPtExpired && (activeTab === 'pt' || !n.isGymExpired || !m.planName)) {
      msg = generatePtExpiredMessage(
        m.name || m.fullName,
        m.ptPlanName || '1-on-1 PT Plan',
        m.trainerName || 'Assigned Coach',
        formatDate(m.ptEndDate || m.ptExpiryDate || m.expiryDate),
        m.ptPlanPrice || '2,500',
        Math.abs(n.ptDiff)
      );
    }
    // 5. Expired Day 1 & 2 (Gym)
    else if (n.isGymExpired) {
      msg = generateExpiredMessage(
        m.name || m.fullName,
        m.planName || 'Gym Plan',
        formatDate(m.expiryDate),
        m.planPrice || '2,500',
        Math.abs(n.gymDiff)
      );
    }
    // 6. Overdue Day 3+ (PT)
    else if (n.isPtOverdue && (activeTab === 'pt' || !n.isGymOverdue || !m.planName)) {
      msg = generatePtOverdueReminderMessage(
        m.name || m.fullName,
        m.ptPlanName || '1-on-1 PT Plan',
        m.trainerName || 'Assigned Coach',
        Math.abs(n.ptDiff),
        m.ptPlanPrice || '2,500',
        m.ptEndDate || m.ptExpiryDate || m.expiryDate
      );
    }
    // 7. Overdue Day 3+ (Gym)
    else if (n.isGymOverdue) {
      msg = generateOverdueReminderMessage(
        m.name || m.fullName,
        m.planName || 'Gym Plan',
        Math.abs(n.gymDiff),
        m.planPrice || '2,500',
        m.expiryDate
      );
    }
    // Fallback
    else {
      msg = generateRenewalReminderMessage(
        m.name || m.fullName,
        m.planName || 'Gym Plan',
        formatDate(m.expiryDate),
        m.planPrice || '2,500',
        n.gymDiff
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
                  { key: "ending_soon", label: `⏳ Ending Soon (${endingSoonCount})` },
                  { key: "expired", label: `🚨 Expired (${expiredCount})` },
                  { key: "overdue", label: `⛔ Overdue (${overdueCount})` },
                  { key: "birthday", label: `🎂 Birthday (${birthdayCount})` },
                  { key: "inactive", label: `🏃 Inactive (${inactiveCount})` },
                  { key: "demo", label: `🎯 Demo (${demoCount})` },
                  { key: "gym", label: `🏋️ Gym (${gymActionCount})` },
                  { key: "pt", label: `✨ PT (${ptActionCount})` },
                  { key: "partial", label: `Partial Due (${partialCount})` },
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
                    🎉 All members and demo trials are up to date! No pending alerts.
                  </div>
                ) : (
                  notificationList.map((m) => {
                    if (m.isDemo) {
                      const sentTime = m.lastReminderSent ? new Date(m.lastReminderSent) : null;
                      return (
                        <div key={m.id} className="py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/70 px-1 rounded-lg transition">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {m.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                🎯 Demo Lead
                              </span>
                              {m.demoNotice?.isEndingToday ? (
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                                  ⏳ Demo Ends Today!
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-cyan-100 text-cyan-900 border border-cyan-300">
                                  🎯 Demo Ended
                                </span>
                              )}
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
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span>Program: <strong className="text-slate-700">{m.interestedIn || 'General Fitness'}</strong></span>
                              {m.demoDate && <span>• Demo Date: {formatDate(m.demoDate)}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendReminder(m)}
                            className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm transition shrink-0 cursor-pointer"
                            title="Send WhatsApp Message"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send</span>
                          </button>
                        </div>
                      );
                    }

                    const n = getMemberNotice(m);
                    const isDue = n.due > 0;
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

                            {/* Exact Ending Soon Countdown Badge (3, 2, 1 Days or Today) */}
                            {(() => {
                              if (n.isPtEndingSoon && (activeTab === 'pt' || !n.isGymEndingSoon)) {
                                const d = n.ptDiff;
                                if (d === 0) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-200">🚨 PT Ends Today!</span>;
                                if (d === 1) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-orange-100 text-orange-800 border border-orange-200">⚠️ PT Ends Tomorrow</span>;
                                if (d === 2) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-200">⏳ PT Ends in 2 Days</span>;
                                if (d === 3) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-50 text-amber-800 border border-amber-200">⏳ PT Ends in 3 Days</span>;
                              }
                              if (n.isGymEndingSoon) {
                                const d = n.gymDiff;
                                if (d === 0) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-200">🚨 Ends Today!</span>;
                                if (d === 1) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-orange-100 text-orange-800 border border-orange-200">⚠️ Ends Tomorrow</span>;
                                if (d === 2) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-200">⏳ Ends in 2 Days</span>;
                                if (d === 3) return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-50 text-amber-800 border border-amber-200">⏳ Ends in 3 Days</span>;
                              }
                              if (n.isPtExpired && (activeTab === 'pt' || !n.isGymExpired)) {
                                const d = Math.abs(n.ptDiff);
                                return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-100 text-rose-900 border border-rose-200">🚨 PT Expired (Day {d})</span>;
                              }
                              if (n.isGymExpired) {
                                const d = Math.abs(n.gymDiff);
                                return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-100 text-rose-900 border border-rose-200">🚨 Expired (Day {d})</span>;
                              }
                              if (n.isPtOverdue && (activeTab === 'pt' || !n.isGymOverdue)) {
                                const d = Math.abs(n.ptDiff);
                                return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-red-100 text-red-900 border border-red-300">⛔ PT Overdue ({d}d)</span>;
                              }
                               if (n.isGymOverdue) {
                                const d = Math.abs(n.gymDiff);
                                return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-red-100 text-red-900 border border-red-300">⛔ Overdue ({d}d)</span>;
                              }
                              return null;
                            })()}

                            {/* Birthday Badge */}
                            {n.isBirthday && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-pink-100 text-pink-900 border border-pink-300">
                                🎂 Birthday Today! 🎉
                              </span>
                            )}

                            {/* Inactive Member Badge */}
                            {n.isInactive && (
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                🏃 Absent ({n.daysAbsent}d)
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
                            ) : n.isBirthday ? (
                              <span className="font-bold text-pink-600">🎂 Birthday Wishes Pending</span>
                            ) : n.isInactive ? (
                              <span className="font-bold text-amber-600">🏃 Inactive for {n.daysAbsent} days</span>
                            ) : (
                              <span className={n.isOverdue ? 'font-bold text-red-600' : 'font-semibold text-amber-700'}>
                                {n.isOverdue ? 'Overdue Plan' : `Exp: ${formatDate(m.ptEndDate || m.ptExpiryDate || m.expiryDate)}`}
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
                          title={m.lastReminderSent ? "Click to resend reminder on WhatsApp in 1 click" : "1-Click Send reminder on WhatsApp"}
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
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition flex items-center gap-1 text-xs font-bold shadow-xs active:scale-95 ml-1 cursor-pointer"
            title="Log Out of your account"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

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
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
