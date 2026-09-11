import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Users,
  Star,
  Phone,
  Edit2,
  Eye,
  Loader2,
  X,
  Upload,
  UserCircle,
  Dumbbell,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  getTrainers,
  addTrainer,
  updateTrainer,
} from "../../firebase/trainers";

// ─── Constants ────────────────────────────────────────────────────────────────
const SPECIALIZATION_OPTIONS = [
  "Weight Training",
  "Cardio",
  "Yoga",
  "Nutrition",
  "CrossFit",
  "HIIT",
  "Pilates",
  "Zumba",
  "Boxing",
  "Calisthenics",
  "Powerlifting",
  "Stretching & Flexibility",
];

const SPEC_COLORS = {
  "Weight Training": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Cardio: "bg-red-500/20 text-red-300 border-red-500/30",
  Yoga: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Nutrition: "bg-green-500/20 text-green-300 border-green-500/30",
  CrossFit: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  HIIT: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  Pilates: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  Zumba: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  Boxing: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  Calisthenics: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Powerlifting: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Stretching & Flexibility": "bg-lime-500/20 text-lime-300 border-lime-500/30",
};

const INPUT_CLS =
  "w-full bg-slate-900/70 border border-slate-600/60 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/20";

const LABEL_CLS = "block text-sm font-medium text-slate-300 mb-1.5";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "teal" }) {
  const colorMap = {
    teal: "from-teal-500/20 to-teal-600/10 border-teal-500/20 text-teal-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/20 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/20 text-yellow-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-xl bg-slate-800/60 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorMap[color].split(" ").at(-1)}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

// ─── Trainer Card ─────────────────────────────────────────────────────────────
function TrainerCard({ trainer, onEdit, onView }) {
  const initials = trainer.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    if (trainer.phone) {
      const num = trainer.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${num}`, "_blank");
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden hover:border-teal-500/30 transition-all duration-300 group">
      {/* Photo / Avatar */}
      <div className="relative h-44 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden">
        {trainer.photoURL ? (
          <img
            src={trainer.photoURL}
            alt={trainer.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-teal-500/30">
              {initials || <UserCircle className="w-10 h-10" />}
            </div>
          </div>
        )}
        {/* Member count badge */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm border border-slate-600/50 rounded-full px-3 py-1 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-xs font-semibold text-white">
            {trainer.memberCount ?? 0} Members
          </span>
        </div>
        {/* Rating badge */}
        {trainer.rating > 0 && (
          <div className="absolute top-3 left-3 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/40 rounded-full px-2.5 py-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300">
              {trainer.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-1">{trainer.name}</h3>

        {/* Experience */}
        {trainer.experience && (
          <p className="text-xs text-slate-400 mb-3">
            {trainer.experience} yr{trainer.experience !== 1 ? "s" : ""} experience
          </p>
        )}

        {/* Specializations */}
        {trainer.specializations?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {trainer.specializations.slice(0, 3).map((s) => (
              <span
                key={s}
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  SPEC_COLORS[s] || "bg-slate-700 text-slate-300 border-slate-600"
                }`}
              >
                {s}
              </span>
            ))}
            {trainer.specializations.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/50 text-slate-400">
                +{trainer.specializations.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bio preview */}
        {trainer.bio && (
          <p className="text-sm text-slate-400 line-clamp-2 mb-4">{trainer.bio}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onView(trainer)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 rounded-xl py-2 text-xs font-semibold transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View Profile
          </button>
          <button
            onClick={handleWhatsApp}
            disabled={!trainer.phone}
            className="w-9 h-9 flex items-center justify-center bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(trainer)}
            className="w-9 h-9 flex items-center justify-center bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-300 rounded-xl transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
function TrainerModal({ isOpen, onClose, onSave, editingTrainer }) {
  const [saving, setSaving] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [specOpen, setSpecOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (isOpen) {
      if (editingTrainer) {
        reset({
          name: editingTrainer.name || "",
          email: editingTrainer.email || "",
          phone: editingTrainer.phone || "",
          bio: editingTrainer.bio || "",
          salary: editingTrainer.salary || "",
          joinDate: editingTrainer.joinDate || "",
          experience: editingTrainer.experience || "",
          photoURL: editingTrainer.photoURL || "",
        });
        setSelectedSpecs(editingTrainer.specializations || []);
      } else {
        reset({});
        setSelectedSpecs([]);
      }
    }
  }, [isOpen, editingTrainer, reset]);

  const toggleSpec = (s) => {
    setSelectedSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await onSave({ ...data, specializations: selectedSpecs });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-slate-800/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 sticky top-0 bg-slate-800/95 backdrop-blur-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-white">
              {editingTrainer ? "Edit Trainer" : "Add New Trainer"}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {editingTrainer ? "Update trainer information" : "Fill in trainer details below"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Photo URL */}
          <div>
            <label className={LABEL_CLS}>Photo URL (optional)</label>
            <div className="relative">
              <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                {...register("photoURL")}
                placeholder="https://example.com/photo.jpg"
                className={`${INPUT_CLS} pl-10`}
              />
            </div>
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register("name", { required: "Name is required" })}
                placeholder="e.g. Rajesh Kumar"
                className={INPUT_CLS}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className={LABEL_CLS}>Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="trainer@gym.com"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Phone & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Phone Number</label>
              <input
                {...register("phone")}
                placeholder="+91 98765 43210"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Experience (years)</label>
              <input
                {...register("experience", { valueAsNumber: true })}
                type="number"
                min="0"
                max="50"
                placeholder="e.g. 5"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Specializations */}
          <div>
            <label className={LABEL_CLS}>Specializations</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpecOpen((v) => !v)}
                className={`${INPUT_CLS} flex items-center justify-between text-left`}
              >
                <span className={selectedSpecs.length ? "text-white" : "text-slate-500"}>
                  {selectedSpecs.length
                    ? `${selectedSpecs.length} selected`
                    : "Select specializations"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${specOpen ? "rotate-180" : ""}`}
                />
              </button>
              {specOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden z-20 shadow-xl max-h-52 overflow-y-auto">
                  {SPECIALIZATION_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpec(s)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-700/50 transition-colors ${
                        selectedSpecs.includes(s) ? "text-teal-400" : "text-slate-300"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          selectedSpecs.includes(s)
                            ? "bg-teal-500 border-teal-500"
                            : "border-slate-600"
                        }`}
                      >
                        {selectedSpecs.includes(s) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Selected tags */}
            {selectedSpecs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedSpecs.map((s) => (
                  <span
                    key={s}
                    className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      SPEC_COLORS[s] || "bg-slate-700 text-slate-300 border-slate-600"
                    }`}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => toggleSpec(s)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className={LABEL_CLS}>Bio</label>
            <textarea
              {...register("bio")}
              rows={3}
              placeholder="Brief description about the trainer's background and approach..."
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          {/* Salary & Join Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Monthly Salary (₹)</label>
              <input
                {...register("salary", { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="e.g. 25000"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Join Date</label>
              <input
                {...register("joinDate")}
                type="date"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-400 hover:to-green-400 text-white text-sm font-semibold shadow-lg shadow-teal-500/25 transition-all disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTrainer ? "Update Trainer" : "Add Trainer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Trainers() {
  const { gymId } = useAuth();
  const navigate = useNavigate();

  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);

  const load = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    try {
      const data = await getTrainers(gymId);
      setTrainers(data);
    } catch (err) {
      toast.error("Failed to load trainers");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    try {
      if (editingTrainer) {
        await updateTrainer(gymId, editingTrainer.id, data);
        toast.success("Trainer updated successfully!");
      } else {
        await addTrainer(gymId, data);
        toast.success("Trainer added successfully!");
      }
      await load();
    } catch (err) {
      toast.error("Failed to save trainer");
      throw err;
    }
  };

  const openAdd = () => {
    setEditingTrainer(null);
    setModalOpen(true);
  };

  const openEdit = (trainer) => {
    setEditingTrainer(trainer);
    setModalOpen(true);
  };

  const openView = (trainer) => {
    navigate(`/owner/trainers/${trainer.id}`);
  };

  // Stats
  const totalTrainers = trainers.length;
  const totalPTMembers = trainers.reduce((acc, t) => acc + (t.memberCount || 0), 0);
  const avgRating =
    trainers.filter((t) => t.rating > 0).length > 0
      ? (
          trainers.reduce((acc, t) => acc + (t.rating || 0), 0) /
          trainers.filter((t) => t.rating > 0).length
        ).toFixed(1)
      : "N/A";

  const filtered = trainers.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.specializations?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Background blobs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-green-500/20 border border-teal-500/30 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-teal-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Trainers</h1>
              <span className="bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-semibold px-2.5 py-1 rounded-full">
                {totalTrainers}
              </span>
            </div>
            <p className="text-slate-400 text-sm">
              Manage your gym's training staff
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-400 hover:to-green-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Trainer
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Users} label="Total Trainers" value={totalTrainers} color="teal" />
          <StatCard icon={Dumbbell} label="Active PT Members" value={totalPTMembers} color="green" />
          <StatCard icon={Star} label="Avg Rating" value={avgRating} color="yellow" />
        </div>

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainers or specializations..."
            className="w-full bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm">
              {search ? "No trainers match your search" : "No trainers added yet"}
            </p>
            {!search && (
              <button
                onClick={openAdd}
                className="text-teal-400 hover:text-teal-300 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add your first trainer
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((trainer) => (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                onEdit={openEdit}
                onView={openView}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <TrainerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingTrainer={editingTrainer}
      />
    </div>
  );
}
