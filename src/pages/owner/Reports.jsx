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
  RefreshCw
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
import { generateFinancialStatementPDF } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

// Format DD/MM/YYYY or YYYY-MM-DD to ISO date string YYYY-MM-DD
function normalizeDate(dStr) {
  if (!dStr) return "";
  if (dStr.includes("/")) {
    const parts = dStr.split("/");
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return dStr.slice(0, 10);
}

export default function Reports() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";
  const settings = getGymSettings();

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

  // Raw Data from Collections
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [supplementSales, setSupplementSales] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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
        const [pSnap, eSnap, sSnap, mSnap] = await Promise.all([
          getAllPayments(gymId),
          getExpenses(gymId),
          getSupplementSales(gymId),
          getMembers(gymId)
        ]);

        setPayments(pSnap || []);
        setExpenses(eSnap || []);
        setSupplementSales(sSnap || []);
        setMembers(mSnap || []);
      } catch (err) {
        console.warn("Reports data load error:", err);
        setPayments([]);
        setExpenses([]);
        setSupplementSales([]);
      } finally {
        setLoading(false);
      }
    }
    loadReportsData();
  }, [gymId]);

  // Combine Membership Payments + Supplement Store Sales into unified revenue items
  const unifiedRevenueItems = useMemo(() => {
    const feeItems = payments.map((p) => ({
      id: p.id || `p_${Math.random()}`,
      date: normalizeDate(p.date || p.createdAt),
      memberName: p.memberName || "Member",
      planName: p.planName || "Membership Fee",
      category: "Membership Fee",
      amount: Number(p.paidAmount || p.amount || 0),
      paymentMode: p.paymentMode || "Cash",
      type: "membership"
    }));

    const supItems = supplementSales.map((s) => ({
      id: s.id || `s_${Math.random()}`,
      date: normalizeDate(s.timestamp || s.date),
      memberName: s.memberName || "Walk-in Member",
      planName: s.productName || "Supplement Sale",
      category: "Supplement Store",
      amount: Number(s.totalAmount || (s.quantitySold * s.unitPrice) || 0),
      paymentMode: s.paymentMode || "Cash",
      type: "supplement"
    }));

    return [...feeItems, ...supItems].sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [payments, supplementSales]);

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

    const totalRev = rev.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExp = exp.reduce((acc, curr) => acc + curr.amount, 0);
    const netProf = totalRev - totalExp;
    const supRev = rev.filter((r) => r.type === "supplement").reduce((acc, curr) => acc + curr.amount, 0);
    const memRev = totalRev - supRev;

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
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      netProfit: netProf,
      supplementRevenue: supRev,
      membershipRevenue: memRev,
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
        totalRevenue: filteredData.totalRevenue,
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
      if (!monthsMap[mKey]) monthsMap[mKey] = { month: mKey, revenue: 0, expenses: 0 };
      monthsMap[mKey].revenue += r.amount;
    });
    standardizedExpenseItems.forEach((e) => {
      const mKey = e.date.slice(0, 7);
      if (!monthsMap[mKey]) monthsMap[mKey] = { month: mKey, revenue: 0, expenses: 0 };
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
          revenue: item.revenue,
          expenses: item.expenses,
          profit: item.revenue - item.expenses
        };
      });
  }, [unifiedRevenueItems, standardizedExpenseItems]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Financial Reports & Audit Statements
              </h1>
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
        {/* Gross Revenue */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Gross Total Revenue</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              Rs. {filteredData.totalRevenue.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">
              Fees: Rs. {filteredData.membershipRevenue.toLocaleString("en-IN")} • Store: Rs. {filteredData.supplementRevenue.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Expenses */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Operational Expenses</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              Rs. {filteredData.totalExpenses.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {filteredData.expenseItems.length} Recorded Overheads & Bills
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Net Operating Profit</p>
            <h3 className={`text-2xl font-black mt-1 ${filteredData.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              Rs. {filteredData.netProfit.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] font-bold mt-1 text-slate-500">
              {filteredData.netProfit >= 0 ? "✅ Surplus Profit" : "⚠️ Operating Deficit"}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filteredData.netProfit >= 0 ? "bg-teal-50 text-teal-600" : "bg-rose-50 text-rose-600"}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Mode Collection */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Collection Breakdown</p>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              Cash: Rs. {filteredData.modeBreakdown.cash.toLocaleString("en-IN")}
            </h3>
            <p className="text-[11px] text-blue-600 font-bold mt-0.5">
              Online/UPI: Rs. {filteredData.modeBreakdown.online.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Graphical Section: Revenue vs Expenses Bar Chart */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue vs Expenses Historical Trend
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of gross collections versus operational gym overheads
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold mt-2 sm:mt-0">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Gross Revenue
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
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="Gross Revenue" />
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
              +Rs. {filteredData.totalRevenue.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredData.revenueItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-xs font-bold">No revenue collected for this selected duration.</p>
              </div>
            ) : (
              filteredData.revenueItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-white transition shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{item.memberName}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        item.type === "supplement" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {item.type === "supplement" ? "Supplement" : "Membership"}
                      </span>
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