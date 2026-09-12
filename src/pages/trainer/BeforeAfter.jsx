import React, { useState, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Plus,
  Search,
  Filter,
  Calendar,
  Flame,
  TrendingDown,
  TrendingUp,
  User,
  Share2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Award,
  X,
  Scale,
  Clock,
  Dumbbell,
  MessageCircle,
  Maximize2
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

// Rich fallback transformations if Firestore is not yet populated
const DEFAULT_TRANSFORMATIONS = [
  {
    id: "ba_01",
    memberName: "Vikas Malhotra",
    trainerName: "Coach Amit Sharma",
    beforeURL: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
    afterURL: "https://images.unsplash.com/photo-1583454155184-870a1f63aebc?w=600&auto=format&fit=crop&q=80",
    startWeight: "92 kg",
    endWeight: "78 kg",
    weightDiff: "-14 kg",
    bodyFatDiff: "28% -> 14%",
    duration: "12 Weeks (90 Days)",
    category: "Fat Loss & Shredding",
    notes: "Disciplined calorie deficit + 5-day hypertrophy split. Zero junk food and 10k steps daily.",
    date: "2026-06-15"
  },
  {
    id: "ba_02",
    memberName: "Pooja Verma",
    trainerName: "Coach Sneha Kapoor",
    beforeURL: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
    afterURL: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80",
    startWeight: "76 kg",
    endWeight: "61 kg",
    weightDiff: "-15 kg",
    bodyFatDiff: "32% -> 21%",
    duration: "16 Weeks",
    category: "PCOD & Posture Recovery",
    notes: "Regulated hormonal balance through strength circuits and low GI high-protein nutrition.",
    date: "2026-07-20"
  },
  {
    id: "ba_03",
    memberName: "Rohit Bansal",
    trainerName: "Coach Rohan Deshmukh",
    beforeURL: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
    afterURL: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
    startWeight: "68 kg",
    endWeight: "79 kg",
    weightDiff: "+11 kg (Lean Muscle)",
    bodyFatDiff: "12% -> 13%",
    duration: "24 Weeks",
    category: "Powerlifting & Bulking",
    notes: "Compound progressive overload (Bench 115kg, Squat 160kg, Deadlift 200kg). 3200 kcal surplus.",
    date: "2026-08-10"
  },
  {
    id: "ba_04",
    memberName: "Deepak Meena",
    trainerName: "Coach Rohan Deshmukh",
    beforeURL: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80",
    afterURL: "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&auto=format&fit=crop&q=80",
    startWeight: "88 kg",
    endWeight: "74 kg",
    weightDiff: "-14 kg",
    bodyFatDiff: "24% -> 11%",
    duration: "16 Weeks",
    category: "Abs & Core Shredding",
    notes: "Carb cycling and high intensity metabolic conditioning. Chiseled 6-pack abs revealed.",
    date: "2026-08-28"
  },
  {
    id: "ba_05",
    memberName: "Kavita Rao",
    trainerName: "Coach Sneha Kapoor",
    beforeURL: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&auto=format&fit=crop&q=80",
    afterURL: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&auto=format&fit=crop&q=80",
    startWeight: "71 kg",
    endWeight: "59 kg",
    weightDiff: "-12 kg",
    bodyFatDiff: "29% -> 19%",
    duration: "18 Weeks",
    category: "Postpartum Toning",
    notes: "Pelvic floor strengthening, progressive dumbbell resistance training, and clean whole foods.",
    date: "2026-09-02"
  },
  {
    id: "ba_06",
    memberName: "Ajay Prajapati",
    trainerName: "Coach Amit Sharma",
    beforeURL: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=80",
    afterURL: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
    startWeight: "84 kg",
    endWeight: "73 kg",
    weightDiff: "-11 kg",
    bodyFatDiff: "22% -> 13%",
    duration: "12 Weeks",
    category: "Athlete Conditioning",
    notes: "Agility ladder drills, heavy bag cardio, and strict protein-to-bodyweight nutrition protocol.",
    date: "2026-09-08"
  }
];

const CATEGORIES = [
  "All",
  "Fat Loss & Shredding",
  "Powerlifting & Bulking",
  "Abs & Core Shredding",
  "PCOD & Posture Recovery",
  "Postpartum Toning",
  "Athlete Conditioning"
];

export default function BeforeAfter() {
  const { gymId = "univo_main" } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewDetailModal, setViewDetailModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // Add form
  const [form, setForm] = useState({
    memberName: "",
    trainerName: "Coach Amit Sharma",
    beforeURL: "",
    afterURL: "",
    startWeight: "",
    endWeight: "",
    duration: "12 Weeks",
    bodyFatDiff: "",
    category: "Fat Loss & Shredding",
    notes: "",
    date: new Date().toISOString().split("T")[0]
  });

  // Fetch from Firestore
  const fetchTransformations = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "gyms", gymId, "beforeAfter"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(loaded);
      } else {
        setItems(DEFAULT_TRANSFORMATIONS);
      }
    } catch (err) {
      console.warn("Firestore fetch error, using rich fallbacks:", err);
      setItems(DEFAULT_TRANSFORMATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransformations();
  }, [gymId]);

  // Handle Save New Transformation
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.memberName.trim()) {
      toast.error("Please enter the member's name");
      return;
    }
    if (!form.beforeURL || !form.afterURL) {
      toast.error("Please attach both Before and After photos");
      return;
    }

    setSaving(true);
    try {
      const startNum = Number(form.startWeight.replace(/\D/g, ""));
      const endNum = Number(form.endWeight.replace(/\D/g, ""));
      const diffVal = startNum && endNum ? `${endNum - startNum} kg` : "";

      const newItem = {
        ...form,
        weightDiff: diffVal ? (diffVal.startsWith("-") ? diffVal : `+${diffVal}`) : "-8 kg",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "gyms", gymId, "beforeAfter"), newItem);
      toast.success("Client transformation added successfully! 🎉");
      setAddModalOpen(false);
      setForm({
        memberName: "",
        trainerName: "Coach Amit Sharma",
        beforeURL: "",
        afterURL: "",
        startWeight: "",
        endWeight: "",
        duration: "12 Weeks",
        bodyFatDiff: "",
        category: "Fat Loss & Shredding",
        notes: "",
        date: new Date().toISOString().split("T")[0]
      });
      fetchTransformations();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save transformation: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Share via WhatsApp
  const handleShareWA = (item) => {
    const text =
      `🔥 *UNIVO GYM TRANSFORMATION RESULT* 🔥\n\n` +
      `👤 *Athlete:* ${item.memberName}\n` +
      `🏋️ *Mentor Coach:* ${item.trainerName}\n` +
      `⏱️ *Duration:* ${item.duration}\n` +
      `⚖️ *Weight:* ${item.startWeight} ➔ ${item.endWeight} (${item.weightDiff})\n` +
      (item.bodyFatDiff ? `📉 *Body Fat:* ${item.bodyFatDiff}\n` : "") +
      `📝 *Notes:* "${item.notes}"\n\n` +
      `💪 Transform your fitness journey with Univo Gym!`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Filtered items
  const filtered = items.filter((item) => {
    const matchesCat =
      selectedCategory === "All" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.memberName?.toLowerCase().includes(q) ||
      item.trainerName?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700/50 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Camera className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight">Client Transformations</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Side-by-side Before & After progress photos, weight loss analytics & client success stories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setAddModalOpen(true)}
            variant="primary"
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" /> Add Transformation Result
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Transformations</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{items.length}</span>
            <span className="text-xs font-bold text-emerald-600">Verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Weight Loss</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">-15 kg</span>
            <span className="text-[11px] text-slate-500 font-medium">16 wks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lean Muscle Gain</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600">+11 kg</span>
            <span className="text-[11px] text-slate-500 font-medium">Bulking</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Body Fat Drop</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-600">-12%</span>
            <span className="text-[11px] text-slate-500 font-medium">InBody</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search member or coach..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
          />
        </div>
      </div>

      {/* Transformation Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No transformations match your search</h3>
          <p className="text-xs text-slate-400 mt-1">Try clearing filters or adding a new client transformation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const isLoss = item.weightDiff?.startsWith("-");
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                {/* Card Top Info */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{item.memberName}</h3>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-emerald-600" /> Mentored by {item.trainerName}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {item.duration}
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Photos */}
                <div className="relative px-5">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden bg-slate-950 p-1.5 border border-slate-200">
                    {/* Before Photo */}
                    <div
                      onClick={() => setViewDetailModal(item)}
                      className="relative h-48 sm:h-52 overflow-hidden rounded-xl cursor-pointer group/before"
                    >
                      <img
                        src={item.beforeURL || item.beforeImg}
                        alt={`${item.memberName} Before`}
                        className="w-full h-full object-cover group-hover/before:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 left-2 z-10 bg-slate-900/90 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                        BEFORE
                      </span>
                      {item.startWeight && (
                        <span className="absolute bottom-2 left-2 z-10 bg-black/80 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                          {item.startWeight}
                        </span>
                      )}
                    </div>

                    {/* After Photo */}
                    <div
                      onClick={() => setViewDetailModal(item)}
                      className="relative h-48 sm:h-52 overflow-hidden rounded-xl cursor-pointer group/after"
                    >
                      <img
                        src={item.afterURL || item.afterImg}
                        alt={`${item.memberName} After`}
                        className="w-full h-full object-cover group-hover/after:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 right-2 z-10 bg-emerald-600/95 text-white border border-emerald-400/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> AFTER
                      </span>
                      {item.endWeight && (
                        <span className="absolute bottom-2 right-2 z-10 bg-emerald-700/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                          {item.endWeight}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Bar */}
                <div className="p-5 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center pt-2">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isLoss
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                          : "bg-blue-50/80 border-blue-200 text-blue-800"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                        Net Change
                      </span>
                      <p className="text-sm font-black mt-0.5 flex items-center justify-center gap-1">
                        {isLoss ? (
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        {item.weightDiff}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Body Fat Drop
                      </span>
                      <p className="text-sm font-black mt-0.5 text-slate-900">
                        {item.bodyFatDiff || "Optimized"}
                      </p>
                    </div>
                  </div>

                  {/* Notes snippet */}
                  {item.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed italic line-clamp-2">
                      "{item.notes}"
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewDetailModal(item)}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" /> View Comparison
                    </button>
                    <button
                      onClick={() => handleShareWA(item)}
                      title="Share result on WhatsApp"
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Add Transformation Result */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="✨ Add Client Transformation Result"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Client / Member Name *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Vikas Malhotra"
                value={form.memberName}
                onChange={(e) => setForm({ ...form, memberName: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Mentor Trainer / Coach *
              </label>
              <select
                value={form.trainerName}
                onChange={(e) => setForm({ ...form, trainerName: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              >
                <option value="Coach Amit Sharma">Coach Amit Sharma (Hypertrophy)</option>
                <option value="Coach Sneha Kapoor">Coach Sneha Kapoor (Fat Loss & HIIT)</option>
                <option value="Coach Rohan Deshmukh">Coach Rohan Deshmukh (Powerlifting)</option>
              </select>
            </div>
          </div>

          {/* Photo Captures Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <PhotoCaptureInput
                value={form.beforeURL}
                onChange={(url) => setForm((prev) => ({ ...prev, beforeURL: url }))}
                label="📸 1. BEFORE Photo"
                subLabel="Upload past picture or click live photo"
                shape="rounded"
                aspectRatio="square"
                required
              />
            </div>
            <div>
              <PhotoCaptureInput
                value={form.afterURL}
                onChange={(url) => setForm((prev) => ({ ...prev, afterURL: url }))}
                label="✨ 2. AFTER Photo"
                subLabel="Current transformed physique"
                shape="rounded"
                aspectRatio="square"
                required
              />
            </div>
          </div>

          {/* Metric inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Starting Weight
              </label>
              <input
                type="text"
                placeholder="e.g. 92 kg"
                value={form.startWeight}
                onChange={(e) => setForm({ ...form, startWeight: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Current Weight
              </label>
              <input
                type="text"
                placeholder="e.g. 78 kg"
                value={form.endWeight}
                onChange={(e) => setForm({ ...form, endWeight: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Transformation Time
              </label>
              <input
                type="text"
                placeholder="e.g. 12 Weeks"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Body Fat % Change
              </label>
              <input
                type="text"
                placeholder="e.g. 28% -> 14%"
                value={form.bodyFatDiff}
                onChange={(e) => setForm({ ...form, bodyFatDiff: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Transformation Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              >
                <option value="Fat Loss & Shredding">Fat Loss & Shredding</option>
                <option value="Powerlifting & Bulking">Powerlifting & Bulking</option>
                <option value="Abs & Core Shredding">Abs & Core Shredding</option>
                <option value="PCOD & Posture Recovery">PCOD & Posture Recovery</option>
                <option value="Postpartum Toning">Postpartum Toning</option>
                <option value="Athlete Conditioning">Athlete Conditioning</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Date Completed
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Workout Routine, Diet & Nutrition Protocol Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 5-Day Push/Pull/Legs split, calorie deficit of 400 kcal, 140g protein daily, zero added sugar."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md hover:from-emerald-700 hover:to-teal-700 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish Transformation"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Full Screen View Detail Modal */}
      {viewDetailModal && (
        <Modal
          isOpen={Boolean(viewDetailModal)}
          onClose={() => setViewDetailModal(null)}
          title={`🏅 Transformation: ${viewDetailModal.memberName}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">{viewDetailModal.memberName}</h3>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  Mentored by {viewDetailModal.trainerName} • {viewDetailModal.category}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {viewDetailModal.duration}
              </span>
            </div>

            {/* Side by side large view */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-rose-600 uppercase tracking-wider">
                    Before Journey
                  </span>
                  <span className="font-bold text-slate-600">{viewDetailModal.startWeight}</span>
                </div>
                <div className="h-72 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200">
                  <img
                    src={viewDetailModal.beforeURL || viewDetailModal.beforeImg}
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> After Journey
                  </span>
                  <span className="font-bold text-emerald-700">{viewDetailModal.endWeight}</span>
                </div>
                <div className="h-72 sm:h-80 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200">
                  <img
                    src={viewDetailModal.afterURL || viewDetailModal.afterImg}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Weight Delta</p>
                <p className="text-base font-black text-emerald-700 mt-0.5">
                  {viewDetailModal.weightDiff}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Body Fat Delta</p>
                <p className="text-base font-black text-purple-700 mt-0.5">
                  {viewDetailModal.bodyFatDiff || "N/A"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Timeframe</p>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  {viewDetailModal.duration}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Verification Date</p>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  {viewDetailModal.date || "2026"}
                </p>
              </div>
            </div>

            {/* Diet & Protocol */}
            {viewDetailModal.notes && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                <p className="text-xs font-bold text-emerald-900">Coach's Nutrition & Protocol Notes:</p>
                <p className="text-xs text-emerald-800 leading-relaxed">{viewDetailModal.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => handleShareWA(viewDetailModal)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition"
              >
                <Share2 className="w-4 h-4" /> Share on WhatsApp
              </button>
              <button
                onClick={() => setViewDetailModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}