import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Send,
  User,
  Dumbbell,
  Phone,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getGymComplaints, replyToComplaint } from "../../firebase/complaints";
import toast from "react-hot-toast";

export default function OwnerComplaints() {
  const { gymId } = useAuth();
  const GID = gymId || "univo_main";

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  // Selected complaint for replying
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [newStatus, setNewStatus] = useState("resolved");
  const [replying, setReplying] = useState(false);

  async function loadComplaints() {
    setLoading(true);
    try {
      const data = await getGymComplaints(GID);
      setComplaints(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, [gymId]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }

    setReplying(true);
    try {
      await replyToComplaint(GID, replyModal.id, replyText.trim(), newStatus, "Gym Owner / Management");
      toast.success("Reply sent to member successfully! ✉️");
      setReplyModal(null);
      setReplyText("");
      await loadComplaints();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  const filtered = complaints.filter((c) => {
    const matchSearch =
      (c.memberName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.trainerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.subject || "").toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = complaints.filter((c) => c.status === "pending").length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved").length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white border border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30 inline-flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Grievance Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
            Member Complaints & Trainer Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review member grievances against personal trainers, take internal action, and reply directly.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] font-bold uppercase text-amber-400 block">Pending Action</span>
            <span className="text-xl font-black text-white">{pendingCount}</span>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block">Resolved</span>
            <span className="text-xl font-black text-white">{resolvedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by member, trainer, issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `All (${complaints.length})` },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "resolved", label: `Resolved (${resolvedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Loading member grievances...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-800">No Complaints Found</h3>
          <p className="text-xs text-slate-400">No member has lodged grievances matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const hasReplies = Array.isArray(item.replies) && item.replies.length > 0;
            return (
              <div
                key={item.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition"
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5" /> Against: {item.trainerName}
                      </span>
                      {item.urgency === "high" && (
                        <span className="text-[10px] font-black uppercase text-white bg-red-600 px-2 py-0.5 rounded-lg animate-pulse">
                          🚨 Urgent Attention
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-400">
                        Incident: {item.incidentDate || "Recent"}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {item.subject || item.category}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {item.status === "resolved" ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Action Needed
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setReplyModal(item);
                        setNewStatus(item.status === "pending" ? "resolved" : item.status);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {hasReplies ? "Add Another Reply" : "Reply to Member"}
                    </button>
                  </div>
                </div>

                {/* Complainant info & Issue description */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Complainant Member</span>
                    <strong className="text-slate-800 font-bold">{item.memberName || "Athlete"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Category / Type</span>
                    <span className="text-slate-700 font-semibold">{item.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Filed On</span>
                    <span className="text-slate-600">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Full Description */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                  <p className="whitespace-pre-line">"{item.description}"</p>
                </div>

                {/* Previous Replies */}
                {hasReplies && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Management Replies ({item.replies.length}):
                    </span>
                    {item.replies.map((r, ri) => (
                      <div
                        key={r.id || ri}
                        className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
                          <span>{r.repliedBy || "Gym Management"}</span>
                          <span className="text-emerald-700 text-[10px]">
                            {new Date(r.repliedAt).toLocaleDateString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">
                          {r.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setReplyModal(null)}
        >
          <div
            className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Reply to Member: {replyModal.memberName}
                </h3>
                <p className="text-xs text-slate-500">
                  Against Coach: <strong>{replyModal.trainerName}</strong>
                </p>
              </div>
              <button
                onClick={() => setReplyModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 max-h-24 overflow-y-auto">
              <strong className="text-slate-800 block mb-1">Issue:</strong>
              "{replyModal.description}"
            </div>

            <form onSubmit={handleSendReply} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Update Resolution Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                >
                  <option value="resolved">✅ Resolved (Owner took action & resolved)</option>
                  <option value="in_progress">⏳ In Progress / Warning Issued to Trainer</option>
                  <option value="pending">⚠️ Keep Pending Investigation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Your Reply / Action Taken *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Humne trainer se baat karke warning de di hai aur aapka workout slot Coach Rohan ke sath re-assign kar diya hai..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replying}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {replying ? "Sending Reply..." : "Post Official Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
