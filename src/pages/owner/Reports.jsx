import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart2,
  TrendingUp,
  Calendar,
  Download,
  DollarSign,
  Users,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  Receipt,
  CreditCard,
  Building,
  Sparkles,
  RefreshCw,
  Dumbbell,
  Wallet
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import Button from "../../components/ui/Button";
import { getAllPayments } from "../../firebase/payments";
import { getExpenses } from "../../firebase/expenses";
import { getSupplementSales } from "../../firebase/stock";
import { getMembers } from "../../firebase/members";
import { getTrainers } from "../../firebase/trainers";
import { getSessionCachedData } from "../../utils/dataCache";
import { generateFinancialStatementPDF } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

// Format DD/MM/YYYY or YYYY-MM-DD or Timestamp to ISO date string YYYY-MM-DD
function normalizeDate(dStr) {
  if (!dStr) return "";
  if (typeof dStr === "object") {
    if (dStr.toDate && typeof dStr.toDate === "function") {
      return dStr.toDate().toISOString().split("T")[0];
    }
    if (dStr.seconds) {
      return new Date(dStr.seconds * 1000).toISOString().split("T")[0];
    }
    if (dStr instanceof Date && !isNaN(dStr.getTime())) {
      return dStr.toISOString().split("T")[0];
    }
  }
  const s = String(dStr).trim();
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return s.slice(0, 10);
}

export default function Reports() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";
  const [settings, setSettings] = useState(getGymSettings());

  useEffect(() => {
    setSettings(getGymSettings());
  }, []);

  // Mode: "daily" | "monthly" | "custom"
  const [reportMode, setReportMode] = useState("daily");

  // Filter Selectors
  const todayIso = new Date().toISOString().split("T")[0];
  const [selectedDailyDate, setSelectedDailyDate] = useState(todayIso);

  const currentYearMonth = todayIso.slice(0, 7); // e.g. "2026-09"
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  const [customRange, setCustomRange] = useState({
    preset: "lifetime", // "lifetime", "this_year", "last_3_months", "custom_dates"
    startDate: "2026-01-01",
    endDate: todayIso
  });

  // Raw Data from Collections (instant pre-seed from cache)
  const [payments, setPayments] = useState(() => getSessionCachedData(`payments_${gymId}`) || []);
  const [expenses, setExpenses] = useState(() => getSessionCachedData(`expenses_${gymId}`) || []);
  const [supplementSales, setSupplementSales] = useState(() => getSessionCachedData(`supplements_sales_${gymId}`) || []);
  const [members, setMembers] = useState(() => getSessionCachedData(`members_${gymId}`) || []);
  const [trainers, setTrainers] = useState(() => getSessionCachedData(`trainers_${gymId}`) || []);
  const [loading, setLoading] = useState(() => !getSessionCachedData(`payments_${gymId}`));

  // Fallback Dummy Data if database is fresh
  const fallbackPayments = [
    { id: "p1", memberName: "Lucky Kirar", planName: "1 Month Standard", amount: 599, paidAmount: 599, paymentMode: "online", date: "2026-09-12", createdAt: "2026-09-12T09:00:00Z" },
    { id: "p2", memberName: "Mohit Yadav", planName: "3 Months Pro", amount: 1499, paidAmount: 1499, paymentMode: "cash", date: "2026-09-12", createdAt: "2026-09-12T10:30:00Z" },
    { id: "p3", memberName: "Vikram Chauhan", planName: "1 Month + Locker", amount: 699, paidAmount: 699, paymentMode: "upi", date: "2026-09-11", createdAt: "2026-09-11T14:15:00Z" },
    { id: "p4", memberName: "Rahul Sharma", planName: "12 Months Annual", amount: 4999, paidAmount: 4999, paymentMode: "online", date: "2026-09-05", createdAt: "2026-09-05T11:00:00Z" },
    { id: "p5", memberName: "Ankit Verma", planName: "3 Months Pro", amount: 1499, paidAmount: 1499, paymentMode: "cash", date: "2026-08-20", createdAt: "2026-08-20T17:00:00Z" },
    { id: "p6", memberName: "Sunil Patel", planName: "1 Month Standard", amount: 599, paidAmount: 599, paymentMode: "upi", date: "2026-07-15", createdAt: "2026-07-15T18:00:00Z" },
    { id: "p7", memberName: "Deepak Meena", planName: "6 Months Pass", amount: 2799, paidAmount: 2799, paymentMode: "online", date: "2026-06-10", createdAt: "2026-06-10T08:00:00Z" },
  ];

  const fallbackExpenses = [
    { id: "e1", title: "Water Dispenser Refill Cans", category: "Water", type: "onetime", amount: 350, date: "2026-09-12" },
    { id: "e2", title: "Gym Cleaning Supplies & Sanitisers", category: "Supplies", type: "onetime", amount: 800, date: "2026-09-12" },
    { id: "e3", title: "Floor Rent for September", category: "Rent", type: "monthly", amount: 45000, date: "2026-09-01" },
    { id: "e4", title: "Commercial Electricity Bill", category: "Electricity", type: "monthly", amount: 18200, date: "2026-09-05" },
    { id: "e5", title: "Treadmill Motor Servicing & Greasing", category: "Maintenance", type: "onetime", amount: 4500, date: "2026-08-15" },
    { id: "e6", title: "Trainer Monthly Incentive", category: "Staff Salary", type: "monthly", amount: 25000, date: "2026-08-01" },
  ];

  const fallbackSupplementSales = [
    { id: "s1", productName: "Gold Standard Whey (5 lbs)", quantitySold: 1, unitPrice: 6699, totalAmount: 6699, memberName: "Lucky Kirar", paymentMode: "online", timestamp: "2026-09-12T11:00:00Z" },
    { id: "s2", productName: "MB Creatine 250g", quantitySold: 1, unitPrice: 899, totalAmount: 899, memberName: "Mohit Yadav", paymentMode: "cash", timestamp: "2026-09-12T16:00:00Z" },
    { id: "s3", productName: "C4 Pre-Workout", quantitySold: 1, unitPrice: 2399, totalAmount: 2399, memberName: "Sunil Patel", paymentMode: "upi", timestamp: "2026-09-08T19:00:00Z" },
  ];

  // Fetch Firestore Data
  useEffect(() => {
    async function loadReportsData() {
      setLoading(true);
      try {
        const [pSnap, eSnap, sSnap, mSnap, tSnap] = await Promise.all([
          getAllPayments(gymId),
          getExpenses(gymId),
          getSupplementSales(gymId),
          getMembers(gymId),
          getTrainers(gymId)
        ]);

        setPayments(pSnap || []);
        setExpenses(eSnap || []);
        setSupplementSales(sSnap || []);
        setMembers(mSnap || []);
        setTrainers(tSnap || []);
      } catch (err) {
        console.warn("Reports data load error:", err);
        setPayments([]);
        setExpenses([]);
        setSupplementSales([]);
        setTrainers([]);
      } finally {
        setLoading(false);
      }
    }
    loadReportsData();
  }, [gymId]);

  // Combine Membership Payments + Supplement Store Sales into unified revenue items
  const unifiedRevenueItems = useMemo(() => {
    const feeItems = payments.map((p) => {
      const paid = Number(p.paidAmount || p.amount || 0);

      // Link payment with member record for PT commission details
      const member = members.find(
        (m) =>
          (p.memberId && (m.id === p.memberId || m.memberId === p.memberId)) ||
          (p.memberName && m.name && m.name.toLowerCase().trim() === p.memberName.toLowerCase().trim())
      );

      const ptPlanPrice = Number(p.ptPlanPrice || member?.ptPlanPrice || 0);
      const planPrice = Number(p.planPrice || member?.planPrice || (ptPlanPrice > 0 ? Math.max(0, paid - ptPlanPrice) : paid));

      const ptCommissionType = p.ptCommissionType || member?.ptCommissionType || "percentage";
      const ptCommissionValue = Number(p.ptCommissionValue || member?.ptCommissionValue || 20);

      // Owner cut vs Trainer payout
      let ptOwnerCommission = 0;
      let ptTrainerPayout = 0;

      if (ptPlanPrice > 0) {
        if (p.ptOwnerCommission !== undefined || member?.ptOwnerCommission !== undefined) {
          ptOwnerCommission = Number(p.ptOwnerCommission ?? member?.ptOwnerCommission ?? 0);
          ptTrainerPayout = Number(p.ptTrainerPayout ?? member?.ptTrainerPayout ?? (ptPlanPrice - ptOwnerCommission));
        } else {
          if (ptCommissionType === "fixed") {
            ptOwnerCommission = ptCommissionValue;
            ptTrainerPayout = Math.max(0, ptPlanPrice - ptCommissionValue);
          } else {
            ptOwnerCommission = Math.round(ptPlanPrice * (ptCommissionValue / 100));
            ptTrainerPayout = Math.max(0, ptPlanPrice - ptOwnerCommission);
          }
        }
      }

      const trainerName = p.personalTrainer || member?.personalTrainer || "";
      const trainerId = p.trainerId || member?.trainerId || "";

      // Net owner share: Base gym membership fee + Gym's PT cut
      // Trainer payout liability: Money belonging to personal trainer
      const netOwnerShare = ptPlanPrice > 0 ? (planPrice + ptOwnerCommission) : paid;
      const trainerLiability = ptPlanPrice > 0 ? ptTrainerPayout : 0;

      return {
        id: p.id || `p_${Math.random()}`,
        date: normalizeDate(p.date || p.createdAt),
        memberName: p.memberName || member?.name || "Member",
        planName: p.planName || "Membership Fee",
        category: "Membership Fee",
        amount: paid, // Gross Collection
        netOwnerShare, // Net Gym Retention (e.g. ₹3,400)
        trainerLiability, // Coach Payout Liability (e.g. ₹3,600)
        baseFee: planPrice, // Base Gym Fee (e.g. ₹2,500)
        ptFee: ptPlanPrice, // PT Fee (e.g. ₹4,500)
        ptOwnerCommission, // Gym Cut (e.g. ₹900)
        ptCommissionValue,
        trainerName,
        trainerId,
        paymentMode: p.paymentMode || "Cash",
        type: "membership"
      };
    });

    const supItems = supplementSales.map((s) => {
      const supAmount = Number(s.totalAmount || (s.quantitySold * s.unitPrice) || 0);
      const commission = Number(s.commissionAmount || 0);
      const netOwner = Number(
        s.gymNetRevenue !== undefined ? s.gymNetRevenue : Math.max(0, supAmount - commission)
      );
      const trainerName = s.referredByTrainerName || s.trainerName || "";
      const trainerId = s.referredByTrainerId || s.trainerId || "";

      return {
        id: s.id || `s_${Math.random()}`,
        date: normalizeDate(s.timestamp || s.date),
        memberName: s.memberName || "Walk-in Member",
        planName: s.productName || "Supplement Sale",
        category: "Supplement Store",
        amount: supAmount,
        netOwnerShare: netOwner, // Net Gym Revenue (Commission hatne ke baad)
        trainerLiability: commission, // Coach referral cut
        baseFee: netOwner,
        ptFee: 0,
        ptOwnerCommission: 0,
        trainerName,
        trainerId,
        commissionType: s.commissionType || "none",
        commissionValue: s.commissionValue || 0,
        paymentMode: s.paymentMode || "Cash",
        type: "supplement"
      };
    });

    return [...feeItems, ...supItems].sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [payments, supplementSales, members]);

  // Standardized Expense Items
  const standardizedExpenseItems = useMemo(() => {
    return expenses.map((e) => ({
      id: e.id || `e_${Math.random()}`,
      date: normalizeDate(e.date || e.createdAt),
      title: e.title || "Operational Overhead",
      category: e.category || "General",
      type: e.type || "onetime",
      amount: Number(e.amount || 0)
    })).sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [expenses]);

  // -------------------------------------------------------------------------
  // FILTERING LOGIC ACCORDING TO ACTIVE MODE
  // -------------------------------------------------------------------------
  const filteredData = useMemo(() => {
    let rev = [];
    let exp = [];
    let periodLabel = "";

    if (reportMode === "daily") {
      // Exact day filter
      periodLabel = new Date(selectedDailyDate).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      rev = unifiedRevenueItems.filter((r) => r.date === selectedDailyDate);
      exp = standardizedExpenseItems.filter((e) => e.date === selectedDailyDate);
    } else if (reportMode === "monthly") {
      // Month-Year filter (e.g. "2026-09")
      const [year, month] = selectedMonth.split("-");
      const d = new Date(Number(year), Number(month) - 1, 1);
      periodLabel = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

      rev = unifiedRevenueItems.filter((r) => r.date.startsWith(selectedMonth));
      exp = standardizedExpenseItems.filter((e) => e.date.startsWith(selectedMonth));
    } else {
      // Custom / Lifetime Mode
      if (customRange.preset === "lifetime") {
        periodLabel = "All Time (Complete Gym Inception to Present)";
        rev = unifiedRevenueItems;
        exp = standardizedExpenseItems;
      } else if (customRange.preset === "this_year") {
        const curYear = new Date().getFullYear().toString();
        periodLabel = `Full Year ${curYear}`;
        rev = unifiedRevenueItems.filter((r) => r.date.startsWith(curYear));
        exp = standardizedExpenseItems.filter((e) => e.date.startsWith(curYear));
      } else {
        // Date Range
        periodLabel = `${customRange.startDate} to ${customRange.endDate}`;
        rev = unifiedRevenueItems.filter(
          (r) => r.date >= customRange.startDate && r.date <= customRange.endDate
        );
        exp = standardizedExpenseItems.filter(
          (e) => e.date >= customRange.startDate && e.date <= customRange.endDate
        );
      }
    }

    // Gross Inflow vs Trainer Liability vs Gym Net Revenue
    const grossTotalRevenue = rev.reduce((acc, curr) => acc + curr.amount, 0);
    const trainerLiabilities = rev.reduce((acc, curr) => acc + (curr.trainerLiability || 0), 0);
    const gymNetRevenue = rev.reduce((acc, curr) => acc + (curr.netOwnerShare ?? curr.amount), 0);

    const totalExp = exp.reduce((acc, curr) => acc + curr.amount, 0);
    const netProf = gymNetRevenue - totalExp; // Owner true profit

    const supRev = rev.filter((r) => r.type === "supplement").reduce((acc, curr) => acc + curr.amount, 0);
    const memRev = grossTotalRevenue - supRev;

    // Group trainer liabilities by coach (PT Fees + Supplement Commissions)
    const trainerLiabilitiesMap = {};
    rev.forEach((r) => {
      if (r.trainerLiability > 0 && (r.trainerName || r.trainerId)) {
        const tName = r.trainerName || "Trainer";
        if (!trainerLiabilitiesMap[tName]) {
          trainerLiabilitiesMap[tName] = {
            trainerName: tName,
            trainerId: r.trainerId || "",
            totalPtCollected: 0,
            ownerCommission: 0,
            totalSupReferred: 0,
            supCommission: 0,
            trainerPayoutDue: 0,
            clients: []
          };
        }
        if (r.type === "supplement") {
          trainerLiabilitiesMap[tName].totalSupReferred =
            (trainerLiabilitiesMap[tName].totalSupReferred || 0) + r.amount;
          trainerLiabilitiesMap[tName].supCommission =
            (trainerLiabilitiesMap[tName].supCommission || 0) + r.trainerLiability;
        } else {
          trainerLiabilitiesMap[tName].totalPtCollected += r.ptFee;
          trainerLiabilitiesMap[tName].ownerCommission += r.ptOwnerCommission;
        }
        trainerLiabilitiesMap[tName].trainerPayoutDue += r.trainerLiability;
        trainerLiabilitiesMap[tName].clients.push({
          memberName: r.memberName,
          totalPaid: r.amount,
          ptFee: r.ptFee,
          ownerCommission: r.ptOwnerCommission,
          trainerPayout: r.trainerLiability,
          date: r.date,
          itemType: r.type,
          planName: r.planName,
          trainerId: r.trainerId || ""
        });
      }
    });

    // Payment Mode Breakdown
    const modeBreakdown = {
      cash: rev.filter((r) => (r.paymentMode || "").toLowerCase().includes("cash")).reduce((acc, c) => acc + c.amount, 0),
      online: rev.filter((r) => (r.paymentMode || "").toLowerCase().includes("online") || (r.paymentMode || "").toLowerCase().includes("upi") || (r.paymentMode || "").toLowerCase().includes("card")).reduce((acc, c) => acc + c.amount, 0),
      bank: rev.filter((r) => (r.paymentMode || "").toLowerCase().includes("bank")).reduce((acc, c) => acc + c.amount, 0),
    };

    // Category Expense Breakdown
    const expCategoryMap = {};
    exp.forEach((e) => {
      const cat = e.category || "Other";
      expCategoryMap[cat] = (expCategoryMap[cat] || 0) + e.amount;
    });

    return {
      revenueItems: rev,
      expenseItems: exp,
      grossTotalRevenue,
      trainerLiabilities,
      gymNetRevenue,
      totalRevenue: grossTotalRevenue, // backwards compatible
      totalExpenses: totalExp,
      netProfit: netProf,
      supplementRevenue: supRev,
      membershipRevenue: memRev,
      trainerLiabilitiesMap,
      modeBreakdown,
      expCategoryMap,
      periodLabel
    };
  }, [reportMode, selectedDailyDate, selectedMonth, customRange, unifiedRevenueItems, standardizedExpenseItems]);

  // Handle PDF Download
  const handleDownloadPDF = () => {
    try {
      generateFinancialStatementPDF({
        periodType: reportMode,
        periodLabel: filteredData.periodLabel,
        grossRevenue: filteredData.grossTotalRevenue,
        trainerPayoutLiability: filteredData.trainerLiabilities,
        gymNetRevenue: filteredData.gymNetRevenue,
        totalRevenue: filteredData.grossTotalRevenue,
        totalExpenses: filteredData.totalExpenses,
        netProfit: filteredData.netProfit,
        revenueItems: filteredData.revenueItems,
        expenseItems: filteredData.expenseItems,
        supplementRevenue: filteredData.supplementRevenue,
        activeMembersCount: members.length || 45,
        newEnrollmentsCount: filteredData.revenueItems.filter((r) => r.type === "membership").length
      }, settings);
      toast.success(`${reportMode.toUpperCase()} Statement PDF generated & downloaded!`);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF statement");
    }
  };

  // Chart data preparation for Monthly & Custom
  const monthlyChartData = useMemo(() => {
    // Group by month
    const monthsMap = {};
    // Last 6 months or all months in filtered range
    unifiedRevenueItems.forEach((r) => {
      const mKey = r.date.slice(0, 7);
      if (!monthsMap[mKey]) monthsMap[mKey] = { month: mKey, grossRevenue: 0, netRevenue: 0, trainerPayout: 0, expenses: 0 };
      monthsMap[mKey].grossRevenue += r.amount;
      monthsMap[mKey].netRevenue += (r.netOwnerShare ?? r.amount);
      monthsMap[mKey].trainerPayout += (r.trainerLiability || 0);
    });
    standardizedExpenseItems.forEach((e) => {
      const mKey = e.date.slice(0, 7);
      if (!monthsMap[mKey]) monthsMap[mKey] = { month: mKey, grossRevenue: 0, netRevenue: 0, trainerPayout: 0, expenses: 0 };
      monthsMap[mKey].expenses += e.amount;
    });

    return Object.values(monthsMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map((item) => {
        const [y, m] = item.month.split("-");
        const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short" });
        return {
          month: monthLabel,
          grossRevenue: item.grossRevenue,
          revenue: item.netRevenue, // Net Gym Revenue
          trainerPayout: item.trainerPayout,
          expenses: item.expenses,
          profit: item.netRevenue - item.expenses
        };
      });
  }, [unifiedRevenueItems, standardizedExpenseItems]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 p-1 flex items-center justify-center text-white shadow-md shadow-emerald-500/10 shrink-0 overflow-hidden">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.gymName || "Gym Logo"}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white ${
                  settings?.logoUrl ? "hidden" : "flex"
                }`}
              >
                <BarChart2 className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Financial Reports & Audit Statements
                </h1>
                {settings?.gymName && (
                  <span className="hidden sm:inline-flex text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {settings.gymName}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                Comprehensive Daily, Monthly & Lifetime profit, expenses and balance ledger
              </p>
            </div>
          </div>
        </div>

        {/* Download Statement Button */}
        <Button
          icon={<Download className="w-4 h-4" />}
          onClick={handleDownloadPDF}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 shrink-0"
        >
          Download Official PDF Statement
        </Button>
      </div>

      {/* 3-Option Mode Switcher */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setReportMode("daily")}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all w-1/3 md:w-auto ${
              reportMode === "daily"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Daily Report</span>
          </button>

          <button
            onClick={() => setReportMode("monthly")}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all w-1/3 md:w-auto ${
              reportMode === "monthly"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Monthly Report</span>
          </button>

          <button
            onClick={() => setReportMode("custom")}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all w-1/3 md:w-auto ${
              reportMode === "custom"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Custom / Lifetime</span>
          </button>
        </div>

        {/* Date Selector for Active Mode */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {reportMode === "daily" && (
            <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Selected Date:</span>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
          )}

          {reportMode === "monthly" && (
            <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Selected Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
          )}

          {reportMode === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "lifetime", label: "Lifetime" },
                  { id: "this_year", label: "This Year" },
                  { id: "custom_dates", label: "Date Range" }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCustomRange({ ...customRange, preset: p.id })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      customRange.preset === p.id
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {customRange.preset === "custom_dates" && (
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <input
                    type="date"
                    value={customRange.startDate}
                    onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-900"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={customRange.endDate}
                    onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-900"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Period Notification Pill */}
      <div className="flex items-center justify-between px-5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
        <span className="text-emerald-800 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Showing Financial Audit for: <span className="underline">{filteredData.periodLabel}</span>
        </span>
        <span className="text-[11px] text-emerald-700 font-semibold">
          Gym Branding: {settings.gymName}
        </span>
      </div>

      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Collections */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Gross Total Inflow</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              Rs. {filteredData.grossTotalRevenue.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">
              Fees: Rs. {filteredData.membershipRevenue.toLocaleString("en-IN")} • Store: Rs. {filteredData.supplementRevenue.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Trainer PT Payout Liability */}
        <div className="p-5 rounded-3xl bg-white border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-500">Trainer PT Payouts</p>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                Coach Share
              </span>
            </div>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              Rs. {filteredData.trainerLiabilities.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {Object.keys(filteredData.trainerLiabilitiesMap || {}).length} Personal Trainer(s) Share
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Dumbbell className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Gym Owner Net Revenue */}
        <div className="p-5 rounded-3xl bg-white border border-teal-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-500">Gym Owner Revenue</p>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                Net Retained
              </span>
            </div>
            <h3 className="text-2xl font-black text-teal-700 mt-1">
              Rs. {filteredData.gymNetRevenue.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] text-teal-600 font-bold mt-1">
              Base Fees + 20% PT Commission Cut
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Net Operating Profit */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Net Operating Profit</p>
            <h3 className={`text-2xl font-black mt-1 ${filteredData.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              Rs. {filteredData.netProfit.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] font-bold mt-1 text-slate-500">
              {filteredData.netProfit >= 0 ? "✅ Net Owner Take-Home" : "⚠️ Operating Deficit"}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filteredData.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Dedicated Trainer Commission & Payout Liabilities Breakdown Card */}
      {filteredData.trainerLiabilities > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border border-amber-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Personal Trainer (PT) Commissions & Coach Payouts Due
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Gym collected total PT packages on coaches' behalf. Here is the exact deal cut & payout owed:
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                Total Coach Liabilities: Rs. {filteredData.trainerLiabilities.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {Object.values(filteredData.trainerLiabilitiesMap).map((t, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white border border-amber-200/90 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                      {t.trainerName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t.trainerName}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {t.trainerId && <span className="mr-1 text-slate-400 font-mono text-[10px]">ID: {t.trainerId.slice(0, 8)} •</span>}
                        {t.clients.length} Total Client / Referral(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Owed To Coach
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 text-center border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Volume</span>
                    <p className="text-xs font-black text-slate-800">Rs. {(t.totalPtCollected + (t.totalSupReferred || 0)).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-teal-600 uppercase">Gym Retained</span>
                    <p className="text-xs font-black text-teal-700">+Rs. {(t.ownerCommission + Math.max(0, (t.totalSupReferred || 0) - (t.supCommission || 0))).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Coach Payout</span>
                    <p className="text-xs font-black text-amber-600">Rs. {t.trainerPayoutDue.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* Clients / Referrals sub-list */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
                  {t.clients.map((c, cIdx) => (
                    <div key={cIdx} className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800 truncate max-w-[50%]">
                        {c.itemType === "supplement" ? "🛍️" : "👤"} {c.memberName}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">({c.planName})</span>
                      </span>
                      <span className="shrink-0">
                        Total: Rs. {Number(c.totalPaid || 0).toLocaleString("en-IN")} • Cut: <b className="text-amber-600">Rs. {Number(c.trainerPayout || 0).toLocaleString("en-IN")}</b>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graphical Section: Revenue vs Expenses Bar Chart */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue & Expense Distribution Trend
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of gym net revenue retained, trainer payouts owed, and operational expenses
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold mt-2 sm:mt-0">
            <span className="flex items-center gap-1.5 text-teal-700">
              <span className="w-3 h-3 rounded bg-teal-600" /> Gym Net Revenue
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-3 h-3 rounded bg-amber-500" /> Coach Payouts
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-3 h-3 rounded bg-rose-500" /> Expenses
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(val) => [`Rs. ${val.toLocaleString("en-IN")}`]}
              />
              <Bar dataKey="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} name="Gym Net Revenue" />
              <Bar dataKey="trainerPayout" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Coach Payouts" />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Columns: Itemized Revenue Ledger & Expenses Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Ledger Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" /> Revenue Ledger Entries ({filteredData.revenueItems.length})
            </h3>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              +Rs. {filteredData.grossTotalRevenue.toLocaleString("en-IN")} Inflow
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {filteredData.revenueItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-xs font-bold">No revenue collected for this selected duration.</p>
              </div>
            ) : (
              filteredData.revenueItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white transition shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{item.memberName}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.type === "supplement" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {item.type === "supplement" ? "Supplement" : "Membership"}
                        </span>
                        {item.ptFee > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            +PT Package
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.planName} • <span className="uppercase text-slate-600 font-semibold">{item.paymentMode}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900">
                        Rs. {item.amount.toLocaleString("en-IN")}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.date}</p>
                    </div>
                  </div>

                  {/* If PT was attached, show clear deal breakdown */}
                  {item.ptFee > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-100/90 border border-slate-200/70 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Gym Plan: <b>Rs. {item.baseFee.toLocaleString("en-IN")}</b></span>
                        <span>•</span>
                        <span>PT Cut: <b className="text-teal-700">+Rs. {item.ptOwnerCommission.toLocaleString("en-IN")}</b></span>
                        <span>•</span>
                        <span>Coach {item.trainerName}: <b className="text-amber-600">-Rs. {item.trainerLiability.toLocaleString("en-IN")}</b></span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                          Gym Net Kept: Rs. {item.netOwnerShare.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* If Supplement was referred by Trainer, show commission breakdown and Gym Net */}
                  {item.type === "supplement" && item.trainerLiability > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] flex flex-wrap items-center justify-between gap-2 text-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Sale: <b>Rs. {item.amount.toLocaleString("en-IN")}</b></span>
                        <span>•</span>
                        <span>Coach {item.trainerName}{item.trainerId ? ` (ID: ${item.trainerId.slice(0, 6)}...)` : ""}: <b className="text-amber-700">-Rs. {item.trainerLiability.toLocaleString("en-IN")}</b></span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                          Gym Net Kept: Rs. {item.netOwnerShare.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expenses Ledger Card */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-rose-600" /> Expense Overhead Entries ({filteredData.expenseItems.length})
            </h3>
            <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              -Rs. {filteredData.totalExpenses.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredData.expenseItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <DollarSign className="w-8 h-8 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-xs font-bold">No expenses logged for this selected duration.</p>
              </div>
            ) : (
              filteredData.expenseItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-white transition shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                      {item.type} Expense
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-600">
                      -Rs. {item.amount.toLocaleString("en-IN")}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}