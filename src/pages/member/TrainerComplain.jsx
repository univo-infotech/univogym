import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShieldAlert,
  Dumbbell,
  User,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getMember } from "../../firebase/members";
import { getTrainers } from "../../firebase/trainers";
import { submitComplaint, getMemberComplaints } from "../../firebase/complaints";
import toast from "react-hot-toast";

const COMPLAINT_CATEGORIES = [
  "Trainer Absent / Late without notice",
  "Rude or Unprofessional Behavior",
  "Incorrect Exercise Form / No Guidance",
  "Diet or Workout Plan Not Provided / Delayed",
  "Over-Friendly / Privacy Concerns",
  "Focusing on Phone during PT Session",
  "Other Grievance / Issues"
];

export default function TrainerComplain() {
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";

  const [member, setMember] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [urgency, setUrgency] = useState("medium"); // 'low' | 'medium' | 'high'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let m = null;
        const targetId = profileId || user?.uid;
        if (targetId) {
          try {
            m = await getMember(GID, targetId);
          } catch (e) {}
        }
        if (!m) {
          const saved = localStorage.getItem("univo_member_session");
          if (saved) {
            try {
              m = JSON.parse(saved);
            } catch (e) {}
          }
        }
        if (m) setMember(m);

        // Fetch gym trainers for dropdown
        try {
          const tList = await getTrainers(GID);
          setTrainers(tList);
          // Pre-select member's assigned trainer if available
          const myCoach = m?.trainerName || m?.personalTrainer || "";
          if (myCoach) {
            setSelectedTrainer(myCoach);
          } else if (tList.length > 0) {
            setSelectedTrainer(tList[0].name || tList[0].fullName);
          }
        } catch (e) {}

        // Fetch past complaints
        const memId = m?.id || targetId || "member";
        const past = await getMemberComplaints(GID, memId);
        setComplaints(past);
      } catch (err) {
        console.error("Error loading complaints data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gymId, profileId, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please provide complaint details.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        memberId: member?.id || profileId || user?.uid || "unknown",
        memberName: member?.name || member?.fullName || user?.displayName || "Athlete Member",
        memberPhone: member?.phone || "",
        trainerName: selectedTrainer || member?.trainerName || "General Trainer",
        category,
        subject: subject.trim() || `${category} - ${selectedTrainer}`,
        description: description.trim(),
        incidentDate,
        urgency,
      };

      await submitComplaint(GID, payload);
      toast.success("Complaint submitted securely to Gym Owner! 🛡️");

      // Reset form
      setSubject("");
      setDescription("");

      // Refresh list
      const memId = member?.id || profileId || user?.uid || "member";
      const updated = await getMemberComplaints(GID, memId);
      setComplaints(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "resolved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved by Owner
          </span>
        );
      case "in_progress":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      case "dismissed":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Closed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Owner Action
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-50 via-red-50 to-white border border-rose-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Confidential Grievance Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Trainer Complaint & Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
            Aapki complaint seedhe <strong>Gym Owner / Management</strong> ke paas jaati hai. Trainer ko yeh pata nahi chalega ki kisne complain ki hai agar aap chahein.
          </p>
        </div>
      </div>

      {/* Complaint Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Lodge a New Complaint</h2>
            <p className="text-xs text-slate-500">Provide specific incident details so owner can take prompt action</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Trainer Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Select Trainer *</label>
              <select
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              >
                {trainers.map((t) => (
                  <option key={t.id || t.name} value={t.name || t.fullName}>
                    {t.name || t.fullName} {t.specialization ? `(${t.specialization})` : ""}
                  </option>
                ))}
                {trainers.length === 0 && (
                  <option value={member?.trainerName || "Assigned Trainer"}>
                    {member?.trainerName || "My Assigned Trainer"}
                  </option>
                )}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Complaint Reason *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              >
                {COMPLAINT_CATEGORIES.map((cat, i) => (
                  <option key={i} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Incident Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Incident Date</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            {/* Urgency */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              >
                <option value="low">Low - Normal Feedback</option>
                <option value="medium">Medium - Action Needed Soon</option>
                <option value="high">High - Immediate Owner Intervention Required</option>
              </select>
            </div>
          </div>

          {/* Subject (Optional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Subject (Brief Title)</label>
            <input
              type="text"
              placeholder="e.g. Trainer absent for 3 consecutive days without replacement"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Full Description *</label>
            <textarea
              rows={4}
              placeholder="Kya problem hui? Detail me batayein taaki gym owner trainers ke sath meeting karke ya schedule change karke problem solve karein..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Owner reviews every complaint within 24 hours.
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Submitting..." : "Submit Complaint to Owner"}
            </button>
          </div>
        </form>
      </div>

      {/* Past Filed Complaints with Owner Reply */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">My Filed Complaints & Owner Replies</h2>
              <p className="text-xs text-slate-500">Track status and read owner resolution updates</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {complaints.length} Total
          </span>
        </div>

        {complaints.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No complaints filed</p>
            <p className="text-[11px] text-slate-400">Everything looks great with your trainer!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
                      Against: {c.trainerName}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-1">
                      {c.subject || c.category}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(c.status)}
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                  "{c.description}"
                </p>

                {/* Owner Replies Section */}
                {Array.isArray(c.replies) && c.replies.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Official Reply from Gym Management:
                    </span>
                    {c.replies.map((r, ri) => (
                      <div
                        key={r.id || ri}
                        className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                          <span>{r.repliedBy || "Gym Owner"}</span>
                          <span className="text-emerald-700 text-[10px]">
                            {new Date(r.repliedAt).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">
                          {r.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/70 flex items-center gap-2 font-medium">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    Waiting for gym owner to review and post response...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
