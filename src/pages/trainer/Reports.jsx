import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart2,
  TrendingUp,
  Calendar,
  Download,
  IndianRupee,
  Users,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  FileText,
  Building,
  Dumbbell,
  Wallet,
  HandCoins,
  Receipt,
  HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
import { useAuth } from "../../contexts/AuthContext";
import { getTrainer, getTrainers, getTrainerMembers } from "../../firebase/trainers";
import { getAllPayments } from "../../firebase/payments";
import { getSupplementSales } from "../../firebase/stock";
import { getStaff } from "../../firebase/staff";
import { generateTrainerEarningsStatementPDF } from "../../utils/pdf";
import toast from "react-hot-toast";

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

export default function TrainerReports() {
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";

  // Mode: "daily" | "monthly" | "custom"
  const [reportMode, setReportMode] = useState("monthly");

  const todayIso = new Date().toISOString().split("T")[0];
  const [selectedDailyDate, setSelectedDailyDate] = useState(todayIso);

  const currentYearMonth = todayIso.slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  const [customRange, setCustomRange] = useState({
    preset: "this_month", // "this_month", "last_3_months", "this_year", "lifetime", "custom_dates"
    startDate: `${currentYearMonth}-01`,
    endDate: todayIso,
  });

  const [trainerProfile, setTrainerProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [supplementSales, setSupplementSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load Trainer Info & Related Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let tData = null;

        // 1. Direct profileId
        if (profileId) {
          try {
            tData = await getTrainer(GID, profileId);
          } catch (e) {}
        }

        // 2. Saved session
        const savedSession = localStorage.getItem("univo_trainer_session");
        let sessionData = null;
        if (savedSession) {
          try {
            sessionData = JSON.parse(savedSession);
          } catch (e) {}
        }

        if (!tData && sessionData) {
          tData = sessionData;
          if (sessionData.id) {
            try {
              const fresh = await getTrainer(GID, sessionData.id);
              if (fresh) tData = { ...sessionData, ...fresh };
            } catch (e) {}
          }
        }

        // 3. Fallback to getTrainers
        if (!tData || !tData.name) {
          try {
            const allT = await getTrainers(GID);
            const searchEmail = (user?.email || sessionData?.email || sessionData?.loginEmail || "").toLowerCase().trim();
            const searchName = (user?.displayName || sessionData?.name || "").toLowerCase().trim();
            const found = allT.find((t) => {
              const tEmail = (t.email || t.loginEmail || "").toLowerCase().trim();
              const tName = (t.name || t.fullName || "").toLowerCase().trim();
              return (searchEmail && tEmail === searchEmail) || (searchName && tName === searchName);
            });
            if (found) tData = found;
          } catch (e) {}
        }

        // 4. Fallback for salary from Staff collection if trainer doc has 0 salary
        if (tData && (!tData.salary || Number(tData.salary) === 0)) {
          try {
            const allStaff = await getStaff(GID);
            const tPhone = (tData.phone || "").replace(/\D/g, "");
            const tName = (tData.name || "").toLowerCase().trim();
            const staffMatch = allStaff.find((s) => {
              const sPhone = (s.phone || "").replace(/\D/g, "");
              const sName = (s.name || "").toLowerCase().trim();
              return (tPhone && sPhone && tPhone === sPhone) || (tName && sName && (sName === tName || sName.includes(tName)));
            });
            if (staffMatch && staffMatch.salary) {
              tData = { ...tData, salary: Number(staffMatch.salary) };
            }
          } catch (e) {}
        }

        setTrainerProfile(tData || { name: user?.displayName || "Coach", salary: 25000 });

        const tId = tData?.id || profileId || "";
        const tName = tData?.name || user?.displayName || "";

        // Fetch parallel resources
        const [memList, allPay, allSales] = await Promise.all([
          tId || tName ? getTrainerMembers(GID, tId, tName).catch(() => []) : [],
          getAllPayments(GID).catch(() => []),
          getSupplementSales(GID).catch(() => [])
        ]);

        setMembers(memList || []);
        setPayments(allPay || []);
        setSupplementSales(allSales || []);
      } catch (err) {
        console.error("Failed to load trainer report data:", err);
        toast.error("Could not load full report data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [GID, profileId, user]);

  // Derived Trainer IDs & Names
  const trainerId = trainerProfile?.id || profileId || "";
  const trainerName = trainerProfile?.name || user?.displayName || "Coach";
  const monthlySalary = Number(trainerProfile?.salary || 0);

  // Active Assigned Member IDs set
  const assignedMemberIds = useMemo(() => {
    return new Set(members.map((m) => m.id));
  }, [members]);

  // Filtered Ledger Data based on Time Window
  const { filteredItems, baseSalaryForPeriod, periodLabel } = useMemo(() => {
    let startBoundary = "";
    let endBoundary = "";
    let pLabel = "";
    let salaryMultiplier = 1; // 1 = 1 month

    if (reportMode === "daily") {
      startBoundary = selectedDailyDate;
      endBoundary = selectedDailyDate;
      pLabel = new Date(selectedDailyDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      salaryMultiplier = 1 / 30; // Daily prorated salary (assuming 30 days)
    } else if (reportMode === "monthly") {
      startBoundary = `${selectedMonth}-01`;
      const [y, m] = selectedMonth.split("-").map(Number);
      const daysInM = new Date(y, m, 0).getDate();
      endBoundary = `${selectedMonth}-${String(daysInM).padStart(2, "0")}`;
      const dObj = new Date(y, m - 1, 1);
      pLabel = dObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      salaryMultiplier = 1;
    } else {
      // Custom range
      if (customRange.preset === "this_month") {
        startBoundary = `${currentYearMonth}-01`;
        endBoundary = todayIso;
        pLabel = "This Month to Date";
        salaryMultiplier = 1;
      } else if (customRange.preset === "last_3_months") {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        startBoundary = d.toISOString().split("T")[0];
        endBoundary = todayIso;
        pLabel = "Last 3 Months";
        salaryMultiplier = 3;
      } else if (customRange.preset === "this_year") {
        const curY = new Date().getFullYear();
        startBoundary = `${curY}-01-01`;
        endBoundary = todayIso;
        pLabel = `Year ${curY} to Date`;
        const mCount = new Date().getMonth() + 1;
        salaryMultiplier = Math.max(1, mCount);
      } else if (customRange.preset === "lifetime") {
        startBoundary = "2020-01-01";
        endBoundary = todayIso;
        pLabel = "Lifetime Overall";
        salaryMultiplier = 6; // representative 6 months
      } else {
        startBoundary = customRange.startDate;
        endBoundary = customRange.endDate;
        pLabel = `${customRange.startDate} to ${customRange.endDate}`;
        const msDiff = new Date(endBoundary).getTime() - new Date(startBoundary).getTime();
        const daysDiff = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)));
        salaryMultiplier = daysDiff / 30;
      }
    }

    const periodSalary = Math.round(monthlySalary * salaryMultiplier);

    // 1. Match PT Client Payments / Commissions
    const ptItems = [];
    payments.forEach((p) => {
      const pDate = normalizeDate(p.date || p.paymentDate || p.createdAt);
      if (!pDate || pDate < startBoundary || pDate > endBoundary) return;

      // Check if payment belongs to this trainer
      const matchTrainerId = trainerId && (p.trainerId === trainerId || p.coachId === trainerId);
      const matchTrainerName =
        trainerName &&
        p.trainerName &&
        (p.trainerName.toLowerCase().trim() === trainerName.toLowerCase().trim() ||
          p.trainerName.toLowerCase().includes(trainerName.toLowerCase()) ||
          trainerName.toLowerCase().includes(p.trainerName.toLowerCase()));

      const matchAssignedMember = p.memberId && assignedMemberIds.has(p.memberId);

      if (matchTrainerId || matchTrainerName || matchAssignedMember) {
        // Calculate trainer's cut
        const totalAmount = Number(p.paidAmount || p.amount || 0);
        let trainerCut = 0;

        if (p.ptTrainerPayout !== undefined && p.ptTrainerPayout !== null) {
          trainerCut = Number(p.ptTrainerPayout);
        } else if (p.trainerCommission !== undefined && p.trainerCommission !== null) {
          trainerCut = Number(p.trainerCommission);
        } else {
          // Check trainer's commission settings
          const commType = trainerProfile?.commissionType || "percentage";
          const commVal = trainerProfile?.commissionValue !== undefined ? Number(trainerProfile.commissionValue) : 30;

          if (commType === "fixed") {
            // Gym owner gets commVal fixed cut, trainer keeps the rest
            trainerCut = Math.max(0, totalAmount - commVal);
          } else {
            // Gym owner gets commVal % cut, trainer gets remaining %
            const trainerSharePct = Math.max(0, 100 - commVal);
            trainerCut = Math.round((totalAmount * trainerSharePct) / 100);
          }
        }

        ptItems.push({
          id: p.id || `pt-${Math.random()}`,
          date: pDate,
          type: "pt_commission",
          typeLabel: "PT Membership Commission",
          clientName: p.memberName || p.userName || "Assigned Athlete",
          planName: p.planName || p.membershipPlan || "1-on-1 PT Session",
          totalSale: totalAmount,
          trainerCut: trainerCut,
          status: p.status || "paid",
          rawDate: new Date(pDate).getTime(),
        });
      }
    });

    // 2. Match Supplement Referral Sales
    const storeItems = [];
    supplementSales.forEach((s) => {
      const sDate = normalizeDate(s.date || s.saleDate || s.createdAt);
      if (!sDate || sDate < startBoundary || sDate > endBoundary) return;

      const matchTrainerId = trainerId && s.referredByTrainerId === trainerId;
      const matchTrainerName =
        trainerName &&
        s.referredByTrainerName &&
        s.referredByTrainerName.toLowerCase().trim() === trainerName.toLowerCase().trim();

      if (matchTrainerId || matchTrainerName) {
        const commAmt = Number(s.commissionAmount || s.trainerCommission || 0);
        const totalSale = Number(s.finalTotal || s.totalAmount || 0);

        storeItems.push({
          id: s.id || `store-${Math.random()}`,
          date: sDate,
          type: "supplement_referral",
          typeLabel: "Store Referral Incentive",
          clientName: s.customerName || "Gym Member",
          planName: s.itemName || `${s.items?.length || 1} Supplement Item(s)`,
          totalSale: totalSale,
          trainerCut: commAmt,
          status: s.status || "cleared",
          rawDate: new Date(sDate).getTime(),
        });
      }
    });

    // Combine and sort by date desc
    const combined = [...ptItems, ...storeItems].sort((a, b) => b.rawDate - a.rawDate);

    return {
      filteredItems: combined,
      baseSalaryForPeriod: periodSalary,
      periodLabel: pLabel,
    };
  }, [
    reportMode,
    selectedDailyDate,
    selectedMonth,
    customRange,
    payments,
    supplementSales,
    trainerId,
    trainerName,
    monthlySalary,
    assignedMemberIds,
    trainerProfile,
    currentYearMonth,
    todayIso,
  ]);

  // Aggregate Metrics
  const ptTotalCut = useMemo(() => {
    return filteredItems
      .filter((i) => i.type === "pt_commission")
      .reduce((sum, i) => sum + (Number(i.trainerCut) || 0), 0);
  }, [filteredItems]);

  const supplementTotalCut = useMemo(() => {
    return filteredItems
      .filter((i) => i.type === "supplement_referral")
      .reduce((sum, i) => sum + (Number(i.trainerCut) || 0), 0);
  }, [filteredItems]);

  const totalNetEarnings = baseSalaryForPeriod + ptTotalCut + supplementTotalCut;

  // Chart Data: Earnings Breakdown
  const earningsPieData = useMemo(() => {
    const data = [
      { name: "Fixed Base Salary", value: baseSalaryForPeriod, color: "#3b82f6" },
      { name: "PT Commissions", value: ptTotalCut, color: "#8b5cf6" },
      { name: "Supplement Cut", value: supplementTotalCut, color: "#10b981" },
    ].filter((d) => d.value > 0);

    if (data.length === 0) {
      return [{ name: "Base Salary", value: 1, color: "#3b82f6" }];
    }
    return data;
  }, [baseSalaryForPeriod, ptTotalCut, supplementTotalCut]);

  // Monthly / Daily Trend Chart Data
  const trendChartData = useMemo(() => {
    if (reportMode === "daily") {
      return [
        {
          name: selectedDailyDate,
          salary: baseSalaryForPeriod,
          pt: ptTotalCut,
          store: supplementTotalCut,
          total: totalNetEarnings,
        },
      ];
    }

    // Group items by day (for monthly view) or by month
    const groups = {};
    filteredItems.forEach((item) => {
      const key = reportMode === "monthly" ? item.date.slice(8, 10) : item.date.slice(0, 7);
      if (!groups[key]) {
        groups[key] = { label: key, pt: 0, store: 0 };
      }
      if (item.type === "pt_commission") groups[key].pt += item.trainerCut;
      if (item.type === "supplement_referral") groups[key].store += item.trainerCut;
    });

    return Object.values(groups).map((g) => ({
      name: reportMode === "monthly" ? `Day ${g.label}` : g.label,
      pt: g.pt,
      store: g.store,
      total: g.pt + g.store,
    }));
  }, [reportMode, selectedDailyDate, baseSalaryForPeriod, ptTotalCut, supplementTotalCut, totalNetEarnings, filteredItems]);

  // PDF Export
  const handleExportPDF = () => {
    try {
      generateTrainerEarningsStatementPDF({
        trainerName: trainerName,
        trainerPhone: trainerProfile?.phone || "",
        periodType: reportMode,
        periodLabel: periodLabel,
        baseSalary: baseSalaryForPeriod,
        ptCommission: ptTotalCut,
        supplementCommission: supplementTotalCut,
        totalNetEarnings: totalNetEarnings,
        ptClientsCount: members.length,
        supplementSalesCount: filteredItems.filter((i) => i.type === "supplement_referral").length,
        breakdownItems: filteredItems,
      });
      toast.success("Trainer Earnings PDF Statement downloaded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      let csv = "Date,Client / Source,Type,Plan / Item,Total Sale (INR),Trainer Cut (INR),Status\n";
      filteredItems.forEach((r) => {
        csv += `"${r.date}","${r.clientName}","${r.typeLabel}","${r.planName}","${r.totalSale}","${r.trainerCut}","${r.status}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Trainer_Earnings_${trainerName.replace(/\s+/g, "_")}_${reportMode}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV export downloaded!");
    } catch (e) {
      toast.error("Failed to export CSV");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                My Earnings & Personal Reports 📈
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold">
                  Personal P&L
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track your monthly salary, PT commissions, and supplement referral cuts in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center gap-2 text-xs border-slate-200 hover:border-slate-400 text-slate-700 bg-white shadow-2xs font-bold"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={handleExportPDF}
            className="flex items-center gap-2 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold shadow-sm shadow-emerald-500/20"
          >
            <FileText className="w-4 h-4" /> Official PDF Statement
          </Button>
        </div>
      </div>

      {/* Mode Selectors (Daily, Monthly, Custom) */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => setReportMode("daily")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center gap-2 ${
              reportMode === "daily"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Daily Report
          </button>
          <button
            onClick={() => setReportMode("monthly")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center gap-2 ${
              reportMode === "monthly"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Monthly Report
          </button>
          <button
            onClick={() => setReportMode("custom")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition flex items-center gap-2 ${
              reportMode === "custom"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Custom Range / Lifetime
          </button>
        </div>

        {/* Dynamic Controls based on selected mode */}
        <div className="flex items-center gap-3">
          {reportMode === "daily" && (
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-bold">Select Date:</span>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
              />
            </div>
          )}

          {reportMode === "monthly" && (
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-bold">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
              />
            </div>
          )}

          {reportMode === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={customRange.preset}
                onChange={(e) => setCustomRange((prev) => ({ ...prev, preset: e.target.value }))}
                className="bg-slate-50 text-xs font-extrabold text-slate-800 px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
              >
                <option value="this_month">This Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="this_year">This Year</option>
                <option value="lifetime">Lifetime Overall</option>
                <option value="custom_dates">Custom Date Range</option>
              </select>

              {customRange.preset === "custom_dates" && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                  <input
                    type="date"
                    value={customRange.startDate}
                    onChange={(e) => setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="bg-transparent text-slate-800 outline-none"
                  />
                  <span className="text-slate-400 font-normal">to</span>
                  <input
                    type="date"
                    value={customRange.endDate}
                    onChange={(e) => setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="bg-transparent text-slate-800 outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trainer Profile Overview Card */}
      <div className="p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-xl shadow-md border-2 border-white">
            {trainerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900">{trainerName}</h2>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {trainerProfile?.specialization || "Certified Fitness Coach"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-3">
              <span>Duration: <strong className="text-slate-900 font-bold">{periodLabel}</strong></span>
              <span>•</span>
              <span>Active PT Clients: <strong className="text-emerald-700 font-black">{members.length}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto bg-white px-4 py-2.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fixed Base Salary</p>
            <p className="text-sm font-black text-slate-900">
              ₹{monthlySalary.toLocaleString("en-IN")}<span className="text-xs text-slate-500 font-normal">/month</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Earnings */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20 relative overflow-hidden group">
          <div className="absolute right-2 -bottom-2 text-white/10 group-hover:text-white/15 transition">
            <IndianRupee className="w-24 h-24" />
          </div>
          <p className="text-xs font-extrabold text-emerald-100 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" /> Total Net Income
          </p>
          <div className="text-3xl font-black text-white tracking-tight mt-1">
            ₹{totalNetEarnings.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-emerald-100/90 mt-2 font-medium">
            Salary + PT Commission + Store Cut
          </p>
        </div>

        {/* Base Salary for Period */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                Base Fixed Salary
              </p>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              ₹{baseSalaryForPeriod.toLocaleString("en-IN")}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {reportMode === "daily" ? "Prorated 1-Day Salary" : "Monthly Fixed Payroll"}
          </p>
        </div>

        {/* PT Commissions */}
        <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-2xs group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-extrabold text-purple-700 uppercase tracking-wider">
                PT Commissions
              </p>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700 tracking-tight mt-1">
              ₹{ptTotalCut.toLocaleString("en-IN")}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            From <strong className="text-slate-800">{filteredItems.filter((i) => i.type === "pt_commission").length}</strong> PT membership sales
          </p>
        </div>

        {/* Supplement Referral Commission */}
        <div className="p-6 rounded-3xl bg-white border border-amber-100 shadow-2xs group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">
                Store Referral Cut
              </p>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 tracking-tight mt-1">
              ₹{supplementTotalCut.toLocaleString("en-IN")}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            From <strong className="text-slate-800">{filteredItems.filter((i) => i.type === "supplement_referral").length}</strong> supplement sales
          </p>
        </div>
      </div>

      {/* Graphical Insights (Area Trend & Pie Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Variable Earnings Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                PT commission and store referral bonuses over time
              </p>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Live Flow
            </span>
          </div>

          <div className="h-64 w-full">
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="storeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "1rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                    itemStyle={{ color: "#0f172a", fontSize: "12px", fontWeight: "bold" }}
                    formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Cut"]}
                  />
                  <Area type="monotone" dataKey="pt" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#ptGrad)" name="PT Commission" />
                  <Area type="monotone" dataKey="store" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#storeGrad)" name="Store Cut" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No variable commissions recorded for this selected time window.
              </div>
            )}
          </div>
        </div>

        {/* Earnings Composition Pie */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-600" /> Income Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Share of Salary vs Commissions</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={earningsPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {earningsPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "0.75rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            {earningsPieData.map((d, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600 font-bold">{d.name}</span>
                </div>
                <span className="font-black text-slate-900">₹{d.value.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Itemized Detailed Earnings Ledger */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" /> Itemized Income Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete breakdown of every PT admission and supplement referral reward
            </p>
          </div>
          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
            {filteredItems.length} Transactions
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            No variable commissions recorded for this duration. Your base salary applies automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Date</th>
                  <th className="py-3 px-4">Athlete / Buyer</th>
                  <th className="py-3 px-4">Income Type</th>
                  <th className="py-3 px-4">Plan / Item</th>
                  <th className="py-3 px-4 text-right">Total Sale</th>
                  <th className="py-3 px-4 text-right">My Earning (+₹)</th>
                  <th className="py-3 px-4 text-center rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                      {item.clientName}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.type === "pt_commission" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-extrabold text-[11px]">
                          <Dumbbell className="w-3 h-3" /> PT Share
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-extrabold text-[11px]">
                          <ShoppingBag className="w-3 h-3" /> Store Referral
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate font-semibold">
                      {item.planName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-500 whitespace-nowrap">
                      ₹{item.totalSale.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-sm whitespace-nowrap">
                      +₹{item.trainerCut.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
