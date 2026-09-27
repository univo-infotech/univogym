import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Megaphone,
  Send,
  MessageSquare,
  Sparkles,
  Tag,
  Percent,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Upload,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Layers,
  ArrowRight,
  RefreshCw,
  Gift,
  Flame,
  Award,
  ShieldCheck,
  X,
  Play,
  Share2,
  Paperclip
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { getMembers } from "../../firebase/members";
import { getVisits } from "../../firebase/visits";
import { getPlans } from "../../firebase/plans";
import {
  getOffers,
  addOffer,
  updateOffer,
  deleteOffer,
  getBroadcastLogs,
  addBroadcastLog
} from "../../firebase/offers";
import { getGymSettings } from "../../utils/settings";
import { openWhatsApp, formatPhone } from "../../utils/whatsapp";
import { formatDate } from "../../utils/dateUtils";
import toast from "react-hot-toast";

// --- PRESET TEMPLATES -----------------------------------------------
const PRESET_TEMPLATES = [
  {
    id: "festival_sale",
    name: "🎉 Festival / Seasonal Flash Discount",
    category: "Promo",
    text: `🔥 *SPECIAL FESTIVAL DISCOUNT - {gym_name}!* 🔥\n\nHi {name},\nCelebrate your fitness journey with our exclusive seasonal offer! 🏋️‍♂️✨\n\n🎁 *Offer:* {discount}\n🎟️ *Promo Code:* {offer_code}\n📅 *Valid Till:* End of this month\n\nClaim at the gym reception or reply *YES* to lock in your discounted membership fee today! 💪`
  },
  {
    id: "winback_expired",
    name: "👋 Win-Back Expired Members (We Miss You!)",
    category: "Win-back",
    text: `👋 *We Miss You at {gym_name}!* 💪\n\nHi {name},\nYour consistency and workout energy were unmatched! We would love to have you back on the floor.\n\n✨ As a valued past member, renew this week and receive:\n• *{discount}*\n• *Zero Re-Admission Fee*\n• *Free Body Composition / Diet Audit*\n\nReply to this message or visit reception to restart your fitness streak today! 🔥`
  },
  {
    id: "upgrade_annual",
    name: "⭐ Annual Membership Upgrade Privilege",
    category: "Upgrade",
    text: `⭐ *EXCLUSIVE MEMBERSHIP UPGRADE - {gym_name}* ⭐\n\nHi {name},\nUpgrade your active gym plan to our *Annual VIP Pass* today and unlock:\n\n💎 *Special Upgrade Price:* {discount}\n🎁 *Perks:* Free Locker + 30 Days Membership Freeze\n🎟️ *Promo Code:* {offer_code}\n\nTrain year-round with zero interruption! Talk to front desk today to upgrade. 🏋️‍♂️`
  },
  {
    id: "buddy_referral",
    name: "🤝 Bring a Buddy / Referral Offer",
    category: "Referral",
    text: `🤝 *BRING A WORKOUT BUDDY & SAVE - {gym_name}!*\n\nHi {name},\nWorking out is 10x more fun with a friend! Bring a partner, colleague, or gym bro to join this month:\n\n💥 *Your Friend gets:* {discount}\n🎁 *You receive:* 1 Extra Month Added to your membership for FREE!\n\nShare this message with your workout partner and visit the reception together! 🔥💪`
  },
  {
    id: "renewal_prompt",
    name: "⏳ Upcoming Expiry Renewal Deal",
    category: "Renewal",
    text: `⚠️ *EARLY RENEWAL REWARD - {gym_name}*\n\nHi {name},\nYour current membership is expiring on *{expiry}*.\n\nRenew before your expiry date to lock in *{discount}* on your next package renewal! Maintain your workout streak and save big.\n\nSee you at the gym! 💪🔥`
  }
];

export default function Offers() {
  const { gymId } = useAuth();
  const currentGymId = gymId || "univo_main";
  const settings = getGymSettings();

  // Navigation Tabs: "broadcast" | "offers" | "history"
  const [activeTab, setActiveTab] = useState("broadcast");

  // Core Data
  const [members, setMembers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [plans, setPlans] = useState([]);
  const [offersList, setOffersList] = useState([]);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Broadcast Composer State
  const [targetAudience, setTargetAudience] = useState("active"); // "active" | "expiring" | "expired" | "leads" | "plan" | "custom"
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [customSelectedIds, setCustomSelectedIds] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState(PRESET_TEMPLATES[0].text);
  const [selectedPromoCode, setSelectedPromoCode] = useState("FESTIVAL25");
  const [selectedDiscountText, setSelectedDiscountText] = useState("25% FLAT OFF");

  // Media Attachments
  const [attachedImage, setAttachedImage] = useState(null); // { dataUrl, name, size }
  const [attachedPdf, setAttachedPdf] = useState(null); // { dataUrl, name, size }
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const [copiedImage, setCopiedImage] = useState(false);

  // Batch Dispatcher Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [sentRecipientIds, setSentRecipientIds] = useState(new Set());
  const [isAutoSending, setIsAutoSending] = useState(false);

  // Create / Edit Offer Modal
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [offerForm, setOfferForm] = useState({
    title: "",
    discountType: "percentage",
    discountValue: 20,
    discountBadge: "20% FLAT OFF",
    promoCode: "SUMMER20",
    planTarget: "All Membership Plans",
    validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    description: "",
    bannerUrl: "",
    isActive: true,
    terms: "Applicable on renewals and new registrations.\nValid for one-time use per member."
  });

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, visitsData, plansData, offersData, logsData] = await Promise.all([
        getMembers(currentGymId),
        getVisits(currentGymId),
        getPlans(currentGymId),
        getOffers(currentGymId),
        getBroadcastLogs(currentGymId)
      ]);

      setMembers(membersData || []);
      setVisits(visitsData || []);
      setPlans(plansData || []);
      setOffersList(offersData || []);
      setBroadcastLogs(logsData || []);
    } catch (err) {
      console.error("Error loading offers data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentGymId]);

  // Target Recipients Filtering
  const targetRecipients = useMemo(() => {
    const today = new Date();
    const next14Days = new Date();
    next14Days.setDate(today.getDate() + 14);

    if (targetAudience === "active") {
      return members.filter(m => m.status === "active" && m.phone);
    }

    if (targetAudience === "expiring") {
      return members.filter(m => {
        if (!m.phone || !m.endDate) return false;
        const exp = new Date(m.endDate);
        return exp >= today && exp <= next14Days;
      });
    }

    if (targetAudience === "expired") {
      return members.filter(m => {
        if (!m.phone) return false;
        if (m.status === "expired") return true;
        if (m.endDate && new Date(m.endDate) < today) return true;
        return false;
      });
    }

    if (targetAudience === "leads") {
      return visits.filter(v => v.phone).map(v => ({
        id: v.id,
        name: v.name,
        phone: v.phone,
        planName: v.planName || "Trial / Demo",
        status: "Lead"
      }));
    }

    if (targetAudience === "plan") {
      if (!selectedPlanId) return members.filter(m => m.phone);
      return members.filter(m => (m.planId === selectedPlanId || m.planName === selectedPlanId) && m.phone);
    }

    if (targetAudience === "custom") {
      return members.filter(m => customSelectedIds.includes(m.id) && m.phone);
    }

    return members.filter(m => m.phone);
  }, [members, visits, targetAudience, selectedPlanId, customSelectedIds]);

  // Sample Member for Preview
  const sampleMember = useMemo(() => {
    if (targetRecipients.length > 0) return targetRecipients[0];
    return {
      name: "Rahul Sharma",
      phone: "9876543210",
      planName: "Annual Gold Membership",
      endDate: "2026-10-15"
    };
  }, [targetRecipients]);

  // Format Dynamic Message for a Specific Member
  const getPersonalizedMessage = (member) => {
    const gymName = settings.gymName || "UNIVO GYM MANAGEMENT";
    return broadcastMessage
      .replace(/{name}/g, member?.name || "Athlete")
      .replace(/{gym_name}/g, gymName)
      .replace(/{plan}/g, member?.planName || "Gym Plan")
      .replace(/{expiry}/g, member?.endDate ? formatDate(member.endDate) : "End of month")
      .replace(/{offer_code}/g, selectedPromoCode || "UNIVOVIP")
      .replace(/{discount}/g, selectedDiscountText || "Special Discount");
  };

  // Insert Variable Chip at cursor
  const handleInsertTag = (tag) => {
    setBroadcastMessage(prev => prev + " " + tag);
    toast.success(`Inserted ${tag}`);
  };

  // Image File Upload Handler
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image file size must be less than 4 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        dataUrl: reader.result,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB"
      });
      toast.success("Flyer image attached!");
    };
    reader.readAsDataURL(file);
  };

  // PDF File Upload Handler
  const handlePdfUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("PDF file size must be less than 8 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPdf({
        dataUrl: reader.result,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB"
      });
      toast.success("PDF document attached!");
    };
    reader.readAsDataURL(file);
  };

  // Copy Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    if (!attachedImage) return;
    try {
      // Fetch dataUrl blob
      const res = await fetch(attachedImage.dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopiedImage(true);
      toast.success("Flyer copied to clipboard! Press Ctrl+V inside WhatsApp Web chat.");
      setTimeout(() => setCopiedImage(false), 3000);
    } catch (err) {
      console.warn("Clipboard write error:", err);
      // Fallback
      toast.success("Flyer ready! Right click image and click 'Copy image'");
    }
  };

  // Open Direct WhatsApp for Single Member
  const handleSendSingle = (member) => {
    const personalizedText = getPersonalizedMessage(member);
    openWhatsApp(member.phone, personalizedText);
    toast.success(`Opening WhatsApp for ${member.name}`);
  };

  // Start Batch Broadcaster
  const handleStartBatchBroadcast = () => {
    if (targetRecipients.length === 0) {
      toast.error("No recipients found in selected audience group!");
      return;
    }
    setCurrentBatchIndex(0);
    setSentRecipientIds(new Set());
    setBatchModalOpen(true);
  };

  // Send to Next In Queue
  const handleDispatchNext = () => {
    if (currentBatchIndex >= targetRecipients.length) {
      toast.success("All members in this queue have been reached!");
      setBatchModalOpen(false);
      // Log broadcast to firestore
      addBroadcastLog(currentGymId, {
        campaignName: selectedPromoCode || "Special Offer Broadcast",
        targetGroup: targetAudience,
        totalRecipients: targetRecipients.length,
        hasImage: !!attachedImage,
        hasPdf: !!attachedPdf,
        sentCount: sentRecipientIds.size + 1
      });
      return;
    }

    const currentMember = targetRecipients[currentBatchIndex];
    handleSendSingle(currentMember);

    setSentRecipientIds(prev => new Set(prev).add(currentMember.id));
    setCurrentBatchIndex(prev => prev + 1);
  };

  // Copy All Phone Numbers for Mobile WA Broadcast List
  const handleCopyAllPhoneNumbers = () => {
    const numbers = targetRecipients
      .map(m => formatPhone(m.phone))
      .filter(Boolean)
      .join(", ");
    navigator.clipboard.writeText(numbers);
    toast.success(`Copied ${targetRecipients.length} numbers for WhatsApp Broadcast List!`);
  };

  // Pre-load an Offer into Broadcaster
  const handleBroadcastOffer = (offer) => {
    setSelectedPromoCode(offer.promoCode || "OFFER");
    setSelectedDiscountText(offer.discountBadge || `${offer.discountValue}% OFF`);
    if (offer.bannerUrl) {
      setAttachedImage({ dataUrl: offer.bannerUrl, name: `${offer.title}-flyer.jpg`, size: "Web Flyer" });
    }
    setBroadcastMessage(
      `🔥 *${offer.title.toUpperCase()} - {gym_name}!* 🔥\n\n` +
      `Hi {name},\nWe have an exclusive limited-time fitness offer just for you!\n\n` +
      `🎁 *Deal:* ${offer.discountBadge || offer.discountValue}\n` +
      `🎟️ *Voucher Code:* ${offer.promoCode || "UNIVO"}\n` +
      `🎯 *Valid For:* ${offer.planTarget || "Selected Plans"}\n` +
      `📅 *Offer Expires:* ${formatDate(offer.validTill)}\n\n` +
      `📝 *Details:*\n${offer.description}\n\n` +
      `Reply *YES* to claim or visit gym reception before offer expires! 💪`
    );
    setActiveTab("broadcast");
    toast.success(`Offer "${offer.title}" loaded into WhatsApp Broadcaster!`);
  };

  // Save / Edit Offer
  const handleSaveOffer = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...offerForm,
        discountValue: Number(offerForm.discountValue) || 0,
        terms: typeof offerForm.terms === "string" ? offerForm.terms.split("\n").filter(Boolean) : offerForm.terms
      };

      if (editingOfferId) {
        await updateOffer(currentGymId, editingOfferId, payload);
        toast.success("Offer updated successfully!");
      } else {
        await addOffer(currentGymId, payload);
        toast.success("New promotional offer created!");
      }

      setOfferModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed to save offer: " + err.message);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm("Are you sure you want to remove this promotional offer?")) return;
    try {
      await deleteOffer(currentGymId, offerId);
      toast.success("Offer deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to delete offer");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Offers & WhatsApp Broadcast
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Send marketing promotions, festival discounts & win-back messages directly on WhatsApp in one click
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingOfferId(null);
              setOfferForm({
                title: "",
                discountType: "percentage",
                discountValue: 20,
                discountBadge: "20% FLAT OFF",
                promoCode: "PROMO20",
                planTarget: "All Plans",
                validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                description: "",
                bannerUrl: "",
                isActive: true,
                terms: "Applicable on renewals and new registrations.\nValid for one-time use per member."
              });
              setOfferModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Create Offer</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("broadcast");
              handleStartBatchBroadcast();
            }}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Broadcast Now</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          QUICK KPI STATS ROW (4 CARDS)
      ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Reachable</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {members.filter(m => m.phone).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">With verified WhatsApp</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Members</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-teal-700 mt-1">
            {members.filter(m => m.status === "active").length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready for upgrades</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Lapsed / Expired</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {members.filter(m => m.status === "expired" || (m.endDate && new Date(m.endDate) < new Date())).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Win-back opportunities</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Live Offers</span>
            <Tag className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {offersList.filter(o => o.isActive !== false).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Active promotions running</p>
        </div>
      </div>

      {/* ============================================================
          MASTER TAB SWITCHER
      ============================================================ */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("broadcast")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "broadcast"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>WhatsApp Broadcaster</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
            {targetRecipients.length} Targets
          </span>
        </button>

        <button
          onClick={() => setActiveTab("offers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "offers"
              ? "bg-white text-purple-800 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Tag className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Active Offers & Deals</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
            {offersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "history"
              ? "bg-white text-slate-800 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Layers className="w-4 h-4 text-slate-600 shrink-0" />
          <span>Broadcast History</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200/80 text-slate-700">
            {broadcastLogs.length}
          </span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: WHATSAPP BROADCASTER
      ============================================================ */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Audience & Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Target Audience Selection */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>1. Choose Target Audience</span>
                </h3>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {targetRecipients.length} Members Selected
                </span>
              </div>

              {/* Audience Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "active", label: "Active Members", count: members.filter(m => m.status === "active").length },
                  { id: "expiring", label: "Expiring Soon (14d)", count: members.filter(m => {
                    if (!m.endDate) return false;
                    const d = new Date(m.endDate);
                    const now = new Date();
                    const lim = new Date(); lim.setDate(now.getDate() + 14);
                    return d >= now && d <= lim;
                  }).length },
                  { id: "expired", label: "Expired / Lapsed", count: members.filter(m => m.status === "expired" || (m.endDate && new Date(m.endDate) < new Date())).length },
                  { id: "leads", label: "Trial & Walk-in Leads", count: visits.length },
                  { id: "plan", label: "Filter by Plan", count: plans.length + " Plans" },
                  { id: "custom", label: "Custom Selection", count: customSelectedIds.length + " Picked" }
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setTargetAudience(aud.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      targetAudience === aud.id
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight">{aud.label}</span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-1">({aud.count})</span>
                  </button>
                ))}
              </div>

              {/* Specific Plan Selector */}
              {targetAudience === "plan" && (
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-700">Select Membership Plan:</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All Plans (All Members)</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.category || "Plan"})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Multi-Select List */}
              {targetAudience === "custom" && (
                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search member name or phone..."
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomSelectedIds(members.filter(m => m.phone).map(m => m.id))}
                      className="text-[11px] font-bold text-emerald-700 hover:underline px-2"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomSelectedIds([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline px-2"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {members
                      .filter(m => m.phone && (
                        (m.name || "").toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                        (m.phone || "").includes(memberSearchTerm)
                      ))
                      .slice(0, 50)
                      .map(m => {
                        const checked = customSelectedIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (checked) {
                                setCustomSelectedIds(prev => prev.filter(id => id !== m.id));
                              } else {
                                setCustomSelectedIds(prev => [...prev, m.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                              checked ? "bg-emerald-100/70 border border-emerald-300 font-bold" : "bg-white hover:bg-slate-100 border border-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                className="w-3.5 h-3.5 text-emerald-600 rounded"
                              />
                              <span className="text-slate-900">{m.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">{m.phone}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Message Composer & Variable Chips */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>2. Craft WhatsApp Message</span>
                </h3>

                {/* Template Selector Dropdown */}
                <select
                  onChange={(e) => {
                    const found = PRESET_TEMPLATES.find(t => t.id === e.target.value);
                    if (found) {
                      setBroadcastMessage(found.text);
                      toast.success(`Template loaded: ${found.name}`);
                    }
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">⚡ Load Ready-Made Template...</option>
                  {PRESET_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Personalization Variable Chips */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Click to insert personal tags (auto-replaces per member):
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { tag: "{name}", desc: "Member's Name" },
                    { tag: "{gym_name}", desc: "Gym Name" },
                    { tag: "{plan}", desc: "Current Plan" },
                    { tag: "{expiry}", desc: "Expiry Date" },
                    { tag: "{discount}", desc: "Discount Amount" },
                    { tag: "{offer_code}", desc: "Voucher Code" }
                  ].map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold transition cursor-pointer"
                      title={v.desc}
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div>
                <textarea
                  rows={8}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your WhatsApp message with emojis, offer details, and personal chips..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 font-mono leading-relaxed focus:bg-white focus:outline-none focus:border-emerald-500 shadow-inner"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
                  <span>Formatting: *bold*, _italic_, ~strikethrough~</span>
                  <span>{broadcastMessage.length} characters</span>
                </div>
              </div>

              {/* Quick Values Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Promo Code Tag Value</label>
                  <input
                    type="text"
                    value={selectedPromoCode}
                    onChange={(e) => setSelectedPromoCode(e.target.value)}
                    placeholder="e.g. DIWALI25"
                    className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-indigo-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Discount Tag Value</label>
                  <input
                    type="text"
                    value={selectedDiscountText}
                    onChange={(e) => setSelectedDiscountText(e.target.value)}
                    placeholder="e.g. 25% FLAT OFF"
                    className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Media Attachments (Image & PDF) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  <span>3. Attach Promotional Flyer & PDF</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 3A. Image Flyer Upload */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-600" /> Offer Flyer (Image)
                    </span>
                    {attachedImage && (
                      <button
                        type="button"
                        onClick={() => setAttachedImage(null)}
                        className="text-rose-500 hover:text-rose-700 text-xs"
                        title="Remove flyer"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {attachedImage ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <img
                        src={attachedImage.dataUrl}
                        alt="Flyer Preview"
                        className="w-full h-28 object-cover"
                      />
                      <div className="p-2 bg-slate-900/90 text-white text-[10px] flex items-center justify-between">
                        <span className="truncate max-w-[140px]">{attachedImage.name}</span>
                        <button
                          type="button"
                          onClick={handleCopyImageToClipboard}
                          className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> {copiedImage ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition hover:bg-indigo-50/20"
                    >
                      <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-700">Upload Promo Banner</p>
                      <p className="text-[10px] text-slate-400">JPG, PNG or WEBP (Max 4MB)</p>
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* 3B. PDF Document Upload */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" /> Brochure / Terms (PDF)
                    </span>
                    {attachedPdf && (
                      <button
                        type="button"
                        onClick={() => setAttachedPdf(null)}
                        className="text-rose-500 hover:text-rose-700 text-xs"
                        title="Remove PDF"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {attachedPdf ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">{attachedPdf.name}</p>
                          <p className="text-[10px] text-slate-400">{attachedPdf.size}</p>
                        </div>
                      </div>
                      <a
                        href={attachedPdf.dataUrl}
                        download={attachedPdf.name}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold shrink-0"
                      >
                        View
                      </a>
                    </div>
                  ) : (
                    <div
                      onClick={() => pdfInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-4 text-center cursor-pointer transition hover:bg-amber-50/20"
                    >
                      <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-700">Attach PDF Document</p>
                      <p className="text-[10px] text-slate-400">Gym Brochure, Rate Card (Max 8MB)</p>
                    </div>
                  )}

                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* 4. Action Buttons Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleStartBatchBroadcast}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-500 hover:to-indigo-600 text-white font-black text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition cursor-pointer active:scale-98"
              >
                <Send className="w-5 h-5" />
                <span>Start 1-Click WhatsApp Broadcast ({targetRecipients.length})</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllPhoneNumbers}
                className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                title="Copy comma-separated phone numbers for WhatsApp Mobile App Broadcast List"
              >
                <Copy className="w-4 h-4 text-emerald-600" />
                <span>Copy All Numbers</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live WhatsApp Mobile Screen Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" /> Live WhatsApp Chat Preview
                </span>
                <span className="text-[11px] font-bold text-slate-400">Sample: {sampleMember.name}</span>
              </div>

              {/* Realistic Mobile Device Frame */}
              <div className="rounded-3xl border-4 border-slate-800 bg-[#e5ddd5] shadow-2xl overflow-hidden relative">
                {/* WhatsApp Chat Header */}
                <div className="bg-[#075e54] text-white px-3.5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                      {sampleMember.name?.charAt(0) || "M"}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight">{sampleMember.name}</h4>
                      <p className="text-[9px] text-emerald-200">Online • Univo Gym Member</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-200 font-mono">📱 WhatsApp</span>
                </div>

                {/* WhatsApp Chat Body */}
                <div
                  className="p-3.5 space-y-2.5 min-h-[380px] max-h-[460px] overflow-y-auto"
                  style={{
                    backgroundImage: "radial-gradient(#00000008 1px, transparent 1px)",
                    backgroundSize: "16px 16px"
                  }}
                >
                  {/* Date Bubble */}
                  <div className="flex justify-center">
                    <span className="bg-white/80 backdrop-blur-xs text-[10px] font-bold text-slate-500 px-3 py-0.5 rounded-full shadow-2xs">
                      TODAY
                    </span>
                  </div>

                  {/* Message Bubble (Outgoing from Gym) */}
                  <div className="max-w-[92%] ml-auto bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-tr-xs p-3 shadow-xs space-y-2">
                    {/* Flyer Attachment Preview */}
                    {attachedImage && (
                      <div className="rounded-xl overflow-hidden border border-emerald-600/20 bg-white">
                        <img
                          src={attachedImage.dataUrl}
                          alt="Flyer"
                          className="w-full max-h-36 object-cover"
                        />
                        <div className="p-1.5 bg-emerald-950/10 text-[10px] font-bold text-emerald-900 flex items-center justify-between">
                          <span>🖼️ {attachedImage.name}</span>
                          <span className="text-[9px] opacity-75">{attachedImage.size}</span>
                        </div>
                      </div>
                    )}

                    {/* PDF Attachment Preview */}
                    {attachedPdf && (
                      <div className="rounded-xl p-2 bg-white/90 border border-emerald-600/30 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-black text-[10px] shrink-0">
                          PDF
                        </div>
                        <div className="truncate text-left flex-1">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{attachedPdf.name}</p>
                          <p className="text-[9px] text-slate-400">{attachedPdf.size}</p>
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {getPersonalizedMessage(sampleMember)}
                    </div>

                    {/* Timestamp */}
                    <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400 pt-0.5">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-emerald-600 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Footer Mockup */}
                <div className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-slate-400 border border-slate-200">
                    Message sent via Univo Broadcaster
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendSingle(sampleMember)}
                    className="w-8 h-8 rounded-full bg-[#128c7e] text-white flex items-center justify-center shadow-xs cursor-pointer hover:bg-[#075e54] transition"
                    title="Test send to this member"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Helper tip */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-[11px] text-emerald-900 mt-3 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  💡 How Image & WhatsApp Sending Works:
                </p>
                <p className="text-emerald-800 text-[10px] leading-relaxed">
                  WhatsApp Web/App opens with your personalized text pre-filled. If you uploaded a flyer image, click <strong>"Copy"</strong> on the flyer and simply press <strong>Ctrl+V</strong> in the chat to attach it!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: ACTIVE OFFERS & DEALS
      ============================================================ */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Gym Promotional Offers & Discount Vouchers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create seasonal deals, promo codes & instant flash discounts to boost renewals and admissions
              </p>
            </div>

            <button
              onClick={() => {
                setEditingOfferId(null);
                setOfferForm({
                  title: "",
                  discountType: "percentage",
                  discountValue: 20,
                  discountBadge: "20% FLAT OFF",
                  promoCode: "DEAL20",
                  planTarget: "All Plans",
                  validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                  description: "",
                  bannerUrl: "",
                  isActive: true,
                  terms: "Applicable on renewals and new registrations.\nValid for one-time use per member."
                });
                setOfferModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Offer</span>
            </button>
          </div>

          {/* Offers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offersList.map((offer) => (
              <div
                key={offer.id}
                className="rounded-3xl bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top Badge & Code */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-pink-50 border-b border-purple-100 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-black shadow-xs">
                      {offer.discountBadge || `${offer.discountValue}% OFF`}
                    </span>
                    <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-900 shadow-2xs">
                      {offer.promoCode || "DEAL"}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div>
                      <h4 className="text-base font-black text-slate-900">{offer.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">
                        {offer.description || "Special limited-period gym discount package."}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Target Plans:</span>
                        <span className="font-bold text-slate-800">{offer.planTarget || "All Plans"}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Valid Till:</span>
                        <span className="font-bold text-amber-700">{formatDate(offer.validTill)}</span>
                      </div>
                      {offer.memberCountClaimed > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Claimed So Far:</span>
                          <span className="font-bold text-emerald-700">{offer.memberCountClaimed} Members</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBroadcastOffer(offer)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast on WA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingOfferId(offer.id);
                      setOfferForm({
                        title: offer.title || "",
                        discountType: offer.discountType || "percentage",
                        discountValue: offer.discountValue || 0,
                        discountBadge: offer.discountBadge || "",
                        promoCode: offer.promoCode || "",
                        planTarget: offer.planTarget || "All Plans",
                        validTill: offer.validTill || "",
                        description: offer.description || "",
                        bannerUrl: offer.bannerUrl || "",
                        isActive: offer.isActive !== false,
                        terms: Array.isArray(offer.terms) ? offer.terms.join("\n") : (offer.terms || "")
                      });
                      setOfferModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                    title="Edit Offer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Delete Offer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: BROADCAST HISTORY
      ============================================================ */}
      {activeTab === "history" && (
        <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Broadcast Campaign Logs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Past WhatsApp broadcast dispatches with reach and timestamp details
              </p>
            </div>
          </div>

          {broadcastLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Megaphone className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">No Broadcast Logs Recorded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Whenever you send a campaign to your gym members using the WhatsApp Broadcaster, logs will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Campaign / Promo Code</th>
                    <th className="p-3">Target Audience</th>
                    <th className="p-3">Recipients Reached</th>
                    <th className="p-3">Media Attached</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {broadcastLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-semibold text-slate-800">
                        {formatDate(log.sentAt || new Date())}
                      </td>
                      <td className="p-3 font-bold text-indigo-700">
                        {log.campaignName || "General Promo"}
                      </td>
                      <td className="p-3 capitalize text-slate-600">
                        {log.targetGroup || "All Active Members"}
                      </td>
                      <td className="p-3 font-black text-emerald-700">
                        {log.sentCount || log.totalRecipients || 1} Members
                      </td>
                      <td className="p-3 text-slate-500">
                        {log.hasImage ? "🖼️ Image Flyer" : ""}
                        {log.hasImage && log.hasPdf ? " • " : ""}
                        {log.hasPdf ? "📄 PDF Brochure" : ""}
                        {!log.hasImage && !log.hasPdf ? "Text Only" : ""}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPromoCode(log.campaignName || "DEAL");
                            setActiveTab("broadcast");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition"
                        >
                          Reuse
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL: BATCH BROADCAST DISPATCHER
      ============================================================ */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="🚀 WhatsApp 1-Click Batch Dispatcher"
      >
        <div className="space-y-4 text-slate-800">
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-extrabold text-emerald-950">Queue Progress:</span>
              <p className="text-emerald-800 font-bold text-sm mt-0.5">
                {currentBatchIndex} of {targetRecipients.length} Sent
              </p>
            </div>
            <div className="w-24 bg-white rounded-full h-2.5 border border-emerald-300 overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{
                  width: `${targetRecipients.length > 0 ? (currentBatchIndex / targetRecipients.length) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          {currentBatchIndex < targetRecipients.length ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                Next Recipient in Queue ({currentBatchIndex + 1}/{targetRecipients.length})
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {targetRecipients[currentBatchIndex]?.name}
              </h3>
              <p className="text-xs font-mono font-bold text-emerald-700">
                📱 {targetRecipients[currentBatchIndex]?.phone}
              </p>
              <p className="text-xs text-slate-500">
                Plan: {targetRecipients[currentBatchIndex]?.planName || "Gym Plan"}
              </p>

              {/* Message preview snippet */}
              <div className="text-left text-xs bg-white p-3 rounded-xl border border-slate-200 max-h-24 overflow-y-auto font-mono text-slate-700">
                {getPersonalizedMessage(targetRecipients[currentBatchIndex])}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleDispatchNext}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send to {targetRecipients[currentBatchIndex]?.name} & Next</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentBatchIndex(prev => prev + 1)}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-black text-slate-900">Broadcast Finished!</h3>
              <p className="text-xs text-slate-500">
                All {targetRecipients.length} members in this audience group have been queued and sent.
              </p>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          )}

          {/* Quick List Option */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Or send to all at once via WA Broadcast List:</span>
            <button
              type="button"
              onClick={handleCopyAllPhoneNumbers}
              className="text-emerald-700 font-bold hover:underline"
            >
              Copy All Numbers
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================
          MODAL: CREATE / EDIT PROMOTIONAL OFFER
      ============================================================ */}
      <Modal
        isOpen={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title={editingOfferId ? "✏️ Edit Promotional Offer" : "🎁 Create New Promotional Offer"}
      >
        <form onSubmit={handleSaveOffer} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Offer Title *</label>
            <input
              required
              type="text"
              placeholder="e.g. Diwali Dhamaka 25% OFF"
              value={offerForm.title}
              onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Discount Badge / Tag *</label>
              <input
                required
                type="text"
                placeholder="e.g. 25% FLAT OFF"
                value={offerForm.discountBadge}
                onChange={(e) => setOfferForm({ ...offerForm, discountBadge: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-purple-700 focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Promo Voucher Code</label>
              <input
                type="text"
                placeholder="e.g. DIWALI25"
                value={offerForm.promoCode}
                onChange={(e) => setOfferForm({ ...offerForm, promoCode: e.target.value.toUpperCase() })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-indigo-700 focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Applicable Plans</label>
              <input
                type="text"
                placeholder="e.g. All 6-Month & Annual Plans"
                value={offerForm.planTarget}
                onChange={(e) => setOfferForm({ ...offerForm, planTarget: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Valid Till Date *</label>
              <input
                required
                type="date"
                value={offerForm.validTill}
                onChange={(e) => setOfferForm({ ...offerForm, validTill: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Offer Description / Marketing Pitch</label>
            <textarea
              rows={3}
              placeholder="Describe what members get, benefits, and reasons to join..."
              value={offerForm.description}
              onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Terms & Conditions (One per line)</label>
            <textarea
              rows={2}
              placeholder="Applicable on renewals and new registrations..."
              value={offerForm.terms}
              onChange={(e) => setOfferForm({ ...offerForm, terms: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-md transition cursor-pointer active:scale-98"
          >
            {editingOfferId ? "Update Offer" : "Publish Offer"}
          </button>
        </form>
      </Modal>
    </div>
  );
}