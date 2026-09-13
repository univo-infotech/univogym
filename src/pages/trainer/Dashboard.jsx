import React, { useEffect, useState, useMemo } from "react";
import {
  Dumbbell,
  Users,
  CheckSquare,
  Camera,
  MessageCircle,
  ArrowRight,
  IndianRupee,
  HandCoins,
  TrendingUp,
  Calendar,
  Clock,
  Apple,
  Scale,
  Edit,
  Save,
  ShieldCheck,
  Award,
  Sparkles
} from "lucide-react";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import { useAuth } from "../../contexts/AuthContext";
import { getTrainerMembers, getTrainer, updateTrainer } from "../../firebase/trainers";
import AthleteHealthDietModal from "../../components/trainer/AthleteHealthDietModal";
import toast from "react-hot-toast";

export default function TrainerDashboard() {
  const { gymId, profileId, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedAthleteForDiet, setSelectedAthleteForDiet] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Edit Profile Form
  const [profileForm, setProfileForm] = useState({
    name: "",
    specialization: "",
    phone: "",
    email: "",
    experience: "",
    bio: "",
    photoUrl: ""
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const GID = gymId || "univo_main";
        let trainerData = null;

        if (profileId) {
          trainerData = await getTrainer(GID, profileId);
        }

        if (!trainerData) {
          const savedSession = localStorage.getItem("univo_trainer_session");
          if (savedSession) {
            try {
              trainerData = JSON.parse(savedSession);
            } catch (e) {}
          }
        }

        if (trainerData) {
          setTrainerProfile(trainerData);
          setProfileForm({
            name: trainerData.name || "",
            specialization: trainerData.specialization || "Weight Training & Hypertrophy",
            phone: trainerData.phone || "",
            email: trainerData.email || trainerData.loginEmail || "",
            experience: trainerData.experience || "5 Years",
            bio: trainerData.bio || "",
            photoUrl: trainerData.photoUrl || ""
          });
        }

        const tName = trainerData?.name || user?.displayName || "";
        const mList = await getTrainerMembers(GID, profileId, tName);
        setMembers(mList);
      } catch (e) {
        console.error("Failed to load trainer portal data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gymId, profileId, user]);

  // Financial calculations: PT Revenue, Gym Owner Cut, and Trainer Net Earning
  const financialSummary = useMemo(() => {
    let totalPtRevenue = 0;
    let totalOwnerCut = 0;
    let totalTrainerCut = 0;

    members.forEach((m) => {
      const ptPrice = Number(m.ptPlanPrice || m.planPrice || 0);
      if (ptPrice > 0) {
        totalPtRevenue += ptPrice;
        if (m.ptOwnerCommission !== undefined) {
          totalOwnerCut += Number(m.ptOwnerCommission || 0);
          totalTrainerCut += Number(m.ptTrainerPayout || Math.max(0, ptPrice - m.ptOwnerCommission));
        } else {
          // Default 30% gym owner, 70% trainer
          const commVal = trainerProfile?.commissionValue !== undefined ? Number(trainerProfile.commissionValue) : 30;
          const isFixed = trainerProfile?.commissionType === "fixed";
          const ownerShare = isFixed ? Math.min(ptPrice, commVal) : Math.round(ptPrice * (commVal / 100));
          totalOwnerCut += ownerShare;
          totalTrainerCut += Math.max(0, ptPrice - ownerShare);
        }
      }
    });

    return {
      totalPtRevenue,
      totalOwnerCut,
      totalTrainerCut,
      payoutsPaid: Number(trainerProfile?.payoutsPaid || 0),
      pendingPayout: Math.max(0, totalTrainerCut - Number(trainerProfile?.payoutsPaid || 0))
    };
  }, [members, trainerProfile]);

  // Handle Save Trainer Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name) {
      toast.error("Trainer name is required");
      return;
    }

    setSavingProfile(true);
    try {
      const GID = gymId || "univo_main";
      const tId = profileId || trainerProfile?.id;
      if (tId) {
        await updateTrainer(GID, tId, profileForm);
      }

      const updated = { ...trainerProfile, ...profileForm };
      setTrainerProfile(updated);
      localStorage.setItem("univo_trainer_session", JSON.stringify(updated));
      toast.success("Coach Profile updated successfully! ✨");
      setEditProfileOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const activeCount = members.filter((m) => (m.status || "active").toLowerCase() === "active").length;
  const dietChartsCount = members.filter((m) => m.dietPlan).length;

  return (
    <div className="space-y-6 pb-12">
      {/* WELCOME HEADER WITH TRAINER PROFILE */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {trainerProfile?.photoUrl ? (
            <img
              src={trainerProfile.photoUrl}
              alt={trainerProfile.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xl flex items-center justify-center shadow-md">
              {(trainerProfile?.name || user?.displayName || "C").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                Coach {trainerProfile?.name || user?.displayName || "Trainer"} 🏋️‍♂️
              </h1>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Personal Trainer
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Specialization: <strong className="text-emerald-700">{trainerProfile?.specialization || "Weight Training & Hypertrophy"}</strong> • Exp: <strong className="text-slate-800">{trainerProfile?.experience || "5 Years"}</strong>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Phone: {trainerProfile?.phone || "N/A"} • Login ID: <span className="font-mono font-bold text-slate-700">{trainerProfile?.email || trainerProfile?.loginEmail || "coach@gym.com"}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditProfileOpen(true)}
          className="px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition shrink-0"
        >
          <Edit className="w-4 h-4 text-emerald-600" /> Update My Profile
        </button>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Assigned Athletes"
          value={members.length}
          change={`${activeCount} Active`}
          changeType="up"
          icon={<Users className="w-5 h-5 text-teal-600" />}
          color="teal"
        />
        <StatCard
          title="Active Diet Plans"
          value={dietChartsCount}
          change="Custom Nutrition"
          changeType="up"
          icon={<Apple className="w-5 h-5 text-emerald-600" />}
          color="green"
        />
        <StatCard
          title="Completed Sessions"
          value={members.reduce((acc, m) => acc + Number(m.ptCompletedSessions || 0), 0)}
          change="Logged Drills"
          changeType="up"
          icon={<Dumbbell className="w-5 h-5 text-indigo-600" />}
          color="blue"
        />
        <StatCard
          title="Trainer Net Payout"
          value={`₹${financialSummary.totalTrainerCut.toLocaleString("en-IN")}`}
          change={`₹${financialSummary.pendingPayout.toLocaleString("en-IN")} Pending`}
          changeType="up"
          icon={<IndianRupee className="w-5 h-5 text-amber-600" />}
          color="orange"
        />
      </div>

      {/* PT FINANCIAL SPLIT CARD (Owner Collection vs Trainer Share) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-emerald-600" /> PT Membership Revenue & Commission Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Member pays full fee to Gym Owner. The system calculates Gym Owner cut and Trainer payout share.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl shrink-0">
            Deal: {trainerProfile?.commissionType === "fixed" ? `₹${trainerProfile.commissionValue} Flat Gym Cut` : `${trainerProfile?.commissionValue || 30}% Gym Cut`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total PT Fees (Owner Collected)</span>
            <p className="text-xl font-black text-slate-900 mt-1">
              ₹{financialSummary.totalPtRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Collected by Gym Owner</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-700 uppercase">🏢 Gym Owner Commission</span>
            <p className="text-xl font-black text-indigo-950 mt-1">
              ₹{financialSummary.totalOwnerCut.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-indigo-600 mt-0.5">Gym Facility & Maintenance Share</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">🏋️ Trainer Earning Share</span>
            <p className="text-xl font-black text-emerald-950 mt-1">
              ₹{financialSummary.totalTrainerCut.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Net Payout Earned by Coach</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase">⏳ Pending Payout from Owner</span>
            <p className="text-xl font-black text-amber-950 mt-1">
              ₹{financialSummary.pendingPayout.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-amber-700 mt-0.5">
              {financialSummary.payoutsPaid > 0 ? `₹${financialSummary.payoutsPaid.toLocaleString("en-IN")} already received` : "Awaiting owner transfer"}
            </p>
          </div>
        </div>
      </div>

      {/* ASSIGNED ATHLETES & SCHEDULE SECTION */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" /> Assigned Athletes & Training Timelines (कब तक ट्रेनिंग देनी है)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor PT expiration dates, workout time slots, weight check-ins and diet charts.
            </p>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-xl">
            {members.length} Athletes Total
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-500">Loading athletes...</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No PT Athletes Assigned Yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When the Gym Owner adds a member and selects your name as personal trainer, they will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => {
              const endDate = m.ptEndDate || m.expiryDate;
              let daysLeft = null;
              if (endDate) {
                daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              }

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {m.photoUrl ? (
                          <img
                            src={m.photoUrl}
                            alt={m.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center">
                            {(m.name || "A").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{m.name}</h4>
                          <p className="text-[11px] text-slate-500">{m.phone || "No contact"}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          daysLeft !== null && daysLeft <= 5
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {daysLeft !== null
                          ? daysLeft > 0
                            ? `${daysLeft}d left`
                            : "Expired"
                          : "Active"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">PT Package:</span>
                        <strong className="text-slate-900 truncate max-w-[150px]">
                          {m.ptPlanName || m.planName || "1-on-1 PT"}
                        </strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-600" /> Kab tak (End Date):
                        </span>
                        <strong className="text-emerald-800 font-bold">{endDate || "Ongoing"}</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-teal-600" /> Time Slot:
                        </span>
                        <strong className="text-slate-800">{m.preferredTime || "Morning Slot"}</strong>
                      </div>
                    </div>

                    {/* Weight & Diet pill */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                        <Scale className="w-3 h-3 text-teal-600" /> Weight:{" "}
                        <strong className="text-slate-900">{m.weight ? `${m.weight} kg` : "N/A"}</strong>
                      </span>
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <Apple className="w-3 h-3" /> {m.dietPlan ? "Diet Active" : "No Diet"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedAthleteForDiet(m)}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:shadow transition"
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
                          )},%20Coach%20checking%20in%20on%20your%20progress!%20💪`,
                          "_blank"
                        );
                      }}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                      title="WhatsApp Athlete"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT COACH PROFILE MODAL */}
      <Modal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Edit Coach Profile"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <PhotoCaptureInput
              value={profileForm.photoUrl}
              onChange={(url) => setProfileForm((prev) => ({ ...prev, photoUrl: url }))}
              label="Coach Profile Photo"
              subLabel="Upload high-res photo or capture live snap"
              shape="circle"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase">Coach Full Name *</label>
              <input
                required
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                placeholder="Coach Amit Kumar"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase">Specialization *</label>
              <input
                required
                type="text"
                value={profileForm.specialization}
                onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                placeholder="Weight Training & Hypertrophy"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase">Phone Number</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase">Experience</label>
              <input
                type="text"
                value={profileForm.experience}
                onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                placeholder="e.g. 6 Years"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase">Bio & Achievements</label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white resize-none"
              placeholder="Certified Fitness Coach, Nutritionist, trained 200+ clients..."
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {savingProfile ? "Saving..." : "Save Profile Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ATHLETE HEALTH, WEIGHT & DIET HUB MODAL */}
      {selectedAthleteForDiet && (
        <AthleteHealthDietModal
          isOpen={!!selectedAthleteForDiet}
          onClose={() => setSelectedAthleteForDiet(null)}
          member={selectedAthleteForDiet}
          gymId={gymId || "univo_main"}
          onMemberUpdated={(updatedM) => {
            setMembers((prev) =>
              prev.map((item) => (item.id === updatedM.id ? { ...item, ...updatedM } : item))
            );
          }}
        />
      )}
    </div>
  );
}