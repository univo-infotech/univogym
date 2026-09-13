
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
  ChevronDown,
  LogOut,
  UserX,
  CheckCircle2
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { getAllPayments, addPayment } from "../../firebase/payments";
import { getMembers, updateMember } from "../../firebase/members";
import { generatePaymentReceipt } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
import { openWhatsApp, formatPhone } from "../../utils/whatsapp";
import { useAuth } from "../../contexts/AuthContext";

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

  // Left action modal state
  const [leftModalOpen, setLeftModalOpen] = useState(false);
  const [memberToLeft, setMemberToLeft] = useState(null);
  const [leftReason, setLeftReason] = useState("Stopped coming / Gym left");

  const settings = getGymSettings();

  // Modal Form State
  const [collectMode, setCollectMode] = useState("renew"); // "renew" or "clear_due"
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

  // Realistic default dummy data
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
      dueDate: "14/09/2026", // 1 day left!
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
      dueDate: "15/09/2026", // 2 days left!
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
      validityEnd: "11/09/2026", // 2 days ago! Expired (1,2,3 days ago)
      dueDate: "11/09/2026",
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
      validityEnd: "05/09/2026", // 8 days ago (>3 days) -> Overdue
      dueDate: "05/09/2026",
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

  const { gymId } = useAuth();
  const activeGymId = gymId || "univo_main";

  const loadData = async () => {
    try {
      const storedPayments = await getAllPayments(activeGymId);
      const storedMembers = await getMembers(activeGymId);
      setPaymentsList(storedPayments || []);
      setMembersList(storedMembers || []);
    } catch (err) {
      console.warn("Could not load payments:", err);
      setPaymentsList([]);
      setMembersList([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGymId]);

  // Map of memberId -> member object for checking real-time member status
  const membersMap = useMemo(() => {
    const map = {};
    membersList.forEach((m) => {
      map[m.id] = m;
      if (m.phone) map[m.phone] = m;
    });
    return map;
  }, [membersList]);

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
    if (collectMode === "clear_due" && selectedMember) {
      setPayingNow(Number(selectedMember.dueAmount || 0));
    } else if (paymentType === "full") {
      setPayingNow(calculatedTotal);
    }
  }, [calculatedTotal, paymentType, collectMode, selectedMember]);

  const remainingDue =
    collectMode === "clear_due"
      ? Math.max(0, Number(selectedMember?.dueAmount || 0) - Number(payingNow || 0))
      : Math.max(0, calculatedTotal - Number(payingNow || 0));

  // Open Collect Modal for a specific member or general
  const handleOpenCollectModal = (item = null, mode = "renew") => {
    setCollectMode(mode);
    if (item) {
      setSelectedMember(item);
      const planMatch = PLANS_CATALOG.find((p) => p.name.toLowerCase().includes((item.planName || "").toLowerCase())) || PLANS_CATALOG[0];
      setSelectedPlanId(planMatch.id);
      setDiscountAmount(item.discount || 0);
      setValidityStart(new Date().toISOString().split("T")[0]);
      if (mode === "clear_due") {
        setPaymentType("full");
        setPayingNow(Number(item.dueAmount || 0));
      } else {
        setPaymentType("full");
        setPayingNow(planMatch.price);
      }
      setPaymentMode("cash");
      setRemarks("");
    } else {
      const firstActive = paymentsList[0] || null;
      setSelectedMember(firstActive);
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

  // Mark member as Left
  const handleOpenLeftModal = (item) => {
    setMemberToLeft(item);
    setLeftReason("Stopped coming / Gym left");
    setLeftModalOpen(true);
  };

  const handleConfirmLeft = async () => {
    if (!memberToLeft) return;
    const mId = memberToLeft.memberId || memberToLeft.id;
    const mName = memberToLeft.memberName || memberToLeft.name || "Member";

    try {
      // 1. Update in Firestore members collection if exists
      if (mId) {
        try {
          await updateMember(mId, {
            status: "left",
            active: false,
            leftAt: new Date().toISOString(),
            leftReason: leftReason,
          });
        } catch (e) {
          console.warn("Could not update member doc:", e);
        }
      }

      // 2. Update local payments list
      setPaymentsList((prev) =>
        prev.map((p) => {
          if (p.id === memberToLeft.id || (mId && p.memberId === mId)) {
            return { ...p, status: "left", leftReason };
          }
          return p;
        })
      );

      // 3. Update membersList
      setMembersList((prev) =>
        prev.map((m) => {
          if (m.id === mId) {
            return { ...m, status: "left", active: false };
          }
          return m;
        })
      );

      toast.success(`${mName} ko Left mark kar diya gaya hai.`);
      setLeftModalOpen(false);
      setMemberToLeft(null);
    } catch (err) {
      toast.error("Failed to mark as left");
    }
  };

  // Submit Fee Collection
  const handleCollectFee = async (sendWhatsApp = false) => {
    const memberName = selectedMember?.memberName || selectedMember?.fullName || selectedMember?.name || "Member";
    const phone = selectedMember?.phone || "";
    const memberSlot = selectedMember?.slot || "General Floor";

    let newRecord;

    if (collectMode === "clear_due") {
      // Clearing existing dues
      const previousDue = Number(selectedMember?.dueAmount || 0);
      const paid = Number(payingNow);
      const remaining = Math.max(0, previousDue - paid);

      newRecord = {
        id: "bill_" + Date.now(),
        memberId: selectedMember?.memberId || selectedMember?.id || "m_" + Date.now(),
        memberName,
        phone,
        slot: memberSlot,
        batch: selectedMember?.batch || "Alpha Gym",
        planName: selectedMember?.planName || "Due Clearance",
        validityStart: selectedMember?.validityStart || toIndianDate(new Date()),
        validityEnd: selectedMember?.validityEnd || toIndianDate(new Date()),
        dueDate: selectedMember?.dueDate || selectedMember?.validityEnd || toIndianDate(new Date()),
        planPrice: previousDue,
        discount: 0,
        amount: previousDue,
        paidAmount: paid,
        dueAmount: remaining,
        paymentMode,
        paymentType: remaining === 0 ? "full" : "partial",
        remarks: remarks || `Due Clearance: Paid ₹${paid} against previous due ₹${previousDue}`,
        date: toIndianDate(new Date()),
        status: remaining > 0 ? "partial" : "paid",
      };

      // Also update the original bill's due amount
      setPaymentsList((prev) =>
        prev.map((p) => {
          if (p.id === selectedMember.id) {
            return { ...p, dueAmount: remaining, status: remaining > 0 ? "partial" : "paid" };
          }
          return p;
        })
      );
    } else {
      // Normal Renewal / New Membership Plan Bill
      newRecord = {
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
    }

    try {
      await addPayment("univo_main", newRecord);
    } catch (e) {
      console.warn("Offline record stored:", e);
    }

    setPaymentsList((prev) => [newRecord, ...prev]);
    setRenewModalOpen(false);

    toast.success(`Fee collected successfully for ${memberName}!`);

    // Download PDF Receipt
    generatePaymentReceipt(newRecord, settings);

    // Send WhatsApp Bill
    if (sendWhatsApp && phone) {
      const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName}*\n\nHello *${memberName}*,\nThank you for your payment!\n\n📋 *Details:* ${newRecord.planName}\n📅 *Validity:* ${newRecord.validityStart} to ${newRecord.validityEnd}\n💰 *Amount Paid:* ₹${payingNow} (${paymentMode.toUpperCase()})\n${newRecord.dueAmount > 0 ? `⚠️ *Remaining Due:* ₹${newRecord.dueAmount}\n` : "✅ *Status:* FULLY PAID\n"}\nYour official tax receipt PDF is generated. Stay fit and healthy! 💪`;
      openWhatsApp(phone, msg);
    }
  };

  /**
   * EXACT STATUS LOGIC:
   * 1. Left: Member marked as left (item.status === 'left' or member document status === 'left')
   * 2. Due / Partial: dueAmount > 0 and not overdue by > 3 days
   * 3. Ending Soon: plan expiring in 3, 2, 1 days or today (0 <= days <= 3)
   * 4. Expired: plan ended 1, 2, 3 days ago (-3 <= days < 0)
   * 5. Overdue: plan ended > 3 days ago (days < -3) OR due pending past 3 days
   * 6. Paid: dueAmount === 0 and days > 3 (active and paid)
   */
  const classifiedItems = useMemo(() => {
    return paymentsList.map((item) => {
      const days = getDaysRemaining(item.dueDate || item.validityEnd);
      const isMemberLeft =
        item.status === "left" ||
        (item.memberId && membersMap[item.memberId]?.status === "left") ||
        (item.phone && membersMap[item.phone]?.status === "left");

      let dynamicStatus = "paid";

      if (isMemberLeft) {
        dynamicStatus = "left";
      } else if (Number(item.dueAmount) > 0) {
        // Has pending due
        if (days !== null && days < -3) {
          // Plan ended more than 3 days ago with due -> Overdue
          dynamicStatus = "overdue";
        } else {
          dynamicStatus = "partial";
        }
      } else if (days !== null) {
        if (days >= 0 && days <= 3) {
          // Ending in 3, 2, 1 days or today (0)
          dynamicStatus = "ending_soon";
        } else if (days < 0 && days >= -3) {
          // Ended 1, 2, or 3 days ago
          dynamicStatus = "expired";
        } else if (days < -3) {
          // Ended more than 3 days ago
          dynamicStatus = "overdue";
        } else {
          // Active with > 3 days remaining and 0 due
          dynamicStatus = "paid";
        }
      } else {
        dynamicStatus = item.status || "paid";
      }

      return { ...item, computedDays: days, dynamicStatus, isLeft: isMemberLeft };
    });
  }, [paymentsList, membersMap]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: classifiedItems.length,
      paid: classifiedItems.filter((i) => i.dynamicStatus === "paid").length,
      partial: classifiedItems.filter((i) => i.dynamicStatus === "partial").length,
      ending_soon: classifiedItems.filter((i) => i.dynamicStatus === "ending_soon").length,
      expired: classifiedItems.filter((i) => i.dynamicStatus === "expired").length,
      overdue: classifiedItems.filter((i) => i.dynamicStatus === "overdue").length,
      left: classifiedItems.filter((i) => i.dynamicStatus === "left").length,
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
      else if (statusFilter === "left") matchTab = item.dynamicStatus === "left";

      return matchSearch && matchSlot && matchTab;
    });
  }, [classifiedItems, search, statusFilter, slotFilter]);

  // List of members expiring in 3, 2, 1 or today for top alert banner
  const endingInThreeDays = useMemo(() => {
    return classifiedItems.filter((i) => i.dynamicStatus === "ending_soon");
  }, [classifiedItems]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            Fee & Subscription Management
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Daily collections, dues tracking, expiring alerts, overdue monitoring & Left members management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-Synced Members & Dues
          </div>

          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => handleOpenCollectModal(null, "renew")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 shadow-sm rounded-xl"
          >
            Collect Fee & Renew
          </Button>
        </div>
      </div>

      {/* 3-Day Expiry Alert Banner */}
      {endingInThreeDays.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                ⚠️ Ending Soon Alert: 3, 2, 1 Days / Today Expiring ({endingInThreeDays.length} Members)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                In members ka plan aaj ya aane wale 1-3 din me khatam hone wala hai. WhatsApp reminder bhejein ya fee collect karein:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {endingInThreeDays.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-amber-300 text-[11px] font-bold text-amber-900 shadow-2xs"
                  >
                    <span>{m.memberName}</span>
                    <span className="text-rose-600 font-extrabold">
                      ({m.computedDays === 0 ? "Expires Today!" : `${m.computedDays} day${m.computedDays > 1 ? "s" : ""} left`})
                    </span>
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
              View All Ending Soon
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
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
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Month: {selectedMonth}</span>
            </div>

            {/* All */}
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

            {/* Paid */}
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "paid"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Paid <span className="text-[10px] px-1 rounded-full bg-emerald-100 text-emerald-800">{counts.paid}</span>
            </button>

            {/* Due / Partial */}
            <button
              onClick={() => setStatusFilter("partial")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "partial"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Due / Partial <span className="text-[10px] px-1 rounded-full bg-amber-200 text-amber-900">{counts.partial}</span>
            </button>

            {/* Ending Soon (3, 2, 1, Today) */}
            <button
              onClick={() => setStatusFilter("ending_soon")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "ending_soon"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              Ending Soon (0-3 Days) <span className="text-[10px] px-1 rounded-full bg-amber-200 text-amber-900">{counts.ending_soon}</span>
            </button>

            {/* Expired (1-3 Days ago) */}
            <button
              onClick={() => setStatusFilter("expired")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "expired"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              Expired (1-3 Days) <span className="text-[10px] px-1 rounded-full bg-orange-100 text-orange-800">{counts.expired}</span>
            </button>

            {/* Overdue (>3 Days ago) */}
            <button
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "overdue"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Overdue (&gt;3 Days) <span className="text-[10px] px-1 rounded-full bg-rose-100 text-rose-800">{counts.overdue}</span>
            </button>

            {/* Left (New Tab) */}
            <button
              onClick={() => setStatusFilter("left")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "left"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              Left Gym <span className="text-[10px] px-1 rounded-full bg-slate-200 text-slate-800">{counts.left}</span>
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
              Showing {filteredSubscriptions.length} of {classifiedItems.length} records
            </span>
          </div>
        </div>
      </div>

      {/* High-Fidelity Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">MEMBER & PHONE</th>
              <th className="px-5 py-3.5">SLOT / BATCH</th>
              <th className="px-5 py-3.5">BILLING VALIDITY PERIOD</th>
              <th className="px-5 py-3.5">AMOUNT & DUES</th>
              <th className="px-5 py-3.5">DUE DATE</th>
              <th className="px-5 py-3.5">STATUS</th>
              <th className="px-5 py-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSubscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  <UserX className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No records found for this filter</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try selecting another filter or searching a different term</p>
                </td>
              </tr>
            ) : (
              filteredSubscriptions.map((item) => {
                const initials = (item.memberName || "M")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                const days = item.computedDays;
                const isEndingSoon = item.dynamicStatus === "ending_soon";
                const isLeft = item.dynamicStatus === "left";
                const hasDue = Number(item.dueAmount) > 0;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/90 transition group ${
                      isLeft ? "bg-slate-50/60 opacity-80" : ""
                    }`}
                  >
                    {/* Member & Phone */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 ${
                            isLeft
                              ? "bg-slate-400"
                              : "bg-gradient-to-br from-indigo-500 to-purple-600"
                          }`}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {item.memberName}
                            {isLeft && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-bold">
                                LEFT
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {item.phone || "No Phone"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Slot / Batch */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
                          {item.slot || "General"}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">{item.batch || "Alpha Gym"}</p>
                      </div>
                    </td>

                    {/* Billing Validity Period */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 text-[11px]">
                          {item.validityStart} to {item.validityEnd}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">{item.planName}</p>
                      </div>
                    </td>

                    {/* Amount & Discount / Due */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">₹{item.amount}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-semibold uppercase text-slate-600">
                            {item.paymentMode || "Cash"}
                          </span>
                        </div>
                        {hasDue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Paid: ₹{item.paidAmount} • Due: ₹{item.dueAmount}
                          </span>
                        ) : item.discount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <Tag className="w-2.5 h-2.5" /> -₹{item.discount} छूट
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold">Full Paid</span>
                        )}
                      </div>
                    </td>

                    {/* Due Date & Countdown */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-[11px]">{item.dueDate || item.validityEnd}</p>
                        {isLeft ? (
                          <span className="text-[10px] font-semibold text-slate-400">Left Gym</span>
                        ) : days !== null ? (
                          <div>
                            {days > 3 ? (
                              <span className="text-[10px] font-bold text-slate-500">
                                {days} days left
                              </span>
                            ) : days >= 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                {days === 0 ? "Expires Today!" : `${days} day${days > 1 ? "s" : ""} left`}
                              </span>
                            ) : days >= -3 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-300">
                                Expired {Math.abs(days)}d ago
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300">
                                Overdue ({Math.abs(days)}d past)
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      {item.dynamicStatus === "left" && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          Left
                        </span>
                      )}
                      {item.dynamicStatus === "paid" && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Paid
                        </span>
                      )}
                      {item.dynamicStatus === "partial" && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          Due: ₹{item.dueAmount}
                        </span>
                      )}
                      {item.dynamicStatus === "ending_soon" && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Ending Soon
                        </span>
                      )}
                      {item.dynamicStatus === "expired" && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
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
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Bill / PDF Button */}
                        <button
                          onClick={() => generatePaymentReceipt(item, settings)}
                          className="px-2 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                          title="Download Tax Invoice / Bill PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Bill</span>
                        </button>

                        {/* Collect Due Button if due pending */}
                        {hasDue && !isLeft && (
                          <button
                            onClick={() => handleOpenCollectModal(item, "clear_due")}
                            className="px-2 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-2xs"
                            title="Collect Remaining Due"
                          >
                            Collect Due
                          </button>
                        )}

                        {/* Renew Fee Button */}
                        {!isLeft && (
                          <button
                            onClick={() => handleOpenCollectModal(item, "renew")}
                            className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs"
                            title="Renew Membership"
                          >
                            Renew
                          </button>
                        )}

                        {/* WhatsApp Button */}
                        <button
                          onClick={() => {
                            const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName}*\n\nHello *${item.memberName}*,\nHere are your membership details:\n\n📋 *Plan:* ${item.planName}\n📅 *Validity:* ${item.validityStart} to ${item.validityEnd}\n💰 *Amount:* ₹${item.amount}\n${hasDue ? `⚠️ *Pending Due:* ₹${item.dueAmount}\n` : `✅ *Status:* ${item.dynamicStatus.toUpperCase()}\n`}\nThank you! 💪`;
                            openWhatsApp(item.phone, msg);
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* Mark Left Button */}
                        {!isLeft && (
                          <button
                            onClick={() => handleOpenLeftModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                            title="Mark Member as Left Gym"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* COLLECT FEE & RENEW / CLEAR DUE MODAL */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title={collectMode === "clear_due" ? "💰 Collect Remaining Due Amount" : "Collect Fee & Renew Membership"}
      >
        <div className="space-y-4 text-slate-800 text-xs">
          {/* Mode Switcher inside modal */}
          {selectedMember && Number(selectedMember.dueAmount) > 0 && (
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setCollectMode("renew")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  collectMode === "renew"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🔄 Renew Membership Plan
              </button>
              <button
                type="button"
                onClick={() => setCollectMode("clear_due")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  collectMode === "clear_due"
                    ? "bg-white text-amber-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💵 Clear Due Balance (₹{selectedMember.dueAmount})
              </button>
            </div>
          )}

          {/* Member Card Header & Selection */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                  {(selectedMember?.memberName || selectedMember?.name || "M")[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedMember?.memberName || selectedMember?.name || "Select Member"}
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    📱 {selectedMember?.phone || "No phone"} • 🏋️ {selectedMember?.slot || "General Shift"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  CURRENT DUE
                </p>
                <p className="text-xs font-extrabold text-rose-600 mt-0.5">
                  ₹{selectedMember?.dueAmount || 0}
                </p>
              </div>
            </div>

            {/* If opening fresh or want to switch member */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Select / Switch Member
              </label>
              <select
                value={selectedMember?.id || ""}
                onChange={(e) => {
                  const m = paymentsList.find((p) => p.id === e.target.value);
                  if (m) {
                    setSelectedMember(m);
                    if (Number(m.dueAmount) > 0 && collectMode === "clear_due") {
                      setPayingNow(Number(m.dueAmount));
                    }
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {paymentsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.memberName} — {p.phone} ({p.planName} • Due: ₹{p.dueAmount || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {collectMode === "clear_due" ? (
            /* Clear Due Mode UI */
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">Total Pending Due Balance:</span>
                <span className="font-black text-rose-600 text-sm">₹{selectedMember?.dueAmount || 0}</span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Amount Paying Now (₹ जमा राशि)
                </label>
                <input
                  type="number"
                  value={payingNow}
                  onChange={(e) => setPayingNow(Number(e.target.value) || 0)}
                  max={selectedMember?.dueAmount || 0}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60">
                <span className="font-semibold text-slate-600">Remaining Balance after payment:</span>
                <span className={`font-black text-sm ${remainingDue > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  ₹{remainingDue}
                </span>
              </div>
            </div>
          ) : (
            /* Renewal Mode UI */
            <>
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

              {/* Membership Bill Validity Period Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Validity Period ({currentPlan.durationMonths} Month):
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-extrabold text-[11px]">
                    {toIndianDate(validityStart)} से {validityEnd}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">
                      Validity Start Date *
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
                      Validity End / Next Due Date *
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
            </>
          )}

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

      {/* MARK AS LEFT MODAL */}
      {leftModalOpen && memberToLeft && (
        <Modal
          isOpen={true}
          onClose={() => {
            setLeftModalOpen(false);
            setMemberToLeft(null);
          }}
          title="🚪 Mark Member as Left Gym"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5">
              <LogOut className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-950">
                  Mark {memberToLeft.memberName} as Left?
                </p>
                <p className="text-rose-800/90 mt-0.5 leading-relaxed">
                  Yeh member active list se hat kar <strong>Left Gym</strong> filter tab me chala jayega.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Reason for Leaving (छोड़ने का कारण)
              </label>
              <div className="space-y-2">
                {[
                  "Stopped coming / Gym left",
                  "Relocated / Out of town",
                  "Personal / Financial reason",
                  "Health / Medical break",
                  "Membership expired & did not renew",
                ].map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs font-semibold ${
                      leftReason === r
                        ? "bg-rose-50 border-rose-300 text-rose-950 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="leftReasonOption"
                      checked={leftReason === r}
                      onChange={() => setLeftReason(r)}
                      className="accent-rose-600"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setLeftModalOpen(false);
                  setMemberToLeft(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeft}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition text-xs shadow-sm"
              >
                Confirm Mark as Left
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}