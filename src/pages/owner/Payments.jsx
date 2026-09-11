import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Receipt,
  Search,
  Plus,
  Download,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Filter,
  DollarSign,
  ArrowRight,
  User,
  Sparkles,
  Phone,
  RefreshCw,
  Tag,
  Share2,
  ChevronDown
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { getAllPayments, addPayment } from "../../firebase/payments";
import { getMembers, updateMember } from "../../firebase/members";
import { generatePaymentReceipt } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
import { openWhatsApp, formatPhone } from "../../utils/whatsapp";

// Available plans for quick selection
const PLANS_CATALOG = [
  { id: "p1", name: "1 Month Standard", durationMonths: 1, durationDays: 30, price: 599, label: "1 Month — ₹599" },
  { id: "p2", name: "1 Month with Locker", durationMonths: 1, durationDays: 30, price: 699, label: "1 Month + Locker — ₹699" },
  { id: "p3", name: "3 Months Pro Transformation", durationMonths: 3, durationDays: 90, price: 1499, label: "3 Months — ₹1,499" },
  { id: "p4", name: "6 Months Fitness Pass", durationMonths: 6, durationDays: 180, price: 2799, label: "6 Months — ₹2,799" },
  { id: "p5", name: "12 Months Annual Elite", durationMonths: 12, durationDays: 365, price: 4999, label: "12 Months / Annual — ₹4,999" },
];

// Helper to compute date diff in days
function getDaysRemaining(endDateStr) {
  if (!endDateStr) return null;
  let end;
  if (endDateStr.includes("/")) {
    const parts = endDateStr.split("/");
    // DD/MM/YYYY
    end = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    end = new Date(endDateStr);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format date to DD/MM/YYYY
function toIndianDate(dateObj) {
  if (!dateObj) return "";
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Convert DD/MM/YYYY to YYYY-MM-DD for date input
function toInputDate(str) {
  if (!str) return new Date().toISOString().split("T")[0];
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return `${y}-${m}-${d}`;
  }
  return str;
}

// Calculate end date based on start date and months
function calculateEndDate(startDateStr, months) {
  const d = new Date(startDateStr);
  d.setMonth(d.getMonth() + Number(months));
  return toIndianDate(d);
}

export default function Payments() {
  const [paymentsList, setPaymentsList] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [slotFilter, setSlotFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const settings = getGymSettings();

  // Modal Form State (Matching Screenshot 2)
  const [selectedPlanId, setSelectedPlanId] = useState("p1");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validityStart, setValidityStart] = useState(new Date().toISOString().split("T")[0]);
  const [validityEnd, setValidityEnd] = useState("");
  const [paymentType, setPaymentType] = useState("full"); // "full" or "partial"
  const [payingNow, setPayingNow] = useState(599);
  const [paymentMode, setPaymentMode] = useState("cash"); // "cash", "online", "bank", "split"
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  // Realistic default dummy data representing Screenshot 1
  const initialSubscriptions = [
    {
      id: "bill_1",
      memberId: "m1",
      memberName: "Lucky Kirar",
      phone: "9343706358",
      slot: "🌅 Morning (6:00 AM - 9:00 AM)",
      batch: "Batch #13 • Alpha Gym",
      planName: "1 Month",
      validityStart: "01/09/2026",
      validityEnd: "01/10/2026",
      dueDate: "01/10/2026",
      planPrice: 599,
      discount: 0,
      amount: 599,
      paidAmount: 599,
      dueAmount: 0,
      paymentMode: "online",
      paymentType: "full",
      date: "01/09/2026",
      status: "paid",
    },
    {
      id: "bill_2",
      memberId: "m2",
      memberName: "Mohit yadav",
      phone: "8357897047",
      slot: "☀️ Afternoon (12:00 PM - 3:00 PM)",
      batch: "Batch #25 • Alpha Gym",
      planName: "Locker + 1 Month",
      validityStart: "05/09/2026",
      validityEnd: "05/10/2026",
      dueDate: "05/10/2026",
      planPrice: 699,
      discount: 0,
      amount: 699,
      paidAmount: 699,
      dueAmount: 0,
      paymentMode: "cash",
      paymentType: "full",
      date: "05/09/2026",
      status: "paid",
    },
    {
      id: "bill_3",
      memberId: "m3",
      memberName: "Aman Gupta",
      phone: "9988776655",
      slot: "🌆 Evening (4:00 PM - 7:00 PM)",
      batch: "Batch #88 • General Floor",
      planName: "1 Month Basic",
      validityStart: "14/08/2026",
      validityEnd: "14/09/2026",
      dueDate: "14/09/2026", // 2 days left!
      planPrice: 599,
      discount: 0,
      amount: 599,
      paidAmount: 599,
      dueAmount: 0,
      paymentMode: "online",
      paymentType: "full",
      date: "14/08/2026",
      status: "ending_soon",
    },
    {
      id: "bill_4",
      memberId: "m4",
      memberName: "Roshan dhakad",
      phone: "9196302375",
      slot: "🌙 Night (7:00 PM - 10:00 PM)",
      batch: "Batch #44 • General Floor",
      planName: "1 Month Standard",
      validityStart: "15/08/2026",
      validityEnd: "15/09/2026",
      dueDate: "15/09/2026", // 3 days left!
      planPrice: 599,
      discount: 0,
      amount: 599,
      paidAmount: 599,
      dueAmount: 0,
      paymentMode: "cash",
      paymentType: "full",
      date: "15/08/2026",
      status: "ending_soon",
    },
    {
      id: "bill_5",
      memberId: "m5",
      memberName: "Sandesh sharma",
      phone: "9685215724",
      slot: "🌅 Morning (6:00 AM - 9:00 AM)",
      batch: "Batch #112 • Alpha Gym",
      planName: "2 Month",
      validityStart: "03/09/2026",
      validityEnd: "03/11/2026",
      dueDate: "03/11/2026",
      planPrice: 999,
      discount: 0,
      amount: 999,
      paidAmount: 999,
      dueAmount: 0,
      paymentMode: "online",
      paymentType: "full",
      date: "03/09/2026",
      status: "paid",
    },
    {
      id: "bill_6",
      memberId: "m6",
      memberName: "Saniya lodhi",
      phone: "9827589671",
      slot: "🌅 Morning (6:00 AM - 9:00 AM)",
      batch: "Batch #70 • Alpha Gym",
      planName: "1 Month",
      validityStart: "03/09/2026",
      validityEnd: "03/10/2026",
      dueDate: "03/10/2026",
      planPrice: 599,
      discount: 100,
      amount: 499,
      paidAmount: 499,
      dueAmount: 0,
      paymentMode: "cash",
      paymentType: "full",
      date: "03/09/2026",
      status: "paid",
    },
    {
      id: "bill_7",
      memberId: "m7",
      memberName: "Anushka jain",
      phone: "6268207738",
      slot: "🌆 Evening (4:00 PM - 7:00 PM)",
      batch: "Batch #95 • Alpha Gym",
      planName: "1 Month",
      validityStart: "01/09/2026",
      validityEnd: "01/10/2026",
      dueDate: "01/10/2026",
      planPrice: 599,
      discount: 100,
      amount: 499,
      paidAmount: 499,
      dueAmount: 0,
      paymentMode: "online",
      paymentType: "full",
      date: "01/09/2026",
      status: "paid",
    },
    {
      id: "bill_8",
      memberId: "m8",
      memberName: "Priya Sharma",
      phone: "9811223344",
      slot: "🌅 Morning (6:00 AM - 9:00 AM)",
      batch: "Batch #10 • Transformation",
      planName: "6-Month Transformation",
      validityStart: "05/09/2026",
      validityEnd: "05/03/2027",
      dueDate: "05/10/2026",
      planPrice: 11000,
      discount: 0,
      amount: 11000,
      paidAmount: 8000,
      dueAmount: 3000,
      paymentMode: "split",
      paymentType: "partial",
      date: "05/09/2026",
      status: "partial",
    },
    {
      id: "bill_9",
      memberId: "m9",
      memberName: "Karan Johar",
      phone: "9711003322",
      slot: "☀️ Afternoon (12:00 PM - 3:00 PM)",
      batch: "Batch #33 • General Floor",
      planName: "3-Month Pro",
      validityStart: "10/05/2026",
      validityEnd: "10/08/2026",
      dueDate: "10/08/2026",
      planPrice: 1499,
      discount: 0,
      amount: 1499,
      paidAmount: 1499,
      dueAmount: 0,
      paymentMode: "bank",
      paymentType: "full",
      date: "10/05/2026",
      status: "expired",
    },
    {
      id: "bill_10",
      memberId: "m10",
      memberName: "Vikram Singh",
      phone: "9876543210",
      slot: "🌙 Night (7:00 PM - 10:00 PM)",
      batch: "Batch #55 • General Floor",
      planName: "1 Month Standard",
      validityStart: "10/08/2026",
      validityEnd: "10/09/2026",
      dueDate: "10/09/2026",
      planPrice: 599,
      discount: 0,
      amount: 599,
      paidAmount: 200,
      dueAmount: 399,
      paymentMode: "cash",
      paymentType: "partial",
      date: "10/08/2026",
      status: "overdue",
    }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const storedPayments = await getAllPayments("univo_main");
        const storedMembers = await getMembers("univo_main");
        if (storedPayments && storedPayments.length > 0) {
          setPaymentsList(storedPayments);
        } else {
          setPaymentsList(initialSubscriptions);
        }
        if (storedMembers && storedMembers.length > 0) {
          setMembersList(storedMembers);
        }
      } catch (err) {
        setPaymentsList(initialSubscriptions);
      }
    }
    loadData();
  }, []);

  // Sync plan and validity calculation in modal
  const currentPlan = PLANS_CATALOG.find((p) => p.id === selectedPlanId) || PLANS_CATALOG[0];
  const calculatedTotal = Math.max(0, currentPlan.price - Number(discountAmount || 0));

  useEffect(() => {
    if (validityStart) {
      const endFormatted = calculateEndDate(validityStart, currentPlan.durationMonths);
      setValidityEnd(endFormatted);
    }
  }, [validityStart, selectedPlanId]);

  useEffect(() => {
    if (paymentType === "full") {
      setPayingNow(calculatedTotal);
    }
  }, [calculatedTotal, paymentType]);

  const remainingDue = Math.max(0, calculatedTotal - Number(payingNow || 0));

  // Open Collect Modal for a specific member or general
  const handleOpenCollectModal = (member = null) => {
    if (member) {
      setSelectedMember(member);
      const planMatch = PLANS_CATALOG.find((p) => p.name.toLowerCase().includes((member.planName || "").toLowerCase())) || PLANS_CATALOG[0];
      setSelectedPlanId(planMatch.id);
      setDiscountAmount(member.discount || 0);
      setValidityStart(new Date().toISOString().split("T")[0]);
      setPaymentType("full");
      setPayingNow(planMatch.price);
      setPaymentMode("cash");
      setRemarks("");
    } else {
      setSelectedMember(paymentsList[0] || null);
      setSelectedPlanId("p1");
      setDiscountAmount(0);
      setValidityStart(new Date().toISOString().split("T")[0]);
      setPaymentType("full");
      setPayingNow(599);
      setPaymentMode("cash");
      setRemarks("");
    }
    setRenewModalOpen(true);
  };

  // Submit Fee Collection
  const handleCollectFee = async (sendWhatsApp = false) => {
    const memberName = selectedMember?.memberName || selectedMember?.fullName || selectedMember?.name || "Member";
    const phone = selectedMember?.phone || "";
    const memberSlot = selectedMember?.slot || "General Floor";

    const newRecord = {
      id: "bill_" + Date.now(),
      memberId: selectedMember?.id || selectedMember?.memberId || "m_" + Date.now(),
      memberName,
      phone,
      slot: memberSlot,
      batch: selectedMember?.batch || "Alpha Gym",
      planName: currentPlan.name,
      validityStart: toIndianDate(validityStart),
      validityEnd: validityEnd,
      dueDate: validityEnd,
      planPrice: currentPlan.price,
      discount: Number(discountAmount || 0),
      amount: calculatedTotal,
      paidAmount: Number(payingNow),
      dueAmount: remainingDue,
      paymentMode,
      paymentType,
      remarks: remarks || (paymentMode === "split" ? `Cash: ₹${cashAmount}, Online: ₹${onlineAmount}` : ""),
      date: toIndianDate(new Date()),
      status: remainingDue > 0 ? "partial" : "paid",
    };

    try {
      await addPayment("univo_main", newRecord);
    } catch (e) {
      console.warn("Offline record stored:", e);
    }

    setPaymentsList([newRecord, ...paymentsList]);
    setRenewModalOpen(false);

    toast.success(`Fee collected successfully for ${memberName}!`);

    // Download PDF Receipt
    generatePaymentReceipt(newRecord, settings);

    // Send WhatsApp Bill
    if (sendWhatsApp && phone) {
      const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName}*\n\nHello *${memberName}*,\nThank you for renewing your gym membership!\n\n📋 *Plan:* ${currentPlan.name}\n📅 *Validity Period:* ${newRecord.validityStart} to ${newRecord.validityEnd}\n💰 *Plan Fee:* ₹${calculatedTotal}\n✅ *Amount Received:* ₹${payingNow} (${paymentMode.toUpperCase()})\n${remainingDue > 0 ? `⚠️ *Remaining Due:* ₹${remainingDue}\n` : ""}\nYour official tax receipt PDF is attached. Stay fit and keep crushing your goals! 💪`;
      openWhatsApp(phone, msg);
    }
  };

  // Filter subscriptions & compute badge counts
  const classifiedItems = useMemo(() => {
    return paymentsList.map((item) => {
      const days = getDaysRemaining(item.dueDate || item.validityEnd);
      let dynamicStatus = item.status;
      if (Number(item.dueAmount) > 0) {
        if (days !== null && days < 0) {
          dynamicStatus = "overdue";
        } else {
          dynamicStatus = "partial";
        }
      } else if (days !== null) {
        if (days < 0) dynamicStatus = "expired";
        else if (days <= 3) dynamicStatus = "ending_soon";
        else dynamicStatus = "paid";
      }
      return { ...item, computedDays: days, dynamicStatus };
    });
  }, [paymentsList]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: classifiedItems.length,
      paid: classifiedItems.filter((i) => i.dynamicStatus === "paid").length,
      partial: classifiedItems.filter((i) => i.dynamicStatus === "partial").length,
      ending_soon: classifiedItems.filter((i) => i.dynamicStatus === "ending_soon").length,
      expired: classifiedItems.filter((i) => i.dynamicStatus === "expired").length,
      overdue: classifiedItems.filter((i) => i.dynamicStatus === "overdue").length,
    };
  }, [classifiedItems]);

  // Filtered list
  const filteredSubscriptions = useMemo(() => {
    return classifiedItems.filter((item) => {
      const term = search.toLowerCase();
      const matchSearch =
        (item.memberName || "").toLowerCase().includes(term) ||
        (item.phone || "").toLowerCase().includes(term) ||
        (item.slot || "").toLowerCase().includes(term) ||
        (item.planName || "").toLowerCase().includes(term);

      const matchSlot =
        slotFilter === "all" ||
        (item.slot || "").toLowerCase().includes(slotFilter.toLowerCase());

      let matchTab = true;
      if (statusFilter === "paid") matchTab = item.dynamicStatus === "paid";
      else if (statusFilter === "partial") matchTab = item.dynamicStatus === "partial";
      else if (statusFilter === "ending_soon") matchTab = item.dynamicStatus === "ending_soon";
      else if (statusFilter === "expired") matchTab = item.dynamicStatus === "expired";
      else if (statusFilter === "overdue") matchTab = item.dynamicStatus === "overdue";

      return matchSearch && matchSlot && matchTab;
    });
  }, [classifiedItems, search, statusFilter, slotFilter]);

  // List of members expiring in 3 days for top alert banner
  const endingInThreeDays = useMemo(() => {
    return classifiedItems.filter((i) => i.dynamicStatus === "ending_soon");
  }, [classifiedItems]);

  return (
    <div className="space-y-6">
      {/* Top Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            Fee & Subscription Management
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Daily collections, monthly dues tracking, discounts & instant WhatsApp PDF receipts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-Synced Monthly Dues
          </div>

          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenCollectModal(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 shadow-sm rounded-xl"
          >
            Collect Fee & Renew
          </Button>
        </div>
      </div>

      {/* 3-Day Expiry Alert Banner (User requested: "3 din phala kis ki member ship katam hu rhi ha") */}
      {endingInThreeDays.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                ⚠️ 3-Day Membership Expiry Alert ({endingInThreeDays.length} Members Expiring)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                The following members have memberships ending within the next 3 days. Send WhatsApp renewal reminders or collect fee:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {endingInThreeDays.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-amber-300 text-[11px] font-bold text-amber-900 shadow-2xs"
                  >
                    <span>{m.memberName}</span>
                    <span className="text-rose-600">({m.computedDays === 0 ? "Expires Today" : `${m.computedDays} days left`})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => {
                setStatusFilter("ending_soon");
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
            >
              View All Expiring
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar (Screenshot 1) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by member name, phone, slot, or plan..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        {/* Filter Pills and Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Month Selector & Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Month: {selectedMonth}</span>
            </div>

            {/* Status Pills */}
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{counts.all}</span>
            </button>

            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "paid"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Paid <span className="text-[10px]">{counts.paid}</span>
            </button>

            <button
              onClick={() => setStatusFilter("partial")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "partial"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Due / Partial <span className="text-[10px]">{counts.partial}</span>
            </button>

            <button
              onClick={() => setStatusFilter("ending_soon")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "ending_soon"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              Ending Soon (3 Days) <span className="text-[10px] px-1 rounded-full bg-amber-200 text-amber-900">{counts.ending_soon}</span>
            </button>

            <button
              onClick={() => setStatusFilter("expired")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "expired"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              Expired <span className="text-[10px]">{counts.expired}</span>
            </button>

            <button
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "overdue"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Overdue <span className="text-[10px]">{counts.overdue}</span>
            </button>
          </div>

          {/* Slot Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Slots & Batches</option>
              <option value="Morning">🌅 Morning (6:00 AM - 9:00 AM)</option>
              <option value="Afternoon">☀️ Afternoon (12:00 PM - 3:00 PM)</option>
              <option value="Evening">🌆 Evening (4:00 PM - 7:00 PM)</option>
              <option value="Night">🌙 Night (7:00 PM - 10:00 PM)</option>
            </select>
            <span className="text-[11px] text-slate-400 font-medium">
              Showing {filteredSubscriptions.length} of {classifiedItems.length} bills
            </span>
          </div>
        </div>
      </div>

      {/* High-Fidelity Table (Matching Screenshot 1) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">MEMBER & PHONE</th>
              <th className="px-5 py-3.5">SLOT / BATCH</th>
              <th className="px-5 py-3.5">BILLING VALIDITY PERIOD</th>
              <th className="px-5 py-3.5">AMOUNT & DISCOUNT</th>
              <th className="px-5 py-3.5">DUE DATE</th>
              <th className="px-5 py-3.5">STATUS</th>
              <th className="px-5 py-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSubscriptions.map((item) => {
              const initials = (item.memberName || "M")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              const days = item.computedDays;
              const isEndingSoon = days !== null && days >= 0 && days <= 3;
              const isExpired = days !== null && days < 0;

              return (
                <tr key={item.id} className="hover:bg-slate-50/90 transition group">
                  {/* Member & Phone */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.memberName}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {item.phone}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Slot / Batch */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
                        {item.slot}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">{item.batch || "General Pass"}</p>
                    </div>
                  </td>

                  {/* Billing Validity Period */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 text-[11px]">
                        {item.validityStart} to {item.validityEnd}
                      </p>
                      <p className="text-[10px] text-slate-500">{item.planName}</p>
                    </div>
                  </td>

                  {/* Amount & Discount */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      <p className="font-extrabold text-slate-900 text-sm">₹{item.amount}</p>
                      {item.discount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <Tag className="w-2.5 h-2.5" /> -₹{item.discount} छूट (₹{item.planPrice})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Due Date & Countdown */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-[11px]">{item.dueDate}</p>
                      {days !== null && (
                        <div>
                          {days > 3 ? (
                            <span className="text-[10px] font-bold text-slate-500">
                              {days} days left
                            </span>
                          ) : isEndingSoon ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              {days === 0 ? "Expires Today" : `${days} days left`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300">
                              Expired {Math.abs(days)}d ago
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    {item.dynamicStatus === "paid" && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid
                      </span>
                    )}
                    {item.dynamicStatus === "partial" && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Partial (Due: ₹{item.dueAmount})
                      </span>
                    )}
                    {item.dynamicStatus === "ending_soon" && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Ending Soon
                      </span>
                    )}
                    {item.dynamicStatus === "expired" && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Expired
                      </span>
                    )}
                    {item.dynamicStatus === "overdue" && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Overdue
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Bill / PDF Button (Screenshot 1) */}
                      <button
                        onClick={() => generatePaymentReceipt(item, settings)}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                        title="Download Tax Invoice / Bill PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        Bill / PDF
                      </button>

                      {/* Collect / Renew Fee Button */}
                      <button
                        onClick={() => handleOpenCollectModal(item)}
                        className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs"
                        title="Collect Fee / Renew Membership"
                      >
                        Renew
                      </button>

                      {/* WhatsApp Button */}
                      <button
                        onClick={() => {
                          const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName}*\n\nHello *${item.memberName}*,\nHere are your current membership billing details:\n\n📋 *Plan:* ${item.planName}\n📅 *Validity:* ${item.validityStart} to ${item.validityEnd}\n💰 *Amount:* ₹${item.amount}\nStatus: *${item.dynamicStatus.toUpperCase()}*\n\nThank you for working out with us! 💪`;
                          openWhatsApp(item.phone, msg);
                        }}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* COLLECT FEE & RENEW MEMBERSHIP MODAL (Exact match for Screenshot 2) */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title="Collect Fee & Renew Membership"
      >
        <div className="space-y-4 text-slate-800 text-xs">
          {/* Member Card Header */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                {(selectedMember?.memberName || selectedMember?.name || "R")[0]}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedMember?.memberName || selectedMember?.name || "Roshan dhakad"}
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  🏋️ {selectedMember?.slot || "6:00 AM - 9:00 AM (Morning Batch)"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ADMISSION / JOINING DATE
              </p>
              <p className="text-xs font-bold text-indigo-700 mt-0.5">
                {selectedMember?.date || selectedMember?.validityStart || "10/09/2026"}
              </p>
            </div>
          </div>

          {/* Select Membership Plan and Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                SELECT MEMBERSHIP PLAN (प्लान चुनें) *
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                {PLANS_CATALOG.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                DISCOUNT (छूट ₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={discountAmount || ""}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Membership Bill Validity Period Box (Screenshot 2) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Membership Bill Validity Period ({currentPlan.durationMonths} Month):
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-extrabold text-[11px]">
                {toIndianDate(validityStart)} से {validityEnd}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">
                  Validity Start Date (शुरू दिनांक - Joining Date) *
                </label>
                <input
                  type="date"
                  value={validityStart}
                  onChange={(e) => setValidityStart(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">
                  Validity End / Due Date (समाप्ति / अगली फीस दिनांक) *
                </label>
                <input
                  type="text"
                  value={validityEnd}
                  onChange={(e) => setValidityEnd(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Fee Summary Row */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-600 font-medium">
                {currentPlan.name} ({currentPlan.durationMonths} Month)
              </span>
              {discountAmount > 0 && (
                <span className="text-emerald-600 font-bold ml-2">
                  (Discount: -₹{discountAmount})
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="font-extrabold text-indigo-700 text-base">
                TOTAL PLAN FEE: ₹{calculatedTotal}
              </span>
            </div>
          </div>

          {/* Payment Type Selection (Full vs Partial) */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
              PAYMENT TYPE (भुगतान प्रकार)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType("full")}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                  paymentType === "full"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                ● Full Payment (पूरा ₹{calculatedTotal})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType("partial");
                  setPayingNow(Math.floor(calculatedTotal / 2));
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                  paymentType === "partial"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                ● Partial / Installment (किस्त)
              </button>
            </div>

            {/* Stat Cards: Total, Paying Now, Remaining Due */}
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">TOTAL PLAN FEE</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">₹{calculatedTotal}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-[10px] text-emerald-800 font-bold uppercase">PAYING NOW</p>
                {paymentType === "partial" ? (
                  <input
                    type="number"
                    value={payingNow}
                    onChange={(e) => setPayingNow(Number(e.target.value) || 0)}
                    className="w-full mt-0.5 text-center bg-white border border-emerald-400 rounded-lg py-0.5 text-xs font-black text-emerald-700"
                  />
                ) : (
                  <p className="text-sm font-black text-emerald-700 mt-0.5">₹{payingNow}</p>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">REMAINING DUE (बाकी)</p>
                <p className={`text-sm font-black mt-0.5 ${remainingDue > 0 ? "text-rose-600" : "text-slate-700"}`}>
                  ₹{remainingDue}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Mode (Cash, UPI / QR, Bank, Split) */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
              PAYMENT MODE (भुगतान माध्यम) *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: "cash", label: "💵 Cash" },
                { key: "online", label: "📱 UPI / QR" },
                { key: "bank", label: "🏦 Bank" },
                { key: "split", label: "⚡ Split (Cash + UPI)" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setPaymentMode(m.key)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition text-center ${
                    paymentMode === m.key
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Split Amount Inputs if Split is chosen */}
            {paymentMode === "split" && (
              <div className="p-3 mt-2 bg-amber-50 border border-amber-200 rounded-xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-amber-900 block mb-0.5">Cash Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 300"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg p-1.5"
                  />
                </div>
                <div>
                  <label className="font-bold text-amber-900 block mb-0.5">UPI Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 299"
                    value={onlineAmount}
                    onChange={(e) => setOnlineAmount(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg p-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Remarks / Transaction ID */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
              PAYMENT REMARKS / TRANSACTION ID (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. GPay Ref #123456 / ₹200 cash advance"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRenewModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleCollectFee(false)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm"
            >
              Collect ₹{payingNow} Only
            </button>

            <button
              type="button"
              onClick={() => handleCollectFee(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Collect ₹{payingNow} & WhatsApp Bill
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}