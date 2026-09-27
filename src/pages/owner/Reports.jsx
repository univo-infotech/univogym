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
  Wallet,
  Search,
  Zap
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
import { formatDate } from "../../utils/dateUtils";

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
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const year = parts[0];
        const month = parts[1].padStart(2, "0");
        const day = parts[2].padStart(2, "0");
        return `${year}-${month}-${day}`;
      } else {
        // DD/MM/YYYY
        const day = parts[0].padStart(2, "0");
        const month = parts[1].padStart(2, "0");
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
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

  // Master Transactions Table state (Unified journal of all revenue, expenses, salaries, commissions)
  const [txFilter, setTxFilter] = useState("all"); // "all" | "revenue" | "expense" | "salary" | "commission"
  const [txSearch, setTxSearch] = useState("");

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
      periodLabel = formatDate(selectedDailyDate);
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

  // Consolidated Master Transactions Ledger (Every revenue, expense, salary, commission)
  const masterTransactions = useMemo(() => {
    const list = [];

    // 1. Revenue: Memberships & Services & Supplements
    (filteredData.revenueItems || []).forEach((r) => {
      const isPT = r.ptFee > 0;
      const isStore = r.type === "supplement";

      list.push({
        id: `rev_${r.id}`,
        rawId: r.id,
        date: r.date,
        flow: "inflow",
        group: "revenue",
        badgeLabel: isStore ? "Store / Supplement" : isPT ? "Gym + PT Fee" : "Membership Fee",
        party: r.memberName || "Member",
        description: r.planName || (isStore ? "Supplements Purchase" : "Gym Plan"),
        paymentMode: r.paymentMode || "Cash",
        amount: Number(r.amount || 0),
        subtext: isPT ? `Gym Net: ₹${(r.netOwnerShare || 0).toLocaleString("en-IN")}` : "",
      });

      // Personal Training Coach Cut (Commission Liability)
      if (isPT && r.trainerLiability > 0) {
        list.push({
          id: `pt_comm_${r.id}`,
          rawId: r.id,
          date: r.date,
          flow: "outflow",
          group: "commission",
          badgeLabel: "Trainer PT Cut",
          party: r.trainerName ? `Coach ${r.trainerName}` : "Personal Trainer",
          description: `PT commission for ${r.memberName} (${r.planName})`,
          paymentMode: "Coach Cut",
          amount: Number(r.trainerLiability || 0),
          subtext: `From Member Fee: ₹${(r.amount || 0).toLocaleString("en-IN")}`,
        });
      }

      // Supplement Store Referral Cut
      if (isStore && r.trainerLiability > 0) {
        list.push({
          id: `sup_comm_${r.id}`,
          rawId: r.id,
          date: r.date,
          flow: "outflow",
          group: "commission",
          badgeLabel: "Store Referral Cut",
          party: r.trainerName ? `Coach ${r.trainerName}` : "Trainer Referral",
          description: `Store referral incentive for ${r.planName}`,
          paymentMode: "Referral Commission",
          amount: Number(r.trainerLiability || 0),
          subtext: `From Store Sale: ₹${(r.amount || 0).toLocaleString("en-IN")}`,
        });
      }
    });

    // 2. Expenses, Overheads, Staff & Trainer Salaries
    (filteredData.expenseItems || []).forEach((e) => {
      const titleLower = (e.title || "").toLowerCase();
      const isStaffSal = e.category === "Staff Salary" || titleLower.includes("staff salary");
      const isTrainerSal = e.category === "Trainer Salary" || titleLower.includes("trainer salary");

      if (isStaffSal) {
        list.push({
          id: `exp_${e.id}`,
          rawId: e.id,
          date: e.date,
          flow: "outflow",
          group: "salary",
          badgeLabel: "Staff Salary",
          party: e.title || "Staff Member",
          description: e.notes || "Staff monthly payroll compensation",
          paymentMode: e.type === "monthly" ? "Monthly Payroll" : "One-Time",
          amount: Number(e.amount || 0),
          subtext: "Staff Salary Outflow",
        });
      } else if (isTrainerSal) {
        list.push({
          id: `exp_${e.id}`,
          rawId: e.id,
          date: e.date,
          flow: "outflow",
          group: "salary",
          badgeLabel: "Trainer Salary",
          party: e.title || "Gym Trainer",
          description: e.notes || "Trainer monthly payroll compensation",
          paymentMode: e.type === "monthly" ? "Monthly Payroll" : "One-Time",
          amount: Number(e.amount || 0),
          subtext: "Trainer Salary Outflow",
        });
      } else {
        list.push({
          id: `exp_${e.id}`,
          rawId: e.id,
          date: e.date,
          flow: "outflow",
          group: "expense",
          badgeLabel: e.category || "Overhead",
          party: e.title || "General Expense",
          description: e.notes || `${e.category || "Operational"} overhead expense`,
          paymentMode: e.type === "monthly" ? "Monthly Fixed" : "One-Time",
          amount: Number(e.amount || 0),
          subtext: "Overhead Cost",
        });
      }
    });

    return list.sort((a, b) => (b.date > a.date ? 1 : a.date < b.date ? -1 : 0));
  }, [filteredData]);

  // Filtered Master Transactions
  const filteredMasterTransactions = useMemo(() => {
    return masterTransactions.filter((tx) => {
      if (txFilter !== "all" && tx.group !== txFilter) return false;

      if (txSearch.trim()) {
        const query = txSearch.toLowerCase();
        const matchParty = (tx.party || "").toLowerCase().includes(query);
        const matchDesc = (tx.description || "").toLowerCase().includes(query);
        const matchBadge = (tx.badgeLabel || "").toLowerCase().includes(query);
        const matchMode = (tx.paymentMode || "").toLowerCase().includes(query);
        const matchAmount = String(tx.amount).includes(query);
        if (!matchParty && !matchDesc && !matchBadge && !matchMode && !matchAmount) {
          return false;
        }
      }
      return true;
    });
  }, [masterTransactions, txFilter, txSearch]);

  const txCounts = useMemo(() => {
    return {
      all: masterTransactions.length,
      revenue: masterTransactions.filter((t) => t.group === "revenue").length,
      expense: masterTransactions.filter((t) => t.group === "expense").length,
      salary: masterTransactions.filter((t) => t.group === "salary").length,
      commission: masterTransactions.filter((t) => t.group === "commission").length,
    };
  }, [masterTransactions]);

  const txTotals = useMemo(() => {
    const totalInflow = filteredMasterTransactions
      .filter((t) => t.flow === "inflow")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalOutflow = filteredMasterTransactions
      .filter((t) => t.flow === "outflow")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const net = totalInflow - totalOutflow;
    return { totalInflow, totalOutflow, net };
  }, [filteredMasterTransactions]);

  const handleExportTransactionsCSV = () => {
    try {
      if (filteredMasterTransactions.length === 0) {
        toast.error("No transactions to export");
        return;
      }

      const headers = ["Date", "Flow", "Group", "Type / Category", "Party / Payee / Member", "Description", "Payment Mode", "Amount (INR)"];
      const rows = filteredMasterTransactions.map((tx) => [
        `"${formatDate(tx.date)}"`,
        `"${tx.flow === "inflow" ? "CREDIT (+)" : "DEBIT (-)"}"`,
        `"${tx.group.toUpperCase()}"`,
        `"${tx.badgeLabel}"`,
        `"${(tx.party || "").replace(/"/g, '""')}"`,
        `"${(tx.description || "").replace(/"/g, '""')}"`,
        `"${tx.paymentMode || "Cash"}"`,
        tx.amount
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Master_Transactions_${reportMode}_${(filteredData.periodLabel || "report").replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Master Transactions CSV exported!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export CSV");
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
      <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 overflow-hidden">
        {/* Main Tab Controls */}
        <div className="flex items-center bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-inner w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setReportMode("daily")}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-extrabold transition-all flex-1 lg:flex-initial ${
              reportMode === "daily"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">
              Daily<span className="hidden sm:inline"> Report</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReportMode("monthly")}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-extrabold transition-all flex-1 lg:flex-initial ${
              reportMode === "monthly"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">
              Monthly<span className="hidden sm:inline"> Report</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReportMode("custom")}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-extrabold transition-all flex-1 lg:flex-initial ${
              reportMode === "custom"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">
              Custom<span className="hidden sm:inline"> / Lifetime</span>
            </span>
          </button>
        </div>

        {/* Date Selector for Active Mode */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {reportMode === "daily" && (
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full lg:w-auto bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl sm:rounded-2xl">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Date:</span>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none min-w-0"
              />
            </div>
          )}

          {reportMode === "monthly" && (
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full lg:w-auto bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl sm:rounded-2xl">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none min-w-0"
              />
            </div>
          )}

          {reportMode === "custom" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              {/* Preset Selector */}
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                {[
                  { id: "lifetime", label: "Lifetime" },
                  { id: "this_year", label: "This Year" },
                  { id: "custom_dates", label: "Date Range" }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCustomRange({ ...customRange, preset: p.id })}
                    className={`px-2.5 py-1.5 text-center rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      customRange.preset === p.id
                        ? "bg-white text-emerald-700 shadow-xs border border-emerald-100/50"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Start & End Date Inputs */}
              {customRange.preset === "custom_dates" && (
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto items-center">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">From</span>
                    <input
                      type="date"
                      value={customRange.startDate}
                      onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full min-w-0"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">To</span>
                    <input
                      type="date"
                      value={customRange.endDate}
                      onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full min-w-0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Period Notification Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-900 font-bold min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">
            Financial Audit for: <span className="underline decoration-emerald-400 font-extrabold">{filteredData.periodLabel}</span>
          </span>
        </div>
        {settings?.gymName && (
          <span className="text-[11px] text-emerald-700 font-medium pl-6 sm:pl-0 truncate">
            Gym: <span className="font-bold">{settings.gymName}</span>
          </span>
        )}
      </div>

      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Gross Collections */}
        <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Gross Inflow</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
            ₹{filteredData.grossTotalRevenue.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-1 truncate">
            Fees: ₹{filteredData.membershipRevenue.toLocaleString("en-IN")}
          </div>
        </div>

        {/* 2. Trainer PT Payout Liability */}
        <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-amber-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Coach Cuts</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-amber-600 tracking-tight whitespace-nowrap">
            ₹{filteredData.trainerLiabilities.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-1 truncate">
            {Object.keys(filteredData.trainerLiabilitiesMap || {}).length} Trainer(s) Share
          </div>
        </div>

        {/* 3. Gym Owner Net Revenue */}
        <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-teal-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Gym Retained</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-teal-700 tracking-tight whitespace-nowrap">
            ₹{filteredData.gymNetRevenue.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] sm:text-[11px] text-teal-600 font-medium mt-1 truncate">
            Gym Net Kept
          </div>
        </div>

        {/* 4. Net Operating Profit */}
        <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Net Profit</span>
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${filteredData.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className={`text-base sm:text-2xl font-black tracking-tight whitespace-nowrap ${filteredData.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
            ₹{filteredData.netProfit.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] sm:text-[11px] font-bold mt-1 truncate">
            {filteredData.netProfit >= 0 ? (
              <span className="text-emerald-600">✅ Take-Home</span>
            ) : (
              <span className="text-rose-600">⚠️ Deficit</span>
            )}
          </div>
        </div>
      </div>

      {/* Dedicated Trainer Commission & Payout Liabilities Breakdown Card */}
      {filteredData.trainerLiabilities > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border border-amber-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                  Personal Trainer (PT) Commissions & Coach Payouts Due
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1">
                Gym collected total PT packages on coaches' behalf. Exact deal cut & payout owed:
              </p>
            </div>
            <div className="flex items-center self-start sm:self-auto shrink-0">
              <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                Total Due: ₹{filteredData.trainerLiabilities.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {Object.values(filteredData.trainerLiabilitiesMap).map((t, idx) => (
              <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-white border border-amber-200/90 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {t.trainerName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{t.trainerName}</h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                        {t.trainerId && <span className="mr-1 text-slate-400 font-mono text-[9px] sm:text-[10px]">ID: {t.trainerId.slice(0, 8)} •</span>}
                        {t.clients.length} Total Client/Referral(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0 whitespace-nowrap">
                    Owed To Coach
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl bg-slate-50 text-center border border-slate-100">
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight block truncate">Gross Vol</span>
                    <p className="text-[11px] sm:text-xs font-black text-slate-800 whitespace-nowrap">
                      ₹{(t.totalPtCollected + (t.totalSupReferred || 0)).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-teal-600 uppercase tracking-tight block truncate">Gym Retained</span>
                    <p className="text-[11px] sm:text-xs font-black text-teal-700 whitespace-nowrap">
                      +₹{(t.ownerCommission + Math.max(0, (t.totalSupReferred || 0) - (t.supCommission || 0))).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-tight block truncate">Coach Due</span>
                    <p className="text-[11px] sm:text-xs font-black text-amber-600 whitespace-nowrap">
                      ₹{t.trainerPayoutDue.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Clients / Referrals sub-list */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pt-2 border-t border-slate-100 text-xs pr-1 scrollbar-thin">
                  {t.clients.map((c, cIdx) => (
                    <div key={cIdx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/70 hover:bg-slate-100/70 text-[11px] transition gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="shrink-0 text-xs">{c.itemType === "supplement" ? "🛍️" : "👤"}</span>
                        <span className="font-semibold text-slate-800 truncate">{c.memberName}</span>
                        {c.planName && (
                          <span className="text-[10px] text-slate-400 font-normal truncate hidden sm:inline">
                            ({c.planName})
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right whitespace-nowrap text-[10px] sm:text-[11px]">
                        <span className="text-slate-500 font-medium">₹{Number(c.totalPaid || 0).toLocaleString("en-IN")}</span>
                        <span className="text-slate-300 mx-1">•</span>
                        <span className="font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                          Cut: ₹{Number(c.trainerPayout || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graphical Section: Revenue vs Expenses Bar Chart */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                Revenue & Expense Distribution Trend
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Monthly Gym Net Revenue, Coach Cuts & Overhead Expenses
              </p>
            </div>
          </div>

          {/* Legend Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
              <span>Gym Net</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Coach Cut</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/60 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span>Expenses</span>
            </span>
          </div>
        </div>

        {/* Scrollable Container on ultra-narrow screens */}
        <div className="w-full overflow-x-auto scrollbar-thin pb-1">
          <div className="min-w-[340px] sm:min-w-0 h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
                margin={{ top: 12, right: 8, left: -14, bottom: 0 }}
                barGap={3}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tickFormatter={(val) => {
                    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                    if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
                    if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
                    return `₹${val}`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "14px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontWeight: 600
                  }}
                  formatter={(val, name) => [`₹${Number(val || 0).toLocaleString("en-IN")}`, name]}
                />
                <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Gym Net Revenue" maxBarSize={22} />
                <Bar dataKey="trainerPayout" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Coach Cut" maxBarSize={22} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Monthly Summary Strip */}
        {monthlyChartData.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">
              Trend of last <b className="text-slate-800">{monthlyChartData.length} months</b>
            </span>
            {monthlyChartData[monthlyChartData.length - 1] && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-semibold text-slate-600">
                  Latest ({monthlyChartData[monthlyChartData.length - 1].month}):
                </span>
                <span className="font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Net: ₹{monthlyChartData[monthlyChartData.length - 1].revenue.toLocaleString("en-IN")}
                </span>
                <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Exp: ₹{monthlyChartData[monthlyChartData.length - 1].expenses.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two Columns: Itemized Revenue Ledger & Expenses Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Ledger Card */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600 shrink-0" /> Revenue Ledger Entries ({filteredData.revenueItems.length})
            </h3>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
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
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</p>
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
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-rose-600 shrink-0" /> Expense Overhead Entries ({filteredData.expenseItems.length})
            </h3>
            <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 self-start sm:self-auto">
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
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MASTER TRANSACTIONS LEDGER (Revenue, Expenses, Salaries, Commissions)     */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden space-y-0">
        {/* Ledger Header & KPI Strip */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0 mt-0.5 sm:mt-0">
                  <Receipt className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
                    Master Transactions Ledger
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      All Activity
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Har tarike ka financial transaction: Revenue, Expenses, Staff & Trainer Salaries, aur Commissions for <span className="font-bold text-slate-700">{filteredData.periodLabel}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Summary Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shadow-2xs">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span>Inflow: +₹{txTotals.totalInflow.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-extrabold shadow-2xs">
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>Outflow: -₹{txTotals.totalOutflow.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-black shadow-2xs">
                <Wallet className="w-4 h-4 text-teal-600" />
                <span>Net: ₹{txTotals.net.toLocaleString("en-IN")}</span>
              </div>

              <button
                type="button"
                onClick={handleExportTransactionsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs transition"
                title="Export this transaction ledger to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Chips & Search Bar */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none max-w-full">
              <button
                type="button"
                onClick={() => setTxFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap ${
                  txFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({txCounts.all})
              </button>

              <button
                type="button"
                onClick={() => setTxFilter("revenue")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1 ${
                  txFilter === "revenue"
                    ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Revenue ({txCounts.revenue})
              </button>

              <button
                type="button"
                onClick={() => setTxFilter("expense")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1 ${
                  txFilter === "expense"
                    ? "bg-white text-rose-700 shadow-xs border border-rose-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Expenses ({txCounts.expense})
              </button>

              <button
                type="button"
                onClick={() => setTxFilter("salary")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1 ${
                  txFilter === "salary"
                    ? "bg-white text-teal-700 shadow-xs border border-teal-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3 h-3 text-teal-600" />
                Salaries ({txCounts.salary})
              </button>

              <button
                type="button"
                onClick={() => setTxFilter("commission")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1 ${
                  txFilter === "commission"
                    ? "bg-white text-purple-700 shadow-xs border border-purple-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap className="w-3 h-3 text-purple-600" />
                Commissions ({txCounts.commission})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search transactions..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 transition font-medium"
              />
            </div>
          </div>
        </div>

        {/* Content Body: Empty State or Transactions Table */}
        {filteredMasterTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white">
            <Receipt className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No transactions recorded for this criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              Filter ya search adjust karein ya duration change karein.
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW (Clean responsive card layout for screens < md) */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {filteredMasterTransactions.map((tx) => {
                const isInflow = tx.flow === "inflow";
                const isSalary = tx.group === "salary";
                const isCommission = tx.group === "commission";

                return (
                  <div key={tx.id} className="p-4 space-y-2 hover:bg-slate-50/80 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{formatDate(tx.date)}</span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isInflow
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isSalary
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : isCommission
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {tx.badgeLabel}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-black ${
                            isInflow ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isInflow ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm capitalize leading-snug">
                          {tx.party}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {tx.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase shrink-0">
                        {tx.paymentMode}
                      </span>
                    </div>

                    {tx.subtext && (
                      <p className="text-[10px] font-bold text-slate-400 pt-0.5">
                        {tx.subtext}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Full data grid for screens >= md) */}
            <div className="hidden md:block overflow-x-auto bg-white">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-black border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Transaction Type</th>
                    <th className="px-5 py-3.5">Party / Payee / Member</th>
                    <th className="px-5 py-3.5">Description / Plan</th>
                    <th className="px-5 py-3.5">Payment Mode</th>
                    <th className="px-5 py-3.5 text-right">Flow & Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMasterTransactions.map((tx) => {
                    const isInflow = tx.flow === "inflow";
                    const isSalary = tx.group === "salary";
                    const isCommission = tx.group === "commission";

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{formatDate(tx.date)}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-[11px] ${
                              isInflow
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : isSalary
                                ? "bg-teal-50 text-teal-800 border-teal-200"
                                : isCommission
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {isInflow ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            ) : isSalary ? (
                              <Users className="w-3.5 h-3.5 text-teal-600" />
                            ) : isCommission ? (
                              <Zap className="w-3.5 h-3.5 text-purple-600" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            {tx.badgeLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 capitalize">{tx.party}</p>
                        </td>
                        <td className="px-5 py-3.5 max-w-xs truncate">
                          <span className="text-slate-700">{tx.description}</span>
                          {tx.subtext && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {tx.subtext}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {tx.paymentMode}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap font-black text-sm">
                          <span className={`inline-flex items-center gap-1 ${isInflow ? "text-emerald-600" : "text-rose-600"}`}>
                            {isInflow ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}