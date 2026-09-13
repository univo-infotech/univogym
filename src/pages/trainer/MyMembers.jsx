import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  MessageCircle,
  Eye,
  Dumbbell,
  Award,
  Flame,
  Calendar,
  Clock,
  Scale,
  Apple,
  TrendingDown,
  Sparkles,
  Activity,
  CheckCircle2,
  Filter
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getTrainerMembers, getTrainer, getTrainers } from "../../firebase/trainers";
import AthleteHealthDietModal from "../../components/trainer/AthleteHealthDietModal";

export default function MyMembers() {
  const { gymId, profileId, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [trainerInfo, setTrainerInfo] = useState(user || null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const GID = gymId || "univo_main";
        let tData = null;

        if (profileId) {
          try {
            tData = await getTrainer(GID, profileId);
          } catch (e) {}
        }

        if (!tData) {
          const savedSession = localStorage.getItem("univo_trainer_session");
          if (savedSession) {
            try {
              tData = JSON.parse(savedSession);
            } catch (e) {}
          }
        }

        if (!tData || !tData.name) {
          try {
            const allTrainers = await getTrainers(GID);
            const searchEmail = (user?.email || "").toLowerCase().trim();
            const searchName = (user?.displayName || "").toLowerCase().trim();
            const found = allTrainers.find((t) => {
              const tEmail = (t.email || t.loginEmail || "").toLowerCase().trim();
              const tName = (t.name || t.fullName || "").toLowerCase().trim();
              return (searchEmail && tEmail === searchEmail) || (searchName && tName === searchName);
            });
            if (found) tData = found;
          } catch (e) {}
        }

        if (tData) setTrainerInfo(tData);

        const tId = tData?.id || profileId || "";
        const tName = tData?.name || user?.displayName || "";
        const data = await getTrainerMembers(GID, tId, tName);
        setMembers(data);
      } catch (err) {
        console.error("Failed to load trainer members:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gymId, profileId, user]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        (m.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.phone || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.ptPlanName || m.planName || "").toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === "active") {
        return (m.status || "").toLowerCase() === "active";
      }
      if (statusFilter === "expiring") {
        const endDate = m.ptEndDate || m.expiryDate;
        if (!endDate) return false;
        const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days <= 7 && days >= 0;
      }
      return true;
    });
  }, [members, search, statusFilter]);

  const handleMemberUpdated = (updatedM) => {
    setMembers((prev) =>
      prev.map((item) => (item.id === updatedM.id ? { ...item, ...updatedM } : item))
    );
    if (selectedAthlete && selectedAthlete.id === updatedM.id) {
      setSelectedAthlete((prev) => ({ ...prev, ...updatedM }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">My PT Athletes & Clients 🏋️‍♂️</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
              {members.length} Assigned
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Athletes assigned for your dedicated 1-on-1 personal training, diet chart management & body transformation tracking.
          </p>
        </div>

        {/* Quick Trainer Stats Banner */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Active Athletes</span>
            <p className="text-base font-black text-emerald-700">
              {members.filter((m) => (m.status || "active").toLowerCase() === "active").length}
            </p>
          </div>
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Diet Charts</span>
            <p className="text-base font-black text-teal-700">
              {members.filter((m) => m.dietPlan).length} Active
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS ROW */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by athlete name, phone..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-emerald-500 outline-none shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "active" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("expiring")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "expiring" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Expiring Soon
          </button>
        </div>
      </div>

      {/* ATHLETES GRID */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading your PT athletes...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No PT Athletes Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? "No athlete matches your search query. Try searching by a different name or phone."
              : "When the Gym Owner assigns athletes to you during registration, they will appear here with full training timelines and diet plan tools."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((m) => {
            const endDate = m.ptEndDate || m.expiryDate;
            let daysRemaining = null;
            if (endDate) {
              daysRemaining = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            }

            return (
              <div
                key={m.id}
                className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between space-y-4"
              >
                {/* Top Member Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {m.photoUrl ? (
                        <img
                          src={m.photoUrl}
                          alt={m.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                          {(m.name || "A").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">{m.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{m.phone || "No phone"}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        daysRemaining !== null && daysRemaining <= 5
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {daysRemaining !== null
                        ? daysRemaining > 0
                          ? `${daysRemaining} Days Left`
                          : "Expired"
                        : "Active PT"}
                    </span>
                  </div>

                  {/* PT Plan & Training Timeline Card */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                        {m.ptPlanName || m.planName || "1-on-1 PT Coaching"}
                      </span>
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                        {m.ptCompletedSessions || 0} Sessions Done
                      </span>
                    </div>

                    {/* Kab tak training deni hai */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> PT End Date:
                      </span>
                      <strong className="text-slate-900">
                        {m.ptEndDate || m.expiryDate || "Ongoing"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Time Slot:
                      </span>
                      <strong className="text-slate-900 truncate max-w-[140px]">
                        {m.preferredTime || m.slot || "Morning Slot"}
                      </strong>
                    </div>
                  </div>

                  {/* Weight & Diet Status Tags */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-teal-50/70 border border-teal-100">
                      <span className="text-[10px] font-bold text-teal-700 uppercase flex items-center justify-center gap-1">
                        <Scale className="w-3 h-3" /> Current Weight
                      </span>
                      <p className="font-extrabold text-slate-900 mt-0.5">
                        {m.weight ? `${m.weight} kg` : "Not logged"}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
                        <Apple className="w-3 h-3" /> Diet Plan
                      </span>
                      <p className="font-extrabold text-slate-900 mt-0.5 truncate">
                        {m.dietPlan ? "Plan Active 🥗" : "Create Plan"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedAthlete(m)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition"
                  >
                    <Apple className="w-3.5 h-3.5" /> Manage Diet & Weight
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const num = (m.phone || "").replace(/\D/g, "");
                      window.open(
                        `https://wa.me/${num}?text=Hi%20${encodeURIComponent(
                          m.name || "Athlete"
                        )},%20Coach%20checking%20in%20for%20your%20training%20session!%20💪`,
                        "_blank"
                      );
                    }}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 transition"
                    title="Message Athlete on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ATHLETE HEALTH, WEIGHT & DIET HUB MODAL */}
      {selectedAthlete && (
        <AthleteHealthDietModal
          isOpen={!!selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
          member={selectedAthlete}
          gymId={gymId || "univo_main"}
          onMemberUpdated={handleMemberUpdated}
        />
      )}
    </div>
  );
}