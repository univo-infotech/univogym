import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  X,
  Phone,
  MessageCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Check,
  ImageIcon,
  AlertCircle,
  ShieldCheck,
  Calendar
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import {
  getRenewalRequests,
  approveRenewalRequest,
  rejectRenewalRequest,
} from "../../firebase/renewalRequests";
import { getGymSettings } from "../../utils/settings";

function formatDate(isoStr) {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return isoStr;
  }
}

export default function UpiApprovals() {
  const { gymId } = useAuth();
  const activeGymId = gymId || "univo_main";
  const navigate = useNavigate();

  const [settings, setSettings] = useState(() => getGymSettings(activeGymId));
  const [onlineRequests, setOnlineRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subFilter, setSubFilter] = useState("pending"); // 'all', 'pending', 'approved', 'rejected'
  const [actionInProgress, setActionInProgress] = useState(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Image preview modal
  const [selectedProofImg, setSelectedProofImg] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const reqs = await getRenewalRequests(activeGymId);
      setOnlineRequests(reqs || []);
    } catch (e) {
      console.warn("Failed to load UPI renewal requests:", e);
      toast.error("Could not load UPI requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    setSettings(getGymSettings(activeGymId));

    const handleSync = () => loadRequests();
    window.addEventListener("univo_renewal_changed", handleSync);
    window.addEventListener("storage", handleSync);
    const interval = setInterval(loadRequests, 15000);

    return () => {
      window.removeEventListener("univo_renewal_changed", handleSync);
      window.removeEventListener("storage", handleSync);
      clearInterval(interval);
    };
  }, [activeGymId]);

  const pendingCount = useMemo(
    () => onlineRequests.filter((r) => r.status === "pending").length,
    [onlineRequests]
  );
  const approvedCount = useMemo(
    () => onlineRequests.filter((r) => r.status === "approved").length,
    [onlineRequests]
  );
  const rejectedCount = useMemo(
    () => onlineRequests.filter((r) => r.status === "rejected").length,
    [onlineRequests]
  );

  const filteredRequests = useMemo(() => {
    return onlineRequests.filter((r) => {
      // Status filter
      if (subFilter === "pending" && r.status !== "pending") return false;
      if (subFilter === "approved" && r.status !== "approved") return false;
      if (subFilter === "rejected" && r.status !== "rejected") return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (r.memberName || "").toLowerCase().includes(q);
        const matchPhone = (r.memberPhone || "").includes(q);
        const matchUtr = (r.utr || r.utrNumber || "").toLowerCase().includes(q);
        const matchPlan = (r.planName || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchUtr && !matchPlan) return false;
      }

      return true;
    });
  }, [onlineRequests, subFilter, search]);

  const handleCopyUtr = (utr) => {
    if (!utr) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(utr);
    }
    toast.success(`UTR ${utr} copied! 📋`);
  };

  const handleApprove = async (req) => {
    if (!req || actionInProgress) return;
    setActionInProgress(req.id);
    const toastId = toast.loading(`Approving renewal for ${req.memberName || "Member"}...`);
    try {
      await approveRenewalRequest(activeGymId, req.id, {
        approvedBy: "Owner",
      });
      toast.success(`Plan approved & renewed for ${req.memberName || "Member"}! 🎉`, { id: toastId });

      setOnlineRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? { ...r, status: "approved", approvedAt: new Date().toISOString() }
            : r
        )
      );
    } catch (err) {
      console.error("Failed to approve renewal:", err);
      toast.error(err.message || "Failed to approve renewal request", { id: toastId });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenReject = (req) => {
    setRequestToReject(req);
    setRejectReason("Payment not credited in gym bank account / invalid 12-digit UTR reference.");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!requestToReject) return;
    const toastId = toast.loading("Rejecting request...");
    try {
      await rejectRenewalRequest(activeGymId, requestToReject.id, {
        rejectionReason: rejectReason,
      });
      toast.success("Request rejected.", { id: toastId });
      setOnlineRequests((prev) =>
        prev.map((r) =>
          r.id === requestToReject.id
            ? { ...r, status: "rejected", rejectionReason: rejectReason }
            : r
        )
      );
      setRejectModalOpen(false);
      setRequestToReject(null);
    } catch (err) {
      console.error("Failed to reject request:", err);
      toast.error("Failed to reject request", { id: toastId });
    }
  };

  const openWhatsApp = (phone, msg) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
            <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Online QR Verification Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            Online UPI Approvals
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Yahan sirf Online UPI payment renewal records verify karein. Member ka 12-digit UTR bank statement se match karein aur 1-click me approve karein.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRequests}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Refresh UPI Requests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Pending Card */}
        <div
          onClick={() => setSubFilter("pending")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === "pending"
              ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400"
              : "bg-white border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Review</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                Action Required
              </span>
            )}
          </div>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => setSubFilter("approved")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === "approved"
              ? "bg-emerald-500/10 border-emerald-300 ring-2 ring-emerald-400"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Approved & Renewed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{approvedCount}</span>
          </div>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => setSubFilter("rejected")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === "rejected"
              ? "bg-rose-500/10 border-rose-300 ring-2 ring-rose-400"
              : "bg-white border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Rejected Requests</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <X className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">{rejectedCount}</span>
          </div>
        </div>

        {/* All Requests Card */}
        <div
          onClick={() => setSubFilter("all")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            subFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-800"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${subFilter === "all" ? "text-slate-300" : "text-slate-500"}`}>
              All UPI Submissions
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${subFilter === "all" ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black ${subFilter === "all" ? "text-white" : "text-slate-900"}`}>
              {onlineRequests.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by member name, phone, 12-digit UTR, or plan..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "pending", label: "Pending Verification", count: pendingCount, highlight: true },
            { id: "approved", label: "Approved", count: approvedCount },
            { id: "rejected", label: "Rejected", count: rejectedCount },
            { id: "all", label: "All Requests", count: onlineRequests.length },
          ].map((tab) => {
            const isSelected = subFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    tab.highlight && tab.count > 0
                      ? isSelected
                        ? "bg-red-500 text-white font-bold"
                        : "bg-red-100 text-red-700 font-bold border border-red-200"
                      : isSelected
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-600 border border-slate-200/80"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main UPI Requests Cards */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {subFilter === "pending"
              ? "Koi Pending UPI Request Nahi Hai! 🎉"
              : "Koi UPI Record Nahi Mila"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {subFilter === "pending"
              ? "Sabhi members ke online UPI payments verify aur approve ho chuke hain. Naya request aate hi real-time alert dikhega."
              : "Diye gaye search criteria ya filter me koi record match nahi hua."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRequests.map((req) => {
            const initials = (req.memberName || "M")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const isPending = req.status === "pending";
            const isApproved = req.status === "approved";
            const isRejected = req.status === "rejected";

            return (
              <div
                key={req.id}
                className={`p-5 rounded-3xl bg-white border shadow-sm transition space-y-4 ${
                  isPending
                    ? "border-amber-300 ring-2 ring-amber-400/20"
                    : isApproved
                    ? "border-emerald-200 bg-emerald-50/10"
                    : "border-slate-200 opacity-80"
                }`}
              >
                {/* Header: Member Avatar, Name, Phone & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        {req.memberName}
                        {req.planType === "pt" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
                            1-on-1 PT
                          </span>
                        )}
                      </h4>
                      {req.memberPhone ? (
                        <a
                          href={`tel:${req.memberPhone.replace(/[^0-9+]/g, "")}`}
                          className="text-xs text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{req.memberPhone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No phone</span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Renewed
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                        <X className="w-3 h-3 text-rose-600" /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Plan & Amount Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Requested Plan
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs block">{req.planName}</span>
                    {req.trainerName && (
                      <span className="text-[11px] text-purple-700 font-medium">Coach: {req.trainerName}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Amount Paid
                    </span>
                    <span className="text-base font-black text-emerald-600">
                      ₹{req.amount || req.amountPaid || req.planPrice || 0}
                    </span>
                  </div>
                </div>

                {/* UTR Number Display (with Copy button) */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                      12-Digit UPI UTR / Reference
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(req.createdAt || req.submittedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-amber-300">
                    <span className="font-mono font-black text-slate-900 text-sm tracking-wider select-all">
                      {req.utr || req.utrNumber || "N/A"}
                    </span>
                    <button
                      onClick={() => handleCopyUtr(req.utr || req.utrNumber)}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1 transition"
                      title="Copy UTR to clipboard"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    💡 Check that ₹{req.amount || req.amountPaid || req.planPrice} credit was received in your bank app for this UTR number.
                  </p>
                </div>

                {/* Screenshot Proof if attached */}
                {req.screenshotUrl && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-700">Payment Screenshot Attached</span>
                    </div>
                    <button
                      onClick={() => setSelectedProofImg(req.screenshotUrl)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      View Screenshot <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Rejection reason if rejected */}
                {isRejected && req.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    <strong>Rejection Reason:</strong> {req.rejectionReason}
                  </div>
                )}

                {/* Approval timestamp if approved */}
                {isApproved && req.approvedAt && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Approved & Plan Renewed on {formatDate(req.approvedAt)}</span>
                  </div>
                )}

                {/* Actions if pending */}
                {isPending && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      disabled={actionInProgress === req.id}
                      onClick={() => handleApprove(req)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {actionInProgress === req.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Approve & Renew Plan
                        </>
                      )}
                    </button>
                    <button
                      disabled={actionInProgress === req.id}
                      onClick={() => handleOpenReject(req)}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    {req.memberPhone && (
                      <button
                        onClick={() => {
                          const msg = `Hello ${req.memberName}, regarding your online renewal request (Plan: ${req.planName}, UTR: ${req.utr}) at ${settings.gymName}...`;
                          openWhatsApp(req.memberPhone, msg);
                        }}
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectModalOpen && requestToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Reject UPI Renewal Request</h3>
                <p className="text-xs text-slate-500">{requestToReject.memberName} (₹{requestToReject.amount})</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason for Rejection</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR number not found in bank statement, amount mismatch..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRequestToReject(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Zoom Modal */}
      {selectedProofImg && (
        <div
          onClick={() => setSelectedProofImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" /> Payment Screenshot Proof
              </h4>
              <button
                onClick={() => setSelectedProofImg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center">
              <img
                src={selectedProofImg}
                alt="Payment proof screenshot"
                className="max-h-[75vh] object-contain rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
