import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Check,
  Shield,
  Award,
  Sparkles,
  Edit3,
  Trash2,
  Copy,
  Share2,
  Eye,
  EyeOff,
  Clock,
  Calendar,
  Tag,
  Percent,
  Flame,
  Dumbbell,
  Zap,
  Snowflake,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowUpDown,
  ChevronDown,
  Filter,
  Search,
  MessageCircle,
  Heart,
  Star,
  CheckSquare,
  Gift,
  Coins,
  Users
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getPlans, addPlan, updatePlan, deletePlan } from "../../firebase/plans";
import { getTrainers } from "../../firebase/trainers";
import { getServices, DEFAULT_SERVICES } from "../../firebase/services";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

// --- Color Themes Configuration --------------------------------
const THEME_STYLES = {
  emerald: {
    name: "Emerald Green",
    border: "border-emerald-500",
    bgLight: "bg-emerald-50/70",
    accent: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500"
  },
  indigo: {
    name: "Royal Indigo",
    border: "border-indigo-500",
    bgLight: "bg-indigo-50/70",
    accent: "text-indigo-700",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-300",
    gradient: "from-indigo-500 to-purple-600",
    ring: "ring-indigo-500/20",
    dot: "bg-indigo-500"
  },
  purple: {
    name: "Elite Purple",
    border: "border-purple-500",
    bgLight: "bg-purple-50/70",
    accent: "text-purple-700",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
    gradient: "from-purple-500 to-pink-600",
    ring: "ring-purple-500/20",
    dot: "bg-purple-500"
  },
  amber: {
    name: "Gold Amber",
    border: "border-amber-500",
    bgLight: "bg-amber-50/70",
    accent: "text-amber-700",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    gradient: "from-amber-500 to-orange-600",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500"
  },
  rose: {
    name: "Power Rose",
    border: "border-rose-500",
    bgLight: "bg-rose-50/70",
    accent: "text-rose-700",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    gradient: "from-rose-500 to-red-600",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500"
  },
  cyan: {
    name: "Active Cyan",
    border: "border-cyan-500",
    bgLight: "bg-cyan-50/70",
    accent: "text-cyan-700",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-300",
    gradient: "from-cyan-500 to-blue-600",
    ring: "ring-cyan-500/20",
    dot: "bg-cyan-500"
  }
};

// Preset standard categories
const PRESET_CATEGORIES = [
  "General Fitness",
  "Fat Loss & Muscle Gain",
  "Muscle Building",
  "Student / Youth Special",
  "Couple / Duo Package",
  "VIP / Elite Member"
];

// Preset standard tags/badges
const PRESET_TAGS = [
  "Most Popular",
  "Bestseller",
  "Best Value",
  "Starter Choice",
  "Limited Time Offer",
  "Save 35%",
  "Student Special",
  "None"
];

// Default plans if database is new
const DEFAULT_PLANS = [
  {
    id: "p1",
    name: "1-Month Kickstart",
    category: "General Fitness",
    duration: 30,
    price: 2500,
    originalPrice: 3200,
    admissionFee: 0,
    color: "emerald",
    tag: "Starter Choice",
    accessTiming: "All Day Unlimited (6:00 AM - 10:00 PM)",
    freezeDays: "No Pause Allowed",
    ptOption: "General Floor Support",
    features: [
      "Full Gym & Cardio Zone Access",
      "Strength & Heavy Machine Zone",
      "Locker & Shower Facility",
      "General Floor Trainer Support"
    ],
    isActive: true,
    memberCount: 24
  },
  {
    id: "p2",
    name: "3-Month Pro Transformation",
    category: "Fat Loss & Muscle Gain",
    duration: 90,
    price: 6500,
    originalPrice: 9000,
    admissionFee: 0,
    color: "amber",
    tag: "Most Popular",
    accessTiming: "All Day Unlimited (6:00 AM - 10:00 PM)",
    freezeDays: "15 Days Free Freeze",
    ptOption: "1 Free PT Session Included",
    features: [
      "All Cardio & Strength Equipment",
      "Steam & Hot Sauna Access",
      "1 Free Personal Training Session",
      "Monthly InBody / BMI Body Composition Test",
      "Custom Diet & Nutrition Meal Chart",
      "15 Days Free Membership Freeze"
    ],
    isActive: true,
    memberCount: 68
  },
  {
    id: "p3",
    name: "6-Month Muscle Hypertrophy",
    category: "Muscle Building",
    duration: 180,
    price: 11000,
    originalPrice: 16000,
    admissionFee: 0,
    color: "indigo",
    tag: "Best Value",
    accessTiming: "All Day Unlimited (6:00 AM - 10:00 PM)",
    freezeDays: "30 Days Free Freeze",
    ptOption: "2 Free PT Sessions Included",
    features: [
      "Full Unlimited Gym Access",
      "Dedicated Locker & Changing Area",
      "2 Free 1-on-1 PT Consultation Sessions",
      "Bi-weekly Body Fat & Measurement Audits",
      "Complete Supplement & Meal Guidance",
      "Free Welcome Shaker Bottle Kit",
      "30 Days Free Membership Freeze"
    ],
    isActive: true,
    memberCount: 42
  },
  {
    id: "p4",
    name: "1-Year Annual Elite Pass",
    category: "VIP / Elite Member",
    duration: 365,
    price: 18000,
    originalPrice: 28000,
    admissionFee: 0,
    color: "purple",
    tag: "Save 35%",
    accessTiming: "All Day Unlimited (6:00 AM - 10:00 PM)",
    freezeDays: "45 Days Free Freeze",
    ptOption: "Weekly PT Check-in Included",
    features: [
      "365 Days Unlimited Access to All Zones",
      "Reserved VIP Locker & Steam Bath",
      "Free InBody BMI Scans Every Month",
      "Personalized Diet & Macro Nutrition Plan",
      "Weekly Trainer Progress Audit",
      "2 Free Guest Passes for Family / Friends",
      "45 Days Free Membership Freeze Allowed"
    ],
    isActive: true,
    memberCount: 31
  }
];

export default function Memberships() {
  const { gymId } = useAuth();
  const currentGymId = gymId || "univo_main";

  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDurationFilter, setSelectedDurationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");

  // Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [modalTab, setModalTab] = useState("basic"); // "basic" | "timing" | "perks"

  // Form State
  const initialForm = {
    name: "",
    category: "General Fitness",
    planType: "regular",
    isPtOnly: false,
    duration: 90,
    price: 6500,
    originalPrice: 9000,
    color: "emerald",
    tag: "Most Popular",
    accessTiming: "All Day Unlimited (6:00 AM - 10:00 PM)",
    freezeDays: "15 Days Free Freeze",
    ptOption: "General Floor Support",
    features: [
      "All Cardio & Strength Equipment"
    ],
    customFeatureInput: "",
    isActive: true
  };
  const [form, setForm] = useState(initialForm);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomTag, setIsCustomTag] = useState(false);

  const allCategories = useMemo(() => {
    const set = new Set(PRESET_CATEGORIES);
    plans.forEach(p => {
      if (p.category) set.add(p.category);
    });
    if (form.category) set.add(form.category);
    return Array.from(set);
  }, [plans, form.category]);

  const allTags = useMemo(() => {
    const set = new Set(PRESET_TAGS);
    plans.forEach(p => {
      if (p.tag && p.tag !== "None") set.add(p.tag);
    });
    if (form.tag && form.tag !== "None") set.add(form.tag);
    return Array.from(set);
  }, [plans, form.tag]);

  // Delete Confirmation Modal
  const [deletePlanModal, setDeletePlanModal] = useState(null);

  // Load plans, trainers & services from Firestore
  const loadPlans = async () => {
    setLoading(true);
    try {
      const [plansData, trainersData, servicesData] = await Promise.all([
        getPlans(currentGymId),
        getTrainers(currentGymId),
        getServices(currentGymId)
      ]);

      if (trainersData && trainersData.length > 0) {
        setTrainers(trainersData);
      }

      if (servicesData && servicesData.length > 0) {
        setServices(servicesData);
      } else {
        setServices(DEFAULT_SERVICES);
      }

      if (plansData && plansData.length > 0) {
        // Exclude any PT packages from Membership page - pure gym packages only
        const gymPlansOnly = plansData.filter(
          p => !p.isPtOnly && p.planType !== "pt" && p.category !== "Personal Training (1-on-1 PT)" && !p.ptSessions
        );
        setPlans(gymPlansOnly.length > 0 ? gymPlansOnly : DEFAULT_PLANS);
      } else {
        // Seed default plans if empty
        setPlans(DEFAULT_PLANS);
      }
    } catch (err) {
      console.warn("Using default plans:", err);
      setPlans(DEFAULT_PLANS);
      setServices(DEFAULT_SERVICES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [currentGymId]);

  // Open Create Modal for Regular Gym Package
  const handleOpenCreate = () => {
    setEditingPlanId(null);
    setIsCustomCategory(false);
    setIsCustomTag(false);
    setForm({
      ...initialForm,
      planType: "regular",
      isPtOnly: false,
      category: "General Fitness",
      color: "emerald",
      tag: "Most Popular",
      ptOption: "General Floor Support",
      price: 6500,
      originalPrice: 9000,
      duration: 90,
      features: [
        "All Cardio & Strength Equipment"
      ]
    });
    setModalTab("basic");
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (plan) => {
    setEditingPlanId(plan.id);
    const isCatCustom = plan.category && !PRESET_CATEGORIES.includes(plan.category);
    const isTagCustom = plan.tag && plan.tag !== "None" && !PRESET_TAGS.includes(plan.tag);
    setIsCustomCategory(Boolean(isCatCustom));
    setIsCustomTag(Boolean(isTagCustom));
    setForm({
      name: plan.name || "",
      category: plan.category || "General Fitness",
      planType: "regular",
      isPtOnly: false,
      duration: plan.duration || 30,
      price: plan.price || 0,
      originalPrice: plan.originalPrice || 0,
      color: plan.color || "emerald",
      tag: plan.tag || "None",
      accessTiming: plan.accessTiming || "All Day Unlimited (6:00 AM - 10:00 PM)",
      freezeDays: plan.freezeDays || "No Pause Allowed",
      ptOption: plan.ptOption || "General Floor Support",
      features: Array.isArray(plan.features) ? plan.features : (plan.features ? [plan.features] : []),
      customFeatureInput: "",
      isActive: plan.isActive !== false
    });
    setModalTab("basic");
    setModalOpen(true);
  };

  // Duplicate / Clone Plan
  const handleDuplicatePlan = async (plan) => {
    const cloned = {
      ...plan,
      name: `${plan.name} (Copy)`,
      id: "p_" + Date.now(),
      memberCount: 0
    };
    try {
      await addPlan(currentGymId, cloned);
      toast.success(`Cloned ${plan.name} successfully!`);
      loadPlans();
    } catch (err) {
      setPlans(prev => [cloned, ...prev]);
      toast.success("Package duplicated locally!");
    }
  };

  // Toggle Plan Status (Active/Inactive)
  const handleToggleStatus = async (plan) => {
    const nextStatus = !plan.isActive;
    try {
      await updatePlan(currentGymId, plan.id, { isActive: nextStatus });
      setPlans(prev =>
        prev.map(p => (p.id === plan.id ? { ...p, isActive: nextStatus } : p))
      );
      toast.success(nextStatus ? "Package activated!" : "Package deactivated!");
    } catch (err) {
      setPlans(prev =>
        prev.map(p => (p.id === plan.id ? { ...p, isActive: nextStatus } : p))
      );
    }
  };

  // Delete Plan
  const handleConfirmDelete = async () => {
    if (!deletePlanModal) return;
    try {
      await deletePlan(currentGymId, deletePlanModal.id);
      setPlans(prev => prev.filter(p => p.id !== deletePlanModal.id));
      toast.success("Membership package removed!");
    } catch (err) {
      setPlans(prev => prev.filter(p => p.id !== deletePlanModal.id));
      toast.success("Removed locally");
    } finally {
      setDeletePlanModal(null);
    }
  };

  // Add / Remove feature in Form
  const handleTogglePerk = (perk) => {
    setForm(prev => {
      const exists = prev.features.includes(perk);
      return {
        ...prev,
        features: exists
          ? prev.features.filter(f => f !== perk)
          : [...prev.features, perk]
      };
    });
  };

  const handleAddCustomFeature = () => {
    if (!form.customFeatureInput.trim()) return;
    setForm(prev => ({
      ...prev,
      features: [...prev.features, prev.customFeatureInput.trim()],
      customFeatureInput: ""
    }));
  };

  const handleRemoveFeature = (index) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== index)
    }));
  };

  // Save Plan Submit
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Package name is required");
      return;
    }
    if (!form.price || form.price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category || "General Fitness",
      planType: "regular",
      isPtOnly: false,
      duration: Number(form.duration),
      price: Number(form.price),
      originalPrice: Number(form.originalPrice) || Number(form.price),
      color: form.color,
      tag: form.tag,
      accessTiming: form.accessTiming,
      freezeDays: form.freezeDays,
      ptOption: form.ptOption || "General Floor Support",
      features: form.features,
      includedServices: form.features,
      ptAddon: false,
      isActive: form.isActive
    };

    try {
      if (editingPlanId) {
        await updatePlan(currentGymId, editingPlanId, payload);
        toast.success("Package updated successfully!");
      } else {
        await addPlan(currentGymId, payload);
        toast.success("New package created successfully!");
      }
      setModalOpen(false);
      loadPlans();
    } catch (err) {
      console.warn("Saving locally:", err);
      if (editingPlanId) {
        setPlans(prev =>
          prev.map(p => (p.id === editingPlanId ? { ...p, ...payload } : p))
        );
      } else {
        setPlans(prev => [{ id: "p_" + Date.now(), ...payload, memberCount: 0 }, ...prev]);
      }
      toast.success("Package saved!");
      setModalOpen(false);
    }
  };

  // Share Plan on WhatsApp
  const handleShareWhatsApp = (plan) => {
    const discount =
      plan.originalPrice > plan.price
        ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
        : 0;

    const text = `🔥 *${plan.name.toUpperCase()}* - Special Gym Membership Offer!\n\n` +
      `⏱ *Duration:* ${plan.duration} Days\n` +
      `💰 *Offer Price:* Rs. ${Number(plan.price).toLocaleString("en-IN")}` +
      (discount > 0 ? ` _(MRP: Rs. ${Number(plan.originalPrice).toLocaleString("en-IN")} - Save ${discount}%)_` : "") +
      `\n⏰ *Access:* ${plan.accessTiming || "Unlimited All Day"}\n` +
      (plan.freezeDays ? `❄️ *Pause Facility:* ${plan.freezeDays}\n` : "") +
      `\n✨ *Included Features & Perks:*\n` +
      (plan.features || []).map(f => `• ${f}`).join("\n") +
      `\n\n🏋️‍♂️ Join today at *Univo Gym*! Contact front desk to register now.`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // --- Filtered and Sorted Plans ---------------------------------
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      // Exclude any PT packages - Membership section is for pure Gym Membership Plans
      if (p.isPtOnly || p.planType === "pt" || p.category === "Personal Training (1-on-1 PT)" || p.ptSessions > 0) {
        return false;
      }

      // Search term
      const matchesSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.features || []).some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

      // Duration filter
      let matchesDuration = true;
      if (selectedDurationFilter === "monthly") matchesDuration = p.duration <= 45;
      else if (selectedDurationFilter === "quarterly") matchesDuration = p.duration > 45 && p.duration <= 100;
      else if (selectedDurationFilter === "half_yearly") matchesDuration = p.duration > 100 && p.duration <= 200;
      else if (selectedDurationFilter === "annual") matchesDuration = p.duration > 200;

      // Status filter
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = p.isActive !== false;
      else if (statusFilter === "inactive") matchesStatus = p.isActive === false;

      return matchesSearch && matchesDuration && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "duration_asc") return a.duration - b.duration;
      if (sortBy === "duration_desc") return b.duration - a.duration;
      if (sortBy === "popular") return (b.memberCount || 0) - (a.memberCount || 0);
      return 0;
    });
  }, [plans, searchTerm, selectedDurationFilter, statusFilter, sortBy]);



  return (
    <div className="space-y-6">
      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Membership Packages & Plans
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Configure flexible gym tiers, discount offers, access timings, pause rules & athlete perks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md hover:shadow-emerald-500/20 transition duration-200 text-xs py-2.5 px-4 shrink-0"
          >
            New Gym Package
          </Button>
        </div>
      </div>



      {/* ============================================================
          FILTER & CONTROLS BAR
      ============================================================ */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search package name, category or features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="recommended">Recommended Order</option>
              <option value="popular">Most Subscribed First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="duration_asc">Duration: Shortest First</option>
              <option value="duration_desc">Duration: Longest First</option>
            </select>
          </div>
        </div>

        {/* Category & Duration Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: "all", label: "All Packages" },
            { id: "monthly", label: "Monthly (30 Days)" },
            { id: "quarterly", label: "3 Months (Quarterly)" },
            { id: "half_yearly", label: "6 Months (Half-Yearly)" },
            { id: "annual", label: "Annual (1 Year)" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDurationFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedDurationFilter === tab.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Active Only
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === "inactive" ? "bg-rose-50 text-rose-700 border border-rose-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          PACKAGE CARDS GRID
      ============================================================ */}
      {filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No membership plans match your search</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or create a brand new custom package for your gym athletes.
          </p>
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
            className="bg-emerald-600 text-white text-xs font-bold"
          >
            Create New Package
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredPlans.map((p) => {
            const theme = THEME_STYLES[p.color] || THEME_STYLES.emerald;
            const discount =
              p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : 0;

            const monthlyEquiv = Math.round(p.price / ((p.duration || 30) / 30));
            const dailyEquiv = Math.round(p.price / (p.duration || 30));

            return (
              <div
                key={p.id}
                className={`group rounded-3xl bg-white border-2 flex flex-col justify-between relative shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  theme.border
                } ${!p.isActive ? "opacity-75 grayscale-[30%]" : ""}`}
              >
                {/* Top Colored Accent Stripe */}
                <div className={`h-2.5 w-full bg-gradient-to-r ${theme.gradient}`} />

                {/* Card Main Body */}
                <div className="p-5 space-y-4">
                  {/* Top Badge Tag & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.tag && p.tag !== "None" && (
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs ${theme.badge}`}
                        >
                          {p.tag}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {p.category || "General Fitness"}
                      </span>
                    </div>

                    {/* Active Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                        p.isActive !== false
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                      title={p.isActive !== false ? "Click to Deactivate" : "Click to Activate"}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.isActive !== false ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {p.isActive !== false ? "Live" : "Inactive"}
                    </button>
                  </div>

                  {/* Plan Name & Duration */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {p.duration} Days Plan
                      </span>
                      <span>•</span>
                      <span className="text-[11px]">
                        ~{Math.round(p.duration / 30)} {p.duration === 30 ? "Month" : "Months"}
                      </span>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-black text-slate-900">
                        Rs. {Number(p.price).toLocaleString("en-IN")}
                      </span>
                      {p.originalPrice > p.price && (
                        <span className="text-xs text-slate-400 line-through font-medium">
                          Rs. {Number(p.originalPrice).toLocaleString("en-IN")}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Rs. {monthlyEquiv.toLocaleString("en-IN")} / month</span>
                      <span className="text-[10px] text-slate-400 font-semibold">(~Rs. {dailyEquiv}/day)</span>
                    </div>
                  </div>

                  {/* Operational Terms Badges (Timing, Freeze, PT) */}
                  <div className="space-y-1.5 text-xs">
                    {(p.isPtOnly || p.planType === "pt" || p.ptSessions > 0) && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50 border border-purple-200">
                        <div className="flex items-center gap-1.5 text-purple-900 font-extrabold text-xs">
                          <Dumbbell className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{p.ptSessions || 24} Dedicated 1-on-1 Sessions</span>
                        </div>
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-200 text-purple-900">
                          PT Package
                        </span>
                      </div>
                    )}
                    {p.assignedTrainerId && p.assignedTrainerId !== "all" && (
                      <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-semibold">
                        <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Assigned Coach: {trainers.find(t => t.id === p.assignedTrainerId)?.name || "Dedicated Coach"}</span>
                      </div>
                    )}
                    {p.accessTiming && (
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{p.accessTiming}</span>
                      </div>
                    )}
                    {p.freezeDays && p.freezeDays !== "No Pause Allowed" && (
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <Snowflake className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-blue-700 font-semibold">{p.freezeDays}</span>
                      </div>
                    )}
                    {p.ptOption && !p.isPtOnly && p.planType !== "pt" && (
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-slate-800 font-semibold">{p.ptOption}</span>
                      </div>
                    )}
                  </div>

                  {/* Features / Perks List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Included Package Perks
                    </span>
                    <ul className="space-y-2">
                      {(p.features || []).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-snug">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                    title="Edit Package"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletePlanModal(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 bg-white transition flex items-center justify-center shrink-0"
                    title="Delete Package"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          CREATE / EDIT ADVANCED PLAN MODAL
      ============================================================ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlanId ? "✏️ Edit Membership Package" : "✨ Create New Membership Package"}
      >
        <form onSubmit={handleSavePlan} className="space-y-4 text-slate-800">
          {/* Modal Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setModalTab("basic")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                modalTab === "basic" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              1. Pricing & Tiers
            </button>
            <button
              type="button"
              onClick={() => setModalTab("timing")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                modalTab === "timing" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              2. Timing & Rules
            </button>
            <button
              type="button"
              onClick={() => setModalTab("perks")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                modalTab === "perks" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              3. Perks & Features ({form.features.length})
            </button>
          </div>

          {/* TAB 1: BASIC & PRICING */}
          {/* TAB 1: BASIC DETAILS */}
          {modalTab === "basic" && (
            <div className="space-y-3.5">
              {/* Plan Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Package Title / Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 3-Month Pro Transformation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category & Preset Tag with Custom Support */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category / Purpose */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Category / Purpose</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isCustomCategory;
                        setIsCustomCategory(next);
                        if (!next && !PRESET_CATEGORIES.includes(form.category)) {
                          setForm(f => ({ ...f, category: "General Fitness" }));
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      {isCustomCategory ? "← Select List" : "+ Custom"}
                    </button>
                  </div>

                  {isCustomCategory ? (
                    <div>
                      <input
                        type="text"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        placeholder="e.g. CrossFit, Boxing, Senior Fitness..."
                        className="w-full bg-emerald-50/50 border-2 border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        autoFocus
                      />
                      <p className="text-[10px] text-emerald-600 font-semibold mt-1">✨ Type your custom category name</p>
                    </div>
                  ) : (
                    <select
                      value={form.category}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomCategory(true);
                          setForm({ ...form, category: "" });
                        } else {
                          setForm({ ...form, category: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === "Muscle Building" ? "Muscle Building (Hypertrophy)" : cat}
                        </option>
                      ))}
                      <option value="__custom__">✨ + Type Custom Category...</option>
                    </select>
                  )}
                </div>

                {/* Highlight Badge / Tag */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Highlight Badge / Tag</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isCustomTag;
                        setIsCustomTag(next);
                        if (!next && !PRESET_TAGS.includes(form.tag)) {
                          setForm(f => ({ ...f, tag: "None" }));
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      {isCustomTag ? "← Select List" : "+ Custom"}
                    </button>
                  </div>

                  {isCustomTag ? (
                    <div>
                      <input
                        type="text"
                        value={form.tag === "None" ? "" : form.tag}
                        onChange={(e) => setForm({ ...form, tag: e.target.value || "None" })}
                        placeholder="e.g. Hot Deal, Summer Pass, Weekend Deal..."
                        className="w-full bg-amber-50/50 border-2 border-amber-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        autoFocus
                      />
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">✨ Badge will appear on top of package card</p>
                    </div>
                  ) : (
                    <select
                      value={form.tag}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomTag(true);
                          setForm({ ...form, tag: "" });
                        } else {
                          setForm({ ...form, tag: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {allTags.map(tag => (
                        <option key={tag} value={tag}>
                          {tag === "None" ? "None (No badge)" : tag}
                        </option>
                      ))}
                      <option value="__custom__">✨ + Type Custom Badge...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Duration Presets + Custom Days */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Duration Presets</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { label: "1 Month", days: 30 },
                    { label: "3 Months", days: 90 },
                    { label: "6 Months", days: 180 },
                    { label: "1 Year", days: 365 }
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setForm({ ...form, duration: preset.days })}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition ${
                        Number(form.duration) === preset.days
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                      <span className="block text-[10px] text-slate-400 font-normal">({preset.days}d)</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">Custom Duration Days:</span>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                    className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs text-slate-900 font-bold"
                  />
                  <span className="text-xs text-slate-400">days</span>
                </div>
              </div>

              {/* Pricing (Selling Price vs MRP) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Selling Fee (Rs.) *</label>
                  <input
                    required
                    type="number"
                    placeholder="6500"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Original MRP (Rs.)</label>
                  <input
                    type="number"
                    placeholder="9000"
                    value={form.originalPrice}
                    onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Shows strike-through discount</span>
                </div>
              </div>

              {/* Theme Color Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Card Accent Theme Color</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(THEME_STYLES).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, color: key })}
                      className={`p-2 rounded-xl border-2 flex items-center gap-1.5 transition ${
                        form.color === key ? `${item.border} ${item.bgLight} font-bold` : "border-slate-200 bg-white"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${item.dot} shadow-2xs`} />
                      <span className="text-[11px] truncate text-slate-800">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMINGS & OPERATIONAL RULES */}
          {modalTab === "timing" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Access Hours / Timings</label>
                <select
                  value={form.accessTiming}
                  onChange={(e) => setForm({ ...form, accessTiming: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="All Day Unlimited (6:00 AM - 10:00 PM)">All Day Unlimited (6:00 AM - 10:00 PM)</option>
                  <option value="Morning Batch Only (6:00 AM - 11:00 AM)">Morning Batch Only (6:00 AM - 11:00 AM)</option>
                  <option value="Afternoon Happy Hours (12:00 PM - 4:00 PM)">Afternoon Happy Hours (12:00 PM - 4:00 PM)</option>
                  <option value="Evening Prime Slot (4:00 PM - 10:00 PM)">Evening Prime Slot (4:00 PM - 10:00 PM)</option>
                  <option value="Weekend Only Access (Saturday & Sunday)">Weekend Only Access (Saturday & Sunday)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Membership Pause / Freeze Policy
                </label>
                <select
                  value={form.freezeDays}
                  onChange={(e) => setForm({ ...form, freezeDays: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="No Pause Allowed">No Pause Allowed</option>
                  <option value="7 Days Free Freeze">7 Days Free Freeze</option>
                  <option value="15 Days Free Freeze">15 Days Free Freeze</option>
                  <option value="30 Days Free Freeze">30 Days Free Freeze</option>
                  <option value="45 Days Free Freeze">45 Days Free Freeze</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Allows athletes to pause membership due to travel or medical reasons
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Personal Trainer (PT) Inclusion</label>
                <select
                  value={form.ptOption}
                  onChange={(e) => setForm({ ...form, ptOption: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="General Floor Support">General Floor Support (No dedicated PT)</option>
                  <option value="1 Free PT Session Included">1 Free PT Session Included</option>
                  <option value="2 Free PT Sessions Included">2 Free PT Sessions Included</option>
                  <option value="Weekly PT Check-in Included">Weekly PT Check-in Included</option>
                  <option value="Dedicated Personal Trainer Included">Dedicated Personal Trainer Included</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="statusToggle"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="statusToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Publish this package immediately (Visible to members & registrations)
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: PERKS & FEATURES */}
          {modalTab === "perks" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    1-Click Include Gym Services ({services.length})
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Tap to add / remove services from this plan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {services.map((svc) => {
                    const isSelected = form.features.includes(svc.name);
                    return (
                      <button
                        key={svc.id || svc.name}
                        type="button"
                        onClick={() => handleTogglePerk(svc.name)}
                        className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 transition border ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs ring-1 ring-emerald-400/40"
                            : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-300 text-transparent"
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <div className="truncate">
                            <span className="font-bold block truncate">{svc.name}</span>
                            {svc.category && (
                              <span className="text-[10px] text-slate-400 font-normal block truncate">
                                {svc.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {svc.price ? (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              isSelected
                                ? "bg-emerald-200/70 text-emerald-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            ₹{svc.price} val
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Features List with Custom Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Active Package Features ({form.features.length})
                </label>
                <div className="space-y-1.5 mb-2.5 max-h-40 overflow-y-auto">
                  {form.features.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800"
                    >
                      <span className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Custom Perk */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom perk (e.g. Free 1KG Whey Protein sample)..."
                    value={form.customFeatureInput}
                    onChange={(e) => setForm({ ...form, customFeatureInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomFeature();
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFeature}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-emerald-600 transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {modalTab !== "basic" ? (
              <button
                type="button"
                onClick={() => setModalTab(modalTab === "perks" ? "timing" : "basic")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Previous Step
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {modalTab !== "perks" ? (
                <button
                  type="button"
                  onClick={() => setModalTab(modalTab === "basic" ? "timing" : "perks")}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                >
                  Next Step →
                </button>
              ) : null}

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition"
              >
                {editingPlanId ? "Save Package Changes" : "Create & Launch Package"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ============================================================
          DELETE CONFIRMATION MODAL
      ============================================================ */}
      {deletePlanModal && (
        <Modal
          isOpen={true}
          onClose={() => setDeletePlanModal(null)}
          title="⚠️ Delete Membership Package"
        >
          <div className="space-y-4 text-slate-800">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the package{" "}
              <strong className="text-slate-900 font-bold">"{deletePlanModal.name}"</strong>?
              Existing members already on this plan will not be affected, but no new athletes can enroll.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletePlanModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Delete Package
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}