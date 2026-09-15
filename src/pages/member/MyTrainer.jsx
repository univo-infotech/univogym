import React, { useState, useEffect } from "react";
import {
  Dumbbell,
  Phone,
  MessageCircle,
  Star,
  Award,
  Calendar,
  Clock,
  Apple,
  Send,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Video,
  FileText,
  X,
  Flame,
  Target,
  Droplets,
  Zap
} from "lucide-react";
import { getTrainer, getTrainers } from "../../firebase/trainers";
import { getMember, getMembers, updateMember } from "../../firebase/members";
import { getChatRoomId, subscribeRoomMeta } from "../../firebase/chat";
import DirectChatModal from "../../components/shared/DirectChatModal";
import toast from "react-hot-toast";

export default function MyTrainer() {
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";

  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [memberNote, setMemberNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [certModal, setCertModal] = useState(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let m = null;

        // 1. Check profileId or user.uid
        const targetId = profileId || user?.uid;
        if (targetId) {
          try {
            m = await getMember(GID, targetId);
          } catch (e) {}
        }

        // 2. Check saved session
        const savedSession = localStorage.getItem("univo_member_session");
        let savedObj = null;
        if (savedSession) {
          try {
            savedObj = JSON.parse(savedSession);
          } catch (e) {}
        }

        if (!m && savedObj?.id) {
          try {
            m = await getMember(GID, savedObj.id);
          } catch (e) {}
        }

        if (!m && savedObj) {
          m = savedObj;
        }

        // 3. Fallback: get first member in gym
        if (!m) {
          const membersList = await getMembers(GID);
          if (membersList.length > 0) m = membersList[0];
        }

        if (m) {
          setMemberData(m);
          try {
            const currentSess = savedObj || {};
            localStorage.setItem("univo_member_session", JSON.stringify({ ...currentSess, ...m }));
          } catch (e) {}
        }

        // Fetch Trainer
        const tId = m?.trainerId || m?.coachId || "";
        const tName = m?.personalTrainer || m?.trainerName || m?.trainer || "";

        let t = null;
        if (tId) {
          try {
            t = await getTrainer(GID, tId);
          } catch (e) {}
        }

        if (!t) {
          const allTrainers = await getTrainers(GID);
          if (tName) {
            t = allTrainers.find((item) =>
              (item.name || "").toLowerCase().includes(tName.toLowerCase()) ||
              tName.toLowerCase().includes((item.name || "").toLowerCase())
            );
          }
          if (!t && allTrainers.length > 0) {
            t = allTrainers[0];
          }
        }

        setTrainer(t);
      } catch (err) {
        console.error("Failed to load trainer details for member:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gymId, profileId, user]);

  // Real-time unread chat listener for member
  useEffect(() => {
    const tId = trainer?.id;
    const mId = memberData?.id || profileId || user?.uid;
    if (!tId || !mId) return;

    const rId = getChatRoomId(tId, mId);
    try {
      const unsub = subscribeRoomMeta(GID, rId, (meta) => {
        if (meta) {
          setHasUnreadChat(!!meta.unread_member);
        }
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    } catch (e) {}
  }, [GID, trainer?.id, memberData?.id, profileId, user?.uid]);

  const handleSendNote = async (e) => {
    e.preventDefault();
    if (!memberNote.trim()) return;

    setSendingNote(true);
    try {
      const mId = memberData?.id || profileId || "q0fWgp43l4zoKhh9Xvso";
      const existingNotes = Array.isArray(memberData?.memberNotes) ? memberData.memberNotes : [];
      const newEntry = {
        id: Date.now().toString(),
        text: memberNote.trim(),
        sentAt: new Date().toISOString(),
        author: memberData?.name || "Athlete"
      };

      await updateMember(GID, mId, {
        memberNotes: [newEntry, ...existingNotes]
      });

      setMemberData((prev) => ({
        ...prev,
        memberNotes: [newEntry, ...(prev?.memberNotes || [])]
      }));

      setMemberNote("");
      toast.success("Query sent to your coach successfully!");
    } catch (err) {
      console.error("Send note error:", err);
      toast.error("Failed to send message.");
    } finally {
      setSendingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">Connecting to your coach...</p>
      </div>
    );
  }

  const coachName = trainer?.name || memberData?.personalTrainer || "Coach Boggey man";
  const coachSpecialization = trainer?.specialization || trainer?.specializations?.[0] || "Strength & Hypertrophy";
  const coachBio = trainer?.bio || "Certified Personal Trainer at Univo Gym. Specializing in weight training, bodybuilding, fat burn and tailored athletic performance.";
  const coachSchedule = trainer?.schedule || "Morning (6:00 AM - 11:00 AM) & Evening (5:00 PM - 9:30 PM)";
  const coachPhoto = trainer?.photoUrl || trainer?.photo || "";

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          1-on-1 Personal Training Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
          My Dedicated Fitness Coach
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Direct communication, daily form guidance and tailored meal plans with your personal coach
        </p>
      </div>

      {/* Coach Profile Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-3xl shadow-md overflow-hidden shrink-0">
              {coachPhoto ? (
                <img src={coachPhoto} alt={coachName} className="w-full h-full object-cover" />
              ) : (
                <span>{coachName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl font-black text-slate-900">{coachName}</h3>
                <span className="p-1 rounded-full bg-emerald-100 text-emerald-700" title="Verified Coach">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">{coachSpecialization}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {trainer?.experience || "4 Years"} Experience
                </span>
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Official Univo Trainer
                </span>
              </div>
            </div>
          </div>

          {/* Communication Buttons (In-App Chat & Video Only) */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setIsChatOpen(true)}
              className={`relative w-full sm:w-auto px-6 py-3.5 rounded-2xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0 active:scale-95 ${
                hasUnreadChat
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/40 ring-2 ring-emerald-400 ring-offset-2 animate-pulse"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20"
              }`}
            >
              {hasUnreadChat && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-md border-2 border-white">
                  NEW
                </span>
              )}
              <MessageCircle className="w-4 h-4" />
              <Video className="w-4 h-4" />
              In-App Chat & Video Call
            </button>
          </div>
        </div>

        {/* Coach Bio */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 mb-1">Coach Note & Philosophy:</p>
          "{coachBio}"
        </div>

        {/* Shift Timings & PT Package Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900 block">Available Floor Slots</span>
              <span className="text-emerald-700">{coachSchedule}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center gap-3">
            <Dumbbell className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold text-purple-900 block">Active PT Package</span>
              <span className="text-purple-700">
                {memberData?.ptPlanName || "1 Month 1-on-1 PT"} ({memberData?.ptCompletedSessions || 0} Sessions Completed)
              </span>
            </div>
          </div>
        </div>

        {/* Coach Official Certification (If Uploaded) */}
        {(trainer?.certifications || trainer?.certUrl || trainer?.certFile) && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-emerald-950 block truncate">
                  Trainer Verified Certification
                </span>
                <p className="text-[11px] text-emerald-800 truncate">
                  {trainer?.certifications || "Accredited Fitness & Training Certificate"}
                </p>
              </div>
            </div>

            {(trainer?.certUrl || trainer?.certFile) && (
              <button
                type="button"
                onClick={() => {
                  const cert = trainer?.certUrl || trainer?.certFile;
                  if (cert.startsWith("data:application/pdf")) {
                    window.open(cert, "_blank");
                  } else {
                    setCertModal({
                      img: cert,
                      title: `${coachName} - Official Certification`,
                      desc: trainer?.certifications || "Government/Accredited Trainer Certificate"
                    });
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs transition shrink-0"
              >
                <FileText className="w-3.5 h-3.5" /> View Certificate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Assigned Meal / Diet Plan */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Apple className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Customized Nutrition & Diet Plan</h3>
              <p className="text-xs text-slate-500">
                Prepared by Coach {coachName} • {memberData?.dietPlan?.presetName || "Personalized Transformation Diet"}
              </p>
            </div>
          </div>
          {memberData?.dietPlan && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Plan
            </span>
          )}
        </div>

        {memberData?.dietPlan ? (
          <div className="space-y-5">
            {/* Daily Macro Targets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Calories
                </span>
                <p className="text-lg font-black text-orange-900 mt-0.5">
                  {memberData.dietPlan.calories || "--"} <span className="text-[11px] font-normal">kcal</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center justify-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Protein
                </span>
                <p className="text-lg font-black text-blue-900 mt-0.5">
                  {memberData.dietPlan.protein || "--"} <span className="text-[11px] font-normal">g</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Carbs
                </span>
                <p className="text-lg font-black text-amber-900 mt-0.5">
                  {memberData.dietPlan.carbs || "--"} <span className="text-[11px] font-normal">g</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Fats
                </span>
                <p className="text-lg font-black text-purple-900 mt-0.5">
                  {memberData.dietPlan.fats || "--"} <span className="text-[11px] font-normal">g</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200/80 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 flex items-center justify-center gap-1">
                  <Droplets className="w-3.5 h-3.5" /> Hydration
                </span>
                <p className="text-lg font-black text-cyan-900 mt-0.5">
                  {memberData.dietPlan.water || "3.5"} <span className="text-[11px] font-normal">L/day</span>
                </p>
              </div>
            </div>

            {/* Structured 7 Daily Meals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                { label: "🍳 Breakfast (8:00 AM)", val: memberData.dietPlan.breakfast },
                { label: "🍎 Mid-Morning Snack (11:00 AM)", val: memberData.dietPlan.midMorning },
                { label: "🥗 Lunch (1:30 PM)", val: memberData.dietPlan.lunch },
                { label: "⚡ Pre-Workout Boost (4:30 PM)", val: memberData.dietPlan.preWorkout },
                { label: "💪 Post-Workout Recovery", val: memberData.dietPlan.postWorkout },
                { label: "🍛 Dinner (8:30 PM)", val: memberData.dietPlan.dinner },
                { label: "🥛 Bedtime Snack (10:30 PM)", val: memberData.dietPlan.bedtime },
              ].map(
                (meal, i) =>
                  meal.val && (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-1">
                      <span className="text-xs font-bold text-emerald-800 tracking-wide block">
                        {meal.label}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                        {meal.val}
                      </p>
                    </div>
                  )
              )}
            </div>

            {/* Special Instructions / Notes */}
            {memberData.dietPlan.instructions && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 leading-relaxed space-y-1">
                <span className="font-extrabold text-emerald-900 block">Coach's Nutrition Guidelines:</span>
                <p className="whitespace-pre-line">{memberData.dietPlan.instructions}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600">
              Coach {coachName} is customizing your transformation meal plan.
            </p>
            <p className="text-[11px] text-slate-400">
              Message your coach on WhatsApp to request your personalized calorie and macro breakdown.
            </p>
          </div>
        )}
      </div>

      {/* Section 2.5: Weekly Workout Routine & Day-wise Split */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Weekly Workout Routine & Training Split</h3>
              <p className="text-xs text-slate-500">
                {memberData?.workoutRoutine?.splitName || "Day-by-Day Training Schedule"}
              </p>
            </div>
          </div>
          {memberData?.workoutRoutine && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Assigned Routine
            </span>
          )}
        </div>

        {memberData?.workoutRoutine ? (
          <div className="space-y-4">
            {/* Split Banner */}
            {memberData.workoutRoutine.splitName && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-slate-50 to-white border border-indigo-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                    Routine Split Target
                  </span>
                  <h4 className="text-sm font-black text-slate-900">
                    {memberData.workoutRoutine.splitName}
                  </h4>
                </div>
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-white px-3 py-1 rounded-xl shadow-xs border border-indigo-100">
                  <Calendar className="w-3.5 h-3.5" /> 7 Days Schedule
                </span>
              </div>
            )}

            {/* 7-Day Day-wise Cards (Monday to Sunday) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                { day: "Monday", val: memberData.workoutRoutine.monday, color: "bg-blue-600", lightBg: "bg-blue-50/50 border-blue-200" },
                { day: "Tuesday", val: memberData.workoutRoutine.tuesday, color: "bg-emerald-600", lightBg: "bg-emerald-50/50 border-emerald-200" },
                { day: "Wednesday", val: memberData.workoutRoutine.wednesday, color: "bg-purple-600", lightBg: "bg-purple-50/50 border-purple-200" },
                { day: "Thursday", val: memberData.workoutRoutine.thursday, color: "bg-amber-600", lightBg: "bg-amber-50/50 border-amber-200" },
                { day: "Friday", val: memberData.workoutRoutine.friday, color: "bg-rose-600", lightBg: "bg-rose-50/50 border-rose-200" },
                { day: "Saturday", val: memberData.workoutRoutine.saturday, color: "bg-teal-600", lightBg: "bg-teal-50/50 border-teal-200" },
                { day: "Sunday", val: memberData.workoutRoutine.sunday, color: "bg-slate-700", lightBg: "bg-slate-100 border-slate-300" },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${item.lightBg} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black text-white px-2.5 py-0.5 rounded-lg ${item.color} tracking-wider uppercase`}>
                      {item.day}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium pt-1">
                    {item.val || "Active Rest / Mobility & Recovery"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600">
              No workout split assigned yet by Coach {coachName}.
            </p>
            <p className="text-[11px] text-slate-400">
              Your coach will update your day-wise training routine shortly.
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Direct Athlete Query to Coach */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Direct Note to Coach</h3>
            <p className="text-[11px] text-slate-500">Ask a question about workout soreness, form, or schedule</p>
          </div>
        </div>

        <form onSubmit={handleSendNote} className="space-y-3">
          <textarea
            rows={3}
            value={memberNote}
            onChange={(e) => setMemberNote(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            placeholder="Type your question or updates for Coach Boggey man..."
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sendingNote || !memberNote.trim()}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition flex items-center gap-2 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {sendingNote ? "Sending..." : "Submit to Coach"}
            </button>
          </div>
        </form>

        {/* Existing notes history */}
        {Array.isArray(memberData?.memberNotes) && memberData.memberNotes.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Recent Submissions:</p>
            {memberData.memberNotes.slice(0, 3).map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-start">
                <span className="text-slate-700">{n.text}</span>
                <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                  {new Date(n.sentAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-time 1-on-1 Chat with Coach */}
      <DirectChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        gymId={GID}
        currentUser={{
          id: memberData?.id || profileId || "member",
          name: memberData?.name || "Athlete",
          role: "member"
        }}
        targetUser={{
          id: trainer?.id || "trainer",
          name: coachName,
          role: "trainer",
          photoUrl: coachPhoto
        }}
        ptPlanName={memberData?.ptPlanName || "Personal Training"}
      />

      {/* Certificate Full View Modal */}
      {certModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setCertModal(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl p-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="min-w-0 pr-3">
                <h4 className="font-bold text-sm text-white truncate">{certModal.title}</h4>
                {certModal.desc && <p className="text-xs text-emerald-400 truncate">{certModal.desc}</p>}
              </div>
              <button
                type="button"
                onClick={() => setCertModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/40 rounded-2xl my-3 max-h-[70vh] overflow-auto">
              <img
                src={certModal.img}
                alt="Trainer Certificate"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setCertModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}