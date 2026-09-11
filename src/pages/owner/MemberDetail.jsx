import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Edit,
  Link2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  CreditCard,
  Activity,
  Camera,
  FileText,
  RefreshCw,
  Flame,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { getMember, generateInviteToken } from "../../firebase/members";
import { getMemberPayments, addPayment } from "../../firebase/payments";
import { getMemberAttendance, markMemberAttendance } from "../../firebase/attendance";
import { getBeforeAfterByTrainer } from "../../firebase/trainers";
import { useAuth } from "../../contexts/AuthContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

function formatDate(val, opts) {
  const d = toDate(val);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", opts || { day: "2-digit", month: "short", year: "numeric" });
}

function getMemberStatus(member) {
  const expiry = toDate(member?.expiryDate);
  if (!expiry) return "inactive";
  const diff = (expiry - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "expired";
  if (diff <= 7) return "expiring";
  if (member.active === false) return "inactive";
  return "active";
}

function daysLeft(member) {
  const expiry = toDate(member?.expiryDate);
  if (!expiry) return null;
  return Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
}

function fmtCountdown(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const STATUS_CONFIG = {
  active: { label: "Active", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  expired: { label: "Expired", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  expiring: { label: "Expiring Soon", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  inactive: { label: "Inactive", cls: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function Avatar({ member, size = "lg" }) {
  const sizeMap = { sm: "w-9 h-9 text-sm", md: "w-14 h-14 text-lg", lg: "w-24 h-24 text-3xl" };
  const colors = ["from-cyan-500 to-teal-500", "from-violet-500 to-purple-500", "from-pink-500 to-rose-500", "from-amber-500 to-orange-500"];
  const colorIdx = (member?.name || "").charCodeAt(0) % colors.length;
  const initials = (member?.name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  if (member?.photoURL) {
    return <img src={member.photoURL} alt={member.name} className={`${sizeMap[size]} rounded-2xl object-cover ring-2 ring-slate-700`} />;
  }
  return (
    <div className={`${sizeMap[size]} rounded-2xl bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center font-bold text-white ring-2 ring-slate-700 flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

const PAYMENT_MODES = ["Cash", "Online", "Bank", "Mixed"];

function PaymentModal({ member, gymId, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount || isNaN(Number(amount))) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await addPayment({
        memberId: member.id,
        gymId,
        memberName: member.name,
        amount: Number(amount),
        mode,
        cashAmount: mode === "Mixed" ? Number(cashAmount || 0) : 0,
        onlineAmount: mode === "Mixed" ? Number(onlineAmount || 0) : 0,
        referenceId: mode !== "Cash" ? referenceId : "",
        plan: member.planName || "",
        date: new Date(date),
        notes,
      });
      toast.success("Payment recorded!");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Record Payment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Total Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                    mode === m
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {mode === "Mixed" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cash (₹)</label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Online/Bank (₹)</label>
                <input
                  type="number"
                  value={onlineAmount}
                  onChange={(e) => setOnlineAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {(mode === "Online" || mode === "Bank" || mode === "Mixed") && (
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Reference / Transaction ID</label>
              <input
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="UPI Ref / Cheque No."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any remarks…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal (reused) ────────────────────────────────────────────────────

const TIMER_SECONDS = 300;

function InviteLinkModal({ gymId, member, onClose }) {
  const [link, setLink] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [expired, setExpired] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timerRef = React.useRef(null);

  function startTimer() {
    setSecondsLeft(TIMER_SECONDS);
    setExpired(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((p) => { if (p <= 1) { clearInterval(timerRef.current); setExpired(true); return 0; } return p - 1; });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function generate() {
    setGenerating(true);
    try {
      const url = await generateInviteToken(gymId, {
        memberName: member.name,
        phone: member.phone,
        planId: member.planId,
        planName: member.planName,
      });
      setLink(url);
      startTimer();
      toast.success("New invite link generated!");
    } catch { toast.error("Failed to generate link"); }
    finally { setGenerating(false); }
  }

  useEffect(() => { generate(); }, []);

  function handleCopy() { navigator.clipboard.writeText(link); toast.success("Copied!"); }
  function handleWA() {
    const msg = encodeURIComponent(`Hi ${member.name}, complete your registration: ${link}`);
    window.open(`https://wa.me/${(member.phone || "").replace(/\D/g, "")}?text=${msg}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white">New Invite Link</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {generating && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {link && !generating && (
            <>
              <div className={`rounded-xl border p-3 ${expired ? "border-red-500/40 bg-red-500/10" : "border-cyan-500/30 bg-slate-800"}`}>
                <p className="text-xs text-slate-400 break-all font-mono leading-relaxed">{link}</p>
              </div>
              {expired ? (
                <div className="space-y-2">
                  <p className="text-red-400 text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Link Expired</p>
                  <button onClick={generate} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm transition-all">
                    Generate New Link
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-orange-400 text-sm font-mono flex items-center gap-2"><Clock className="w-4 h-4" /> Expires in {fmtCountdown(secondsLeft)}</p>
                  <div className="flex gap-2">
                    <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                    <button onClick={handleWA} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Calendar Heatmap ──────────────────────────────────────────────

function AttendanceCalendar({ attendance }) {
  const [month, setMonth] = useState(new Date());

  const attendedDays = React.useMemo(() => {
    const set = new Set();
    attendance.forEach((a) => {
      const d = toDate(a.date);
      if (d) set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [attendance]);

  function prevMonth() { setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)); }
  function nextMonth() { setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)); }

  const year = month.getFullYear();
  const mon = month.getMonth();
  const firstDay = new Date(year, mon, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const thisMonth = today.getMonth() === mon && today.getFullYear() === year;
  const todayDay = today.getDate();

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-white font-semibold">
          {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />;
          const key = `${year}-${mon}-${day}`;
          const attended = attendedDays.has(key);
          const isToday = thisMonth && day === todayDay;
          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                attended
                  ? "bg-green-500/30 text-green-400 border border-green-500/40"
                  : isToday
                  ? "border border-cyan-500/60 text-cyan-400"
                  : "text-slate-500 hover:bg-slate-700/50"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/40" /> Present
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-slate-600" /> Absent
        </div>
      </div>
    </div>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab({ member }) {
  const infoItems = [
    { label: "Date of Birth", value: formatDate(member.dob), icon: Calendar },
    { label: "Gender", value: member.gender || "—", icon: User },
    { label: "Email", value: member.email || "—", icon: Mail },
    { label: "Alt. Phone", value: member.altPhone || "—", icon: Phone },
    { label: "Address", value: member.address || "—", icon: MapPin },
    { label: "Preferred Time", value: member.preferredTime || "—", icon: Clock },
  ];

  const planFeatures = member.planFeatures || [];

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" /> Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infoItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-slate-200 text-sm font-medium mt-0.5 break-words">{value}</p>
              </div>
            </div>
          ))}
        </div>
        {member.healthNotes && (
          <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Health Notes
            </p>
            <p className="text-slate-300 text-sm">{member.healthNotes}</p>
          </div>
        )}
      </div>

      {/* Current Plan */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-cyan-400" /> Current Plan
        </h3>
        {member.planName ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold text-sm">
                  {member.planName}
                </span>
                {member.planPrice && (
                  <span className="text-white font-bold text-lg">₹{member.planPrice}</span>
                )}
              </div>
              {planFeatures.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {planFeatures.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm whitespace-nowrap self-start sm:self-auto">
              <RefreshCw className="w-4 h-4" /> Renew Plan
            </button>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No plan assigned</p>
        )}
      </div>
    </div>
  );
}

function PaymentsTab({ member, gymId, payments, onRefresh }) {
  const [showModal, setShowModal] = useState(false);

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);

  function handleExportPDF() {
    toast.success("PDF export coming soon");
  }

  function modeBadge(mode) {
    const map = {
      Cash: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Online: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Bank: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      Mixed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };
    return map[mode] || "bg-slate-700 text-slate-400";
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-400">₹{total.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-xs text-slate-400 mb-1">Total Records</p>
          <p className="text-2xl font-bold text-white">{payments.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <CreditCard className="w-10 h-10 mb-3 opacity-30" />
          <p>No payment records yet</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Amount</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Mode</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Plan</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Ref ID</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 font-semibold text-white">₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${modeBadge(p.mode)}`}>{p.mode}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{p.plan || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.referenceId || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                        {p.status || "paid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <PaymentModal
          member={member}
          gymId={gymId}
          onClose={() => setShowModal(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}

function AttendanceTab({ member, gymId, attendance, onRefresh }) {
  const [marking, setMarking] = useState(false);

  const today = new Date();
  const alreadyMarkedToday = attendance.some((a) => {
    const d = toDate(a.date);
    return d && d.toDateString() === today.toDateString();
  });

  // Stats
  const thisMonth = attendance.filter((a) => {
    const d = toDate(a.date);
    return d && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;

  // Streak: consecutive days ending today or yesterday
  const sortedDates = attendance
    .map((a) => toDate(a.date))
    .filter(Boolean)
    .map((d) => d.toDateString())
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < sortedDates.length; i++) {
    const d = new Date(sortedDates[i]);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === cursor.getTime()) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  async function handleMarkPresent() {
    if (alreadyMarkedToday) { toast("Already marked today!"); return; }
    setMarking(true);
    try {
      await markMemberAttendance(member.id, gymId);
      toast.success("Marked present today!");
      onRefresh();
    } catch { toast.error("Failed to mark attendance"); }
    finally { setMarking(false); }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{attendance.length}</p>
          <p className="text-xs text-slate-400 mt-1">Total Days</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{thisMonth}</p>
          <p className="text-xs text-slate-400 mt-1">This Month</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-400 flex items-center justify-center gap-1">
            <Flame className="w-5 h-5" />{streak}
          </p>
          <p className="text-xs text-slate-400 mt-1">Day Streak</p>
        </div>
      </div>

      {/* Mark present */}
      <button
        onClick={handleMarkPresent}
        disabled={marking || alreadyMarkedToday}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
          alreadyMarkedToday
            ? "bg-green-500/10 border border-green-500/30 text-green-400 cursor-default"
            : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
        } disabled:opacity-50`}
      >
        <CheckCircle className="w-4 h-4" />
        {alreadyMarkedToday ? "Already Marked Present Today" : marking ? "Marking…" : "Mark Present Today"}
      </button>

      {/* Calendar */}
      <AttendanceCalendar attendance={attendance} />
    </div>
  );
}

function BeforeAfterTab({ entries }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Camera className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">No progress photos yet</p>
        <p className="text-sm">Photos added by trainers will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.map((entry) => (
        <div key={entry.id} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold">{formatDate(entry.date)}</p>
              {entry.trainerName && (
                <p className="text-xs text-slate-500">by {entry.trainerName}</p>
              )}
            </div>
            {(entry.weightBefore || entry.weightAfter) && (
              <div className="flex items-center gap-3 text-sm">
                {entry.weightBefore && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-700 text-slate-300 text-xs">
                    Before: {entry.weightBefore} kg
                  </span>
                )}
                {entry.weightAfter && (
                  <span className="px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 text-xs">
                    After: {entry.weightAfter} kg
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Before</p>
              {entry.beforeURL ? (
                <img
                  src={entry.beforeURL}
                  alt="Before"
                  className="w-full rounded-xl object-cover aspect-[3/4]"
                />
              ) : (
                <div className="w-full rounded-xl bg-slate-800 border border-slate-700 aspect-[3/4] flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">After</p>
              {entry.afterURL ? (
                <img
                  src={entry.afterURL}
                  alt="After"
                  className="w-full rounded-xl object-cover aspect-[3/4]"
                />
              ) : (
                <div className="w-full rounded-xl bg-slate-800 border border-slate-700 aspect-[3/4] flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>
          </div>

          {entry.notes && (
            <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Trainer Notes</p>
              <p className="text-slate-300 text-sm">{entry.notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WaiverTab({ member }) {
  function handleDownload() {
    toast.success("PDF download coming soon");
  }

  if (!member.waiverSigned) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">No waiver on file</p>
        <p className="text-sm">Member has not signed a liability waiver</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
        <div>
          <p className="text-green-400 font-semibold">Waiver Signed</p>
          <p className="text-slate-400 text-sm">Signed on {formatDate(member.waiverSignedDate)}</p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Liability Waiver</h3>
        <div className="prose-sm text-slate-300 space-y-3 text-sm leading-relaxed">
          <p>
            I, <strong className="text-white">{member.name}</strong>, hereby acknowledge that I have voluntarily
            chosen to participate in physical fitness activities at the gym. I understand that
            physical activity involves risk of injury and I assume responsibility for my health
            during training.
          </p>
          <p>
            I release the gym, its owners, trainers, and staff from any liability for injuries
            sustained during my membership and agree to comply with gym rules and guidelines.
          </p>
          <p>
            I confirm that I am in adequate physical health to undertake the fitness program and
            will inform the gym of any pre-existing medical conditions.
          </p>
        </div>

        {member.waiverSignatureURL && (
          <div className="mt-6">
            <p className="text-xs text-slate-500 mb-2">Member Signature</p>
            <div className="bg-white rounded-xl p-3 inline-block">
              <img src={member.waiverSignatureURL} alt="Signature" className="h-16 object-contain" />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
      >
        <Download className="w-4 h-4" /> Download PDF
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "attendance", label: "Attendance", icon: Activity },
  { key: "beforeafter", label: "Before/After", icon: Camera },
  { key: "waiver", label: "Waiver", icon: FileText },
];

export default function MemberDetail() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { gymId } = useAuth();

  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [beforeAfter, setBeforeAfter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [showInvite, setShowInvite] = useState(false);

  async function fetchMember() {
    const m = await getMember(memberId);
    setMember(m);
  }

  async function fetchPayments() {
    const p = await getMemberPayments(memberId);
    setPayments(p);
  }

  async function fetchAttendance() {
    const a = await getMemberAttendance(memberId);
    setAttendance(a);
  }

  async function fetchBeforeAfter() {
    const b = await getBeforeAfterByTrainer(memberId);
    setBeforeAfter(b);
  }

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    Promise.all([fetchMember(), fetchPayments(), fetchAttendance(), fetchBeforeAfter()])
      .catch(() => toast.error("Failed to load member details"))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <User className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">Member not found</p>
        <button
          onClick={() => navigate("/owner/members")}
          className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </button>
      </div>
    );
  }

  const status = getMemberStatus(member);
  const days = daysLeft(member);
  const totalPlanDays = member.planDurationDays || 30;
  const progressPct = days !== null
    ? Math.max(0, Math.min(100, (days / totalPlanDays) * 100))
    : 0;

  function handleWhatsApp() {
    const msg = encodeURIComponent(`Hi ${member.name}, your gym membership update.`);
    window.open(`https://wa.me/${(member.phone || "").replace(/\D/g, "")}?text=${msg}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* ── Back ── */}
      <button
        onClick={() => navigate("/owner/members")}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </button>

      {/* ── Profile Header Card ── */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar member={member} size="lg" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="text-2xl font-bold text-white">{member.name}</h1>
              {member.planName && (
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-semibold">
                  {member.planName}
                </span>
              )}
              <StatusBadge status={status} />
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                Joined {formatDate(member.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Expires {formatDate(member.expiryDate)}
              </span>
              {member.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-500" />
                  {member.phone}
                </span>
              )}
            </div>

            {/* Progress bar */}
            {days !== null && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Membership duration</span>
                  <span className={days < 0 ? "text-red-400" : days <= 7 ? "text-orange-400" : "text-slate-400"}>
                    {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      days < 0 ? "bg-red-500" : days <= 7 ? "bg-orange-500" : "bg-gradient-to-r from-cyan-500 to-teal-500"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Trainer info */}
            {member.trainerName && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                  {(member.trainerName || "T")[0]}
                </div>
                <span>Trainer: <span className="text-white font-medium">{member.trainerName}</span></span>
                {member.trainerPhone && (
                  <span className="text-slate-500">· {member.trainerPhone}</span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm font-semibold border border-green-600/30 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button
              onClick={() => navigate(`/owner/members/${memberId}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-colors"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-medium border border-cyan-500/20 transition-colors"
            >
              <Link2 className="w-4 h-4" /> New Link
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-900/40 border border-slate-700/50 rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === key
                ? "bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div>
        {tab === "overview" && <OverviewTab member={member} />}
        {tab === "payments" && (
          <PaymentsTab
            member={member}
            gymId={gymId}
            payments={payments}
            onRefresh={fetchPayments}
          />
        )}
        {tab === "attendance" && (
          <AttendanceTab
            member={member}
            gymId={gymId}
            attendance={attendance}
            onRefresh={fetchAttendance}
          />
        )}
        {tab === "beforeafter" && <BeforeAfterTab entries={beforeAfter} />}
        {tab === "waiver" && <WaiverTab member={member} />}
      </div>

      {/* ── Invite Modal ── */}
      {showInvite && member && (
        <InviteLinkModal
          gymId={gymId}
          member={member}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
