import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Star,
  CheckCircle,
  Dumbbell,
  Flame,
  Sparkles,
  Heart,
  Utensils,
  Music,
  Shield,
  Trophy,
  Activity,
  Clock,
  Users,
  Calendar,
  Tag,
  Percent,
  MessageCircle,
  Edit3,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Search,
  ArrowUpDown,
  Check,
  X,
  CheckSquare,
  Gift,
  Bath,
  Waves,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Coins
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import {
  getServices,
  addService,
  updateService,
  deleteService
} from "../../firebase/services";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

// Icon mapping for categories & services
const ICON_MAP = {
  dumbbell: Dumbbell,
  flame: Flame,
  sparkles: Sparkles,
  heart: Heart,
  utensils: Utensils,
  music: Music,
  bath: Bath,
  waves: Waves,
  shield: Shield,
  trophy: Trophy,
  activity: Activity,
  star: Star
};

// Category Config with stylish color badges
const CATEGORIES = {
  "Recovery & Spa": {
    color: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "border-blue-500",
    icon: "bath"
  },
  "Nutrition & Diet": {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "border-amber-500",
    icon: "utensils"
  },
  "Group Fitness": {
    color: "bg-purple-50 text-purple-700 border-purple-200",
    badge: "border-purple-500",
    icon: "music"
  },
  "Locker & Amenities": {
    color: "bg-slate-100 text-slate-700 border-slate-200",
    badge: "border-slate-500",
    icon: "shield"
  },
  "Health Assessment": {
    color: "bg-rose-50 text-rose-700 border-rose-200",
    badge: "border-rose-500",
    icon: "activity"
  }
};

const PRESET_SERVICE_CATEGORIES = [
  "Recovery & Spa",
  "Nutrition & Diet",
  "Group Fitness",
  "Locker & Amenities",
  "Health Assessment"
];

const PRESET_SERVICE_TAGS = [
  "High Demand",
  "Bestseller",
  "Relaxing",
  "Certified",
  "Fun & Cardio",
  "Free Perk",
  "Convenience",
  "None"
];

// Preset benefits for 1-click selection
const PRESET_BENEFITS = [
  "Weekly Body Weight & Macro Diet Audits",
  "Dedicated Digital Locker with Master Keycard",
  "Hot Steam & Sauna Muscle Relaxation Session",
  "High Energy Music & Group Motivational Environment",
  "Post-Workout Hydration & Electrolytes Support",
  "Certified Specialist 1-on-1 Consultation",
  "Free Monthly Progress & InBody Audit Report"
];

// Default Services if database is new
const DEFAULT_SERVICES = [
  {
    id: "s2",
    name: "Diet & Nutrition Counseling",
    category: "Nutrition & Diet",
    icon: "utensils",
    tag: "Bestseller",
    isFree: false,
    price: 1500,
    originalPrice: 2200,
    billingType: "Per Month",
    timing: "By Prior Appointment",
    duration: "45 mins consultation",
    capacity: "Individualized Plan",
    instructor: "Dr. Shalini (Clinical Dietitian)",
    desc: "Complete calorie and macro-nutrient breakdown tailored to your food habits (Veg/Non-Veg), metabolic rate and fitness target.",
    benefits: [
      "Personalized Weekly Indian Meal Plan",
      "Macro & Calorie Target Calculator",
      "Safe Supplement Guidance (Protein, Creatine)",
      "Bi-Weekly Meal Plan Rotation & Adjustments"
    ],
    isActive: true,
    subscriberCount: 52
  },
  {
    id: "s3",
    name: "Steam & Infrared Sauna Detox",
    category: "Recovery & Spa",
    icon: "bath",
    tag: "Relaxing",
    isFree: false,
    price: 250,
    originalPrice: 400,
    billingType: "Per Session",
    timing: "Daily (7:00 AM - 11:00 AM & 5:00 PM - 9:00 PM)",
    duration: "25 mins bath",
    capacity: "Up to 4 Persons / Slot",
    instructor: "Spa Attendant On Floor",
    desc: "Deep muscle recovery, pore cleansing and toxin elimination bath to relieve joint soreness and optimize athletic recovery.",
    benefits: [
      "Eucalyptus Aromatherapy Steam Chamber",
      "Reduces DOMS Muscle Soreness by 40%",
      "Improves Blood Circulation & Skin Glow",
      "Fresh Sanitized Towel & Shower Included"
    ],
    isActive: true,
    subscriberCount: 84
  },
  {
    id: "s4",
    name: "Private Digital Locker Facility",
    category: "Locker & Amenities",
    icon: "shield",
    tag: "Convenience",
    isFree: false,
    price: 500,
    originalPrice: 750,
    billingType: "Per Month",
    timing: "All Day 24/7 Access",
    duration: "Monthly Reservation",
    capacity: "Dedicated Private Bay",
    instructor: "Front Desk Security",
    desc: "Assigned personal locker for shoes, gym apparel, protein shakers and accessories so you never have to carry gym bags every day.",
    benefits: [
      "Individual Assigned Bay with Digital Keypad",
      "Safe Shoe & Shaker Storage Area",
      "Monitored by 24/7 Security CCTV",
      "Free Locker Sanitization Every Week"
    ],
    isActive: true,
    subscriberCount: 45
  },
  {
    id: "s5",
    name: "Physiotherapy & Injury Rehab",
    category: "Recovery & Spa",
    icon: "activity",
    tag: "Certified",
    isFree: false,
    price: 800,
    originalPrice: 1200,
    billingType: "Per Session",
    timing: "Mon, Wed, Fri (4:00 PM - 8:00 PM)",
    duration: "45 mins therapy",
    capacity: "1-on-1 Treatment",
    instructor: "Dr. Rohit Verma (BPT, MPT Sports)",
    desc: "Clinical assessment and targeted rehabilitation drills for lower back pain, knee impingement, rotator cuff strain or posture defects.",
    benefits: [
      "Therapeutic Mobility & Trigger Point Release",
      "Dry Needling & Cupping Available",
      "Corrective Exercise Home Routine",
      "Return-to-Lifting Clearance Certification"
    ],
    isActive: true,
    subscriberCount: 19
  },
  {
    id: "s6",
    name: "Zumba & Weekend Functional Batch",
    category: "Group Fitness",
    icon: "music",
    tag: "Fun & Cardio",
    isFree: false,
    price: 1200,
    originalPrice: 1800,
    billingType: "Per Month",
    timing: "Sat & Sun (7:00 AM - 8:30 AM)",
    duration: "90 mins batch",
    capacity: "Max 25 Athletes / Class",
    instructor: "Coach Sneha (Licensed Zumba)",
    desc: "High energy, calorie-scorching dance cardio and functional agility workouts to boost stamina, endurance and cardiovascular health.",
    benefits: [
      "Burns 600+ Calories per 90-min Session",
      "Latin & Bollywood High-Tempo Soundtracks",
      "Battle Ropes & Agility Ladder Drills",
      "Free Entry for Active Transformation Members"
    ],
    isActive: true,
    subscriberCount: 62
  },
  {
    id: "s7",
    name: "InBody BMI & Body Fat Audit",
    category: "Health Assessment",
    icon: "activity",
    tag: "Free Perk",
    isFree: true,
    price: 0,
    originalPrice: 500,
    billingType: "Included in Plan",
    timing: "Daily (Available on Request)",
    duration: "15 mins test",
    capacity: "Walk-in Facility",
    instructor: "Floor Fitness Head",
    desc: "Bio-electrical impedance scan measuring visceral fat, skeletal muscle mass, hydration levels and basal metabolic rate (BMR).",
    benefits: [
      "Detailed 14-Point Health Diagnostic Printout",
      "Accurate Muscle Mass vs Fat Distribution",
      "Digital Copy Sent to Member's WhatsApp",
      "100% Free for All Active Gym Members"
    ],
    isActive: true,
    subscriberCount: 110
  }
];

export default function Services() {
  const { gymId } = useAuth();
  const currentGymId = gymId || "univo_main";

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState("basic"); // "basic" | "schedule" | "benefits"
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomTag, setIsCustomTag] = useState(false);

  // Dynamic category and tag lists merging presets and any custom created items
  const allCategories = useMemo(() => {
    const set = new Set(PRESET_SERVICE_CATEGORIES);
    (services || []).forEach(s => {
      if (s.category && s.category.trim()) set.add(s.category.trim());
    });
    return Array.from(set);
  }, [services]);

  const allTags = useMemo(() => {
    const set = new Set(PRESET_SERVICE_TAGS);
    (services || []).forEach(s => {
      if (s.tag && s.tag.trim()) set.add(s.tag.trim());
    });
    return Array.from(set);
  }, [services]);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState(null);

  // Form State
  const initialForm = {
    name: "",
    category: "Recovery & Spa",
    icon: "bath",
    tag: "Bestseller",
    isFree: false,
    price: 300,
    originalPrice: 500,
    billingType: "Per Month",
    timing: "All Day Unlimited (6:00 AM - 10:00 PM)",
    duration: "45 mins / session",
    capacity: "Individual Access",
    instructor: "Attendant On Floor",
    desc: "",
    benefits: [
      "Hot Steam & Sauna Muscle Relaxation Session",
      "Post-Workout Hydration & Electrolytes Support",
      "Free Monthly Progress & InBody Audit Report"
    ],
    customBenefitInput: "",
    isActive: true
  };
  const [form, setForm] = useState(initialForm);

  // Load Services from Firestore
  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await getServices(currentGymId);
      const nonPtServices = (data || []).filter(
        s => s.category !== "Personal Training" && 
             !s.name?.toLowerCase().includes("personal training") &&
             !s.name?.toLowerCase().includes("1-on-1 pt")
      );
      if (nonPtServices.length > 0) {
        setServices(nonPtServices);
      } else {
        setServices(DEFAULT_SERVICES);
      }
    } catch (err) {
      console.warn("Using default services:", err);
      setServices(DEFAULT_SERVICES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [currentGymId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsCustomCategory(false);
    setIsCustomTag(false);
    setModalTab("basic");
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (s) => {
    setEditingId(s.id);
    setIsCustomCategory(Boolean(s.category && !PRESET_SERVICE_CATEGORIES.includes(s.category)));
    setIsCustomTag(Boolean(s.tag && !PRESET_SERVICE_TAGS.includes(s.tag)));
    setForm({
      name: s.name || "",
      category: s.category || "Recovery & Spa",
      icon: s.icon || "bath",
      tag: s.tag || "Bestseller",
      isFree: s.isFree || false,
      price: s.price || 0,
      originalPrice: s.originalPrice || 0,
      billingType: s.billingType || "Per Month",
      timing: s.timing || "All Day Unlimited",
      duration: s.duration || "60 mins",
      capacity: s.capacity || "1-on-1 Individual",
      instructor: s.instructor || "",
      desc: s.desc || "",
      benefits: Array.isArray(s.benefits) ? s.benefits : [],
      customBenefitInput: "",
      isActive: s.isActive !== false
    });
    setModalTab("basic");
    setModalOpen(true);
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (s) => {
    const nextStatus = !s.isActive;
    try {
      await updateService(currentGymId, s.id, { isActive: nextStatus });
      setServices(prev =>
        prev.map(item => (item.id === s.id ? { ...item, isActive: nextStatus } : item))
      );
      toast.success(nextStatus ? "Facility marked active!" : "Facility deactivated!");
    } catch (err) {
      setServices(prev =>
        prev.map(item => (item.id === s.id ? { ...item, isActive: nextStatus } : item))
      );
    }
  };

  // Duplicate Service
  const handleDuplicate = async (s) => {
    const cloned = {
      ...s,
      name: `${s.name} (Copy)`,
      id: "s_" + Date.now(),
      subscriberCount: 0
    };
    try {
      await addService(currentGymId, cloned);
      toast.success(`Duplicated ${s.name}!`);
      loadServices();
    } catch (err) {
      setServices(prev => [cloned, ...prev]);
      toast.success("Service duplicated locally!");
    }
  };

  // Delete Service
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteService(currentGymId, deleteModal.id);
      setServices(prev => prev.filter(s => s.id !== deleteModal.id));
      toast.success("Service removed from catalog!");
    } catch (err) {
      setServices(prev => prev.filter(s => s.id !== deleteModal.id));
      toast.success("Removed locally");
    } finally {
      setDeleteModal(null);
    }
  };

  // Toggle Benefit
  const handleToggleBenefit = (benefit) => {
    setForm(prev => {
      const exists = prev.benefits.includes(benefit);
      return {
        ...prev,
        benefits: exists
          ? prev.benefits.filter(b => b !== benefit)
          : [...prev.benefits, benefit]
      };
    });
  };

  const handleAddCustomBenefit = () => {
    if (!form.customBenefitInput.trim()) return;
    setForm(prev => ({
      ...prev,
      benefits: [...prev.benefits, prev.customBenefitInput.trim()],
      customBenefitInput: ""
    }));
  };

  const handleRemoveBenefit = (index) => {
    setForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, idx) => idx !== index)
    }));
  };

  // Submit Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      icon: form.icon,
      tag: form.tag,
      isFree: form.isFree,
      price: form.isFree ? 0 : Number(form.price),
      originalPrice: form.isFree ? 0 : Number(form.originalPrice) || Number(form.price),
      billingType: form.isFree ? "Included in Plan" : form.billingType,
      timing: form.timing,
      duration: form.duration,
      capacity: form.capacity,
      instructor: form.instructor,
      desc: form.desc,
      benefits: form.benefits,
      isActive: form.isActive
    };

    try {
      if (editingId) {
        await updateService(currentGymId, editingId, payload);
        toast.success("Service updated successfully!");
      } else {
        await addService(currentGymId, payload);
        toast.success("New facility/service launched!");
      }
      setModalOpen(false);
      loadServices();
    } catch (err) {
      console.warn("Saving locally:", err);
      if (editingId) {
        setServices(prev =>
          prev.map(item => (item.id === editingId ? { ...item, ...payload } : item))
        );
      } else {
        setServices(prev => [{ id: "s_" + Date.now(), ...payload, subscriberCount: 0 }, ...prev]);
      }
      toast.success("Saved successfully!");
      setModalOpen(false);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = (s) => {
    const text = `⭐ *UNIVO GYM FACILITY & SERVICE: ${s.name.toUpperCase()}*\n\n` +
      `📌 *Category:* ${s.category}\n` +
      `💰 *Price:* ${s.isFree ? "✅ FREE / Included in Membership" : `Rs. ${Number(s.price).toLocaleString("en-IN")} (${s.billingType})`}\n` +
      `⏰ *Timing:* ${s.timing}\n` +
      (s.instructor ? `👨‍🏫 *In-charge / Coach:* ${s.instructor}\n` : "") +
      `\n📝 *Details:*\n${s.desc || "Specialized gym facility for athletes."}\n\n` +
      `✨ *What's Included:*\n` +
      (s.benefits || []).map(b => `• ${b}`).join("\n") +
      `\n\n🏋️‍♂️ Contact front desk to book or inquire today!`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Filtered & Sorted
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      // Search
      const matchesSearch =
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.desc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.instructor?.toLowerCase().includes(searchTerm.toLowerCase());

      // Category
      let matchesCategory = true;
      if (selectedCategory !== "all") {
        matchesCategory = s.category === selectedCategory;
      }

      // Billing
      let matchesBilling = true;
      if (billingFilter === "paid") matchesBilling = !s.isFree;
      else if (billingFilter === "free") matchesBilling = s.isFree;
      else if (billingFilter !== "all") matchesBilling = s.billingType === billingFilter;

      // Status
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = s.isActive !== false;
      else if (statusFilter === "inactive") matchesStatus = s.isActive === false;

      return matchesSearch && matchesCategory && matchesBilling && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "popular") return (b.subscriberCount || 0) - (a.subscriberCount || 0);
      return 0;
    });
  }, [services, searchTerm, selectedCategory, billingFilter, statusFilter, sortBy]);



  return (
    <div className="space-y-6">
      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Gym Services & Facility Add-ons
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage steam sauna, physiotherapy, private lockers, diet consultation, and class batches
          </p>
        </div>

        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md hover:shadow-emerald-500/20 transition self-start sm:self-auto"
        >
          Add New Facility / Service
        </Button>
      </div>



      {/* ============================================================
          FILTER & SEARCH CONTROLS BAR
      ============================================================ */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search facility name, coach in-charge or description..."
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

          {/* Pricing Model & Sort Selectors */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={billingFilter}
              onChange={(e) => setBillingFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Fee Models</option>
              <option value="paid">Paid Add-ons Only</option>
              <option value="free">Free / Included Only</option>
              <option value="Per Month">Per Month</option>
              <option value="Per Session">Per Session</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="popular">Most Inquired First</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: "all", label: "All Categories" },
            ...allCategories.map(cat => ({ id: cat, label: cat }))
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategory === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
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
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                statusFilter === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Active
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
          SERVICES CATALOG GRID
      ============================================================ */}
      {filteredServices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No services match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or create a brand new service or wellness facility.
          </p>
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
            className="bg-emerald-600 text-white text-xs font-bold"
          >
            Add New Facility
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((s) => {
            const IconComponent = ICON_MAP[s.icon] || Dumbbell;
            const catConfig = CATEGORIES[s.category] || CATEGORIES["Recovery & Spa"] || { color: "bg-slate-100 text-slate-700 border-slate-200", badge: "border-slate-500", icon: "bath" };
            const discount =
              !s.isFree && s.originalPrice > s.price
                ? Math.round(((s.originalPrice - s.price) / s.originalPrice) * 100)
                : 0;

            return (
              <div
                key={s.id}
                className={`group rounded-3xl bg-white border-2 flex flex-col justify-between relative shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  catConfig.badge
                } ${!s.isActive ? "opacity-75 grayscale-[30%]" : ""}`}
              >
                {/* Main Card Body */}
                <div className="p-5 space-y-4">
                  {/* Top Header: Icon + Category + Price Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-700 flex items-center justify-center transition shadow-2xs">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${catConfig.color}`}>
                          {s.category}
                        </span>
                        {s.tag && (
                          <p className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {s.tag}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Active Status Badge */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(s)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                        s.isActive !== false
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                      title={s.isActive !== false ? "Click to Deactivate" : "Click to Activate"}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s.isActive !== false ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {s.isActive !== false ? "Active" : "Paused"}
                    </button>
                  </div>

                  {/* Service Title & Description */}
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                      {s.name}
                    </h3>
                    {s.desc && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {s.desc}
                      </p>
                    )}
                  </div>

                  {/* Pricing Box */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      {s.isFree ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl border border-emerald-300">
                            Included in Membership
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xl font-black text-slate-900">
                            Rs. {Number(s.price).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            / {s.billingType || "session"}
                          </span>
                          {discount > 0 && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 ml-1">
                              {discount}% OFF
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {s.subscriberCount !== undefined && s.subscriberCount > 0 && (
                      <div className="text-[11px] font-semibold text-slate-400">
                        {s.subscriberCount} enrolled
                      </div>
                    )}
                  </div>

                  {/* Operational Details (Timing, Coach, Duration) */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-white p-2.5 rounded-2xl border border-slate-100">
                    {s.timing && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{s.timing}</span>
                      </div>
                    )}
                    {s.duration && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{s.duration}</span>
                        {s.capacity && <span className="text-slate-400">• {s.capacity}</span>}
                      </div>
                    )}
                    {s.instructor && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="text-indigo-900 font-bold truncate">In-charge: {s.instructor}</span>
                      </div>
                    )}
                  </div>

                  {/* Key Benefits List */}
                  {s.benefits && s.benefits.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Included Benefits
                      </span>
                      <ul className="space-y-1.5">
                        {s.benefits.slice(0, 3).map((b, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 leading-snug">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="truncate">{b}</span>
                          </li>
                        ))}
                        {s.benefits.length > 3 && (
                          <li className="text-[11px] text-slate-400 font-semibold pl-5">
                            +{s.benefits.length - 3} more amenities included
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Edit Service"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteModal(s)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Service"
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
          CREATE / EDIT SERVICE MODAL
      ============================================================ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "✏️ Edit Gym Facility & Service" : "✨ Launch New Facility / Service"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-slate-800">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setModalTab("basic")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                modalTab === "basic" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              1. Basic & Pricing
            </button>
            <button
              type="button"
              onClick={() => setModalTab("schedule")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                modalTab === "schedule" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              2. Timing & In-charge
            </button>
            <button
              type="button"
              onClick={() => setModalTab("benefits")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                modalTab === "benefits" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              3. Benefits ({form.benefits.length})
            </button>
          </div>

          {/* TAB 1: BASIC & PRICING */}
          {modalTab === "basic" && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Service / Facility Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Personal Training (1-on-1 PT)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selection / Custom Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Category</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCustomCategory) {
                          setIsCustomCategory(true);
                          setForm({ ...form, category: "" });
                        } else {
                          setIsCustomCategory(false);
                          setForm({ ...form, category: PRESET_SERVICE_CATEGORIES[0] });
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {isCustomCategory ? "← Select List" : "+ Custom"}
                    </button>
                  </div>
                  {isCustomCategory ? (
                    <input
                      type="text"
                      placeholder="Type custom category name..."
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-emerald-400 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      {allCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__custom__">✨ + Type Custom Category...</option>
                    </select>
                  )}
                </div>

                {/* Highlight Badge Tag Selection / Custom Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Highlight Badge Tag</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCustomTag) {
                          setIsCustomTag(true);
                          setForm({ ...form, tag: "" });
                        } else {
                          setIsCustomTag(false);
                          setForm({ ...form, tag: PRESET_SERVICE_TAGS[0] });
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {isCustomTag ? "← Select List" : "+ Custom"}
                    </button>
                  </div>
                  {isCustomTag ? (
                    <input
                      type="text"
                      placeholder="Type custom badge (e.g. Hot Deal, New)..."
                      value={form.tag}
                      onChange={(e) => setForm({ ...form, tag: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-emerald-400 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  ) : (
                    <select
                      value={form.tag}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomTag(true);
                          setForm({ ...form, tag: "" });
                        } else {
                          setForm({ ...form, tag: e.target.value === "None" ? "" : e.target.value });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      {allTags.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="__custom__">✨ + Type Custom Badge...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Free vs Paid Toggle */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">Complimentary / Free Facility</span>
                  <span className="text-[11px] text-slate-500">Is this facility included for free in memberships?</span>
                </div>
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {/* Price Fields (if not free) */}
              {!form.isFree && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">Fee (Rs.) *</label>
                    <input
                      required
                      type="number"
                      placeholder="1500"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Billing Unit</label>
                    <select
                      value={form.billingType}
                      onChange={(e) => setForm({ ...form, billingType: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Per Session">Per Session</option>
                      <option value="Per Month">Per Month</option>
                      <option value="Per Quarter">Per Quarter (3 Mos)</option>
                      <option value="Per Year">Per Year</option>
                      <option value="One-time Fee">One-time Fee</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Original MRP (Rs.)</label>
                    <input
                      type="number"
                      placeholder="2000"
                      value={form.originalPrice}
                      onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Shows discount</span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description & Overview</label>
                <textarea
                  rows={2}
                  placeholder="Briefly explain what athletes will achieve with this facility..."
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Service Icon Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Service Icon</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(ICON_MAP).map((iconKey) => {
                    const IconComp = ICON_MAP[iconKey];
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setForm({ ...form, icon: iconKey })}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                          form.icon === iconKey
                            ? "bg-slate-900 text-white shadow-xs scale-105"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={iconKey}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMING & IN-CHARGE */}
          {modalTab === "schedule" && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Timings / Operating Hours</label>
                <input
                  type="text"
                  placeholder="e.g. Daily (7:00 AM - 11:00 AM & 5:00 PM - 9:00 PM)"
                  value={form.timing}
                  onChange={(e) => setForm({ ...form, timing: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Session Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 45 mins / session"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Capacity / Slots</label>
                  <input
                    type="text"
                    placeholder="e.g. 1-on-1 Individual or Max 15 per batch"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Instructor / Specialist / Attendant In-charge
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coach Vikram Singh or Dr. Shalini (Nutritionist)"
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="activeToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Publish this facility immediately in gym services directory
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: BENEFITS & WHAT'S INCLUDED */}
          {modalTab === "benefits" && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  1-Click Select Standard Amenities & Benefits
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {PRESET_BENEFITS.map((b, idx) => {
                    const isSelected = form.benefits.includes(b);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleBenefit(b)}
                        className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition ${
                          isSelected
                            ? "bg-emerald-100/90 text-emerald-900 border border-emerald-300"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                      >
                        <CheckSquare className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-700" : "text-slate-400"}`} />
                        <span className="truncate">{b}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Benefits List */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Active Service Benefits ({form.benefits.length})
                </label>
                <div className="space-y-1.5 mb-2.5 max-h-40 overflow-y-auto">
                  {form.benefits.map((item, idx) => (
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
                        onClick={() => handleRemoveBenefit(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Custom Benefit Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom benefit (e.g. Free 1KG Protein Shaker)..."
                    value={form.customBenefitInput}
                    onChange={(e) => setForm({ ...form, customBenefitInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomBenefit();
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBenefit}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-emerald-600 transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {modalTab !== "basic" ? (
              <button
                type="button"
                onClick={() => setModalTab(modalTab === "benefits" ? "schedule" : "basic")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Previous
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {modalTab !== "benefits" ? (
                <button
                  type="button"
                  onClick={() => setModalTab(modalTab === "basic" ? "schedule" : "benefits")}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                >
                  Next →
                </button>
              ) : null}

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition"
              >
                {editingId ? "Save Facility Changes" : "Launch Facility Service"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ============================================================
          DELETE CONFIRMATION MODAL
      ============================================================ */}
      {deleteModal && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteModal(null)}
          title="⚠️ Remove Service / Facility"
        >
          <div className="space-y-4 text-slate-800">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-slate-900 font-bold">"{deleteModal.name}"</strong>?
              This service will no longer appear in your gym directory or be available for new enrollments.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Remove Facility
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}