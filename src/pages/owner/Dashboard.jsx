import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  UserPlus, 
  AlertTriangle, 
  TrendingUp, 
  Share2,
  Clock,
  CheckCircle2,
  Wrench,
  ArrowRight,
  ChevronRight,
  MessageCircle,
  Bell,
  Check,
  QrCode,
  Copy,
  Sparkles,
  SlidersHorizontal,
  CreditCard,
  Fingerprint,
  Activity,
  Receipt,
  Target,
  XCircle,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import { getMembers, generateInviteToken } from "../../firebase/members";
import { getTrainers } from "../../firebase/trainers";
import { getAllPayments } from "../../firebase/payments";
import { getStock, getSupplementSales } from "../../firebase/stock";
import { getExpenses } from "../../firebase/expenses";
import { getVisits } from "../../firebase/visits";
import { getPlans } from "../../firebase/plans";
import { getBiometricPunches } from "../../firebase/attendance";
import { 
  openWhatsApp, 
  generateMemberInviteMessage, 
  generateRenewalReminderMessage,
  generatePartialDueReminderMessage,
  generatePaymentReceiptMessage,
  generateDemoEndingTodayMessage 
} from "../../utils/whatsapp";
import { getGymSettings, fetchGymSettings, subscribeGymSettings, DEFAULT_SETTINGS } from "../../utils/settings";
import DirectAddMemberModal from "../../components/shared/DirectAddMemberModal";
import { useAuth } from "../../contexts/AuthContext";
import { getSessionCachedData } from "../../utils/dataCache";
import { formatDate } from "../../utils/dateUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";

  // Pre-seed state from session cache for instant 0ms initial render
  const [members, setMembers] = useState(() => getSessionCachedData(`members_${gymId}`) || []);
  const [payments, setPayments] = useState(() => getSessionCachedData(`payments_${gymId}`) || []);
  const [stockItems, setStockItems] = useState(() => getSessionCachedData(`stock_${gymId}`) || []);
  const [supplementSales, setSupplementSales] = useState(() => getSessionCachedData(`supplements_sales_${gymId}`) || []);
  const [expenses, setExpenses] = useState(() => getSessionCachedData(`expenses_${gymId}`) || []);
  const [visits, setVisits] = useState(() => getSessionCachedData(`visits_${gymId}`) || []);
  const [plans, setPlans] = useState(() => getSessionCachedData(`plans_${gymId}`) || []);
  const [punches, setPunches] = useState(() => getSessionCachedData(`punches_${gymId}`) || []);
  const [settings, setSettings] = useState(getGymSettings());

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [directAddOpen, setDirectAddOpen] = useState(false);
  const [renewalsModalOpen, setRenewalsModalOpen] = useState(false);
  const [directMember, setDirectMember] = useState({ name: "", phone: "", email: "", planName: "3-Month Pro", gender: "Male" });

  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [isPT, setIsPT] = useState(false);
  const [trainersList, setTrainersList] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("Member@123");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCountdown, setLinkCountdown] = useState(600);

  useEffect(() => {
    fetchGymSettings(gymId).then((data) => {
      if (data) setSettings(data);
    });
    const unsub = subscribeGymSettings(gymId, (data) => {
      if (data) setSettings(data);
    });

    async function loadData() {
      try {
        const [m, p, s, v, pl, tr, sups, exps, pu] = await Promise.all([
          getMembers(gymId),
          getAllPayments(gymId),
          getStock(gymId),
          getVisits(gymId),
          getPlans(gymId),
          getTrainers(gymId),
          getSupplementSales(gymId),
          getExpenses(gymId),
          getBiometricPunches(gymId).catch(() => [])
        ]);

        if (pl && pl.length > 0) {
          const activeOnly = pl.filter(item => item.isActive !== false);
          setPlans(activeOnly.length > 0 ? activeOnly : pl);
        }
        
        setMembers(m || []);
        setPayments(p || []);
        setStockItems(s || []);
        setVisits(v || []);
        setTrainersList(tr || []);
        setSupplementSales(sups || []);
        setExpenses(exps || []);
        setPunches(pu || []);
        if (tr && tr.length > 0) setSelectedTrainerId(tr[0].id);
      } catch (err) {
        console.error("Dashboard load data error:", err);
      }
    }
    loadData();

    return () => {
      if (unsub) unsub();
    };
  }, [gymId]);

  // Customizable layout settings
  const dashboardLayout = settings?.dashboardLayout || DEFAULT_SETTINGS.dashboardLayout;
  const sectionsOrder = dashboardLayout.sectionsOrder || DEFAULT_SETTINGS.dashboardLayout.sectionsOrder;
  const visibleSections = dashboardLayout.visibleSections || DEFAULT_SETTINGS.dashboardLayout.visibleSections;
  const visibleKpis = dashboardLayout.visibleKpis || DEFAULT_SETTINGS.dashboardLayout.visibleKpis;

  const totalMembers = members.length;
  // Real active members (status !== 'left' and status !== 'inactive')
  const activeMembers = members.filter((m) => {
    if (m.status === "left" || m.active === false || m.status === "inactive") return false;
    if (m.status === "active") return true;
    if (!m.expiryDate) return true;
    const exp = new Date(m.expiryDate?.seconds ? m.expiryDate.seconds * 1000 : m.expiryDate);
    return isNaN(exp.getTime()) ? true : exp >= new Date();
  }).length;

  // Unified Fee Payments with Net Owner Share calculation
  const paymentRevenueItems = useMemo(() => {
    return payments.map((p) => {
      const paid = Number(p.paidAmount || p.amount || 0);
      const member = members.find(
        (m) =>
          (p.memberId && (m.id === p.memberId || m.memberId === p.memberId)) ||
          (p.memberName && m.name && m.name.toLowerCase().trim() === p.memberName.toLowerCase().trim())
      );

      const ptPlanPrice = Number(p.ptPlanPrice || member?.ptPlanPrice || 0);
      const planPrice = Number(p.planPrice || member?.planPrice || (ptPlanPrice > 0 ? Math.max(0, paid - ptPlanPrice) : paid));

      let ptOwnerCommission = 0;
      let ptTrainerPayout = 0;
      if (ptPlanPrice > 0) {
        if (p.ptOwnerCommission !== undefined || member?.ptOwnerCommission !== undefined) {
          ptOwnerCommission = Number(p.ptOwnerCommission ?? member?.ptOwnerCommission ?? 0);
          ptTrainerPayout = Number(p.ptTrainerPayout ?? member?.ptTrainerPayout ?? (ptPlanPrice - ptOwnerCommission));
        } else {
          const ptCommType = p.ptCommissionType || member?.ptCommissionType || "percentage";
          const ptCommVal = Number(p.ptCommissionValue || member?.ptCommissionValue || 20);
          if (ptCommType === "fixed") {
            ptOwnerCommission = ptCommVal;
            ptTrainerPayout = Math.max(0, ptPlanPrice - ptCommVal);
          } else {
            ptOwnerCommission = Math.round(ptPlanPrice * (ptCommVal / 100));
            ptTrainerPayout = Math.max(0, ptPlanPrice - ptOwnerCommission);
          }
        }
      }

      const netOwnerShare = ptPlanPrice > 0 ? (planPrice + ptOwnerCommission) : paid;
      const trainerLiability = ptPlanPrice > 0 ? ptTrainerPayout : 0;
      const trainerName = p.personalTrainer || member?.personalTrainer || "";
      const trainerId = p.trainerId || member?.trainerId || "";

      return {
        id: p.id,
        date: p.date || p.createdAt || "",
        grossAmount: paid,
        netOwnerShare, // Net revenue kept by Gym Owner
        trainerLiability, // Coach commission
        trainerName,
        trainerId,
        type: "membership"
      };
    });
  }, [payments, members]);

  // Unified Supplement Store Sales with Net Owner Share calculation
  const supplementRevenueItems = useMemo(() => {
    return supplementSales.map((s) => {
      const grossAmount = Number(s.totalAmount || (s.quantitySold * s.unitPrice) || 0);
      const commission = Number(s.commissionAmount || 0);
      const netOwnerShare = Number(
        s.gymNetRevenue !== undefined ? s.gymNetRevenue : Math.max(0, grossAmount - commission)
      );
      const trainerName = s.referredByTrainerName || s.trainerName || "";
      const trainerId = s.referredByTrainerId || s.trainerId || "";

      return {
        id: s.id,
        date: s.timestamp || s.date || "",
        grossAmount,
        netOwnerShare, // Net revenue kept by Gym Owner (commission deducted)
        trainerLiability: commission,
        trainerName,
        trainerId,
        type: "supplement"
      };
    });
  }, [supplementSales]);

  // Combined Revenue Ledger Items
  const allRevenueItems = useMemo(() => {
    return [...paymentRevenueItems, ...supplementRevenueItems];
  }, [paymentRevenueItems, supplementRevenueItems]);

  // Financial Totals: Gross vs Trainer Liability vs Net Revenue vs Net Profit
  const totalGrossRevenue = useMemo(() => {
    return allRevenueItems.reduce((acc, curr) => acc + curr.grossAmount, 0);
  }, [allRevenueItems]);

  const totalTrainerLiability = useMemo(() => {
    return allRevenueItems.reduce((acc, curr) => acc + curr.trainerLiability, 0);
  }, [allRevenueItems]);

  const totalNetRevenue = useMemo(() => {
    return allRevenueItems.reduce((acc, curr) => acc + curr.netOwnerShare, 0);
  }, [allRevenueItems]);

  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [expenses]);

  // Sab kuch hatne ke baad jo net profit aayega (True Gym Owner Net Profit)
  const netOperatingProfit = totalNetRevenue - totalExpensesAmount;

  // Real expiring members calculation (within next 7 days or status === 'expiring')
  const expiringMembers = members.filter((m) => {
    if (m.status === "left" || m.status === "inactive") return false;
    if (m.status === "expiring") return true;
    if (!m.expiryDate) return false;
    const exp = new Date(m.expiryDate?.seconds ? m.expiryDate.seconds * 1000 : m.expiryDate);
    if (isNaN(exp.getTime())) return false;
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Calculate real payment modes breakdown from payments
  const paymentModesData = useMemo(() => {
    if (!payments || payments.length === 0) {
      return [{ name: "No Payments", value: 100, color: "#e2e8f0" }];
    }

    let upiCount = 0;
    let cashCount = 0;
    let bankCount = 0;
    let splitCount = 0;

    payments.forEach((p) => {
      const mode = (p.paymentMode || "").toLowerCase();
      if (mode === "online" || mode === "upi") upiCount++;
      else if (mode === "cash") cashCount++;
      else if (mode === "bank") bankCount++;
      else splitCount++;
    });

    const total = upiCount + cashCount + bankCount + splitCount || 1;
    return [
      { name: "Online UPI", value: Math.round((upiCount / total) * 100), color: "#10b981" },
      { name: "Cash", value: Math.round((cashCount / total) * 100), color: "#06b6d4" },
      { name: "Bank Transfer", value: Math.round((bankCount / total) * 100), color: "#8b5cf6" },
      { name: "Mixed Mode", value: Math.round((splitCount / total) * 100), color: "#f59e0b" },
    ].filter(item => item.value > 0);
  }, [payments]);

  // Compute dynamic daily NET revenue for last 7 days from actual payments & store sales (Commissions Deducted)
  const revenueData = useMemo(() => {
    const daysArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = daysArr[d.getDay()];
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const dayNum = String(d.getDate()).padStart(2, "0");
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const indianDateStr = `${dayNum}/${monthNum}/${d.getFullYear()}`;

      // Sum Net Owner revenue matching this day (after trainer commission deduction)
      let dayNetSum = 0;
      allRevenueItems.forEach((item) => {
        const pDate = String(item.date || "");
        if (pDate.includes(dateStr) || pDate.includes(indianDateStr)) {
          dayNetSum += Number(item.netOwnerShare || 0);
        }
      });

      result.push({ day: dayName, revenue: dayNetSum });
    }

    return result;
  }, [allRevenueItems]);

  // Urgent expiring members (expiring within next 3 days: diffDays >= 0 && diffDays <= 3)
  const urgentExpiringMembers = useMemo(() => {
    const now = new Date();
    return members
      .filter((m) => {
        if (m.status === "left" || m.status === "inactive") return false;
        if (!m.expiryDate) return false;
        const exp = new Date(m.expiryDate?.seconds ? m.expiryDate.seconds * 1000 : m.expiryDate);
        if (isNaN(exp.getTime())) return false;
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
      })
      .map((m) => {
        const exp = new Date(m.expiryDate?.seconds ? m.expiryDate.seconds * 1000 : m.expiryDate);
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        return { ...m, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [members]);

  // Pending balance dues (members with positive unpaid balance)
  const pendingDuesMembers = useMemo(() => {
    return members
      .filter((m) => m.status !== "left" && m.status !== "inactive" && Number(m.dueAmount || 0) > 0)
      .sort((a, b) => Number(b.dueAmount || 0) - Number(a.dueAmount || 0));
  }, [members]);

  const totalPendingDuesAmount = useMemo(() => {
    return pendingDuesMembers.reduce((sum, m) => sum + Number(m.dueAmount || 0), 0);
  }, [pendingDuesMembers]);

  // Today's date representations
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // YYYY-MM-DD
  }, []);

  // Today's payments & collections
  const todayPayments = useMemo(() => {
    const now = new Date();
    const dayNum = String(now.getDate()).padStart(2, "0");
    const monthNum = String(now.getMonth() + 1).padStart(2, "0");
    const indianDateStr = `${dayNum}/${monthNum}/${now.getFullYear()}`;

    return payments.filter((p) => {
      const pDate = String(p.date || p.createdAt || "");
      return pDate.includes(todayStr) || pDate.includes(indianDateStr);
    });
  }, [payments, todayStr]);

  const todayCollectionTotal = useMemo(() => {
    return todayPayments.reduce((sum, p) => sum + Number(p.paidAmount || p.amount || 0), 0);
  }, [todayPayments]);

  // Today's biometric punches & live check-ins
  const todayPunches = useMemo(() => {
    const now = new Date();
    const dayNum = String(now.getDate()).padStart(2, "0");
    const monthNum = String(now.getMonth() + 1).padStart(2, "0");
    const indianDateStr = `${dayNum}/${monthNum}/${now.getFullYear()}`;

    return punches.filter((p) => {
      const pDate = String(p.date || p.timestamp || p.createdAt || "");
      return pDate.includes(todayStr) || pDate.includes(indianDateStr);
    });
  }, [punches, todayStr]);

  // Active prospective leads & demo trials
  const pendingVisits = useMemo(() => {
    return visits
      .filter((v) => v.status !== "converted" && v.status !== "lost")
      .slice(0, 6);
  }, [visits]);

  // Sorted recent payments stream
  const sortedRecentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
      .slice(0, 6);
  }, [payments]);

  const handleGenerateLink = async () => {
    if (!invitePhone.trim()) {
      toast.error("Enter WhatsApp phone number first!");
      return;
    }
    const link = await generateInviteToken("univo_main", {
      memberName: inviteName.trim(),
      phone: invitePhone.trim(),
      isPT: false,
      trainerId: "",
      trainerName: "",
      loginEmail: "",
      loginPassword: "",
    });
    setGeneratedLink(link);
    setLinkCountdown(600);
    toast.success("10-Minute Invite Link & QR Code Generated!");
  };

  const handleSendReminder = (m) => {
    const rawNum = (m.phone || "").replace(/\D/g, "");
    const msg = generateRenewalReminderMessage(m.fullName || m.name, m.planName, m.expiryDate || "soon", m.renewalFee || "2500", m.diffDays);
    openWhatsApp(rawNum, msg);
    toast.success(`WhatsApp reminder sent to ${m.fullName || m.name}!`);
  };

  const handleSendDueReminder = (m) => {
    if (!m.phone) {
      toast.error("No phone number recorded for this member.");
      return;
    }
    const msg = generatePartialDueReminderMessage(m.fullName || m.name, m.dueAmount, m.planName);
    openWhatsApp(m.phone, msg);
    toast.success(`Due reminder sent via WhatsApp to ${m.fullName || m.name}!`);
  };

  const handleSendReceipt = (p) => {
    const member = members.find((m) => (p.memberId && m.id === p.memberId) || (m.name && m.name === p.memberName));
    const phone = p.phone || member?.phone || "";
    const name = p.memberName || member?.fullName || member?.name || "Athlete";
    const amount = p.paidAmount || p.amount || 0;
    const plan = p.planName || member?.planName || "Gym Plan";
    const date = p.date || p.createdAt || new Date();

    if (!phone) {
      toast.error("No phone number found for this payment record.");
      return;
    }
    const msg = generatePaymentReceiptMessage(name, amount, plan, date);
    openWhatsApp(phone, msg);
    toast.success(`Receipt sent via WhatsApp to ${name}!`);
  };

  const handleFollowUpLead = (v) => {
    if (!v.phone) {
      toast.error("No phone number recorded for this lead.");
      return;
    }
    const msg = generateDemoEndingTodayMessage(v.name, v.interestedPlan || "Gym Membership", settings.gymName);
    openWhatsApp(v.phone, msg);
    toast.success(`Follow-up sent via WhatsApp to ${v.name}!`);
  };

  // Dynamic Section Renderers for Customizer
  const renderBanner = () => (
    <div key="banner" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg relative overflow-hidden">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 sm:px-3 py-1 rounded-full text-white backdrop-blur-md inline-block">
            Gym Owner Portal • {settings.gymName}
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-2 leading-tight">
            Welcome back, Manager! ⚡
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
            {settings.tagline} • Click any metric to jump directly to its dedicated manager
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          <button
            onClick={() => {
              setGeneratedLink("");
              setInvitePhone("");
              setInviteModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-white text-emerald-800 text-xs sm:text-sm font-bold shadow-md hover:bg-emerald-50 active:scale-98 transition"
          >
            <Share2 className="w-4 h-4 text-emerald-600 shrink-0" /> Share 10-Min WhatsApp Link
          </button>

          <button
            onClick={() => setDirectAddOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-emerald-950/40 text-white border border-white/30 text-xs sm:text-sm font-bold backdrop-blur-md hover:bg-emerald-950/60 active:scale-98 transition"
          >
            <UserPlus className="w-4 h-4 shrink-0" /> Add Member Directly
          </button>
        </div>
      </div>
    </div>
  );

  const renderQuickJump = () => (
    <div key="quick_jump" className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 scrollbar-none text-xs -mx-1 px-1 touch-pan-x">
      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 pr-0.5">
        ⚡ Quick Jump:
      </span>
      <button
        onClick={() => navigate("/owner/members")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <Users className="w-3.5 h-3.5 text-emerald-600" /> Members
      </button>
      <button
        onClick={() => navigate("/owner/payments")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <DollarSign className="w-3.5 h-3.5 text-teal-600" /> Payments & Fees
      </button>
      <button
        onClick={() => navigate("/owner/attendance")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <Calendar className="w-3.5 h-3.5 text-blue-600" /> Attendance
      </button>
      <button
        onClick={() => navigate("/owner/offers")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-700 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Offers & Broadcast
      </button>
      <button
        onClick={() => navigate("/owner/visits")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-cyan-500 hover:text-cyan-700 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <UserPlus className="w-3.5 h-3.5 text-cyan-600" /> Visits & Leads
      </button>
      <button
        onClick={() => navigate("/owner/expenses")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-rose-500 hover:text-rose-700 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Expenses
      </button>
      <button
        onClick={() => navigate("/owner/stock")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-500 hover:text-slate-900 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <Wrench className="w-3.5 h-3.5 text-slate-600" /> Stock & Equipment
      </button>
      <button
        onClick={() => navigate("/owner/reports")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-purple-500 hover:text-purple-700 font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
      >
        <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Reports & Analytics
      </button>
      <button
        onClick={() => navigate("/owner/customization")}
        className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:border-indigo-500 hover:text-indigo-900 font-bold text-indigo-700 shadow-xs transition flex items-center gap-1.5"
        title="Customize which sections appear on your dashboard and their order"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" /> Customize Layout 🎨
      </button>
    </div>
  );

  const renderKpiStats = () => {
    const kpiCards = [];
    if (visibleKpis.active_members !== false) {
      kpiCards.push(
        <StatCard
          key="active_members"
          title="Active Members"
          value={activeMembers}
          change="+14% this month • View active members"
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          color="green"
          onClick={() => navigate("/owner/members?tab=active")}
        />
      );
    }
    if (visibleKpis.net_revenue !== false) {
      kpiCards.push(
        <StatCard
          key="net_revenue"
          title="Gym Net Revenue"
          value={`₹${totalNetRevenue.toLocaleString("en-IN")}`}
          change={`Net ₹${totalNetRevenue.toLocaleString("en-IN")} • View payments`}
          icon={<DollarSign className="w-5 h-5 text-teal-600" />}
          color="teal"
          onClick={() => navigate("/owner/payments")}
        />
      );
    }
    if (visibleKpis.renewals_due !== false) {
      kpiCards.push(
        <StatCard
          key="renewals_due"
          title="Renewals Due"
          value={`${expiringMembers.length} Members`}
          change="Expiring this week"
          icon={<Bell className="w-5 h-5 text-amber-600" />}
          color="orange"
          onClick={() => navigate("/owner/members?tab=ending_soon")}
          footerAction={
            <button
              type="button"
              onClick={() => setRenewalsModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition"
              title="Quick WhatsApp Reminder Blast Modal"
            >
              <MessageCircle className="w-3 h-3" /> Quick Blast
            </button>
          }
        />
      );
    }
    if (visibleKpis.walkins !== false) {
      kpiCards.push(
        <StatCard
          key="walkins"
          title="Walk-ins & Trials"
          value={`${visits.length} Enquiries`}
          change="View visits & trial leads"
          icon={<UserPlus className="w-5 h-5 text-blue-600" />}
          color="blue"
          onClick={() => navigate("/owner/visits")}
        />
      );
    }
    if (visibleKpis.today_collection !== false) {
      kpiCards.push(
        <StatCard
          key="today_collection"
          title="Today's Collection"
          value={`₹${todayCollectionTotal.toLocaleString("en-IN")}`}
          change={`${todayPayments.length} transaction${todayPayments.length === 1 ? "" : "s"} today`}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          color="green"
          onClick={() => navigate("/owner/payments")}
        />
      );
    }
    if (visibleKpis.pending_dues !== false) {
      kpiCards.push(
        <StatCard
          key="pending_dues"
          title="Pending Dues"
          value={`₹${totalPendingDuesAmount.toLocaleString("en-IN")}`}
          change={`${pendingDuesMembers.length} member${pendingDuesMembers.length === 1 ? "" : "s"} with balance`}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          color="red"
          onClick={() => navigate("/owner/members?tab=due")}
        />
      );
    }
    if (visibleKpis.today_punches !== false) {
      kpiCards.push(
        <StatCard
          key="today_punches"
          title="Today's Check-ins"
          value={`${todayPunches.length} Punches`}
          change="Live turnstile & attendance"
          icon={<Fingerprint className="w-5 h-5 text-purple-600" />}
          color="purple"
          onClick={() => navigate("/owner/attendance")}
        />
      );
    }

    if (kpiCards.length === 0) return null;

    const colsClass =
      kpiCards.length === 1
        ? "grid grid-cols-1 gap-3.5 sm:gap-5"
        : kpiCards.length === 2
        ? "grid grid-cols-2 gap-3 sm:gap-5"
        : kpiCards.length === 3
        ? "grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5"
        : kpiCards.length === 4
        ? "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
        : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5";

    return (
      <div key="kpi_stats" className={colsClass}>
        {kpiCards}
      </div>
    );
  };

  const renderPnlStrip = () => (
    <div key="pnl_strip" className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white shadow-sm border border-teal-900/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-extrabold tracking-wide uppercase text-[10px] sm:text-[11px] text-emerald-300">
            Live Financial P&L Summary (Net Profit After Commission & Expenses)
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] text-slate-300 hidden sm:inline">
          Click any section below to inspect details
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 pt-3 text-center">
        <div 
          onClick={() => navigate("/owner/payments")}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/15 hover:scale-[1.02] active:scale-[0.98] transition group"
          title="Click to view all Payments"
        >
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 group-hover:text-white flex items-center justify-center gap-1 truncate">
            Gross Inflow <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
          </span>
          <span className="text-xs sm:text-base lg:text-lg font-black text-white mt-0.5 block truncate">
            ₹{totalGrossRevenue.toLocaleString("en-IN")}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-400 group-hover:text-emerald-300">View payments →</span>
        </div>

        <div 
          onClick={() => navigate("/owner/trainers")}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition group"
          title="Click to view Trainers & Commissions"
        >
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-400 group-hover:text-amber-200 flex items-center justify-center gap-1 truncate">
            Trainer Cuts <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
          </span>
          <span className="text-xs sm:text-base lg:text-lg font-black text-amber-300 mt-0.5 block truncate">
            -₹{totalTrainerLiability.toLocaleString("en-IN")}
          </span>
          <span className="text-[9px] sm:text-[10px] text-amber-200/70 group-hover:text-amber-200">View trainers →</span>
        </div>

        <div 
          onClick={() => navigate("/owner/payments")}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-teal-500/10 border border-teal-500/20 cursor-pointer hover:bg-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition group"
          title="Click to view Retained Net Revenue"
        >
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-teal-300 group-hover:text-white flex items-center justify-center gap-1 truncate">
            Gym Net Rev <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
          </span>
          <span className="text-xs sm:text-base lg:text-lg font-black text-teal-200 mt-0.5 block truncate">
            ₹{totalNetRevenue.toLocaleString("en-IN")}
          </span>
          <span className="text-[9px] sm:text-[10px] text-teal-300/70 group-hover:text-teal-200">View ledger →</span>
        </div>

        <div 
          onClick={() => navigate("/owner/expenses")}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/20 cursor-pointer hover:bg-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition group"
          title="Click to view Overhead Expenses"
        >
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-300 group-hover:text-rose-100 flex items-center justify-center gap-1 truncate">
            Overhead Costs <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
          </span>
          <span className="text-xs sm:text-base lg:text-lg font-black text-rose-300 mt-0.5 block truncate">
            -₹{totalExpensesAmount.toLocaleString("en-IN")}
          </span>
          <span className="text-[9px] sm:text-[10px] text-rose-200/70 group-hover:text-rose-100">View expenses →</span>
        </div>

        <div 
          onClick={() => navigate("/owner/reports")}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-400/40 col-span-2 sm:col-span-3 lg:col-span-1 cursor-pointer hover:bg-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition group"
          title="Click to view Financial Reports & P&L"
        >
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-300 group-hover:text-emerald-100 flex items-center justify-center gap-1 truncate">
            Net Operating Profit <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
          </span>
          <span className="text-sm sm:text-base lg:text-lg font-black text-emerald-300 mt-0.5 block truncate">
            ₹{netOperatingProfit.toLocaleString("en-IN")}
          </span>
          <span className="text-[9px] sm:text-[10px] text-emerald-200 font-semibold group-hover:underline">View P&L report →</span>
        </div>
      </div>
    </div>
  );

  const renderChartsRow = () => (
    <div key="charts_row" className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Weekly Revenue Graph */}
      <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue Growth Trend
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Weekly net revenue breakdown retained by gym</p>
          </div>
          <button
            onClick={() => navigate("/owner/reports")}
            className="self-start sm:self-auto text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 transition flex items-center gap-1"
          >
            Detailed Reports <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="h-56 sm:h-64 -ml-3 sm:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGradLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} width={38} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px" }}
                formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Gym Net Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#revGradLight)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Modes Pie Chart */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Payment Modes Split</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">UPI, Cash, Bank and Partial payments</p>
          </div>
          <button
            onClick={() => navigate("/owner/payments")}
            className="self-start sm:self-auto text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-xl border border-teal-200/60 transition flex items-center gap-1"
          >
            Payments <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="h-44 sm:h-52 my-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentModesData}
                innerRadius={50}
                outerRadius={72}
                paddingAngle={5}
                dataKey="value"
              >
                {paymentModesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
          {paymentModesData.map(item => (
            <div key={item.name} className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 truncate">{item.name} ({item.value}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRecentMembers = () => (
    <div key="recent_members_card" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Recently Enrolled Members</h3>
          <p className="text-[11px] sm:text-xs text-slate-500">Live athletes registered in gym system</p>
        </div>
        <button
          onClick={() => navigate("/owner/members")}
          className="self-start sm:self-auto text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200/60 transition flex items-center gap-1 shrink-0"
        >
          View All ({members.length}) <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {members.slice(0, 4).map((m) => (
          <div 
            key={m.id} 
            onClick={() => navigate(`/owner/members/${m.id}`)}
            className="py-3 px-1.5 sm:px-2 rounded-2xl flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-50/40 transition group"
            title={`Click to open ${m.fullName || m.name}'s profile`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center group-hover:scale-105 transition shrink-0">
                {m.name?.[0] || "M"}
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate flex items-center gap-1">
                  {m.fullName || m.name}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0" />
                </h5>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">{m.phone} • {m.planName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold ${
                m.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {m.status?.toUpperCase()}
              </span>
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition hidden sm:inline">
                Profile →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEquipmentStatus = () => (
    <div key="equipment_status_card" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Equipment & Service Status</h3>
          <p className="text-[11px] sm:text-xs text-slate-500">Machine maintenance and safety tracker</p>
        </div>
        <button
          onClick={() => navigate("/owner/stock")}
          className="self-start sm:self-auto text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full border border-slate-200 transition flex items-center gap-1 shrink-0"
        >
          Stock & Equipment <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {stockItems.slice(0, 4).map((item) => (
          <div 
            key={item.id} 
            onClick={() => navigate("/owner/stock")}
            className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-100/80 hover:border-emerald-300 transition group"
            title="Click to view equipment in Stock manager"
          >
            <div className="min-w-0 flex-1">
              <h5 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate flex items-center gap-1">
                {item.name}
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0" />
              </h5>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Category: {item.type} • Last service: {item.lastServiceDate}</p>
            </div>
            <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-xl bg-white text-emerald-700 border border-emerald-200 shadow-sm flex items-center gap-1 shrink-0 ml-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {item.condition}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUrgentRenewals = () => (
    <div key="urgent_renewals" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-amber-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" /> Urgent Plan Expiries
            </h3>
            <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {urgentExpiringMembers.length} (≤ 3 Days)
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">High-priority renewals needing immediate follow-up</p>
        </div>
        <button
          onClick={() => navigate("/owner/members?tab=ending_soon")}
          className="self-start sm:self-auto text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200/70 transition flex items-center gap-1 shrink-0"
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {urgentExpiringMembers.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No Members Expiring in Next 3 Days</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All active athlete plans are running smoothly.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {urgentExpiringMembers.slice(0, 4).map((m) => {
            const isToday = m.diffDays === 0;
            const isTomorrow = m.diffDays === 1;
            return (
              <div 
                key={m.id}
                className="py-3 px-1.5 sm:px-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-amber-50/40 transition group"
              >
                <div 
                  onClick={() => navigate(`/owner/members/${m.id}`)}
                  className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
                  title="Click to view member profile"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isToday ? "bg-rose-100 text-rose-700" : isTomorrow ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                  }`}>
                    {m.fullName?.[0] || m.name?.[0] || "M"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition truncate flex items-center gap-1">
                      {m.fullName || m.name}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition shrink-0" />
                    </h5>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      {m.planName || "General Plan"} • Fee: ₹{m.renewalFee || m.planPrice || "2,500"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <span className={`text-[10px] sm:text-[11px] font-extrabold px-2.5 py-1 rounded-xl border ${
                    isToday
                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      : isTomorrow
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    {isToday ? "🚨 Ends Today" : isTomorrow ? "⚠️ Ends Tomorrow" : `⏳ In ${m.diffDays} Days`}
                  </span>
                  <button
                    onClick={() => handleSendReminder(m)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition text-[11px] font-bold flex items-center gap-1 shrink-0"
                    title="Send WhatsApp renewal reminder"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Remind
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPendingDues = () => (
    <div key="pending_dues" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-rose-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-600 shrink-0" /> Outstanding Balances & Dues
            </h3>
            <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              ₹{totalPendingDuesAmount.toLocaleString("en-IN")} Total
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Pending fee dues awaiting collection</p>
        </div>
        <button
          onClick={() => navigate("/owner/members?tab=due")}
          className="self-start sm:self-auto text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-full border border-rose-200/70 transition flex items-center gap-1 shrink-0"
        >
          View Dues ({pendingDuesMembers.length}) <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {pendingDuesMembers.length === 0 ? (
        <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-emerald-900">Zero Outstanding Dues!</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">All active gym members have cleared their fee accounts.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pendingDuesMembers.slice(0, 4).map((m) => (
            <div 
              key={m.id}
              className="py-3 px-1.5 sm:px-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-rose-50/30 transition group"
            >
              <div 
                onClick={() => navigate(`/owner/members/${m.id}`)}
                className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
                title="Click to view member profile"
              >
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {m.fullName?.[0] || m.name?.[0] || "M"}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-sm font-bold text-slate-900 group-hover:text-rose-700 transition truncate flex items-center gap-1">
                    {m.fullName || m.name}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 transition shrink-0" />
                  </h5>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    {m.phone || "No phone"} • {m.planName || "Gym Plan"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                  Due: ₹{Number(m.dueAmount || 0).toLocaleString("en-IN")}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSendDueReminder(m)}
                    className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                    title="Send WhatsApp payment due reminder"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate("/owner/payments")}
                    className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition"
                  >
                    Collect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTodayAttendance = () => (
    <div key="today_attendance" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-blue-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-blue-600 shrink-0" /> Today's Live Attendance & Punches
            </h3>
            <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {todayPunches.length} Today
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Real-time biometric turnstile check-ins</p>
        </div>
        <button
          onClick={() => navigate("/owner/attendance")}
          className="self-start sm:self-auto text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200/70 transition flex items-center gap-1 shrink-0"
        >
          Turnstile Monitor <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {todayPunches.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <Activity className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No Check-ins Logged Yet Today</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Biometric turnstile and door readers are online and ready.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {todayPunches.slice(0, 4).map((p) => {
            const isGranted = p.status === "granted";
            return (
              <div 
                key={p.id}
                onClick={() => navigate("/owner/attendance")}
                className="py-3 px-1.5 sm:px-2 rounded-2xl flex items-center justify-between gap-2.5 hover:bg-blue-50/40 transition cursor-pointer group"
                title="Click to view live turnstile attendance logs"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isGranted ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    {p.memberName?.[0] || "A"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition truncate flex items-center gap-1">
                      {p.memberName || "Gym Member"}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition shrink-0" />
                    </h5>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      {p.deviceName || "Main Gate"} • {p.time || formatDate(p.timestamp || p.createdAt, "Today")}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                    isGranted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {isGranted ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Granted
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-rose-600" /> {p.reason || "Denied"}
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTodayDemos = () => (
    <div key="today_demos" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-teal-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-600 shrink-0" /> Walk-in Leads & Demo Trials Board
            </h3>
            <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
              {pendingVisits.length} In Pipeline
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Prospects to follow up and convert to memberships</p>
        </div>
        <button
          onClick={() => navigate("/owner/visits")}
          className="self-start sm:self-auto text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full border border-teal-200/70 transition flex items-center gap-1 shrink-0"
        >
          Visits Board <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {pendingVisits.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <UserPlus className="w-8 h-8 text-teal-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No Pending Trial Inquiries</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Add new walk-in visitors to start tracking demo sessions.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pendingVisits.slice(0, 4).map((v) => (
            <div 
              key={v.id}
              className="py-3 px-1.5 sm:px-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-teal-50/40 transition group"
            >
              <div 
                onClick={() => navigate("/owner/visits")}
                className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
                title="Click to view visit lead card"
              >
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {v.name?.[0] || "L"}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition truncate flex items-center gap-1">
                    {v.name}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 transition shrink-0" />
                  </h5>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    Interested: {v.interestedPlan || "General Membership"} • {v.source || "Walk-in"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  {v.status === "demo_scheduled" ? "Demo Scheduled" : v.status === "demo_done" ? "Demo Completed" : "New Lead"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleFollowUpLead(v)}
                    className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                    title="Follow up via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate("/owner/visits")}
                    className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-xs transition"
                  >
                    Convert
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecentPayments = () => (
    <div key="recent_payments" className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-emerald-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600 shrink-0" /> Latest Payments & Receipts Stream
            </h3>
            <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              ₹{todayCollectionTotal.toLocaleString("en-IN")} Today
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Recent collections, membership renewals & purchases</p>
        </div>
        <button
          onClick={() => navigate("/owner/payments")}
          className="self-start sm:self-auto text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200/70 transition flex items-center gap-1 shrink-0"
        >
          All Payments <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {sortedRecentPayments.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center">
          <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No Payments Recorded Yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Collect member fees to see real-time payment transactions here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {sortedRecentPayments.slice(0, 4).map((p) => {
            const member = members.find((m) => (p.memberId && m.id === p.memberId) || (m.name && m.name === p.memberName));
            const memberName = p.memberName || member?.fullName || member?.name || "Athlete";
            const amount = Number(p.paidAmount || p.amount || 0);
            const mode = (p.paymentMode || "cash").toUpperCase();

            return (
              <div 
                key={p.id}
                className="py-3 px-1.5 sm:px-2 rounded-2xl flex items-center justify-between gap-2 hover:bg-emerald-50/40 transition group"
              >
                <div 
                  onClick={() => navigate("/owner/payments")}
                  className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
                  title="Click to open Payments ledger"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {memberName[0] || "P"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition truncate flex items-center gap-1">
                      {memberName}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition shrink-0" />
                    </h5>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                      {p.planName || member?.planName || "Membership"} • {formatDate(p.date || p.createdAt, "Recent")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                  <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                    {mode}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600">
                    +₹{amount.toLocaleString("en-IN")}
                  </span>
                  <button
                    onClick={() => handleSendReceipt(p)}
                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition"
                    title="Send WhatsApp payment receipt"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Filter sections that are toggled active by user
  const activeSections = useMemo(() => {
    return sectionsOrder.filter((id) => visibleSections[id] !== false);
  }, [sectionsOrder, visibleSections]);

  // Distinguish card-type widgets (which look best side-by-side) from full-width hero widgets
  const isCardSection = (id) => [
    "urgent_renewals",
    "pending_dues",
    "today_attendance",
    "today_demos",
    "recent_payments",
    "recent_members",
    "equipment_status"
  ].includes(id);

  const renderSection = (id) => {
    switch (id) {
      case "banner":
        return renderBanner();
      case "quick_jump":
        return renderQuickJump();
      case "kpi_stats":
        return renderKpiStats();
      case "pnl_strip":
        return renderPnlStrip();
      case "urgent_renewals":
        return renderUrgentRenewals();
      case "pending_dues":
        return renderPendingDues();
      case "today_attendance":
        return renderTodayAttendance();
      case "today_demos":
        return renderTodayDemos();
      case "recent_payments":
        return renderRecentPayments();
      case "charts_row":
        return renderChartsRow();
      case "recent_members":
        return renderRecentMembers();
      case "equipment_status":
        return renderEquipmentStatus();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Dynamic User-Customized Dashboard Layout */}
      {(() => {
        const elements = [];
        let i = 0;
        while (i < activeSections.length) {
          const sec = activeSections[i];
          const nextSec = activeSections[i + 1];

          // If two card sections are consecutive in order, pair them side-by-side in a 2-col responsive grid
          if (isCardSection(sec) && nextSec && isCardSection(nextSec)) {
            elements.push(
              <div key={`${sec}_${nextSec}`} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {renderSection(sec)}
                {renderSection(nextSec)}
              </div>
            );
            i += 2;
          } else if (isCardSection(sec)) {
            elements.push(
              <div key={sec} className="w-full">
                {renderSection(sec)}
              </div>
            );
            i++;
          } else {
            const el = renderSection(sec);
            if (el) elements.push(el);
            i++;
          }
        }
        return elements;
      })()}

      {/* Modal 1: WhatsApp 10-Min Invite Link */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="📲 Generate 10-Minute Member WhatsApp Link & QR"
      >
        <div className="space-y-4 text-slate-800">
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px] text-emerald-900">
              Enter member name and WhatsApp number. The member will scan the <strong>QR Code</strong> or click the 10-minute link to upload their photo, pick their plan, and sign their waiver directly!
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Member Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Member WhatsApp Number *</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {!generatedLink ? (
            <button
              onClick={handleGenerateLink}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition"
            >
              Generate Link & QR Code
            </button>
          ) : (
            <div className="space-y-3.5 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4 text-emerald-600" /> Active 10-Minute Link:
                </span>
                <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full ${linkCountdown <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-900'}`}>
                  {linkCountdown <= 0 ? 'EXPIRED' : `${String(Math.floor(linkCountdown / 60)).padStart(2, '0')}:${String(linkCountdown % 60).padStart(2, '0')} Left`}
                </span>
              </div>

              {isPT && (
                <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>PT Login: <strong>{loginEmail.trim() || invitePhone.trim()}</strong> | Pass: <strong className="font-mono text-emerald-700">{loginPassword.trim() || 'Member@123'}</strong></span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 shrink-0">PT Link</span>
                </div>
              )}

              {/* Link & QR Code 2-column view */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center pt-1">
                {/* Left Column: Link input & buttons */}
                <div className="space-y-2.5 flex flex-col justify-center">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Direct Registration Link</label>
                    <input
                      readOnly
                      value={generatedLink}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono select-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        toast.success("Link copied!");
                      }}
                      className="w-full py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <button
                      onClick={() => {
                        const rawNum = invitePhone.replace(/\D/g, "");
                        const waPhone = rawNum.length === 10 ? `91${rawNum}` : rawNum;

                        const msg = encodeURIComponent(
                          `💪 *Welcome to ${settings.gymName || 'UNIVO GYM'}!*\n\nHi ${inviteName || 'Athlete'},\nPlease complete your gym registration form, choose your membership plan & trainer, and sign your liability waiver using this direct link:\n\n🔗 ${generatedLink}\n\n⚠️ *Important:* This secure registration link expires in 10 minutes.`
                        );
                        window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank");
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <MessageCircle className="w-4 h-4" /> Send via WhatsApp
                    </button>
                  </div>
                </div>

                {/* Right Column: Instant QR Code Box */}
                <div className="p-3 bg-white border-2 border-emerald-100 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                  <p className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Scan to Register
                  </p>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                    <QRCodeSVG
                      value={generatedLink}
                      size={135}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 max-w-[180px] leading-tight">
                    Scan with mobile camera to create ID instantly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 2: Direct Add Member by Owner with complete registration flow */}
      <DirectAddMemberModal
        isOpen={directAddOpen}
        onClose={() => setDirectAddOpen(false)}
        onSuccess={(newMem) => setMembers([newMem, ...members])}
        plans={plans}
        existingMembers={members}
      />

      {/* Modal 3: Renewals & WhatsApp Reminders Blast */}
      <Modal
        isOpen={renewalsModalOpen}
        onClose={() => setRenewalsModalOpen(false)}
        title="🔔 3-Day Renewals & WhatsApp Reminder Blast"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-xs text-slate-500">
            List of members whose gym membership is expiring within 3 to 7 days. Send official WhatsApp renewal reminders in 1-click:
          </p>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {expiringMembers.map((m) => {
              const expFormatted = formatDate(m.expiryDate, "Soon");
              return (
                <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 px-2 rounded-xl transition">
                  <div 
                    onClick={() => {
                      setRenewalsModalOpen(false);
                      navigate(`/owner/members/${m.id}`);
                    }}
                    className="cursor-pointer group flex-1 min-w-0"
                    title="Click to view full member profile"
                  >
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1 transition">
                      {m.fullName || m.name}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500">{m.planName} • Expiring: <span className="font-bold text-amber-600">{expFormatted}</span></p>
                    <p className="text-[11px] sm:text-xs text-emerald-700 font-semibold">Renewal Fee: ₹{m.renewalFee || "2,500"}</p>
                  </div>
                  <button
                    onClick={() => handleSendReminder(m)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" /> Remind
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                setRenewalsModalOpen(false);
                navigate("/owner/members?tab=ending_soon");
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              📋 Open in Members Page
            </button>
            <button
              onClick={() => {
                setRenewalsModalOpen(false);
                navigate("/owner/offers");
              }}
              className="flex-1 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition"
            >
              📢 Broadcast via Offers
            </button>
            <button
              onClick={() => {
                expiringMembers.forEach(m => handleSendReminder(m));
                toast.success("Broadcast initiated for all expiring members!");
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-sm hover:from-amber-600 hover:to-orange-600 transition"
            >
              🚀 Send WA Reminders to All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}