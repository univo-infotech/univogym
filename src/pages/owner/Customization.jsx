import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  DollarSign,
  TrendingUp,
  Users,
  Wrench,
  Zap,
  Layers,
  Check,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Send,
  CheckCheck,
  Copy,
  Clock,
  AlertTriangle,
  HelpCircle,
  FileText,
  Gift,
  UserCheck,
  Smartphone,
  PhoneCall,
  Flame
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getGymSettings, saveGymSettings, fetchGymSettings, DEFAULT_SETTINGS } from "../../utils/settings";
import { useAuth } from "../../contexts/AuthContext";
import { openWhatsApp } from "../../utils/whatsapp";

// Master definitions of all dashboard blocks (Tab 1)
const ALL_DASHBOARD_SECTIONS = [
  {
    id: "banner",
    label: "Welcome Banner & Quick Action Buttons",
    shortLabel: "Banner & Actions",
    category: "Header",
    color: "from-emerald-600 to-teal-700",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: Sparkles,
    desc: "Gym Owner greeting, tagline, 10-Minute Member WhatsApp Invite Link button, and Add Member Directly modal button."
  },
  {
    id: "quick_jump",
    label: "Quick Jump Shortcuts Bar",
    shortLabel: "Navigation Bar",
    category: "Navigation",
    color: "from-blue-600 to-cyan-700",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Zap,
    desc: "1-Click horizontal quick navigation pills to Members, Payments, Attendance, Offers, Visits, Expenses, Stock and Reports."
  },
  {
    id: "kpi_stats",
    label: "Key Performance Metric Cards (KPIs)",
    shortLabel: "KPI Metric Cards",
    category: "Overview",
    color: "from-amber-600 to-orange-700",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    icon: LayoutGrid,
    desc: "Essential business cards: Active Members, Today's Collection, Gym Net Revenue, Renewals Due, Pending Dues, and Walk-in Leads."
  },
  {
    id: "pnl_strip",
    label: "Live Financial P&L Summary Strip",
    shortLabel: "Live P&L Strip",
    category: "Financials",
    color: "from-teal-800 to-slate-900",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    icon: DollarSign,
    desc: "Detailed ledger strip: Gross Inflow, Coach/Trainer Cuts, Gym Retained Revenue, Overhead Costs, and Net Operating Take-Home Profit."
  },
  {
    id: "urgent_renewals",
    label: "Urgent Plan Expiries & Renewal Reminders",
    shortLabel: "Urgent Renewals",
    category: "Members",
    color: "from-amber-600 to-rose-600",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
    icon: Clock,
    desc: "Live list of athletes expiring in the next 3 days or today, with countdown badges, plan prices, and 1-Click WhatsApp reminder buttons."
  },
  {
    id: "pending_dues",
    label: "Outstanding Fee Balances & Dues Feed",
    shortLabel: "Pending Dues",
    category: "Financials",
    color: "from-rose-600 to-red-700",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-200",
    icon: AlertTriangle,
    desc: "Athletes with partial payments and pending fee balances, with total gym dues counter and direct Collect Fee & WhatsApp alert buttons."
  },
  {
    id: "today_attendance",
    label: "Today's Live Floor Attendance & Punch Feed",
    shortLabel: "Live Attendance",
    category: "Operations",
    color: "from-teal-600 to-cyan-700",
    badgeColor: "bg-teal-100 text-teal-900 border-teal-200",
    icon: CheckCircle2,
    desc: "Today's total gym check-ins, morning vs evening breakdown, and live stream of athletes who scanned in at the entrance."
  },
  {
    id: "today_demos",
    label: "Walk-in Leads & Demo Trials Action Board",
    shortLabel: "Demo & Leads",
    category: "Leads",
    color: "from-blue-600 to-indigo-700",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-200",
    icon: UserCheck,
    desc: "Today's scheduled trial workouts, expiring trial demos, with 1-click WhatsApp follow-up and Convert to Member shortcuts."
  },
  {
    id: "recent_payments",
    label: "Latest Fee Payments & Tax Receipts Stream",
    shortLabel: "Recent Payments",
    category: "Financials",
    color: "from-emerald-600 to-teal-700",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-200",
    icon: FileText,
    desc: "Live ledger stream of fees collected today with member names, payment modes (UPI/Cash/Bank/Split), and 1-click Receipt PDF button."
  },
  {
    id: "charts_row",
    label: "Financial Analytics & Charts Section",
    shortLabel: "Charts & Graphs",
    category: "Analytics",
    color: "from-indigo-600 to-purple-700",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: TrendingUp,
    desc: "Weekly Revenue Growth trend area graph and Payment Modes distribution (UPI, Cash, Bank, Split) pie chart."
  },
  {
    id: "recent_members",
    label: "Recently Enrolled Members Feed",
    shortLabel: "Recent Members",
    category: "Members",
    color: "from-emerald-700 to-green-800",
    badgeColor: "bg-green-100 text-green-800 border-green-200",
    icon: Users,
    desc: "Live list of the latest registered gym athletes with direct click-through to their complete member profiles."
  },
  {
    id: "equipment_status",
    label: "Equipment & Service Maintenance Status",
    shortLabel: "Stock & Service",
    category: "Inventory",
    color: "from-slate-700 to-slate-900",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    icon: Wrench,
    desc: "Gym machinery conditions, overdue servicing warnings, and direct shortcut to the equipment stock manager."
  }
];

// Preset layout templates for Tab 1
const PRESET_TEMPLATES = [
  {
    id: "default",
    name: "⚡ Standard Complete Overview",
    desc: "Full overview with Banner, Shortcuts, KPIs, P&L, Renewals, Dues, Attendance, Demos, Payments, and Charts.",
    order: [
      "banner",
      "quick_jump",
      "kpi_stats",
      "pnl_strip",
      "urgent_renewals",
      "pending_dues",
      "today_attendance",
      "today_demos",
      "recent_payments",
      "charts_row",
      "recent_members",
      "equipment_status"
    ],
    visible: {
      banner: true,
      quick_jump: true,
      kpi_stats: true,
      pnl_strip: true,
      urgent_renewals: true,
      pending_dues: true,
      today_attendance: true,
      today_demos: true,
      recent_payments: true,
      charts_row: true,
      recent_members: true,
      equipment_status: true
    }
  },
  {
    id: "finance_first",
    name: "💰 Cashflow & Revenue First",
    desc: "Prioritizes incoming revenue: Pending Dues, Recent Payments, P&L Strip and Charts placed at the top.",
    order: [
      "pnl_strip",
      "pending_dues",
      "recent_payments",
      "urgent_renewals",
      "charts_row",
      "kpi_stats",
      "quick_jump",
      "banner",
      "today_attendance",
      "today_demos",
      "recent_members",
      "equipment_status"
    ],
    visible: {
      banner: true,
      quick_jump: true,
      kpi_stats: true,
      pnl_strip: true,
      urgent_renewals: true,
      pending_dues: true,
      today_attendance: true,
      today_demos: true,
      recent_payments: true,
      charts_row: true,
      recent_members: true,
      equipment_status: true
    }
  },
  {
    id: "members_ops",
    name: "👥 Operations & Floor First",
    desc: "Focuses on daily gym floor: Live Attendance, Urgent Renewals, Demo Leads, and Recent Members at top.",
    order: [
      "kpi_stats",
      "today_attendance",
      "urgent_renewals",
      "today_demos",
      "recent_members",
      "quick_jump",
      "pending_dues",
      "pnl_strip",
      "recent_payments",
      "banner",
      "charts_row",
      "equipment_status"
    ],
    visible: {
      banner: true,
      quick_jump: true,
      kpi_stats: true,
      pnl_strip: true,
      urgent_renewals: true,
      pending_dues: true,
      today_attendance: true,
      today_demos: true,
      recent_payments: true,
      charts_row: true,
      recent_members: true,
      equipment_status: true
    }
  },
  {
    id: "minimal_speed",
    name: "🚀 Minimal & Essential View",
    desc: "Ultra-fast daily view: Only Quick Jump, KPI Cards, Urgent Renewals, and Pending Dues.",
    order: [
      "quick_jump",
      "kpi_stats",
      "urgent_renewals",
      "pending_dues",
      "pnl_strip",
      "banner",
      "today_attendance",
      "today_demos",
      "recent_payments",
      "charts_row",
      "recent_members",
      "equipment_status"
    ],
    visible: {
      banner: false,
      quick_jump: true,
      kpi_stats: true,
      pnl_strip: false,
      urgent_renewals: true,
      pending_dues: true,
      today_attendance: false,
      today_demos: false,
      recent_payments: false,
      charts_row: false,
      recent_members: false,
      equipment_status: false
    }
  }
];

// Master list of all customizable WhatsApp Notification Templates (Tab 2)
const ALL_WHATSAPP_TEMPLATES = [
  {
    id: "whatsappReminder",
    name: "Ending Soon: Gym Membership Renewal (3, 2, 1 Days & Today)",
    category: "ending_soon",
    categoryLabel: "Ending Soon (Gym)",
    trigger: "Sent 3 days, 2 days, 1 day before expiry, and on the day of expiry (today)",
    badge: "Ending Soon (3 to 0 Days)",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
    defaultText: DEFAULT_SETTINGS.whatsappReminder,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Rahul Sharma" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. 3 Months Fitness Pro" },
      { key: "{expiry}", label: "Expiry Date", desc: "e.g. 05 Oct 2026" },
      { key: "{days_left}", label: "Days Left Text", desc: "e.g. in 3 days / tomorrow / today" },
      { key: "{days}", label: "Days Number", desc: "e.g. 3 / 2 / 1 / 0" },
      { key: "{amount}", label: "Renewal Amount", desc: "e.g. 3,500" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Rahul Sharma",
      "{plan}": "3 Months Fitness Pro",
      "{expiry}": "05 Oct 2026",
      "{days_left}": "in 3 days",
      "{days}": "3",
      "{amount}": "3,500",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappPtReminder",
    name: "Ending Soon: Personal Training (PT) Renewal (3, 2, 1 Days & Today)",
    category: "ending_soon",
    categoryLabel: "Ending Soon (PT)",
    trigger: "Sent 3 days, 2 days, 1 day before PT package expiry, and on the day of expiry (today)",
    badge: "PT Ending Soon (3 to 0 Days)",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Sparkles,
    defaultText: DEFAULT_SETTINGS.whatsappPtReminder,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Vikram" },
      { key: "{trainer}", label: "Trainer Name", desc: "e.g. Coach Aryan" },
      { key: "{plan}", label: "PT Plan", desc: "e.g. 1-on-1 Transformation PT" },
      { key: "{expiry}", label: "Expiry Date", desc: "e.g. 08 Oct 2026" },
      { key: "{days_left}", label: "Days Left Text", desc: "e.g. in 2 days / tomorrow / today" },
      { key: "{days}", label: "Days Number", desc: "e.g. 2" },
      { key: "{amount}", label: "Renewal Amount", desc: "e.g. 6,000" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Vikram Malhotra",
      "{trainer}": "Coach Aryan",
      "{plan}": "1-on-1 Transformation PT",
      "{expiry}": "08 Oct 2026",
      "{days_left}": "in 2 days",
      "{days}": "2",
      "{amount}": "6,000",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappExpired",
    name: "Expired: Gym Membership Expired Alert (Day 1 & Day 2)",
    category: "expired",
    categoryLabel: "Expired (Day 1-2)",
    trigger: "Sent daily on Day 1 and Day 2 immediately after gym membership expiration",
    badge: "Expired (Day 1 & 2)",
    badgeColor: "bg-red-100 text-red-800 border-red-200",
    icon: AlertTriangle,
    defaultText: DEFAULT_SETTINGS.whatsappExpired,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Rohit Mehra" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. 3 Months Fitness Pro" },
      { key: "{expiry}", label: "Expiry Date", desc: "e.g. 27 Sep 2026" },
      { key: "{days_expired}", label: "Days Expired Phrase", desc: "e.g. yesterday (1 day ago) / 2 days ago" },
      { key: "{days}", label: "Days Count", desc: "e.g. 1 / 2" },
      { key: "{amount}", label: "Renewal Amount", desc: "e.g. 3,500" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Rohit Mehra",
      "{plan}": "3 Months Fitness Pro",
      "{expiry}": "27 Sep 2026",
      "{days_expired}": "yesterday (1 day ago)",
      "{days}": "1",
      "{amount}": "3,500",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappPtExpired",
    name: "Expired: Personal Training (PT) Expired Alert (Day 1 & Day 2)",
    category: "expired",
    categoryLabel: "Expired (Day 1-2)",
    trigger: "Sent daily on Day 1 and Day 2 immediately after PT package expiration",
    badge: "PT Expired (Day 1 & 2)",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    icon: AlertTriangle,
    defaultText: DEFAULT_SETTINGS.whatsappPtExpired,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Simran Kaur" },
      { key: "{trainer}", label: "Trainer Name", desc: "e.g. Coach Aryan" },
      { key: "{plan}", label: "PT Plan", desc: "e.g. Personal Training 20 Sessions" },
      { key: "{expiry}", label: "Expiry Date", desc: "e.g. 27 Sep 2026" },
      { key: "{days_expired}", label: "Days Expired Phrase", desc: "e.g. yesterday (1 day ago) / 2 days ago" },
      { key: "{days}", label: "Days Count", desc: "e.g. 1 / 2" },
      { key: "{amount}", label: "Renewal Amount", desc: "e.g. 5,000" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Simran Kaur",
      "{trainer}": "Coach Aryan",
      "{plan}": "Personal Training 20 Sessions",
      "{expiry}": "27 Sep 2026",
      "{days_expired}": "2 days ago",
      "{days}": "2",
      "{amount}": "5,000",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappOverdue",
    name: "Overdue: Gym Membership Overdue Notice (Day 3+ Overdue)",
    category: "overdue",
    categoryLabel: "Overdue (Day 3+)",
    trigger: "Sent starting Day 3 after membership expiration and beyond",
    badge: "Overdue (Day 3+)",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
    icon: AlertTriangle,
    defaultText: DEFAULT_SETTINGS.whatsappOverdue,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Amit Verma" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. Monthly Standard" },
      { key: "{expiry}", label: "Expired Date", desc: "e.g. 24 Sep 2026" },
      { key: "{days_overdue}", label: "Days Overdue Text", desc: "e.g. 5 days / 3 days" },
      { key: "{days}", label: "Days Count", desc: "e.g. 5" },
      { key: "{amount}", label: "Renewal Amount", desc: "e.g. 1,500" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Amit Verma",
      "{plan}": "Monthly Standard",
      "{expiry}": "24 Sep 2026",
      "{days_overdue}": "5 days",
      "{days}": "5",
      "{amount}": "1,500",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappPtOverdue",
    name: "Overdue: Personal Training (PT) Overdue Notice (Day 3+ Overdue)",
    category: "overdue",
    categoryLabel: "Overdue (Day 3+)",
    trigger: "Sent starting Day 3 after PT package expiration and beyond",
    badge: "PT Overdue (Day 3+)",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    icon: AlertTriangle,
    defaultText: DEFAULT_SETTINGS.whatsappPtOverdue,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Sameer Khan" },
      { key: "{trainer}", label: "Trainer Name", desc: "e.g. Coach Aryan" },
      { key: "{plan}", label: "PT Plan", desc: "e.g. 1-on-1 PT Gold" },
      { key: "{days_overdue}", label: "Days Overdue Text", desc: "e.g. 4 days / 3 days" },
      { key: "{days}", label: "Days Count", desc: "e.g. 4" },
      { key: "{amount}", label: "Renewal Amount", desc: "e.g. 6,000" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Sameer Khan",
      "{trainer}": "Coach Aryan",
      "{plan}": "1-on-1 PT Gold",
      "{days_overdue}": "4 days",
      "{days}": "4",
      "{amount}": "6,000",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappPartialDue",
    name: "Pending / Partial Fee Balance Reminder",
    category: "fee",
    categoryLabel: "Fee & Expiry",
    trigger: "Sent to members with a partial fee balance or pending installment",
    badge: "Balance Due Reminder",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    icon: DollarSign,
    defaultText: DEFAULT_SETTINGS.whatsappPartialDue,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Priya Singh" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. 6 Months Plan" },
      { key: "{amount}", label: "Due Amount", desc: "e.g. 2,000" },
      { key: "{due_amount}", label: "Due Amount", desc: "e.g. 2,000" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Priya Singh",
      "{plan}": "6 Months Transformation",
      "{amount}": "2,000",
      "{due_amount}": "2,000",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappWelcome",
    name: "New Member Welcome & Onboarding",
    category: "onboarding",
    categoryLabel: "Welcome & Onboarding",
    trigger: "Sent immediately when a new member registers or is approved",
    badge: "Welcome Greeting",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: UserCheck,
    defaultText: DEFAULT_SETTINGS.whatsappWelcome,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Deepak Patel" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. Annual Gold Plan" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Deepak Patel",
      "{plan}": "Annual Gold Plan",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappReceipt",
    name: "Official Payment Receipt Confirmation",
    category: "receipts",
    categoryLabel: "Receipts & Bills",
    trigger: "Sent right after recording a fee payment (Cash, UPI, Bank)",
    badge: "Paid Receipt Confirmation",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    icon: FileText,
    defaultText: DEFAULT_SETTINGS.whatsappReceipt,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Sneha Kapoor" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. Quarterly Pro" },
      { key: "{amount}", label: "Paid Amount", desc: "e.g. 4,500" },
      { key: "{date}", label: "Payment Date", desc: "e.g. 28 Sep 2026" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Sneha Kapoor",
      "{plan}": "Quarterly Pro",
      "{amount}": "4,500",
      "{date}": "28 Sep 2026",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappInvite",
    name: "10-Minute Self-Registration WhatsApp Link",
    category: "onboarding",
    categoryLabel: "Welcome & Onboarding",
    trigger: "Sent when sharing the direct 10-minute self-registration invite link",
    badge: "10-Min Invite Link",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Smartphone,
    defaultText: DEFAULT_SETTINGS.whatsappInvite,
    variables: [
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" },
      { key: "{link}", label: "Registration Link", desc: "Direct secure registration link" }
    ],
    sampleData: {
      "{gym_name}": "UNIVO FITNESS CENTRE",
      "{link}": "https://univogym.com/#/register/univo_main/demo987xyz"
    }
  },
  {
    id: "whatsappBirthday",
    name: "Member Birthday Greetings & Fitness Wishes",
    category: "engagement",
    categoryLabel: "Engagement & Leads",
    trigger: "Sent on the member's birthday as a personalized fitness greeting",
    badge: "Birthday Wish",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Gift,
    defaultText: DEFAULT_SETTINGS.whatsappBirthday,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Rohan Gupta" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Rohan Gupta",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappDemoEndingToday",
    name: "Demo: Trial Session Ending Today Alert",
    category: "demo",
    categoryLabel: "Demo & Leads",
    trigger: "Sent on the day of the trial workout session (ending today)",
    badge: "Demo Ending Today",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
    defaultText: DEFAULT_SETTINGS.whatsappDemoEndingToday,
    variables: [
      { key: "{name}", label: "Candidate Name", desc: "e.g. Rahul Sharma" },
      { key: "{plan}", label: "Fitness Program", desc: "e.g. Fat Loss & Strength" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Rahul Sharma",
      "{plan}": "Fat Loss & Strength",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappDemoEnded",
    name: "Demo: Trial Session Ended / Completed Follow-up",
    category: "demo",
    categoryLabel: "Demo & Leads",
    trigger: "Sent after the demo session has finished to enroll the prospect",
    badge: "Demo Completed",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    icon: Sparkles,
    defaultText: DEFAULT_SETTINGS.whatsappDemoEnded,
    variables: [
      { key: "{name}", label: "Candidate Name", desc: "e.g. Kavita Rao" },
      { key: "{plan}", label: "Fitness Program", desc: "e.g. Personal Training & Diet" },
      { key: "{trainer}", label: "Trainer Name", desc: "e.g. Coach Sneha" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Kavita Rao",
      "{plan}": "Personal Training & Diet",
      "{trainer}": "Coach Sneha",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappVisitFollowup",
    name: "Walk-in Lead & General Visit Follow-up",
    category: "demo",
    categoryLabel: "Demo & Leads",
    trigger: "Sent to follow up with walk-in visitors and general inquiries",
    badge: "Visit Follow-up",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: PhoneCall,
    defaultText: DEFAULT_SETTINGS.whatsappVisitFollowup,
    variables: [
      { key: "{name}", label: "Visitor Name", desc: "e.g. Anil Kumar" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. Strength & Conditioning" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Anil Kumar",
      "{plan}": "Strength & Conditioning",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappMemberLogin",
    name: "Member Portal App Login ID & Password",
    category: "onboarding",
    categoryLabel: "Welcome & Onboarding",
    trigger: "Sent when sharing member login credentials for athlete portal/app",
    badge: "App Login Credentials",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Smartphone,
    defaultText: DEFAULT_SETTINGS.whatsappMemberLogin,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Rahul Sharma" },
      { key: "{phone}", label: "Login ID / Phone", desc: "e.g. 9876543210" },
      { key: "{password}", label: "Password", desc: "e.g. Rahul@2026" },
      { key: "{link}", label: "Login Portal Link", desc: "Portal web address" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Rahul Sharma",
      "{phone}": "9876543210",
      "{password}": "Rahul@2026",
      "{link}": "https://univogym.com/#/login",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappExtension",
    name: "Membership Validity Extension Confirmation (+Days)",
    category: "receipts",
    categoryLabel: "Receipts & Invoices",
    trigger: "Sent after adding bonus or paid extension days to a membership",
    badge: "Plan Extended Notice",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    icon: Clock,
    defaultText: DEFAULT_SETTINGS.whatsappExtension,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Vikas Patel" },
      { key: "{extra_days}", label: "Added Days", desc: "e.g. 15" },
      { key: "{expiry}", label: "New Expiry Date", desc: "e.g. 20 Nov 2026" },
      { key: "{amount}", label: "Extension Fee", desc: "e.g. 800" },
      { key: "{mode}", label: "Payment Mode", desc: "e.g. CASH / UPI" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Vikas Patel",
      "{extra_days}": "15",
      "{expiry}": "20 Nov 2026",
      "{amount}": "800",
      "{mode}": "UPI",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappPtInvoice",
    name: "Personal Training (PT) Package Invoice & Receipt",
    category: "receipts",
    categoryLabel: "Receipts & Invoices",
    trigger: "Sent when enrolling or renewing a Personal Training transformation package",
    badge: "PT Official Invoice",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Sparkles,
    defaultText: DEFAULT_SETTINGS.whatsappPtInvoice,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Rohit Mehra" },
      { key: "{trainer}", label: "Coach Name", desc: "e.g. Coach Aryan" },
      { key: "{plan}", label: "PT Plan Name", desc: "e.g. 20 Sessions Muscle Gain" },
      { key: "{expiry}", label: "Valid Till", desc: "e.g. 15 Nov 2026" },
      { key: "{duration}", label: "Duration Days", desc: "e.g. 30" },
      { key: "{amount}", label: "Total PT Fee", desc: "e.g. 6,000" },
      { key: "{paid}", label: "Paid Amount", desc: "e.g. 6,000" },
      { key: "{due_text}", label: "Due Status", desc: "e.g. Status: FULLY PAID" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Rohit Mehra",
      "{trainer}": "Coach Aryan",
      "{plan}": "20 Sessions Muscle Gain",
      "{expiry}": "15 Nov 2026",
      "{duration}": "30",
      "{amount}": "6,000",
      "{paid}": "6,000",
      "{due_text}": "✨ Status: FULLY PAID",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappServiceInvoice",
    name: "Gym Facility / Amenity Service Invoice (Locker, Sauna, Zumba)",
    category: "receipts",
    categoryLabel: "Receipts & Invoices",
    trigger: "Sent when a member subscribes to Lockers, Steam Bath, Sauna, or Diet Consultation",
    badge: "Facility Amenity Bill",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    icon: FileText,
    defaultText: DEFAULT_SETTINGS.whatsappServiceInvoice,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Pooja Sharma" },
      { key: "{service}", label: "Service Name", desc: "e.g. Locker #24" },
      { key: "{category}", label: "Category", desc: "e.g. Premium Locker" },
      { key: "{duration}", label: "Duration", desc: "e.g. 3 Months" },
      { key: "{expiry}", label: "Valid Till", desc: "e.g. 31 Dec 2026" },
      { key: "{amount}", label: "Total Fee", desc: "e.g. 1,500" },
      { key: "{paid}", label: "Paid Amount", desc: "e.g. 1,500" },
      { key: "{due_text}", label: "Due Status", desc: "e.g. Status: FULLY PAID" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Pooja Sharma",
      "{service}": "Locker #24",
      "{category}": "Premium Locker",
      "{duration}": "3 Months",
      "{expiry}": "31 Dec 2026",
      "{amount}": "1,500",
      "{paid}": "1,500",
      "{due_text}": "✨ Status: FULLY PAID",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappSupplementInvoice",
    name: "Supplement Store Digital Tax Invoice & Bill",
    category: "receipts",
    categoryLabel: "Receipts & Invoices",
    trigger: "Sent when selling Whey Protein, Creatine, Pre-workout, or gym merchandise from the store",
    badge: "Store Product Bill",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: DollarSign,
    defaultText: DEFAULT_SETTINGS.whatsappSupplementInvoice,
    variables: [
      { key: "{name}", label: "Customer Name", desc: "e.g. Kunal Sen" },
      { key: "{item}", label: "Product Name", desc: "e.g. Gold Whey Isolate 2kg" },
      { key: "{brand}", label: "Brand", desc: "e.g. Optimum Nutrition" },
      { key: "{quantity}", label: "Quantity", desc: "e.g. 1 Unit" },
      { key: "{amount}", label: "Total Paid", desc: "e.g. 4,800" },
      { key: "{mode}", label: "Payment Mode", desc: "e.g. UPI" },
      { key: "{date}", label: "Billing Date", desc: "e.g. 29 Sep 2026" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Kunal Sen",
      "{item}": "Gold Whey Isolate 2kg",
      "{brand}": "Optimum Nutrition",
      "{quantity}": "1 Unit",
      "{amount}": "4,800",
      "{mode}": "UPI",
      "{date}": "29 Sep 2026",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  },
  {
    id: "whatsappInactive",
    name: "Absent / Inactive Member Follow-up (7+ Days Inactivity)",
    category: "engagement",
    categoryLabel: "Engagement & Retention",
    trigger: "Sent to active members who have not checked in for their workouts in 7 or more days",
    badge: "We Miss You Alert",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    icon: Flame,
    defaultText: DEFAULT_SETTINGS.whatsappInactive,
    variables: [
      { key: "{name}", label: "Member Name", desc: "e.g. Ankit Roy" },
      { key: "{days_absent}", label: "Days Absent", desc: "e.g. 8" },
      { key: "{plan}", label: "Plan Name", desc: "e.g. 3 Months Transformation" },
      { key: "{gym_name}", label: "Gym Name", desc: "e.g. UNIVO FITNESS CENTRE" }
    ],
    sampleData: {
      "{name}": "Ankit Roy",
      "{days_absent}": "8",
      "{plan}": "3 Months Transformation",
      "{gym_name}": "UNIVO FITNESS CENTRE"
    }
  }
];

export default function Customization() {
  const navigate = useNavigate();
  const { gymId: authGymId } = useAuth();
  const gymId = authGymId || "univo_main";

  // Master Active Tab: "layout" (Tab 1: Dashboard Layout) or "whatsapp" (Tab 2: WhatsApp Notifications)
  const [activeTab, setActiveTab] = useState("layout");

  // Tab 2 Category Filter
  const [whatsappFilter, setWhatsappFilter] = useState("all");

  const [settings, setSettings] = useState(() => getGymSettings());
  const [sectionsOrder, setSectionsOrder] = useState(() => {
    return settings.dashboardLayout?.sectionsOrder || DEFAULT_SETTINGS.dashboardLayout.sectionsOrder;
  });
  const [visibleSections, setVisibleSections] = useState(() => {
    return settings.dashboardLayout?.visibleSections || DEFAULT_SETTINGS.dashboardLayout.visibleSections;
  });
  const [visibleKpis, setVisibleKpis] = useState(() => {
    return settings.dashboardLayout?.visibleKpis || DEFAULT_SETTINGS.dashboardLayout.visibleKpis;
  });

  // WhatsApp templates state initialized from settings
  const [whatsappTemplates, setWhatsappTemplates] = useState(() => {
    const s = getGymSettings();
    const initial = {};
    ALL_WHATSAPP_TEMPLATES.forEach((tpl) => {
      initial[tpl.id] = s[tpl.id] || tpl.defaultText;
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchGymSettings(gymId).then((data) => {
      if (data) {
        setSettings(data);
        if (data.dashboardLayout?.sectionsOrder) setSectionsOrder(data.dashboardLayout.sectionsOrder);
        if (data.dashboardLayout?.visibleSections) setVisibleSections(data.dashboardLayout.visibleSections);
        if (data.dashboardLayout?.visibleKpis) setVisibleKpis(data.dashboardLayout.visibleKpis);

        // Sync whatsapp templates
        const synced = {};
        ALL_WHATSAPP_TEMPLATES.forEach((tpl) => {
          synced[tpl.id] = data[tpl.id] || tpl.defaultText;
        });
        setWhatsappTemplates(synced);
      }
    });
  }, [gymId]);

  // Section moving functions (Up / Down / Top)
  const moveSection = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sectionsOrder.length) return;

    const updated = [...sectionsOrder];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);

    setSectionsOrder(updated);
    setHasChanges(true);
  };

  const moveToExtreme = (index, position) => {
    const updated = [...sectionsOrder];
    const [movedItem] = updated.splice(index, 1);
    if (position === "top") {
      updated.unshift(movedItem);
    } else {
      updated.push(movedItem);
    }
    setSectionsOrder(updated);
    setHasChanges(true);
  };

  // Toggle single section visibility
  const toggleSection = (id) => {
    setVisibleSections((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      setHasChanges(true);
      return updated;
    });
  };

  // Toggle single KPI card visibility
  const toggleKpi = (key) => {
    setVisibleKpis((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return updated;
    });
  };

  // Apply a preset template (Tab 1)
  const applyPreset = (preset) => {
    setSectionsOrder(preset.order);
    setVisibleSections(preset.visible);
    setHasChanges(true);
    toast.success(`Applied "${preset.name}" preset! Click Save Changes.`);
  };

  // Reset Tab 1 to Factory Default
  const handleResetLayoutToDefault = () => {
    setSectionsOrder([...DEFAULT_SETTINGS.dashboardLayout.sectionsOrder]);
    setVisibleSections({ ...DEFAULT_SETTINGS.dashboardLayout.visibleSections });
    setVisibleKpis({ ...DEFAULT_SETTINGS.dashboardLayout.visibleKpis });
    setHasChanges(true);
    toast.success("Dashboard order & visibility reset to defaults!");
  };

  // WhatsApp template change handler
  const handleTemplateChange = (id, newText) => {
    setWhatsappTemplates((prev) => ({
      ...prev,
      [id]: newText
    }));
    setHasChanges(true);
  };

  // Insert a variable tag into a template
  const handleInsertVariable = (id, varKey) => {
    setWhatsappTemplates((prev) => {
      const current = prev[id] || "";
      const updated = current + (current.endsWith(" ") || current.endsWith("\n") || !current ? "" : " ") + varKey;
      return {
        ...prev,
        [id]: updated
      };
    });
    setHasChanges(true);
    toast.success(`Tag ${varKey} inserted!`, { duration: 1500 });
  };

  // Reset a single WhatsApp template to default
  const handleResetSingleTemplate = (id) => {
    const tpl = ALL_WHATSAPP_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setWhatsappTemplates((prev) => ({
      ...prev,
      [id]: tpl.defaultText
    }));
    setHasChanges(true);
    toast.success(`Template reset to standard text!`);
  };

  // Reset all WhatsApp templates to defaults
  const handleResetAllWhatsApp = () => {
    const resetted = {};
    ALL_WHATSAPP_TEMPLATES.forEach((tpl) => {
      resetted[tpl.id] = tpl.defaultText;
    });
    setWhatsappTemplates(resetted);
    setHasChanges(true);
    toast.success("All WhatsApp notification templates reset to defaults!");
  };

  // Render preview with sample data
  const renderMessagePreview = (tpl, text) => {
    let result = text || "";
    Object.entries(tpl.sampleData).forEach(([key, val]) => {
      result = result.split(key).join(val);
    });
    return result;
  };

  // Test send to owner's WhatsApp
  const handleTestWhatsApp = (tpl) => {
    const currentText = whatsappTemplates[tpl.id] || tpl.defaultText;
    const rendered = renderMessagePreview(tpl, currentText);
    const encoded = encodeURIComponent(rendered);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // Copy template text
  const handleCopyMessage = (tpl) => {
    const currentText = whatsappTemplates[tpl.id] || tpl.defaultText;
    const rendered = renderMessagePreview(tpl, currentText);
    navigator.clipboard.writeText(rendered).then(() => {
      toast.success("Sample message copied to clipboard!");
    });
  };

  // Save changes to Firebase and runtime settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const newSettings = {
        ...settings,
        dashboardLayout: {
          sectionsOrder,
          visibleSections,
          visibleKpis
        },
        ...whatsappTemplates
      };
      await saveGymSettings(newSettings, gymId);
      setSettings(newSettings);
      setHasChanges(false);
      toast.success("Customization saved successfully! 🚀", {
        icon: "✨",
        duration: 4000
      });
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // Counts for Tab 1
  const visibleCount = Object.values(visibleSections).filter(Boolean).length;
  const hiddenCount = ALL_DASHBOARD_SECTIONS.length - visibleCount;

  // Filtered templates for Tab 2
  const filteredTemplates = ALL_WHATSAPP_TEMPLATES.filter((tpl) => {
    if (whatsappFilter === "all") return true;
    if (whatsappFilter === "ending_soon") return tpl.category === "ending_soon";
    if (whatsappFilter === "expired") return tpl.category === "expired";
    if (whatsappFilter === "overdue") return tpl.category === "overdue";
    if (whatsappFilter === "fee") return tpl.category === "fee";
    if (whatsappFilter === "demo") return tpl.category === "demo";
    if (whatsappFilter === "onboarding") return tpl.category === "onboarding";
    if (whatsappFilter === "receipts") return tpl.category === "receipts";
    if (whatsappFilter === "engagement") return tpl.category === "engagement";
    return tpl.category === whatsappFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Gym Customization Suite
              </span>
              {hasChanges && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 text-white">
              {activeTab === "layout" ? "Dashboard Layout & Reorder 🎨" : "WhatsApp Notifications & Messages 💬"}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {activeTab === "layout"
                ? "Configure which widgets appear on your dashboard, and organize their sequence from top to bottom."
                : "Customize renewal reminders, overdue fee alerts, member onboarding, fee receipts, and lead follow-up WhatsApp notifications."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={activeTab === "layout" ? handleResetLayoutToDefault : handleResetAllWhatsApp}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-sm"
              title="Reset current tab to factory defaults"
            >
              <RotateCcw className="w-4 h-4 text-slate-300" /> Reset Default
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-5 py-2.5 rounded-2xl font-bold text-xs shadow-lg transition flex items-center gap-2 ${
                hasChanges
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 scale-[1.02]"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={() => navigate("/owner/dashboard")}
              className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              Dashboard <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2 MASTER TABS NAVIGATION */}
      <div className="p-1.5 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shadow-xs">
        {/* Tab 1: Dashboard Layout */}
        <button
          type="button"
          onClick={() => setActiveTab("layout")}
          className={`flex-1 py-3 px-5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition ${
            activeTab === "layout"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <SlidersHorizontal className={`w-4 h-4 ${activeTab === "layout" ? "text-indigo-600" : "text-slate-400"}`} />
          <span>Tab 1: Dashboard Layout & Order</span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {visibleCount} Active
          </span>
        </button>

        {/* Tab 2: WhatsApp Notification Templates */}
        <button
          type="button"
          onClick={() => setActiveTab("whatsapp")}
          className={`flex-1 py-3 px-5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition ${
            activeTab === "whatsapp"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <MessageSquare className={`w-4 h-4 ${activeTab === "whatsapp" ? "text-emerald-600" : "text-slate-400"}`} />
          <span>Tab 2: WhatsApp Notifications & Messages</span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {ALL_WHATSAPP_TEMPLATES.length} Templates
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1 CONTENT: DASHBOARD LAYOUT & REORDER */}
      {/* ========================================================================= */}
      {activeTab === "layout" && (
        <div className="space-y-6">
          {/* Preset Layout Templates Row */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-indigo-600" /> 1-Click Preset Layout Templates
              </h3>
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Click any card to apply preset order</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {PRESET_TEMPLATES.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition group flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                      {preset.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {preset.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                    <span>Apply this layout</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section Reorder & Visibility Stack */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Arrange Dashboard Sections
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use Up (🔼) and Down (🔽) buttons to order sections from top to bottom
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {visibleCount} Active
                </span>
                {hiddenCount > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                    {hiddenCount} Hidden
                  </span>
                )}
              </div>
            </div>

            {/* List of Section Cards */}
            <div className="space-y-3">
              {sectionsOrder.map((sectionId, index) => {
                const def = ALL_DASHBOARD_SECTIONS.find((s) => s.id === sectionId);
                if (!def) return null;
                const isVisible = visibleSections[sectionId] !== false;
                const IconComp = def.icon;
                const isFirst = index === 0;
                const isLast = index === sectionsOrder.length - 1;

                return (
                  <div
                    key={sectionId}
                    className={`p-4 md:p-5 rounded-2xl border transition-all ${
                      isVisible
                        ? "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                        : "bg-slate-50/80 border-slate-200/60 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Position Number + Icon + Title + Description */}
                      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                        {/* Position Badge */}
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          #{index + 1}
                        </div>

                        {/* Category Icon */}
                        <div className={`p-3 rounded-2xl text-white bg-gradient-to-br ${def.color} shadow-xs shrink-0`}>
                          <IconComp className="w-4 h-4" />
                        </div>

                        {/* Title & Desc */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {def.label}
                            </h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${def.badgeColor}`}>
                              {def.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {def.desc}
                          </p>
                        </div>
                      </div>

                      {/* Right: Controls (Visibility Toggle + Move Up/Down Buttons) */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Show / Hide Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleSection(sectionId)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition ${
                            isVisible
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300"
                          }`}
                          title={isVisible ? "Click to hide from dashboard" : "Click to show on dashboard"}
                        >
                          {isVisible ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => moveSection(index, "up")}
                          disabled={isFirst}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                            isFirst
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                              : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs"
                          }`}
                          title="Move Up (Appear higher)"
                        >
                          <ArrowUp className="w-4 h-4" />
                          <span className="text-[11px] hidden md:inline">Up</span>
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => moveSection(index, "down")}
                          disabled={isLast}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                            isLast
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                              : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs"
                          }`}
                          title="Move Down (Appear lower)"
                        >
                          <ArrowDown className="w-4 h-4" />
                          <span className="text-[11px] hidden md:inline">Down</span>
                        </button>

                        {/* Jump to Extreme */}
                        {!isFirst && (
                          <button
                            type="button"
                            onClick={() => moveToExtreme(index, "top")}
                            className="px-2.5 py-2 text-[11px] font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hidden lg:inline"
                            title="Directly send to #1 Top position"
                          >
                            Top 🔝
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sub-configurator for KPI Cards Row */}
                    {sectionId === "kpi_stats" && isVisible && (
                      <div className="mt-4 pt-3.5 border-t border-slate-100 bg-slate-50/80 p-3.5 rounded-2xl space-y-2.5">
                        <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                          <LayoutGrid className="w-3.5 h-3.5 text-amber-600" /> Individual KPI Cards Visibility (Choose cards to show inside this section):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          {[
                            { key: "active_members", label: "Active Members", desc: "Live athlete count" },
                            { key: "net_revenue", label: "Gym Net Revenue", desc: "Retained collections" },
                            { key: "renewals_due", label: "Renewals Due", desc: "Expiring members & blast" },
                            { key: "walkins", label: "Walk-ins & Trials", desc: "Demo and leads" }
                          ].map((kpi) => {
                            const kpiVisible = visibleKpis[kpi.key] !== false;
                            return (
                              <button
                                key={kpi.key}
                                type="button"
                                onClick={() => toggleKpi(kpi.key)}
                                className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                                  kpiVisible
                                    ? "bg-white border-emerald-300 shadow-xs text-slate-900"
                                    : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                                }`}
                              >
                                <div>
                                  <span className="font-extrabold text-xs block">{kpi.label}</span>
                                  <span className="text-[10px] text-slate-400 block">{kpi.desc}</span>
                                </div>
                                <CheckCircle2
                                  className={`w-4 h-4 shrink-0 ${
                                    kpiVisible ? "text-emerald-600" : "text-slate-300"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Bar (Normal flow, non-sticky) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{visibleCount} of {ALL_DASHBOARD_SECTIONS.length} sections active on dashboard</span>
              {hasChanges && (
                <span className="ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Unsaved Changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetLayoutToDefault}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset Default
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 ${
                  hasChanges
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 scale-[1.02]"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Dashboard Layout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 CONTENT: WHATSAPP NOTIFICATIONS & AUTOMATED MESSAGES CUSTOMIZER */}
      {/* ========================================================================= */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          {/* Explanatory Banner & Category Filter Pills */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <span>Customize WhatsApp Automated Message Templates</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Customize the exact messages sent for fee expiry reminders, overdue dues, member onboarding, fee receipts, and lead follow-ups.
                  Click any dynamic tag like <strong>&#123;name&#125;</strong>, <strong>&#123;plan&#125;</strong>, <strong>&#123;amount&#125;</strong>, or <strong>&#123;expiry&#125;</strong> to insert it into your message template.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetAllWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  title="Reset all message templates to default texts"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset All to Default
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider shrink-0 mr-1">Filter Messages:</span>
              {[
                { id: "all", label: "All Templates", count: ALL_WHATSAPP_TEMPLATES.length },
                { id: "ending_soon", label: "⏳ Ending Soon (Gym & PT)", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "ending_soon").length },
                { id: "expired", label: "🚨 Expired (Day 1-2)", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "expired").length },
                { id: "overdue", label: "⛔ Overdue (Day 3+)", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "overdue").length },
                { id: "fee", label: "💳 Partial Balance", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "fee").length },
                { id: "demo", label: "🎯 Demo & Leads", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "demo").length },
                { id: "engagement", label: "🎂 Birthday & Inactivity", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "engagement").length },
                { id: "receipts", label: "🧾 Receipts & Invoices", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "receipts").length },
                { id: "onboarding", label: "🌟 Welcome & App Login", count: ALL_WHATSAPP_TEMPLATES.filter(t => t.category === "onboarding").length }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setWhatsappFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    whatsappFilter === cat.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    whatsappFilter === cat.id ? "bg-white/20 text-white" : "bg-white text-slate-600"
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List of WhatsApp Template Editor Cards */}
          <div className="space-y-6">
            {filteredTemplates.map((tpl, idx) => {
              const currentText = whatsappTemplates[tpl.id] || tpl.defaultText;
              const renderedPreview = renderMessagePreview(tpl, currentText);
              const IconComp = tpl.icon || MessageSquare;

              return (
                <div
                  key={tpl.id}
                  className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  {/* Top Bar of Template Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                            {tpl.name}
                          </h4>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${tpl.badgeColor}`}>
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          📌 <strong>Trigger:</strong> {tpl.trigger}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResetSingleTemplate(tpl.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                        title="Reset this template to standard text"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestWhatsApp(tpl)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                        title="Open WhatsApp with sample message to test on your phone"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" /> Test Send
                      </button>
                    </div>
                  </div>

                  {/* 2-Column Responsive Layout: Left is Editor, Right is Live WhatsApp Bubble */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* LEFT COLUMN: Message Editor & Available Tags */}
                    <div className="lg:col-span-7 space-y-3">
                      {/* Available Variables Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <span>Available Dynamic Tags (Click to insert):</span>
                          </span>
                          <span className="text-[11px] text-slate-400">Auto-replaced per member</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {tpl.variables.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => handleInsertVariable(tpl.id, v.key)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200 transition flex items-center gap-1 group"
                              title={`Click to insert ${v.key} (${v.desc})`}
                            >
                              <span>+</span>
                              <span>{v.key}</span>
                              <span className="text-[10px] text-indigo-400 group-hover:text-indigo-600 hidden sm:inline">
                                ({v.label})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Textarea */}
                      <div className="space-y-1">
                        <textarea
                          rows={6}
                          value={currentText}
                          onChange={(e) => handleTemplateChange(tpl.id, e.target.value)}
                          placeholder="Type your custom WhatsApp message here..."
                          className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs sm:text-sm text-slate-800 font-sans leading-relaxed resize-y transition"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>WhatsApp formatting: <strong>*bold*</strong>, <em>_italic_</em>, ~strike~</span>
                          <span>{currentText.length} characters</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Realistic WhatsApp Live Chat Bubble */}
                    <div className="lg:col-span-5 bg-[#EFEAE2] p-4 rounded-2xl border border-slate-200 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                      <div>
                        {/* WhatsApp Mock Chat Top Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 text-[11px] font-bold text-slate-600">
                          <span className="flex items-center gap-1 text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live WhatsApp Preview
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">Sample Athlete Chat</span>
                        </div>

                        {/* Speech Bubble */}
                        <div className="bg-[#E7FFDB] text-slate-900 p-3.5 rounded-2xl rounded-tr-xs shadow-xs border border-[#D0F5B7] text-xs sm:text-[13px] leading-relaxed relative whitespace-pre-wrap font-sans">
                          {renderedPreview}

                          {/* Time & Double Tick */}
                          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                            <span>10:45 AM</span>
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Quick Test & Copy Actions */}
                      <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(tpl)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold border border-slate-200 transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Copy className="w-3 h-3 text-slate-500" /> Copy Text
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestWhatsApp(tpl)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Send className="w-3 h-3" /> Test in WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Bar for WhatsApp Templates (Normal flow, non-sticky) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{ALL_WHATSAPP_TEMPLATES.length} WhatsApp notification templates managed</span>
              {hasChanges && (
                <span className="ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Unsaved Changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetAllWhatsApp}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset All to Default
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 ${
                  hasChanges
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 scale-[1.02]"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All WhatsApp Templates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
