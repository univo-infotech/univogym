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
  X
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getTrainer, getTrainers } from "../../firebase/trainers";
import { getMember, getMembers, updateMember } from "../../firebase/members";
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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let m = null;

        // 1. Check profileId
        if (profileId) {
          try {
            m = await getMember(GID, profileId);
          } catch (e) {}
        }

        // 2. Check saved session
        if (!m) {
          const savedSession = localStorage.getItem("univo_member_session");
          if (savedSession) {
            try {
              m = JSON.parse(savedSession);
            } catch (e) {}
          }
        }

        // 3. Fallback: get first member in gym
        if (!m) {
          const membersList = await getMembers(GID);
          if (membersList.length > 0) m = membersList[0];
        }

        setMemberData(m);

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
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
            >
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
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Apple className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Customized Nutrition & Diet Plan</h3>
            <p className="text-[11px] text-slate-500">Prepared by Coach {coachName} for your fitness target</p>
          </div>
        </div>

        {memberData?.dietPlan ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {Object.entries(memberData.dietPlan).map(([mealKey, mealText], idx) => {
              if (!mealText) return null;
              const titles = {
                breakfast: "Breakfast (8:00 AM)",
                lunch: "Lunch (1:30 PM)",
                preWorkout: "Pre-Workout Boost (5:00 PM)",
                dinner: "Post-Workout / Dinner (8:30 PM)",
                supplements: "Recommended Supplements",
                generalNotes: "Hydration & Sleep Guidelines"
              };
              return (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    {titles[mealKey] || mealKey}
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{mealText}</p>
                </div>
              );
            })}
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