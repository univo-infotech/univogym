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
  Filter,
  Phone,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getTrainerMembers, getTrainer, getTrainers } from "../../firebase/trainers";
import { getMembers } from "../../firebase/members";
import { getChatRoomId, subscribeRoomMeta } from "../../firebase/chat";
import { openWhatsApp } from "../../utils/whatsapp";
import AthleteHealthDietModal from "../../components/trainer/AthleteHealthDietModal";
import DirectChatModal from "../../components/shared/DirectChatModal";

export default function MyMembers() {
  const { gymId, profileId, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [floorMembers, setFloorMembers] = useState([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState("pt"); // "pt" | "floor"
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [chatAthlete, setChatAthlete] = useState(null);
  const [trainerInfo, setTrainerInfo] = useState(user || null);
  const [unreadChats, setUnreadChats] = useState({}); // { [memberId]: boolean }

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
            if (found) {
              tData = found;
            } else if (allTrainers.length > 0) {
              tData = allTrainers[0];
            }
          } catch (e) {}
        }

        if (tData) setTrainerInfo(tData);

        const tId = tData?.id || profileId || "i5sXkR1c7jIkPb89US2x";
        const tName = tData?.name || user?.displayName || "";
        
        const [ptData, allMembersList] = await Promise.all([
          (tId || tName) ? getTrainerMembers(GID, tId, tName) : [],
          getMembers(GID)
        ]);

        setMembers(ptData);

        // Floor members are active gym members who are not assigned to this trainer for PT
        const ptIds = new Set(ptData.map(pt => pt.id));
        const floorList = allMembersList.filter(m => {
          if (m.status === 'left' || m.status === 'ended' || m.active === false) return false;
          return !ptIds.has(m.id);
        });
        setFloorMembers(floorList);
      } catch (err) {
        console.error("Failed to load trainer members:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gymId, profileId, user]);

  // Real-time unread messages listener for assigned PT members
  useEffect(() => {
    if (!members.length) return;
    const tId = trainerInfo?.id || profileId || "i5sXkR1c7jIkPb89US2x";
    const GID = gymId || "univo_main";
    const unsubs = [];

    members.forEach((m) => {
      const rId = getChatRoomId(tId, m.id);
      try {
        const unsub = subscribeRoomMeta(GID, rId, (meta) => {
          if (meta) {
            setUnreadChats((prev) => ({
              ...prev,
              [m.id]: !!meta.unread_trainer
            }));
          }
        });
        if (typeof unsub === "function") unsubs.push(unsub);
      } catch (e) {}
    });

    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [members, trainerInfo?.id, profileId, gymId]);

  const currentList = activeCategoryTab === "pt" ? members : floorMembers;

  const filteredMembers = useMemo(() => {
    return currentList.filter((m) => {
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
  }, [currentList, search, statusFilter]);

  const handleMemberUpdated = (updatedM) => {
    setMembers((prev) =>
      prev.map((item) => (item.id === updatedM.id ? { ...item, ...updatedM } : item))
    );
    setFloorMembers((prev) =>
      prev.map((item) => (item.id === updatedM.id ? { ...item, ...updatedM } : item))
    );
    if (selectedAthlete && selectedAthlete.id === updatedM.id) {
      setSelectedAthlete((prev) => ({ ...prev, ...updatedM }));
    }
  };

  const handleContactFloorMember = (m) => {
    const tName = trainerInfo?.name || "Your Gym Coach";
    const mName = m.name || m.fullName || "Athlete";
    const msg = `👋 *Hi ${mName}*,\nCoach *${tName}* here from Univo Gym floor team. Hope your workouts are going great! Let me know if you need any machine guidance, spotting, or workout tips during your gym shift today! 💪🏋️`;
    openWhatsApp(m.phone, msg);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Gym Athletes & Members 🏋️‍♂️</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
              {activeCategoryTab === "pt" ? `${members.length} PT Clients` : `${floorMembers.length} Floor Members`}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {activeCategoryTab === "pt"
              ? "Your dedicated 1-on-1 personal training clients. Manage customized diets, splits, body weight and in-app chats."
              : "Active general floor members in the gym. Assist with proper machine setup, spotting on heavy sets, and general posture guidance."}
          </p>
        </div>

        {/* Quick Trainer Stats Banner */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">My PT Athletes</span>
            <p className="text-base font-black text-emerald-700">
              {members.length}
            </p>
          </div>
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Floor Members</span>
            <p className="text-base font-black text-teal-700">
              {floorMembers.length}
            </p>
          </div>
        </div>
      </div>

      {/* CATEGORY TABS (PT vs Floor Members) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => { setActiveCategoryTab("pt"); setStatusFilter("all"); }}
          className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-t-2xl transition flex items-center gap-2 ${
            activeCategoryTab === "pt"
              ? "bg-slate-900 text-emerald-400 shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          1-on-1 PT Athletes ({members.length})
        </button>
        <button
          onClick={() => { setActiveCategoryTab("floor"); setStatusFilter("all"); }}
          className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-t-2xl transition flex items-center gap-2 ${
            activeCategoryTab === "floor"
              ? "bg-slate-900 text-teal-300 shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          General Floor Members ({floorMembers.length})
        </button>
      </div>

      {/* SEARCH & FILTERS ROW */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeCategoryTab === "pt" ? "PT athletes" : "floor members"} by name, phone...`}
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
            All ({currentList.length})
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

      {/* MEMBERS GRID */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading members list...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {activeCategoryTab === "pt" ? "No PT Athletes Found" : "No Floor Members Found"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? "No member matches your search query. Try searching by a different name or phone."
              : activeCategoryTab === "pt"
              ? "When the Gym Owner assigns athletes to you for personal training, they will appear here with complete diet plan and workout split tools."
              : "All active floor gym members will be visible here for machine assistance and floor support."}
          </p>
        </div>
      ) : activeCategoryTab === "pt" ? (
        /* PT ATHLETES CARDS */
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
                      {m.photoURL || m.photoUrl || m.photo ? (
                        <img
                          src={m.photoURL || m.photoUrl || m.photo}
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
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <p className="text-xs text-purple-700 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-500" /> PT Athlete
                          </p>
                          {m.phone && (
                            <>
                              <span className="text-slate-300 text-xs">•</span>
                              <a
                                href={`tel:${m.phone.replace(/[^0-9+]/g, '')}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-slate-500 hover:text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium transition cursor-pointer"
                                title={`Call ${m.name} (${m.phone})`}
                              >
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{m.phone}</span>
                              </a>
                            </>
                          )}
                        </div>
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
                    onClick={() => setChatAthlete(m)}
                    className={`relative px-4 py-2.5 rounded-xl border transition flex items-center gap-1.5 font-extrabold text-xs ${
                      unreadChats[m.id]
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30 animate-pulse"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                    }`}
                    title="In-App 1-on-1 Chat with Athlete"
                  >
                    {unreadChats[m.id] && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-md border-2 border-white">
                        NEW
                      </span>
                    )}
                    <MessageCircle className={`w-4 h-4 ${unreadChats[m.id] ? "text-white" : "text-emerald-600"}`} />
                    <span>In-App Chat</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GENERAL FLOOR MEMBERS CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-teal-300 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {m.photoURL || m.photoUrl || m.photo ? (
                      <img
                        src={m.photoURL || m.photoUrl || m.photo}
                        alt={m.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-slate-700 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                        {(m.name || "M").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{m.name}</h4>
                      <p className="text-xs text-teal-700 font-bold">Gym Floor Member</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Floor Access
                  </span>
                </div>

                {/* Floor Info Card */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 text-teal-600" /> Workout Shift:
                    </span>
                    <strong className="text-slate-900">{m.slot || m.preferredTime || "General Hours"}</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" /> Fitness Goal:
                    </span>
                    <strong className="text-slate-900 truncate max-w-[150px]">{m.fitnessGoal || m.goal || "Fitness"}</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Flame className="w-3.5 h-3.5 text-orange-500" /> Gym Streak:
                    </span>
                    <strong className="text-orange-600 font-extrabold">
                      {m.attendanceStreak ? `${m.attendanceStreak} Days 🔥` : "Active"}
                    </strong>
                  </div>
                </div>

                {/* Physical baseline */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Weight</span>
                    <p className="font-extrabold text-slate-800 mt-0.5">{m.weight ? `${m.weight} kg` : "--"}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Height / BMI</span>
                    <p className="font-extrabold text-slate-800 mt-0.5">{m.bmi ? `BMI ${m.bmi}` : (m.height ? `${m.height} cm` : "--")}</p>
                  </div>
                </div>
              </div>

              {/* Floor Member Actions */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAthlete(m)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" /> View Health Profile
                </button>

                <button
                  type="button"
                  onClick={() => handleContactFloorMember(m)}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center gap-1.5 transition"
                  title="Send Floor Assistance WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Floor Help</span>
                </button>
              </div>
            </div>
          ))}
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

      {/* DIRECT LIVE 1-ON-1 CHAT WITH ATHLETE */}
      {chatAthlete && (
        <DirectChatModal
          isOpen={!!chatAthlete}
          onClose={() => setChatAthlete(null)}
          gymId={gymId || "univo_main"}
          currentUser={{
            id: trainerInfo?.id || profileId || "i5sXkR1c7jIkPb89US2x",
            name: trainerInfo?.name || "Coach Boggey man",
            role: "trainer",
            photoUrl: trainerInfo?.photoUrl || trainerInfo?.photo
          }}
          targetUser={{
            id: chatAthlete.id,
            name: chatAthlete.name || "Athlete",
            role: "member",
            photoUrl: chatAthlete.photoUrl || chatAthlete.photo
          }}
          ptPlanName={chatAthlete.ptPlanName || chatAthlete.planName}
        />
      )}
    </div>
  );
}