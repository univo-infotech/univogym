import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  UserPlus,
  Plus,
  Phone,
  CheckCircle,
  Clock,
  MessageCircle,
  Search,
  Calendar,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Tag,
  Dumbbell,
  Users,
  Eye,
  Edit3,
  Trash2,
  Zap,
  QrCode,
  Copy,
  Check,
  Share2,
  CalendarDays,
  Target,
  FileText
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { getVisits, addVisit, updateVisit, deleteVisit, convertVisitToMember } from "../../firebase/visits";
import { getPlans } from "../../firebase/plans";
import { getTrainers } from "../../firebase/trainers";
import { addMember, generateInviteToken } from "../../firebase/members";
import { addPayment } from "../../firebase/payments";
import { getGymSettings } from "../../utils/settings";
import { useAuth } from "../../contexts/AuthContext";

// Initial Mock Enquiries if database is pristine
const DEFAULT_VISITS = [
  {
    id: "v1",
    name: "Sunil Kapoor",
    phone: "9711002233",
    gender: "Male",
    interestedIn: "Weight Loss & Transformation",
    source: "Walk-in (Reception)",
    visitDate: "2026-09-11",
    demoDate: "2026-09-12",
    demoTime: "07:00 PM",
    budget: "Rs. 1,500 - 3,000",
    assignedTrainer: "Coach Amit",
    notes: "Has desk job, wants 10kg fat loss in 3 months. Came for trial workout.",
    followUpDate: "2026-09-13",
    status: "demo_done",
    createdAt: "2026-09-11T10:00:00Z"
  },
  {
    id: "v2",
    name: "Kavita Rao",
    phone: "9822334455",
    gender: "Female",
    interestedIn: "Personal Training & Diet",
    source: "Instagram Ad",
    visitDate: "2026-09-12",
    demoDate: "2026-09-13",
    demoTime: "06:30 AM",
    budget: "Rs. 3,000 - 6,000",
    assignedTrainer: "Coach Sneha",
    notes: "Interested in dedicated female trainer for strength training & nutrition plan.",
    followUpDate: "2026-09-14",
    status: "new",
    createdAt: "2026-09-12T11:30:00Z"
  },
  {
    id: "v3",
    name: "Deepak Choudhary",
    phone: "9911882233",
    gender: "Male",
    interestedIn: "Strength & Muscle Gain",
    source: "Member Referral (Lucky Kirar)",
    visitDate: "2026-09-09",
    demoDate: "2026-09-10",
    demoTime: "08:00 AM",
    budget: "Annual Membership",
    assignedTrainer: "Coach Rohan",
    notes: "Joined 1-year annual pass directly after demo workout.",
    followUpDate: "",
    status: "converted",
    createdAt: "2026-09-09T09:15:00Z"
  },
  {
    id: "v4",
    name: "Ritu Verma",
    phone: "9877001122",
    gender: "Female",
    interestedIn: "Cardio, Steam Bath & Zumba",
    source: "Walk-in (Reception)",
    visitDate: "2026-09-10",
    demoDate: "2026-09-11",
    demoTime: "05:30 PM",
    budget: "Quarterly",
    assignedTrainer: "Unassigned",
    notes: "Liked the gym hygiene and locker setup. Discussing with family.",
    followUpDate: "2026-09-15",
    status: "demo_done",
    createdAt: "2026-09-10T16:00:00Z"
  }
];

const TIMER_SECONDS = 600;

function fmtCountdown(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Visits() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";
  const settings = getGymSettings();

  const [visits, setVisits] = useState([]);
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);

  // Convert to Member Direct Modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedVisitForConvert, setSelectedVisitForConvert] = useState(null);
  const [convertForm, setConvertForm] = useState({
    planName: "3-Month Pro",
    durationMonths: 3,
    planPrice: 1499,
    paidAmount: 1499,
    dueAmount: 0,
    paymentMode: "Cash",
    assignedTrainer: "Unassigned",
    slot: "Morning (6:00 AM - 9:00 AM)",
    startDate: new Date().toISOString().split("T")[0]
  });

  // Invite Link & QR Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ name: "", phone: "", link: "", secondsLeft: TIMER_SECONDS, expired: false });
  const timerRef = useRef(null);

  // Form State for Add / Edit Walk-in Lead
  const [form, setForm] = useState({
    enquiryType: "visit", // "visit" | "demo"
    name: "",
    phone: "",
    gender: "Male",
    interestedIn: "Weight Loss & Transformation",
    source: "Walk-in (Reception)",
    visitDate: new Date().toISOString().split("T")[0],
    demoDate: new Date().toISOString().split("T")[0],
    demoTime: "07:00 PM",
    budget: "Rs. 1,000 - 3,000",
    assignedTrainer: "Unassigned",
    notes: "",
    followUpDate: "",
    status: "new"
  });

  // Load Firestore Data
  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [vSnap, pSnap, tSnap] = await Promise.all([
          getVisits(gymId),
          getPlans(gymId),
          getTrainers(gymId)
        ]);

        setVisits(vSnap || []);
        setPlans(pSnap || []);
        setTrainers(tSnap || []);
      } catch (err) {
        console.warn("Visits data fallback:", err);
        setVisits([]);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [gymId]);

  // Clean timer on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // --- ACTIONS: ADD / EDIT VISIT ---
  const handleOpenAddModal = (initialType = "visit") => {
    setEditingVisit(null);
    setForm({
      enquiryType: initialType, // "visit" | "demo"
      name: "",
      phone: "",
      gender: "Male",
      interestedIn: "Weight Loss & Transformation",
      source: "Walk-in (Reception)",
      visitDate: new Date().toISOString().split("T")[0],
      demoDate: new Date().toISOString().split("T")[0],
      demoTime: "07:00 PM",
      budget: "Rs. 1,000 - 3,000",
      assignedTrainer: "Unassigned",
      notes: "",
      followUpDate: "",
      status: initialType === "demo" ? "scheduled" : "new"
    });
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (visit) => {
    setEditingVisit(visit);
    setForm({
      enquiryType: visit.enquiryType || (visit.status === "scheduled" || visit.status === "demo_done" ? "demo" : "visit"),
      name: visit.name || "",
      phone: visit.phone || "",
      gender: visit.gender || "Male",
      interestedIn: visit.interestedIn || "Weight Loss & Transformation",
      source: visit.source || "Walk-in (Reception)",
      visitDate: visit.visitDate || new Date().toISOString().split("T")[0],
      demoDate: visit.demoDate || new Date().toISOString().split("T")[0],
      demoTime: visit.demoTime || "07:00 PM",
      budget: visit.budget || "",
      assignedTrainer: visit.assignedTrainer || "Unassigned",
      notes: visit.notes || "",
      followUpDate: visit.followUpDate || "",
      status: visit.status || "new"
    });
    setAddModalOpen(true);
  };

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    try {
      if (editingVisit) {
        await updateVisit(gymId, editingVisit.id, form);
        setVisits(visits.map((v) => (v.id === editingVisit.id ? { ...v, ...form } : v)));
        toast.success("Enquiry details updated!");
      } else {
        const newId = "v_" + Date.now();
        const payload = {
          ...form,
          id: newId,
          createdAt: new Date().toISOString()
        };
        await addVisit(gymId, payload);
        setVisits([payload, ...visits]);
        toast.success("Walk-in lead saved successfully!");
      }
      setAddModalOpen(false);
    } catch (err) {
      toast.error("Failed to save enquiry");
    }
  };

  const handleDeleteVisit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this visit record?")) return;
    try {
      await deleteVisit(gymId, id);
      setVisits(visits.filter((v) => v.id !== id));
      toast.success("Visit lead removed");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  // --- ACTIONS: CONVERT TO FULL MEMBER DIRECTLY ---
  const handleOpenConvertModal = (visit) => {
    setSelectedVisitForConvert(visit);
    setConvertForm({
      planName: "3-Month Pro Transformation",
      durationMonths: 3,
      planPrice: 1499,
      paidAmount: 1499,
      dueAmount: 0,
      paymentMode: "Cash",
      assignedTrainer: visit.assignedTrainer || "Unassigned",
      slot: "🌅 Morning (6:00 AM - 9:00 AM)",
      startDate: new Date().toISOString().split("T")[0]
    });
    setConvertModalOpen(true);
  };

  const handleConfirmConvert = async (e) => {
    e.preventDefault();
    if (!selectedVisitForConvert) return;

    const start = new Date(convertForm.startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(convertForm.durationMonths || 1));
    const expiryDate = end.toISOString().split("T")[0];

    const newMemberData = {
      name: selectedVisitForConvert.name,
      fullName: selectedVisitForConvert.name,
      phone: selectedVisitForConvert.phone,
      gender: selectedVisitForConvert.gender || "Male",
      planName: convertForm.planName,
      trainerName: convertForm.assignedTrainer || "Unassigned",
      preferredSlot: convertForm.slot,
      status: "active",
      source: `Converted from Visit (${selectedVisitForConvert.source || "Walk-in"})`,
      createdAt: new Date().toISOString(),
      joinDate: convertForm.startDate,
      expiryDate,
      registeredBy: "owner"
    };

    try {
      // 1. Add to Members collection
      const memDoc = await addMember(gymId, newMemberData);
      const memberId = memDoc?.id || "m_" + Date.now();

      // 2. Mark Visit as Converted
      await convertVisitToMember(gymId, selectedVisitForConvert.id, memberId);

      // 3. Record Initial Payment
      await addPayment({
        gymId,
        memberId,
        memberName: selectedVisitForConvert.name,
        phone: selectedVisitForConvert.phone,
        plan: convertForm.planName,
        planName: convertForm.planName,
        amount: Number(convertForm.planPrice),
        paidAmount: Number(convertForm.paidAmount),
        dueAmount: Math.max(0, Number(convertForm.planPrice) - Number(convertForm.paidAmount)),
        paymentMode: convertForm.paymentMode,
        date: convertForm.startDate,
        remarks: "Admission Fee converted from Walk-in Enquiry Demo",
        status: Number(convertForm.paidAmount) >= Number(convertForm.planPrice) ? "paid" : "partial"
      });

      // Update local visits state
      setVisits(
        visits.map((v) =>
          v.id === selectedVisitForConvert.id
            ? { ...v, status: "converted", convertedMemberId: memberId }
            : v
        )
      );

      toast.success(`🎉 ${selectedVisitForConvert.name} is now an Active Gym Member!`);
      setConvertModalOpen(false);
    } catch (err) {
      console.error("Convert error:", err);
      toast.error("Failed to convert lead to member");
    }
  };

  // --- ACTIONS: GENERATE 5-MIN INVITE LINK & QR CODE ---
  const handleOpenInviteModal = async (visit) => {
    clearInterval(timerRef.current);
    const cleanPhone = (visit.phone || "").replace(/\D/g, "");
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    try {
      const genLink = await generateInviteToken(gymId, {
        memberName: visit.name,
        phone: waPhone,
      });

      setInviteData({
        name: visit.name,
        phone: waPhone,
        link: genLink,
        secondsLeft: TIMER_SECONDS,
        expired: false
      });

      timerRef.current = setInterval(() => {
        setInviteData((prev) => {
          if (prev.secondsLeft <= 1) {
            clearInterval(timerRef.current);
            return { ...prev, secondsLeft: 0, expired: true };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);

      setInviteModalOpen(true);
    } catch (err) {
      toast.error("Failed to generate invite token");
    }
  };

  const handleCopyLink = () => {
    if (!inviteData.link) return;
    navigator.clipboard.writeText(inviteData.link);
    toast.success("Registration link copied to clipboard!");
  };

  const handleSendWhatsAppInvite = () => {
    const msg = encodeURIComponent(
      `💪 *Welcome to ${settings.gymName || "UNIVO GYM MANAGEMENT"}!*\n\nHi ${inviteData.name || "Athlete"},\nThank you for visiting us for trial workout!\n\nYou can complete your online membership registration, choose your workout slot, select your personal trainer, and sign your liability waiver using this direct link:\n\n🔗 ${inviteData.link}\n\n⚠️ *Important:* This secure VIP link expires in 10 minutes.\n\nLet's get stronger together! 🔥`
    );
    window.open(`https://wa.me/${inviteData.phone}?text=${msg}`, "_blank");
  };

  // WhatsApp Follow-up Chat
  const handleQuickWhatsAppChat = (vis) => {
    const rawNum = (vis.phone || "").replace(/\D/g, "");
    const waPhone = rawNum.length === 10 ? `91${rawNum}` : rawNum;
    const msg = encodeURIComponent(
      `Hi ${vis.name}! 👋\n\nThank you for visiting ${settings.gymName || "UNIVO GYM MANAGEMENT"}!\nHow was your trial session? We have special early-bird membership discounts running this week. Would you like us to reserve your workout batch?\n\nBest regards,\n${settings.gymName || "Gym Management"}`
    );
    window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank");
  };

  // Status Badge Helper
  const getStatusBadge = (status, enquiryType) => {
    switch (status) {
      case "converted":
        return {
          label: "CONVERTED TO MEMBER",
          class: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2
        };
      case "demo_done":
        return {
          label: "TRIAL WORKOUT COMPLETED",
          class: "bg-cyan-50 text-cyan-700 border-cyan-200",
          icon: Dumbbell
        };
      case "scheduled":
        return {
          label: "DEMO TRIAL SCHEDULED",
          class: "bg-teal-50 text-teal-700 border-teal-200",
          icon: Clock
        };
      case "lost":
        return {
          label: "NOT INTERESTED",
          class: "bg-slate-100 text-slate-500 border-slate-200",
          icon: AlertCircle
        };
      default:
        return enquiryType === "demo"
          ? {
              label: "TRIAL DEMO INQUIRY",
              class: "bg-teal-50 text-teal-700 border-teal-200",
              icon: Dumbbell
            }
          : {
              label: "WALK-IN VISIT ENQUIRY",
              class: "bg-amber-50 text-amber-700 border-amber-200",
              icon: Sparkles
            };
    }
  };

  // Filtered Results
  const filtered = visits.filter((v) => {
    const matchSearch =
      (v.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.phone || "").includes(search) ||
      (v.interestedIn || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchSource = sourceFilter === "all" || v.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  });

  // KPI Metrics
  const totalLeads = visits.length;
  const newCount = visits.filter((v) => v.status === "new").length;
  const demoDoneCount = visits.filter((v) => v.status === "demo_done").length;
  const convertedCount = visits.filter((v) => v.status === "converted").length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Visits & Demo Leads CRM
              </h1>
              <p className="text-slate-500 text-xs">
                Walk-in trials, demo scheduling, follow-ups & 1-click conversion to active members
              </p>
            </div>
          </div>
        </div>

        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAddModal}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 shrink-0"
        >
          Record Walk-in Lead
        </Button>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Enquiries Received</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalLeads} Leads</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{newCount} New Inquiries Pending Demo</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Trial / Demos Completed</p>
            <h3 className="text-2xl font-black text-cyan-600 mt-1">{demoDoneCount} Visitors</h3>
            <p className="text-[11px] text-cyan-700 font-bold mt-0.5">High Intent for Joining</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Dumbbell className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Converted Full Members</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{convertedCount} Enrolled</h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Active Paid Subscriptions</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Lead Conversion Rate</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">{conversionRate}%</h3>
            <p className="text-[11px] text-purple-700 font-bold mt-0.5">Walk-in to Member Success</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor name, phone, program..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Leads" },
            { id: "new", label: "New Inquiry" },
            { id: "demo_done", label: "Trial Completed" },
            { id: "converted", label: "Converted" },
            { id: "lost", label: "Dropped" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((vis) => {
          const badge = getStatusBadge(vis.status, vis.enquiryType);
          const BadgeIcon = badge.icon;

          return (
            <div
              key={vis.id}
              className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-4 hover:border-emerald-300 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Status & Date Bar */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border shadow-2xs flex items-center gap-1 ${badge.class}`}
                  >
                    <BadgeIcon className="w-3 h-3" /> {badge.label}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Visited: {vis.visitDate || "Today"}
                  </span>
                </div>

                {/* Lead Profile */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      {vis.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                      {vis.gender || "Athlete"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> {vis.phone}
                  </p>
                </div>

                {/* Program & Demo Info */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Interested In:</span>
                    <span className="font-bold text-emerald-700">{vis.interestedIn}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Trial / Demo:</span>
                    <span className="font-bold text-slate-800">
                      {vis.demoDate} {vis.demoTime ? `(${vis.demoTime})` : ""}
                    </span>
                  </div>
                  {vis.assignedTrainer && vis.assignedTrainer !== "Unassigned" && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Assigned Coach:</span>
                      <span className="font-bold text-teal-700">{vis.assignedTrainer}</span>
                    </div>
                  )}
                  {vis.source && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-400">Lead Source:</span>
                      <span className="font-semibold text-slate-600">{vis.source}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {vis.notes && (
                  <p className="text-xs text-slate-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 italic leading-relaxed">
                    "{vis.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons: 1-Click Convert, WhatsApp, Link */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {/* IF NOT CONVERTED -> SHOW CONVERT BUTTON */}
                {vis.status !== "converted" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenConvertModal(vis)}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Add as Member</span>
                    </button>

                    <button
                      onClick={() => handleOpenInviteModal(vis)}
                      className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>QR & Link</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-xs font-black text-emerald-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Member Enrolled & Active
                    </span>
                  </div>
                )}

                {/* Secondary Row: WhatsApp Follow-up & Edit */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={() => handleQuickWhatsAppChat(vis)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Follow-up
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(vis)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                      title="Edit Enquiry"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVisit(vis.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* -------------------- MODAL: RECORD / EDIT WALK-IN ENQUIRY --------------- */}
      {/* ========================================================================= */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={
          editingVisit
            ? `✏️ Edit ${form.enquiryType === "demo" ? "Trial Demo" : "Walk-in Visit"}`
            : form.enquiryType === "demo"
            ? "🏋️‍♂️ Book Trial / Demo Session"
            : "🚶 Record Walk-in Enquiry"
        }
      >
        <form onSubmit={handleSaveVisit} className="space-y-4 text-slate-800">
          {/* TAB SWITCHER: 1. VISIT ENQUIRY  vs  2. TRIAL DEMO */}
          <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1.5 border border-slate-200">
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  enquiryType: "visit",
                  status: prev.status === "scheduled" ? "new" : prev.status
                }))
              }
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                form.enquiryType === "visit"
                  ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>Walk-in Visit / Enquiry</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  enquiryType: "demo",
                  status: prev.status === "new" ? "scheduled" : prev.status
                }))
              }
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                form.enquiryType === "demo"
                  ? "bg-white text-teal-700 shadow-sm border border-teal-100"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>Free Trial / Workout Demo</span>
            </button>
          </div>

          {/* Prompt banner explaining the selected mode */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
              form.enquiryType === "demo"
                ? "bg-teal-50 text-teal-900 border-teal-200"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"
            }`}
          >
            {form.enquiryType === "demo" ? (
              <>
                <Dumbbell className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Trial Demo Mode:</strong> Schedule date, preferred time slot and assign a coach for trial workout.
                </span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Walk-in Visit Mode:</strong> General enquiry for gym fees, membership plans, and facilities tour.
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Visitor Full Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Sunil Kapoor"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">WhatsApp Phone Number *</label>
              <input
                required
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Lead Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              >
                <option>Walk-in (Reception)</option>
                <option>Instagram / Social Ad</option>
                <option>Google Maps / Search</option>
                <option>Member Referral</option>
                <option>Flyer / Billboard</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Current Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
              >
                <option value="new">New Inquiry</option>
                <option value="scheduled">Demo Scheduled</option>
                <option value="demo_done">Trial Completed</option>
                <option value="converted">Converted</option>
                <option value="lost">Not Interested</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Interested Fitness Goal / Program *</label>
            <input
              required
              type="text"
              placeholder="e.g. Weight Loss, Muscle Gain, Personal Training, CrossFit..."
              value={form.interestedIn}
              onChange={(e) => setForm({ ...form, interestedIn: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          {/* Conditional Demo / Trial Scheduling Section */}
          <div
            className={`p-3.5 rounded-2xl border space-y-3 transition ${
              form.enquiryType === "demo"
                ? "bg-teal-50/70 border-teal-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                {form.enquiryType === "demo" ? "Trial Workout Session Details" : "Visit Date & Optional Demo"}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {form.enquiryType === "demo" ? "Active Demo Booking" : "Optional"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  {form.enquiryType === "demo" ? "Trial / Demo Date *" : "Visit Date"}
                </label>
                <input
                  type="date"
                  value={form.enquiryType === "demo" ? form.demoDate : form.visitDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      demoDate: e.target.value,
                      visitDate: e.target.value
                    })
                  }
                  className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  {form.enquiryType === "demo" ? "Preferred Demo Time *" : "Visit Time Slot"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 07:00 PM"
                  value={form.demoTime}
                  onChange={(e) => setForm({ ...form, demoTime: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Assigned Coach / Trainer</label>
                <select
                  value={form.assignedTrainer}
                  onChange={(e) => setForm({ ...form, assignedTrainer: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option>Unassigned</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.name || t.fullName}>
                      {t.name || t.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Discussion Notes & Requirements</label>
            <textarea
              rows={2}
              placeholder="e.g. Looking for evening batch, interested in nutrition plan, trial workout feedback..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-md shadow-emerald-500/20 transition active:scale-98"
          >
            {editingVisit
              ? "Update Enquiry Details"
              : form.enquiryType === "demo"
              ? "Confirm & Schedule Trial Demo Session ✨"
              : "Save Walk-in Lead 🚶"}
          </button>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* -------------------- MODAL: DIRECT CONVERT TO MEMBER -------------------- */}
      {/* ========================================================================= */}
      <Modal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        title="⚡ Convert Walk-in Visitor to Full Member"
      >
        {selectedVisitForConvert && (
          <form onSubmit={handleConfirmConvert} className="space-y-4 text-slate-800">
            {/* Summary of Lead */}
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Converting Lead:
                </span>
                <h4 className="text-sm font-black text-slate-900">{selectedVisitForConvert.name}</h4>
                <p className="text-xs text-slate-600">
                  Phone: {selectedVisitForConvert.phone} • Goal: {selectedVisitForConvert.interestedIn}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                1-Click Enroll
              </span>
            </div>

            {/* Plan Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Choose Membership Plan *</label>
                <select
                  value={convertForm.planName}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    let price = 1499;
                    let months = 3;
                    if (chosen.includes("1 Month")) {
                      price = 599;
                      months = 1;
                    } else if (chosen.includes("3 Month")) {
                      price = 1499;
                      months = 3;
                    } else if (chosen.includes("6 Month")) {
                      price = 2799;
                      months = 6;
                    } else if (chosen.includes("12 Month") || chosen.includes("Annual")) {
                      price = 4999;
                      months = 12;
                    }
                    setConvertForm({
                      ...convertForm,
                      planName: chosen,
                      planPrice: price,
                      paidAmount: price,
                      durationMonths: months
                    });
                  }}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none"
                >
                  <option value="1 Month Standard (Rs. 599)">1 Month Standard (Rs. 599)</option>
                  <option value="1 Month + Locker (Rs. 699)">1 Month + Locker (Rs. 699)</option>
                  <option value="3-Month Pro Transformation (Rs. 1,499)">3-Month Pro Transformation (Rs. 1,499)</option>
                  <option value="6-Month Fitness Pass (Rs. 2,799)">6-Month Fitness Pass (Rs. 2,799)</option>
                  <option value="12-Month Annual Elite (Rs. 4,999)">12-Month Annual Elite (Rs. 4,999)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Preferred Workout Batch</label>
                <select
                  value={convertForm.slot}
                  onChange={(e) => setConvertForm({ ...convertForm, slot: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  <option>🌅 Morning (6:00 AM - 9:00 AM)</option>
                  <option>☀️ Afternoon (12:00 PM - 3:00 PM)</option>
                  <option>🌇 Evening (4:00 PM - 7:00 PM)</option>
                  <option>🌙 Night (7:00 PM - 10:00 PM)</option>
                </select>
              </div>
            </div>

            {/* Financial Admission Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Total Plan Fee (Rs.)</label>
                <input
                  required
                  type="number"
                  value={convertForm.planPrice}
                  onChange={(e) => setConvertForm({ ...convertForm, planPrice: Number(e.target.value) })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-emerald-800">Amount Paid Now (Rs.) *</label>
                <input
                  required
                  type="number"
                  value={convertForm.paidAmount}
                  onChange={(e) => setConvertForm({ ...convertForm, paidAmount: Number(e.target.value) })}
                  className="w-full mt-1 bg-white border-2 border-emerald-500 rounded-xl px-3 py-2 text-xs font-black text-emerald-700"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Payment Mode</label>
                <select
                  value={convertForm.paymentMode}
                  onChange={(e) => setConvertForm({ ...convertForm, paymentMode: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                >
                  <option>Cash</option>
                  <option>Online / UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* Trainer & Start Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Assigned Personal Trainer</label>
                <select
                  value={convertForm.assignedTrainer}
                  onChange={(e) => setConvertForm({ ...convertForm, assignedTrainer: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                >
                  <option>Unassigned</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.name || t.fullName}>
                      {t.name || t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Membership Start Date</label>
                <input
                  type="date"
                  value={convertForm.startDate}
                  onChange={(e) => setConvertForm({ ...convertForm, startDate: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm Admission & Create Member Profile</span>
            </button>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* -------------------- MODAL: 10-MIN INVITE LINK & QR CODE ---------------- */}
      {/* ========================================================================= */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          clearInterval(timerRef.current);
          setInviteModalOpen(false);
        }}
        title="📲 Self-Registration 10-Minute Link & QR Code"
      >
        <div className="space-y-4 text-slate-800">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed">
            Send this link on WhatsApp or let <strong>{inviteData.name}</strong> scan this QR code directly at reception. They will choose their plan, trainer, and sign the waiver on their mobile!
          </div>

          {/* Countdown Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" /> Link Security Expiry:
            </span>
            <span
              className={`font-mono text-xs font-black px-3 py-1 rounded-full ${
                inviteData.expired ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {inviteData.expired ? "EXPIRED" : fmtCountdown(inviteData.secondsLeft)}
            </span>
          </div>

          {/* QR Code Center Box */}
          <div className="flex flex-col items-center justify-center p-5 bg-white border-2 border-dashed border-emerald-200 rounded-3xl">
            <QRCodeSVG value={inviteData.link || "https://univo.app"} size={160} level="M" />
            <span className="text-[11px] font-extrabold text-slate-600 mt-2">
              Scan with Phone Camera to Register Instantly
            </span>
          </div>

          {/* Link Box & Copy */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteData.link}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>

          {/* Send via WhatsApp Button */}
          <button
            onClick={handleSendWhatsAppInvite}
            className="w-full py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <MessageCircle className="w-4 h-4" /> Send Invite on WhatsApp (+{inviteData.phone})
          </button>
        </div>
      </Modal>
    </div>
  );
}