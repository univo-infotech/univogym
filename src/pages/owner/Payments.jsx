
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  CheckCircle2,
  QrCode,
  Check,
  X,
  ExternalLink,
  Copy,
  Image as ImageIcon,
  Dumbbell,
  Layers,
  RotateCcw,
  Eye,
  IndianRupee,
  Sunrise,
  Sunset,
  Sun
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { getAllPayments, addPayment } from "../../firebase/payments";
import { getMembers, updateMember } from "../../firebase/members";
import { getPlans } from "../../firebase/plans";
import { getTrainers } from "../../firebase/trainers";
import {
  getRenewalRequests,
  approveRenewalRequest,
  rejectRenewalRequest
} from "../../firebase/renewalRequests";
import { generatePaymentReceipt } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
import { openWhatsApp, formatPhone } from "../../utils/whatsapp";
import { useAuth } from "../../contexts/AuthContext";
import ReceiptModal from "./members/modals/ReceiptModal";
import CollectFeeModal from "./members/modals/CollectFeeModal";
import AddPtPackageModal from "./members/modals/AddPtPackageModal";
import AddServiceModal from "./members/modals/AddServiceModal";
import { formatDate, parseToDate } from "../../utils/dateUtils";
import {
  getGymStatus,
  getPtStatus,
  hasPt,
  isPaid,
  isPartial,
  isLeft,
  isEnded
} from "./members/memberUtils";

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
  const end = parseToDate(endDateStr);
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endZero = new Date(end);
  endZero.setHours(0, 0, 0, 0);
  const diffTime = endZero.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format date to DD/MM/YYYY
function toIndianDate(dateObj) {
  return formatDate(dateObj, "");
}

// Convert DD/MM/YYYY to YYYY-MM-DD for date input
function toInputDate(str) {
  if (!str) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const d = parseToDate(str);
  if (d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return str;
}

// Calculate end date based on start date and months (safe from month length overflow)
function calculateEndDate(startDateStr, months) {
  if (!startDateStr) return "";
  const d = parseToDate(startDateStr);
  if (!d) return "";
  const originalDay = d.getDate();
  const expectedMonth = d.getMonth() + Number(months);
  d.setMonth(expectedMonth);
  // Prevent overflow into next month (e.g., Jan 31 + 1 month rolling over into March)
  if (d.getDate() !== originalDay) {
    d.setDate(0); // Sets to last day of target month
  }
  return toIndianDate(d);
}

export default function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const isUpiApprovalsPath = location.pathname.includes("upi-approvals");
  const urlTab = new URLSearchParams(location.search).get("tab") || location.state?.tab || (isUpiApprovalsPath ? "online_requests" : null);

  const [paymentsList, setPaymentsList] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [trainersList, setTrainersList] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(urlTab || "all");
  const [subFilter, setSubFilter] = useState("all"); // 'all' | 'gym' | 'pt'
  const [slotFilter, setSlotFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedMember, setSelectedMember] = useState(null);

  // Dedicated Modals state
  const [collectFeeModalOpen, setCollectFeeModalOpen] = useState(false);
  const [collectFeeMode, setCollectFeeMode] = useState("renew"); // "renew" | "clear_due" | "collect"
  const [ptModalOpen, setPtModalOpen] = useState(false);
  const [ptModalMember, setPtModalMember] = useState(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceModalMember, setServiceModalMember] = useState(null);

  useEffect(() => {
    const isUpi = location.pathname.includes("upi-approvals");
    const currentTab = new URLSearchParams(location.search).get("tab") || location.state?.tab || (isUpi ? "online_requests" : null);
    if (currentTab) {
      setStatusFilter(currentTab);
    }
  }, [location.search, location.state, location.pathname]);

  // Left action modal state
  const [leftModalOpen, setLeftModalOpen] = useState(false);
  const [memberToLeft, setMemberToLeft] = useState(null);
  const [leftReason, setLeftReason] = useState("Stopped coming / Gym left");
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptMember, setReceiptMember] = useState(null);

  // Online UPI Renewal Requests state
  const [onlineRequests, setOnlineRequests] = useState([]);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedProofImg, setSelectedProofImg] = useState(null);
  const [requestsSubFilter, setRequestsSubFilter] = useState("all");

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
      const storedPlans = await getPlans(activeGymId);
      const storedTrainers = await getTrainers(activeGymId);
      const realStoredPayments = (storedPayments || []).filter(
        (p) => p.batch !== "Self Registration • Link Access" && !p.remarks?.includes("Online Registration & Plan Activation")
      );
      setPaymentsList(realStoredPayments);
      setMembersList(storedMembers || []);
      setPlansList(storedPlans || []);
      setTrainersList(storedTrainers || []);

      // Load Online UPI Renewal Requests
      try {
        const reqs = await getRenewalRequests(activeGymId);
        setOnlineRequests(reqs || []);
      } catch (e) {
        console.warn("Could not load renewal requests:", e);
      }
    } catch (err) {
      console.warn("Could not load payments:", err);
      setPaymentsList([]);
      setMembersList([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGymId]);

  // Helper for slot icons
  const getSlotIcon = (slotStr = '') => {
    const s = String(slotStr).toLowerCase();
    if (s.includes('morn')) return <Sunrise className="w-3 h-3 text-amber-500" />;
    if (s.includes('even') || s.includes('night')) return <Sunset className="w-3 h-3 text-indigo-500" />;
    if (s.includes('noon') || s.includes('after')) return <Sun className="w-3 h-3 text-orange-500" />;
    return <Clock className="w-3 h-3 text-teal-500" />;
  };

  // Open Collect Modal for a specific member or general
  const handleOpenCollectModal = (item = null, mode = "renew") => {
    let targetMem = null;
    if (item) {
      targetMem = item.rawMember || membersList.find((m) => m.id === item.memberId || m.id === item.id) || item;
    } else {
      targetMem = membersList[0] || null;
    }
    setSelectedMember(targetMem);
    setCollectFeeMode(mode);
    setCollectFeeModalOpen(true);
  };

  const handleOpenPtModal = (item) => {
    const rawMem = item?.rawMember || membersList.find((m) => m.id === item?.memberId || m.id === item?.id) || item;
    setPtModalMember(rawMem);
    setPtModalOpen(true);
  };

  const handleOpenServiceModal = (item) => {
    const rawMem = item?.rawMember || membersList.find((m) => m.id === item?.memberId || m.id === item?.id) || item;
    setServiceModalMember(rawMem);
    setServiceModalOpen(true);
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

  // --- Online UPI Renewal Approval / Rejection Handlers ---
  const handleApproveRequest = async (req) => {
    if (!req || actionInProgress) return;
    setActionInProgress(req.id);
    const toastId = toast.loading(`Approving renewal for ${req.memberName || "Member"}...`);
    try {
      const result = await approveRenewalRequest(activeGymId, req.id, {
        approvedBy: "Owner",
      });
      toast.success(`Plan approved & renewed for ${req.memberName || "Member"}! 🎉`, { id: toastId });

      // Update local onlineRequests state
      setOnlineRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? { ...r, status: "approved", approvedAt: new Date().toISOString() }
            : r
        )
      );

      // Reload payments and members to update tables & charts
      loadData();
    } catch (err) {
      console.error("Failed to approve renewal:", err);
      toast.error(err.message || "Failed to approve renewal request", { id: toastId });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenReject = (req) => {
    setRequestToReject(req);
    setRejectReason("Payment not reflected in gym bank account / invalid UTR reference.");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!requestToReject) return;
    const toastId = toast.loading("Rejecting request...");
    try {
      await rejectRenewalRequest(activeGymId, requestToReject.id, {
        rejectionReason: rejectReason,
      });
      toast.success("Request rejected.", { id: toastId });
      setOnlineRequests((prev) =>
        prev.map((r) =>
          r.id === requestToReject.id
            ? { ...r, status: "rejected", rejectionReason: rejectReason }
            : r
        )
      );
      setRejectModalOpen(false);
      setRequestToReject(null);
    } catch (err) {
      console.error("Failed to reject request:", err);
      toast.error("Failed to reject request", { id: toastId });
    }
  };

  const handleCopyUtr = (utr) => {
    if (!utr) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(utr);
    }
    toast.success(`UTR ${utr} copied! 📋`);
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

      // Auto-reactivate member upon renewal / fee collection
      const targetMemberId = selectedMember?.id || selectedMember?.memberId;
      if (targetMemberId && !String(targetMemberId).startsWith("bill_")) {
        const updatePayload = {
          status: "active",
          active: true,
          dueAmount: collectMode === "clear_due" ? (newRecord.dueAmount || 0) : remainingDue,
        };
        if (collectMode === "renew") {
          updatePayload.expiryDate = validityEnd;
          updatePayload.plan = currentPlan.name;
          updatePayload.planName = currentPlan.name;
          if (newRecord.planName?.toLowerCase().includes("pt") || selectedMember?.ptPlanName) {
            updatePayload.ptEndDate = validityEnd;
          }
        }
        await updateMember("univo_main", targetMemberId, updatePayload);
      }
    } catch (e) {
      console.warn("Offline record stored:", e);
    }

    setPaymentsList((prev) => [newRecord, ...prev]);
    setRenewModalOpen(false);

    toast.success(`Fee collected successfully for ${memberName}!`);

    // Automatically open ReceiptModal for viewing, printing, and downloading
    setReceiptPayment(newRecord);
    setReceiptMember(selectedMember);

    // Send WhatsApp Bill
    if (sendWhatsApp && phone) {
      const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName}*\n\nHello *${memberName}*,\nThank you for your payment!\n\n📋 *Details:* ${newRecord.planName}\n📅 *Validity:* ${formatDate(newRecord.validityStart)} to ${formatDate(newRecord.validityEnd)}\n💰 *Amount Paid:* ₹${payingNow} (${paymentMode.toUpperCase()})\n${newRecord.dueAmount > 0 ? `⚠️ *Remaining Due:* ₹${newRecord.dueAmount}\n` : "✅ *Status:* FULLY PAID\n"}\nYour official tax receipt PDF is generated. Stay fit and healthy! 💪`;
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
    const items = [];
    const processedMemberIds = new Set();

    // 1. Map all members from membersList
    (membersList || []).forEach((m) => {
      processedMemberIds.add(m.id);
      if (m.phone) processedMemberIds.add(m.phone);

      const memberPayments = (paymentsList || []).filter(
        (p) => p.memberId === m.id || (p.phone && m.phone && p.phone === m.phone)
      );
      const latestPayment = memberPayments[0] || null;

      const expiryVal = m.expiryDate || latestPayment?.validityEnd || latestPayment?.dueDate;
      const days = getDaysRemaining(expiryVal);
      const isMemberLeft = m.status === "left" || latestPayment?.status === "left";
      const dueAmt = Number(m.dueAmount ?? latestPayment?.dueAmount ?? 0);
      const planAmt = Number(m.planPrice || latestPayment?.planPrice || latestPayment?.amount || 2500);
      const paidAmt = Number(m.paidAmount || latestPayment?.paidAmount || (dueAmt > 0 ? Math.max(0, planAmt - dueAmt) : planAmt));

      // 1. Gym individual status
      let gymDynamicStatus = "paid";
      if (isMemberLeft) {
        gymDynamicStatus = "left";
      } else if (days !== null) {
        if (days < -2) gymDynamicStatus = "overdue";
        else if (days <= 0) gymDynamicStatus = "expired";
        else if (days <= 3) gymDynamicStatus = "ending_soon";
        else gymDynamicStatus = "paid";
      }

      // 2. PT individual status
      const memberHasPt = hasPt(m);
      const ptDateVal = m.ptEndDate || m.ptExpiryDate || (m.isPt ? m.expiryDate : null);
      const ptDays = memberHasPt && ptDateVal ? getDaysRemaining(ptDateVal) : null;
      let ptDynamicStatus = null;
      if (memberHasPt) {
        if (isMemberLeft || m.ptStatus === "ended") {
          ptDynamicStatus = "ended";
        } else if (ptDays !== null) {
          if (ptDays < -2) ptDynamicStatus = "overdue";
          else if (ptDays <= 0) ptDynamicStatus = "expired";
          else if (ptDays <= 3) ptDynamicStatus = "ending_soon";
          else ptDynamicStatus = "paid";
        } else {
          ptDynamicStatus = "paid";
        }
      }

      // 3. Composite dynamic status (accounting for both Gym & PT)
      let dynamicStatus = "paid";
      if (isMemberLeft) {
        dynamicStatus = "left";
      } else if (dueAmt > 0) {
        if ((days !== null && days < -2) || (ptDays !== null && ptDays < -2)) dynamicStatus = "overdue";
        else dynamicStatus = "partial";
      } else if (gymDynamicStatus === "overdue" || ptDynamicStatus === "overdue") {
        dynamicStatus = "overdue";
      } else if (gymDynamicStatus === "expired" || ptDynamicStatus === "expired") {
        dynamicStatus = "expired";
      } else if (gymDynamicStatus === "ending_soon" || ptDynamicStatus === "ending_soon") {
        dynamicStatus = "ending_soon";
      } else {
        dynamicStatus = "paid";
      }

      const hasPaidAtLeastOnce = Boolean(m.lastPaymentDate || (latestPayment && Number(latestPayment.paidAmount || 0) > 0));
      const isFirstTimeUnpaid = !hasPaidAtLeastOnce && dueAmt > 0;
      const isPartialDue = hasPaidAtLeastOnce && dueAmt > 0;
      const isFullyPaid = dueAmt <= 0 && (hasPaidAtLeastOnce || paidAmt > 0);

      items.push({
        id: m.id,
        memberId: m.id,
        memberName: m.name || m.fullName || "Member",
        phone: m.phone || "",
        slot: m.slot || m.workoutSlot || "General Shift",
        batch: m.batch || "Alpha Gym",
        planName: m.planName || m.plan || latestPayment?.planName || "Gym Plan",
        planPrice: planAmt,
        amount: planAmt,
        paidAmount: paidAmt,
        dueAmount: dueAmt,
        validityStart: m.startDate || m.admissionDate || m.createdAt || latestPayment?.validityStart || "—",
        validityEnd: m.expiryDate || latestPayment?.validityEnd || "—",
        dueDate: m.expiryDate || latestPayment?.dueDate || "—",
        paymentMode: m.paymentMode || latestPayment?.paymentMode || "Cash",
        discount: Number(m.discount || latestPayment?.discount || 0),
        computedDays: days,
        isPt: memberHasPt,
        trainerName: m.trainerName && !["Unassigned", "General Floor Trainer (Included)", "No Trainer"].includes(m.trainerName) ? m.trainerName : null,
        ptPlanName: m.ptPlanName || (memberHasPt ? "1-on-1 PT" : null),
        ptPlanPrice: Number(m.ptPlanPrice || 0),
        ptEndDate: m.ptEndDate || m.ptExpiryDate,
        ptStatus: m.ptStatus,
        ptDays,
        gymDynamicStatus,
        ptDynamicStatus,
        hasPaidAtLeastOnce,
        isFirstTimeUnpaid,
        isPartialDue,
        isFullyPaid,
        selectedServices: m.selectedServices || m.services || [],
        dynamicStatus,
        isLeft: isMemberLeft,
        rawMember: m,
        latestPayment,
      });
    });

    // 2. Also append any payment records whose member is not in membersList
    (paymentsList || []).forEach((p) => {
      if (p.memberId && !processedMemberIds.has(p.memberId) && (!p.phone || !processedMemberIds.has(p.phone))) {
        const days = getDaysRemaining(p.dueDate || p.validityEnd);
        const isMemberLeft = p.status === "left";
        const dueAmt = Number(p.dueAmount || 0);

        let dynamicStatus = "paid";
        if (isMemberLeft) {
          dynamicStatus = "left";
        } else if (dueAmt > 0) {
          if (days !== null && days < -2) dynamicStatus = "overdue";
          else dynamicStatus = "partial";
        } else if (days !== null) {
          if (days < -2) dynamicStatus = "overdue";
          else if (days <= 0) dynamicStatus = "expired";
          else if (days <= 3) dynamicStatus = "ending_soon";
          else dynamicStatus = "paid";
        }

        const hasPaidAtLeastOnce = Boolean(Number(p.paidAmount || p.amount || 0) > 0);
        const isFirstTimeUnpaid = !hasPaidAtLeastOnce && dueAmt > 0;
        const isPartialDue = hasPaidAtLeastOnce && dueAmt > 0;
        const isFullyPaid = dueAmt <= 0 && (hasPaidAtLeastOnce || Number(p.paidAmount || 0) > 0);

        items.push({
          id: p.id,
          memberId: p.memberId,
          memberName: p.memberName || "Guest",
          phone: p.phone || "",
          slot: p.slot || "General",
          batch: p.batch || "Alpha Gym",
          planName: p.planName || "Standard Plan",
          planPrice: Number(p.amount || 0),
          amount: Number(p.amount || 0),
          paidAmount: Number(p.paidAmount || 0),
          dueAmount: dueAmt,
          validityStart: p.validityStart || "—",
          validityEnd: p.validityEnd || "—",
          dueDate: p.dueDate || "—",
          paymentMode: p.paymentMode || "Cash",
          discount: Number(p.discount || 0),
          computedDays: days,
          isPt: false,
          trainerName: null,
          ptPlanName: null,
          ptPlanPrice: 0,
          ptEndDate: null,
          ptStatus: null,
          ptDays: null,
          gymDynamicStatus: dynamicStatus,
          ptDynamicStatus: null,
          hasPaidAtLeastOnce,
          isFirstTimeUnpaid,
          isPartialDue,
          isFullyPaid,
          selectedServices: [],
          dynamicStatus,
          isLeft: isMemberLeft,
          rawMember: null,
          latestPayment: p,
        });
      }
    });

    return items;
  }, [membersList, paymentsList]);

  const totalCollections = useMemo(() => {
    return (paymentsList || []).reduce((acc, p) => acc + Number(p.paidAmount || p.amount || 0), 0);
  }, [paymentsList]);

  const totalDues = useMemo(() => {
    return classifiedItems.reduce((acc, i) => acc + Number(i.dueAmount || 0), 0);
  }, [classifiedItems]);

  const totalDueMembersCount = useMemo(() => {
    return classifiedItems.filter((i) => Number(i.dueAmount || 0) > 0 && !i.isLeft).length;
  }, [classifiedItems]);

  const pendingOnlineRequests = useMemo(() => {
    return (onlineRequests || []).filter((r) => r.status === "pending");
  }, [onlineRequests]);

  // Tab counts with Gym & PT breakdown
  const counts = useMemo(() => {
    let gymEndingSoonCount = 0;
    let ptEndingSoonCount = 0;
    let gymExpiredCount = 0;
    let ptExpiredCount = 0;
    let gymOverdueCount = 0;
    let ptOverdueCount = 0;

    classifiedItems.forEach((i) => {
      if (i.isLeft) return;
      if (i.gymDynamicStatus === "ending_soon") gymEndingSoonCount++;
      if (i.ptDynamicStatus === "ending_soon") ptEndingSoonCount++;
      if (i.gymDynamicStatus === "expired") gymExpiredCount++;
      if (i.ptDynamicStatus === "expired") ptExpiredCount++;
      if (i.gymDynamicStatus === "overdue") gymOverdueCount++;
      if (i.ptDynamicStatus === "overdue") ptOverdueCount++;
    });

    return {
      all: classifiedItems.length,
      paid: classifiedItems.filter((i) => i.isFullyPaid && !i.isLeft && i.gymDynamicStatus === "paid" && (!i.isPt || i.ptDynamicStatus === "paid")).length,
      partial: classifiedItems.filter((i) => Number(i.dueAmount || 0) > 0 && !i.isLeft).length,
      ending_soon: classifiedItems.filter((i) => (i.gymDynamicStatus === "ending_soon" || i.ptDynamicStatus === "ending_soon") && !i.isLeft).length,
      expired: classifiedItems.filter((i) => (i.gymDynamicStatus === "expired" || i.ptDynamicStatus === "expired") && !i.isLeft).length,
      overdue: classifiedItems.filter((i) => (i.gymDynamicStatus === "overdue" || i.ptDynamicStatus === "overdue") && !i.isLeft).length,
      left: classifiedItems.filter((i) => i.isLeft).length,
      online_requests: pendingOnlineRequests.length,
      gymEndingSoonCount,
      ptEndingSoonCount,
      gymExpiredCount,
      ptExpiredCount,
      gymOverdueCount,
      ptOverdueCount,
    };
  }, [classifiedItems, pendingOnlineRequests]);

  // Filtered list
  const filteredSubscriptions = useMemo(() => {
    return classifiedItems.filter((item) => {
      const term = search.toLowerCase();
      const matchSearch =
        (item.memberName || "").toLowerCase().includes(term) ||
        (item.phone || "").toLowerCase().includes(term) ||
        (item.slot || "").toLowerCase().includes(term) ||
        (item.planName || "").toLowerCase().includes(term) ||
        (item.trainerName || "").toLowerCase().includes(term);

      const matchSlot =
        slotFilter === "all" ||
        (item.slot || "").toLowerCase().includes(slotFilter.toLowerCase());

      let matchTab = true;
      if (statusFilter === "paid") {
        matchTab = item.isFullyPaid && !item.isLeft && item.gymDynamicStatus === "paid" && (!item.isPt || item.ptDynamicStatus === "paid");
      } else if (statusFilter === "partial") {
        matchTab = Number(item.dueAmount || 0) > 0 && !item.isLeft;
      } else if (statusFilter === "ending_soon") {
        const isEnding = (item.gymDynamicStatus === "ending_soon" || item.ptDynamicStatus === "ending_soon") && !item.isLeft;
        if (!isEnding) return false;
        if (subFilter === "gym") return item.gymDynamicStatus === "ending_soon";
        if (subFilter === "pt") return item.ptDynamicStatus === "ending_soon";
        return true;
      } else if (statusFilter === "expired") {
        const isExp = (item.gymDynamicStatus === "expired" || item.ptDynamicStatus === "expired") && !item.isLeft;
        if (!isExp) return false;
        if (subFilter === "gym") return item.gymDynamicStatus === "expired";
        if (subFilter === "pt") return item.ptDynamicStatus === "expired";
        return true;
      } else if (statusFilter === "overdue") {
        const isOver = (item.gymDynamicStatus === "overdue" || item.ptDynamicStatus === "overdue") && !item.isLeft;
        if (!isOver) return false;
        if (subFilter === "gym") return item.gymDynamicStatus === "overdue";
        if (subFilter === "pt") return item.ptDynamicStatus === "overdue";
        return true;
      } else if (statusFilter === "left") {
        matchTab = item.isLeft;
      }

      return matchSearch && matchSlot && matchTab;
    });
  }, [classifiedItems, search, statusFilter, slotFilter, subFilter]);

  // List of members expiring in 3, 2, 1 or today for top alert banner
  const endingInThreeDays = useMemo(() => {
    return classifiedItems.filter((i) => (i.gymDynamicStatus === "ending_soon" || i.ptDynamicStatus === "ending_soon") && !i.isLeft);
  }, [classifiedItems]);

  // Filtered Online Requests
  const filteredOnlineRequests = useMemo(() => {
    let list = onlineRequests || [];
    if (requestsSubFilter === "pending") list = list.filter((r) => r.status === "pending");
    else if (requestsSubFilter === "approved") list = list.filter((r) => r.status === "approved");
    else if (requestsSubFilter === "rejected") list = list.filter((r) => r.status === "rejected");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.memberName || "").toLowerCase().includes(q) ||
          (r.memberPhone || "").toLowerCase().includes(q) ||
          (r.utr || "").toLowerCase().includes(q) ||
          (r.planName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [onlineRequests, requestsSubFilter, search]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* App-Style Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            Fee Desk
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold">
              {classifiedItems.length}
            </span>
          </h1>
          <p className="text-slate-500 text-xs">
            Fee collections, pending dues & renewals
          </p>
        </div>

        <button
          onClick={() => handleOpenCollectModal(null, "renew")}
          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs py-2 px-3.5 shadow-sm rounded-xl flex items-center gap-1.5 shrink-0 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Collect Fee & Renew</span>
          <span className="sm:hidden">Collect Fee</span>
        </button>
      </div>

      {/* KPI Stats Quick Bar (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Collections */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Collections</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-lg sm:text-xl font-black text-emerald-600 leading-tight">
              ₹{totalCollections.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total fee collected</p>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div
          onClick={() => setStatusFilter("partial")}
          className={`p-3 sm:p-4 rounded-2xl bg-white border shadow-2xs flex flex-col justify-between cursor-pointer transition ${
            totalDues > 0 ? "border-rose-200 hover:border-rose-300" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pending Dues</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${totalDues > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className={`text-lg sm:text-xl font-black leading-tight ${totalDues > 0 ? "text-rose-600" : "text-slate-800"}`}>
              ₹{totalDues.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {totalDueMembersCount} member{totalDueMembersCount === 1 ? "" : "s"} due
            </p>
          </div>
        </div>

        {/* Ending Soon Alerts */}
        <div
          onClick={() => setStatusFilter("ending_soon")}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 shadow-2xs flex flex-col justify-between cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ending Soon</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-lg sm:text-xl font-black text-amber-600 leading-tight">
              {counts.ending_soon}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Expiring in 0-3 days</p>
          </div>
        </div>

        {/* Fully Paid */}
        <div
          onClick={() => setStatusFilter("paid")}
          className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-2xs flex flex-col justify-between cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fully Paid</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <p className="text-lg sm:text-xl font-black text-indigo-600 leading-tight">
              {counts.paid}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active & cleared</p>
          </div>
        </div>
      </div>

      {/* Online UPI Requests Sleek Alert Strip */}
      {counts.online_requests > 0 && (
        <div
          onClick={() => navigate("/owner/upi-approvals")}
          className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white flex items-center justify-between gap-3 border border-emerald-500/30 cursor-pointer shadow-sm hover:border-emerald-400 transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <p className="text-xs font-bold text-emerald-200 truncate">
              🔔 {counts.online_requests} UPI Renewal Request{counts.online_requests > 1 ? "s" : ""} Pending Verification
            </p>
          </div>
          <span className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded-lg shrink-0">
            Review →
          </span>
        </div>
      )}

      {/* Ending Soon Quick Strip */}
      {endingInThreeDays.length > 0 && statusFilter !== "ending_soon" && (
        <div
          onClick={() => setStatusFilter("ending_soon")}
          className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-100/70 transition"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950 min-w-0 truncate">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">{endingInThreeDays.length} member{endingInThreeDays.length > 1 ? "s" : ""} expiring in 0-3 days</span>
          </div>
          <span className="text-[11px] font-extrabold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md shrink-0">
            View →
          </span>
        </div>
      )}

      {/* App-Style Search & Scrollable Filter Tabs */}
      <div className="space-y-2.5">
        {/* Search Bar + Slot selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member, phone, plan or slot..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 shadow-2xs max-w-[140px] sm:max-w-[180px] truncate"
          >
            <option value="all">All Shifts</option>
            <option value="Morning">🌅 Morning</option>
            <option value="Afternoon">☀️ Afternoon</option>
            <option value="Evening">🌆 Evening</option>
            <option value="Night">🌙 Night</option>
          </select>
        </div>

        {/* Horizontally Scrollable Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* All */}
          <button
            onClick={() => { setStatusFilter("all"); setSubFilter("all"); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${statusFilter === "all" ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
              {counts.all}
            </span>
          </button>

          {/* Dues / Partial */}
          <button
            onClick={() => { setStatusFilter("partial"); setSubFilter("all"); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "partial"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100/70"
            }`}
          >
            <span>⚠️ Dues</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${statusFilter === "partial" ? "bg-white/20" : "bg-amber-200 text-amber-950"}`}>
              {counts.partial}
            </span>
          </button>

          {/* Ending Soon */}
          <button
            onClick={() => { setStatusFilter("ending_soon"); setSubFilter("all"); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "ending_soon"
                ? "bg-amber-500 text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>⏰ Ending</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === "ending_soon" ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
              {counts.ending_soon}
            </span>
          </button>

          {/* Expired */}
          <button
            onClick={() => { setStatusFilter("expired"); setSubFilter("all"); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "expired"
                ? "bg-orange-600 text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>Expired</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === "expired" ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
              {counts.expired}
            </span>
          </button>

          {/* Overdue */}
          <button
            onClick={() => { setStatusFilter("overdue"); setSubFilter("all"); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "overdue"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>Overdue</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === "overdue" ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
              {counts.overdue}
            </span>
          </button>

          {/* Paid */}
          <button
            onClick={() => { setStatusFilter("paid"); setSubFilter("all"); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "paid"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>✅ Paid</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === "paid" ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
              {counts.paid}
            </span>
          </button>

          {/* Left */}
          <button
            onClick={() => { setStatusFilter("left"); setSubFilter("all"); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "left"
                ? "bg-slate-700 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>Left</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === "left" ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
              {counts.left}
            </span>
          </button>

          {/* Online UPI Approvals link */}
          <button
            onClick={() => navigate("/owner/upi-approvals")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 cursor-pointer shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>UPI Approvals</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${counts.online_requests > 0 ? "bg-red-500 text-white animate-pulse" : "bg-emerald-200 text-emerald-900"}`}>
              {counts.online_requests}
            </span>
          </button>
        </div>
      </div>

      {/* Category Sub-Filter (Gym vs PT Breakdown) for Ending Soon, Expired, Overdue */}
      {statusFilter === "ending_soon" && counts.ending_soon > 0 && (
        <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-amber-950 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ending Soon Breakdown:</span>
            <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">Select Gym or PT package:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSubFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                subFilter === "all" ? "bg-amber-500 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              All Ending ({counts.ending_soon})
            </button>
            <button
              onClick={() => setSubFilter("gym")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                subFilter === "gym" ? "bg-blue-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-200"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span>Gym Ending ({counts.gymEndingSoonCount})</span>
            </button>
            <button
              onClick={() => setSubFilter("pt")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                subFilter === "pt" ? "bg-purple-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>PT Ending ({counts.ptEndingSoonCount})</span>
            </button>
          </div>
        </div>
      )}

      {statusFilter === "expired" && counts.expired > 0 && (
        <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50/90 border border-orange-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-orange-950 font-bold">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Expired Breakdown:</span>
            <span className="text-[11px] text-orange-800 font-medium hidden sm:inline">Select Gym or PT package:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSubFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                subFilter === "all" ? "bg-orange-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-orange-100 border border-orange-200"
              }`}
            >
              All Expired ({counts.expired})
            </button>
            <button
              onClick={() => setSubFilter("gym")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                subFilter === "gym" ? "bg-blue-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-200"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span>Gym Expired ({counts.gymExpiredCount})</span>
            </button>
            <button
              onClick={() => setSubFilter("pt")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                subFilter === "pt" ? "bg-purple-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>PT Expired ({counts.ptExpiredCount})</span>
            </button>
          </div>
        </div>
      )}

      {statusFilter === "overdue" && counts.overdue > 0 && (
        <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50/90 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-rose-950 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Overdue Breakdown:</span>
            <span className="text-[11px] text-rose-800 font-medium hidden sm:inline">Select Gym or PT package:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSubFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                subFilter === "all" ? "bg-rose-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              All Overdue ({counts.overdue})
            </button>
            <button
              onClick={() => setSubFilter("gym")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                subFilter === "gym" ? "bg-blue-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-200"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span>Gym Overdue ({counts.gymOverdueCount})</span>
            </button>
            <button
              onClick={() => setSubFilter("pt")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                subFilter === "pt" ? "bg-purple-600 text-white shadow-2xs" : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>PT Overdue ({counts.ptOverdueCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Online UPI Renewal Requests View or Standard Subscriptions View */}
      {statusFilter === "online_requests" ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Subfilter Bar & Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                Online UPI Payment Renewal Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review UPI transactions submitted by members via Gym UPI QR. Verify UTR in your bank app and approve.
              </p>
            </div>

            {/* Sub-filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Requests", count: onlineRequests.length },
                { id: "pending", label: "Pending Verification", count: pendingOnlineRequests.length, highlight: true },
                { id: "approved", label: "Approved", count: onlineRequests.filter(r => r.status === "approved").length },
                { id: "rejected", label: "Rejected", count: onlineRequests.filter(r => r.status === "rejected").length }
              ].map((sf) => (
                <button
                  key={sf.id}
                  onClick={() => setRequestsSubFilter(sf.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    requestsSubFilter === sf.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sf.label}{" "}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      sf.highlight && sf.count > 0
                        ? "bg-red-500 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {sf.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cards for Online Requests */}
          {filteredOnlineRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              <QrCode className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h4 className="text-base font-bold text-slate-700">No UPI Requests Found</h4>
              <p className="text-xs text-slate-400 mt-1">
                {requestsSubFilter === "pending"
                  ? "All online UPI renewal requests have been verified and processed! 🎉"
                  : "No requests match the selected search or filter."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredOnlineRequests.map((req) => {
                const initials = (req.memberName || "M")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const isPending = req.status === "pending";
                const isApproved = req.status === "approved";
                const isRejected = req.status === "rejected";

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-3xl bg-white border shadow-sm transition space-y-4 ${
                      isPending
                        ? "border-amber-300 ring-2 ring-amber-400/20"
                        : isApproved
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-slate-200 opacity-75"
                    }`}
                  >
                    {/* Header: Member Avatar, Name, Phone & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            {req.memberName}
                            {req.planType === "pt" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
                                1-on-1 PT
                              </span>
                            )}
                          </h4>
                          {req.memberPhone ? (
                            <a
                              href={`tel:${req.memberPhone.replace(/[^0-9+]/g, '')}`}
                              className="text-xs text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{req.memberPhone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No phone</span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Renewed
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <X className="w-3 h-3 text-rose-600" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Plan & Amount Box */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Requested Plan</span>
                        <span className="font-extrabold text-slate-900 text-xs block">{req.planName}</span>
                        {req.trainerName && (
                          <span className="text-[11px] text-purple-700 font-medium">Coach: {req.trainerName}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Amount</span>
                        <span className="text-base font-black text-emerald-600">₹{req.amount || req.amountPaid || req.planPrice || 0}</span>
                      </div>
                    </div>

                    {/* UTR Number Display (with Copy button) */}
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                          12-Digit UPI UTR / Reference
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(req.createdAt || req.submittedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-amber-300">
                        <span className="font-mono font-black text-slate-900 text-sm tracking-wider select-all">
                          {req.utr || req.utrNumber || "N/A"}
                        </span>
                        <button
                          onClick={() => handleCopyUtr(req.utr || req.utrNumber)}
                          className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1 transition"
                          title="Copy UTR to clipboard"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        💡 Verify that ₹{req.amount || req.amountPaid || req.planPrice} was credited in your Axis/PhonePe/GPay bank account for this UTR.
                      </p>
                    </div>

                    {/* Screenshot Proof if attached */}
                    {req.screenshotUrl && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-semibold text-slate-700">Payment Screenshot Attached</span>
                        </div>
                        <button
                          onClick={() => setSelectedProofImg(req.screenshotUrl)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                        >
                          View Screenshot <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Rejection reason if rejected */}
                    {isRejected && req.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        <strong>Reason:</strong> {req.rejectionReason}
                      </div>
                    )}

                    {/* Actions if pending */}
                    {isPending && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          disabled={actionInProgress === req.id}
                          onClick={() => handleApproveRequest(req)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {actionInProgress === req.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Approve & Renew Plan
                            </>
                          )}
                        </button>
                        <button
                          disabled={actionInProgress === req.id}
                          onClick={() => handleOpenReject(req)}
                          className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                        {req.memberPhone && (
                          <button
                            onClick={() => {
                              const msg = `Hello ${req.memberName}, regarding your gym renewal request (Plan: ${req.planName}, UTR: ${req.utr}) at ${settings.gymName}...`;
                              openWhatsApp(req.memberPhone, msg);
                            }}
                            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* High-Fidelity Table (Desktop & Tablet) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3.5">MEMBER PROFILE & SHIFT</th>
              <th className="px-4 py-3.5">GYM MEMBERSHIP</th>
              <th className="px-4 py-3.5">PERSONAL TRAINING (PT)</th>
              <th className="px-4 py-3.5">SERVICES & FACILITIES</th>
              <th className="px-4 py-3.5">FEES & DUES</th>
              <th className="px-4 py-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSubscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
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
                const isLeftMember = item.dynamicStatus === "left" || item.isLeft;
                const hasDue = Number(item.dueAmount) > 0;
                const ptDays = item.ptDays;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/90 transition group ${
                      isLeftMember ? "bg-slate-50/60 opacity-80" : ""
                    }`}
                  >
                    {/* 1. Member Profile & Shift */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 mt-0.5 ${
                            isLeftMember
                              ? "bg-slate-400"
                              : "bg-gradient-to-br from-indigo-500 to-purple-600"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="space-y-1">
                          <button
                            onClick={() => navigate(`/owner/members/${item.memberId || item.id}`)}
                            className="font-bold text-slate-900 text-sm hover:text-indigo-600 hover:underline flex items-center gap-1.5 text-left transition-colors"
                          >
                            <span>{item.memberName}</span>
                            {isLeftMember && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-bold">
                                LEFT
                              </span>
                            )}
                          </button>
                          {item.phone ? (
                            <a
                              href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-slate-500 hover:text-emerald-600 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Call ${item.memberName} (${item.phone})`}
                            >
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{item.phone}</span>
                            </a>
                          ) : (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-300" /> No Phone
                            </p>
                          )}
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold">
                              {getSlotIcon(item.slot)}
                              <span className="truncate max-w-[140px]">{item.slot || "General Shift"}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Gym Membership */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{item.planName}</span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            ₹{item.planPrice || item.amount}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Valid: <strong className="text-slate-700">{formatDate(item.validityStart)}</strong> to <strong className="text-slate-700">{formatDate(item.validityEnd)}</strong>
                        </p>
                        <div>
                          {isLeftMember ? (
                            <span className="text-[10px] font-semibold text-slate-400">Left Gym</span>
                          ) : days !== null ? (
                            <div>
                              {days > 3 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  {days} days left
                                </span>
                              ) : days >= 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                  {days === 0 ? "Expires Today!" : `${days} day${days > 1 ? "s" : ""} left`}
                                </span>
                              ) : days >= -2 ? (
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
                      </div>
                    </td>

                    {/* 3. Personal Training (PT) */}
                    <td className="px-4 py-3.5 align-top">
                      {item.isPt && item.trainerName ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs">
                            <Dumbbell className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{item.trainerName}</span>
                          </div>
                          <p className="text-[10px] text-slate-600 font-medium">
                            {item.ptPlanName || "1-on-1 PT Coaching"}
                          </p>
                          {item.ptEndDate && (
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-slate-400">Till:</span>
                              <span className="font-semibold text-slate-700">{formatDate(item.ptEndDate)}</span>
                              {ptDays !== null && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  ptDays > 3 ? "bg-indigo-50 text-indigo-700" : ptDays >= 0 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700"
                                }`}>
                                  {ptDays >= 0 ? `${ptDays}d left` : "PT Expired"}
                                </span>
                              )}
                            </div>
                          )}
                          {/* PT Dynamic Action: Paid -> 'PT Paid' Badge; Ending Soon -> 'Renew PT (Expiring Soon)'; Expired/Overdue -> 'Renew PT' */}
                          {!isLeftMember && (
                            item.ptDynamicStatus === "ending_soon" ? (
                              <button
                                onClick={() => handleOpenPtModal(item)}
                                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] inline-flex items-center gap-1 transition shadow-2xs animate-pulse cursor-pointer"
                                title="PT Expiring Soon - Click to Renew PT Package"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Renew PT (Expiring Soon)
                              </button>
                            ) : item.ptDynamicStatus === "expired" ? (
                              <button
                                onClick={() => handleOpenPtModal(item)}
                                className="px-2 py-0.5 rounded bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="PT Expired - Click to Renew PT Package"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Renew PT (Expired)
                              </button>
                            ) : item.ptDynamicStatus === "overdue" ? (
                              <button
                                onClick={() => handleOpenPtModal(item)}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] inline-flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="PT Overdue - Click to Renew PT Package"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Renew PT (Overdue)
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                <CheckCircle2 className="w-3 h-3 text-purple-600" /> PT Active ({ptDays !== null ? `${ptDays}d left` : "Paid"})
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-400 block">Floor Only (No PT)</span>
                          {!isLeftMember && (
                            <button
                              onClick={() => handleOpenPtModal(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold transition"
                            >
                              <Plus className="w-2.5 h-2.5" /> Add PT
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 4. Services & Facilities */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-1.5">
                        {item.selectedServices && item.selectedServices.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {item.selectedServices.map((srv, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-semibold"
                                title={srv.name || srv.serviceName}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                                <span className="truncate max-w-[120px]">{srv.name || srv.serviceName}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium block">No active add-ons</span>
                        )}
                        {!isLeftMember && (
                          <button
                            onClick={() => handleOpenServiceModal(item)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 text-[10px] font-bold transition"
                          >
                            <Plus className="w-2.5 h-2.5" /> Service
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 5. Fees & Dues */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">₹{item.amount}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-semibold uppercase text-slate-600">
                            {item.paymentMode || "Cash"}
                          </span>
                        </div>
                        {item.isFirstTimeUnpaid ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              Unpaid: ₹{item.dueAmount || item.planPrice}
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium">New Admission</p>
                          </div>
                        ) : item.isPartialDue ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Due: ₹{item.dueAmount}
                            </span>
                            <p className="text-[10px] text-slate-500 font-medium">Paid: ₹{item.paidAmount}</p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid in Full
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Actions */}
                    <td className="px-4 py-3.5 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Dynamic Primary Action Button by Status (Gym & PT aware) */}
                        {item.isFirstTimeUnpaid && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenCollectModal(item, "collect")}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Collect Initial Membership Admission Fee"
                          >
                            <IndianRupee className="w-3 h-3" /> Collect Fee
                          </button>
                        ) : item.isPartialDue && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenCollectModal(item, "clear_due")}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Collect Remaining Due Balance"
                          >
                            <IndianRupee className="w-3 h-3" /> Collect Due ({`₹${item.dueAmount}`})
                          </button>
                        ) : (item.gymDynamicStatus === "ending_soon" && item.ptDynamicStatus === "ending_soon") && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenCollectModal(item, "renew")}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer animate-pulse"
                            title="Gym Plan & PT Both Expiring Soon - Renew Now"
                          >
                            <RotateCcw className="w-3 h-3" /> Renew Plan & PT
                          </button>
                        ) : item.gymDynamicStatus === "ending_soon" && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenCollectModal(item, "renew")}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer animate-pulse"
                            title="Plan Expiring Soon - Renew Now"
                          >
                            <RotateCcw className="w-3 h-3" /> Renew Plan
                          </button>
                        ) : item.ptDynamicStatus === "ending_soon" && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenPtModal(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer animate-pulse"
                            title="PT Expiring Soon - Renew PT Package"
                          >
                            <RotateCcw className="w-3 h-3" /> Renew PT
                          </button>
                        ) : item.gymDynamicStatus === "expired" && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenCollectModal(item, "renew")}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Plan Expired - Renew"
                          >
                            <RotateCcw className="w-3 h-3" /> Renew Plan
                          </button>
                        ) : item.ptDynamicStatus === "expired" && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenPtModal(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="PT Expired - Renew PT Package"
                          >
                            <RotateCcw className="w-3 h-3" /> Renew PT
                          </button>
                        ) : item.gymDynamicStatus === "overdue" && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenCollectModal(item, "renew")}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Plan Overdue - Renew"
                          >
                            <RotateCcw className="w-3 h-3" /> Renew Plan
                          </button>
                        ) : item.ptDynamicStatus === "overdue" && !isLeftMember ? (
                          <button
                            onClick={() => handleOpenPtModal(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="PT Overdue - Renew PT Package"
                          >
                            <RotateCcw className="w-3 h-3" /> Renew PT
                          </button>
                        ) : (item.isFullyPaid || item.dynamicStatus === "paid") && !isLeftMember ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
                          </span>
                        ) : null}

                        {/* Receipt Button */}
                        <button
                          onClick={() => {
                            setReceiptPayment(item.latestPayment || item);
                            setReceiptMember(item.rawMember || membersMap[item.memberId] || membersMap[item.phone] || null);
                          }}
                          className="px-2 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                          title="View & Print Official Fee Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden xl:inline">Receipt</span>
                        </button>

                        {/* WhatsApp Button */}
                        <button
                          onClick={() => {
                            const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName}*\n\nHello *${item.memberName}*,\nHere are your membership details:\n\n📋 *Gym Plan:* ${item.planName}\n📅 *Validity:* ${formatDate(item.validityStart)} to ${formatDate(item.validityEnd)}\n💰 *Total Fee:* ₹${item.amount}\n${hasDue ? `⚠️ *Pending Due:* ₹${item.dueAmount}\n` : `✅ *Status:* FULLY PAID\n`}${item.isPt && item.trainerName ? `🏋️ *Personal Trainer:* ${item.trainerName} (${item.ptPlanName || "PT"})\n` : ""}\nThank you! 💪`;
                            openWhatsApp(item.phone, msg);
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition"
                          title="Share Fee Summary on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* View Full Profile */}
                        <button
                          onClick={() => navigate(`/owner/members/${item.memberId || item.id}`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                          title="View Member Full Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Mark Left Button */}
                        {!isLeftMember && (
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

      {/* Modern App-Style Mobile Cards (Visible on <md screens) */}
      <div className="md:hidden space-y-2.5">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-400 shadow-2xs">
            <UserX className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700 text-sm">No members found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try choosing another filter tab or search keyword</p>
          </div>
        ) : (
          filteredSubscriptions.map((item) => {
            const initials = (item.memberName || "M")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const days = item.computedDays;
            const ptDays = item.ptDays;
            const isLeftMember = item.dynamicStatus === "left" || item.isLeft;
            const hasDue = Number(item.dueAmount) > 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-3.5 sm:p-4 space-y-3"
              >
                {/* Row 1: Member Profile Header & Status Tag */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0 ${
                        isLeftMember
                          ? "bg-slate-400"
                          : hasDue
                          ? "bg-gradient-to-br from-amber-500 to-rose-500"
                          : "bg-gradient-to-br from-indigo-500 to-emerald-500"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => navigate(`/owner/members/${item.memberId || item.id}`)}
                          className="font-extrabold text-slate-900 text-sm hover:text-indigo-600 transition text-left truncate cursor-pointer"
                        >
                          {item.memberName}
                        </button>
                        {isLeftMember && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold border border-slate-200">
                            LEFT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        {item.phone ? (
                          <a
                            href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-emerald-600 flex items-center gap-1 font-medium transition cursor-pointer"
                            title={`Call ${item.memberName}`}
                          >
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{item.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">No phone</span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 text-slate-600 font-medium truncate">
                          {getSlotIcon(item.slot)}
                          <span className="truncate">{item.slot?.split("(")[0]?.trim() || "General"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Status Tag */}
                  <div className="shrink-0 text-right">
                    {item.isFirstTimeUnpaid && !isLeftMember ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                        Unpaid: ₹{item.dueAmount || item.planPrice}
                      </span>
                    ) : item.isPartialDue && !isLeftMember ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                        Due: ₹{item.dueAmount}
                      </span>
                    ) : (item.gymDynamicStatus === "ending_soon" || item.ptDynamicStatus === "ending_soon") && !isLeftMember ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {days === 0 ? "Expires Today" : `${days}d left`}
                      </span>
                    ) : (item.gymDynamicStatus === "expired" || item.ptDynamicStatus === "expired") && !isLeftMember ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        Expired {Math.abs(days)}d ago
                      </span>
                    ) : (item.gymDynamicStatus === "overdue" || item.ptDynamicStatus === "overdue") && !isLeftMember ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        Overdue
                      </span>
                    ) : isLeftMember ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Left Gym
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Paid
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Gym Plan & Validity Banner */}
                <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-900 text-xs leading-tight truncate">
                          {item.planName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {formatDate(item.validityStart)} – {formatDate(item.validityEnd)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 text-sm">
                        ₹{item.planPrice || item.amount}
                      </p>
                      {days !== null && !isLeftMember && (
                        <p className={`text-[10px] font-extrabold ${
                          days > 3
                            ? "text-emerald-700"
                            : days >= 0
                            ? "text-amber-700"
                            : "text-rose-600"
                        }`}>
                          {days > 3 ? `${days} days left` : days === 0 ? "Expires Today!" : days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Clean Non-Overlapping PT & Services Rows */}
                  {!isLeftMember && (
                    <div className="pt-2 border-t border-slate-200/70 space-y-2 text-xs">
                      {/* PT Coaching Row */}
                      <div className="flex items-center justify-between gap-2 bg-white/70 px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Dumbbell className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="text-slate-500 text-[11px] font-medium shrink-0">PT Coach:</span>
                          <span className="font-bold text-slate-800 text-[11px] truncate">
                            {item.isPt && item.trainerName ? item.trainerName : "Floor Only (No PT)"}
                          </span>
                        </div>
                        {item.isPt && item.trainerName ? (
                          item.ptDynamicStatus === "ending_soon" ? (
                            <button
                              onClick={() => handleOpenPtModal(item)}
                              className="text-[10px] font-black text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 transition shrink-0 cursor-pointer animate-pulse"
                              title="Renew Expiring PT Package"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-amber-600" /> Renew PT
                            </button>
                          ) : item.ptDynamicStatus === "expired" ? (
                            <button
                              onClick={() => handleOpenPtModal(item)}
                              className="text-[10px] font-black text-white bg-orange-600 hover:bg-orange-700 px-2 py-0.5 rounded-lg flex items-center gap-1 transition shrink-0 cursor-pointer"
                              title="Renew Expired PT Package"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Renew PT
                            </button>
                          ) : item.ptDynamicStatus === "overdue" ? (
                            <button
                              onClick={() => handleOpenPtModal(item)}
                              className="text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded-lg flex items-center gap-1 transition shrink-0 cursor-pointer"
                              title="Renew Overdue PT Package"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Renew PT
                            </button>
                          ) : (
                            <span className="text-[10px] font-extrabold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" /> PT Paid ({ptDays !== null ? `${ptDays}d` : "Active"})
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => handleOpenPtModal(item)}
                            className="text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition shrink-0 cursor-pointer"
                          >
                            + Add PT
                          </button>
                        )}
                      </div>

                      {/* Add-On Services Row */}
                      <div className="flex items-center justify-between gap-2 bg-white/70 px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="text-slate-500 text-[11px] font-medium shrink-0">Facilities:</span>
                          <span className="font-bold text-teal-800 text-[11px] truncate">
                            {item.selectedServices && item.selectedServices.length > 0
                              ? item.selectedServices.map(s => s.name || s.serviceName).join(", ")
                              : "No active add-on"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenServiceModal(item)}
                          className="text-[10px] font-extrabold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded transition shrink-0 cursor-pointer"
                        >
                          + Service
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 3: Financial Fee & Balance Due Summary */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px] font-medium">Plan Fee:</span>
                    <span className="font-extrabold text-slate-900">₹{item.planPrice || item.amount}</span>
                  </div>

                  <div>
                    {item.isFirstTimeUnpaid ? (
                      <span className="font-black text-rose-600 text-xs flex items-center gap-1">
                        <span>Unpaid:</span>
                        <span className="text-sm font-black">₹{item.dueAmount || item.planPrice}</span>
                      </span>
                    ) : item.isPartialDue ? (
                      <span className="font-black text-amber-700 text-xs flex items-center gap-1">
                        <span>Balance Due:</span>
                        <span className="text-sm font-black">₹{item.dueAmount}</span>
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Full Paid
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 4: Action Buttons (Clean & Context-Aware) */}
                <div className="space-y-2 pt-0.5">
                  {/* Dynamic Primary Action Button by Exact Status (Gym & PT aware) */}
                  {item.isFirstTimeUnpaid && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenCollectModal(item, "collect")}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Collect Initial Admission Fee"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Collect Fee (₹{item.dueAmount || item.planPrice})</span>
                    </button>
                  ) : item.isPartialDue && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenCollectModal(item, "clear_due")}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Collect Due Amount"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Collect Due (₹{item.dueAmount})</span>
                    </button>
                  ) : (item.gymDynamicStatus === "ending_soon" && item.ptDynamicStatus === "ending_soon") && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenCollectModal(item, "renew")}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer animate-pulse"
                      title="Renew Gym Plan & PT Package"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Renew Plan & PT (Expiring Soon)</span>
                    </button>
                  ) : item.gymDynamicStatus === "ending_soon" && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenCollectModal(item, "renew")}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer animate-pulse"
                      title="Renew Membership Plan (Expiring Soon)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Renew Plan (Expiring Soon)</span>
                    </button>
                  ) : item.ptDynamicStatus === "ending_soon" && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenPtModal(item)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer animate-pulse"
                      title="Renew PT Package (Expiring Soon)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Renew PT Package (Expiring Soon)</span>
                    </button>
                  ) : item.gymDynamicStatus === "expired" && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenCollectModal(item, "renew")}
                      className="w-full py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Renew Expired Membership Plan"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Renew Plan (Expired)</span>
                    </button>
                  ) : item.ptDynamicStatus === "expired" && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenPtModal(item)}
                      className="w-full py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Renew Expired PT Package"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Renew PT Package (Expired)</span>
                    </button>
                  ) : item.gymDynamicStatus === "overdue" && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenCollectModal(item, "renew")}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Renew Overdue Membership Plan"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Renew Plan (Overdue)</span>
                    </button>
                  ) : item.ptDynamicStatus === "overdue" && !isLeftMember ? (
                    <button
                      onClick={() => handleOpenPtModal(item)}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Renew Overdue PT Package"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Renew PT Package (Overdue)</span>
                    </button>
                  ) : (item.isFullyPaid || item.dynamicStatus === "paid") && !isLeftMember ? (
                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-extrabold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Paid in Full • Active</span>
                    </div>
                  ) : isLeftMember ? (
                    <div className="w-full py-2 px-3 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5">
                      <span>Left Gym</span>
                    </div>
                  ) : null}

                  {/* Secondary Quick Action Bar (4 Equal Clean Buttons) */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {/* Bill / Receipt */}
                    <button
                      onClick={() => {
                        setReceiptPayment(item.latestPayment || item);
                        setReceiptMember(item.rawMember || membersMap[item.memberId] || membersMap[item.phone] || null);
                      }}
                      className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 flex items-center justify-center gap-1 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                      title="View & Print Official Receipt"
                    >
                      <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Bill</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => {
                        const msg = `🧾 *Official Gym Fee Receipt - ${settings.gymName}*\n\nHello *${item.memberName}*,\nHere are your membership details:\n\n📋 *Gym Plan:* ${item.planName}\n📅 *Validity:* ${formatDate(item.validityStart)} to ${formatDate(item.validityEnd)}\n💰 *Total Fee:* ₹${item.amount}\n${hasDue ? `⚠️ *Pending Due:* ₹${item.dueAmount}\n` : `✅ *Status:* FULLY PAID\n`}${item.isPt && item.trainerName ? `🏋️ *Personal Trainer:* ${item.trainerName}\n` : ""}\nThank you! 💪`;
                        openWhatsApp(item.phone, msg);
                      }}
                      className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 flex items-center justify-center gap-1 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                      title="Share on WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chat</span>
                    </button>

                    {/* Profile */}
                    <button
                      onClick={() => navigate(`/owner/members/${item.memberId || item.id}`)}
                      className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center gap-1 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                      title="View Member Full Profile"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Profile</span>
                    </button>

                    {/* Left */}
                    {!isLeftMember ? (
                      <button
                        onClick={() => handleOpenLeftModal(item)}
                        className="py-2 px-1 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 flex items-center justify-center gap-1 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                        title="Mark Member as Left Gym"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Left</span>
                      </button>
                    ) : (
                      <div className="py-2 px-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center gap-1 text-[11px] font-semibold">
                        <span>Left</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  )}

      {/* COMPREHENSIVE COLLECT FEE & RENEW MODAL */}
      {collectFeeModalOpen && selectedMember && (
        <CollectFeeModal
          member={selectedMember}
          gymId={activeGymId}
          plans={plansList}
          trainers={trainersList}
          onClose={() => {
            setCollectFeeModalOpen(false);
            setSelectedMember(null);
          }}
          onSave={async (updatedMember) => {
            setCollectFeeModalOpen(false);
            setSelectedMember(null);
            await loadData();
          }}
        />
      )}

      {/* PERSONAL TRAINING (PT) PACKAGE MODAL */}
      {ptModalOpen && ptModalMember && (
        <AddPtPackageModal
          member={ptModalMember}
          gymId={activeGymId}
          plans={plansList}
          trainers={trainersList}
          existingMembers={membersList}
          onClose={() => {
            setPtModalOpen(false);
            setPtModalMember(null);
          }}
          onSave={async () => {
            setPtModalOpen(false);
            setPtModalMember(null);
            await loadData();
          }}
        />
      )}

      {/* ADD-ON SERVICES MODAL (LOCKER, SAUNA, DIET, ETC.) */}
      {serviceModalOpen && serviceModalMember && (
        <AddServiceModal
          isOpen={serviceModalOpen}
          member={serviceModalMember}
          gymId={activeGymId}
          plans={plansList}
          onClose={() => {
            setServiceModalOpen(false);
            setServiceModalMember(null);
          }}
          onSave={async () => {
            setServiceModalOpen(false);
            setServiceModalMember(null);
            await loadData();
          }}
        />
      )}

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
                Reason for Leaving
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

      {/* Official Fee Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          isOpen={Boolean(receiptPayment)}
          onClose={() => {
            setReceiptPayment(null);
            setReceiptMember(null);
          }}
          payment={receiptPayment}
          member={receiptMember}
        />
      )}

      {/* Reject Online UPI Request Modal */}
      {rejectModalOpen && requestToReject && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => {
            setRejectModalOpen(false);
            setRequestToReject(null);
          }}
          title="❌ Reject Online UPI Renewal Request"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <p className="font-extrabold text-sm">
                Reject request from {requestToReject.memberName}?
              </p>
              <p className="text-xs text-rose-700">
                Plan: {requestToReject.planName} • Amount: ₹{requestToReject.amount} • UTR: {requestToReject.utr}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase w-full">Quick Suggestions:</span>
              {[
                "Payment not received in bank account",
                "Invalid or fake 12-digit UTR number",
                "Transferred amount does not match plan price",
                "Duplicate request submitted"
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRejectReason(s)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRequestToReject(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition text-xs shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Screenshot Proof Modal */}
      {selectedProofImg && (
        <Modal
          isOpen={Boolean(selectedProofImg)}
          onClose={() => setSelectedProofImg(null)}
          title="📸 Member UPI Payment Screenshot Proof"
        >
          <div className="space-y-4">
            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={selectedProofImg}
                alt="Payment proof screenshot"
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedProofImg(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}