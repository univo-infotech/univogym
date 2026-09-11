import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserPlus,
  Download,
  Filter,
  LayoutGrid,
  LayoutList,
  Eye,
  MessageCircle,
  Link2,
  MoreVertical,
  ChevronDown,
  X,
  Copy,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  UserX,
  UserCheck,
  TrendingUp,
  Edit,
  UserMinus,
} from "lucide-react";
import toast from "react-hot-toast";
import { getMembers, generateInviteToken } from "../../firebase/members";
import { getTrainers } from "../../firebase/trainers";
import { useAuth } from "../../contexts/AuthContext";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
}

function getMemberStatus(member) {
  const expiry = toDate(member.expiryDate);
  if (!expiry) return "inactive";
  const now = new Date();
  const diff = (expiry - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "expired";
  if (diff <= 7) return "expiring";
  if (member.active === false) return "inactive";
  return "active";
}

function daysLeft(member) {
  const expiry = toDate(member.expiryDate);
  if (!expiry) return null;
  const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(val) {
  const d = toDate(val);
  if (!d) return "â€”";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtCountdown(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const STATUS_CONFIG = {
  active: { label: "Active", cls: "bg-green-500/20 text-green-400 border border-green-500/30" },
  expired: { label: "Expired", cls: "bg-red-500/20 text-red-400 border border-red-500/30" },
  expiring: { label: "Expiring Soon", cls: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  inactive: { label: "Inactive", cls: "bg-slate-500/20 text-slate-400 border border-slate-500/30" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function Avatar({ member, size = "sm" }) {
  const sizeMap = { sm: "w-9 h-9 text-sm", md: "w-12 h-12 text-base", lg: "w-20 h-20 text-2xl" };
  if (member.photoURL) {
    return (
      <img
        src={member.photoURL}
        alt={member.name}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-slate-700`}
      />
    );
  }
  const initials = (member.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = ["from-cyan-500 to-teal-500", "from-violet-500 to-purple-500", "from-pink-500 to-rose-500", "from-amber-500 to-orange-500"];
  const colorIdx = (member.name || "").charCodeAt(0) % colors.length;
  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center font-bold text-white ring-2 ring-slate-700 flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

// â”€â”€â”€ Invite Link Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TIMER_SECONDS = 300; // 5 min

function InviteLinkModal({ gymId, plans, onClose }) {
  const [memberName, setMemberName] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    setSecondsLeft(TIMER_SECONDS);
    setExpired(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function handleGenerate() {
    if (!phone.trim()) { toast.error("WhatsApp number is required"); return; }
    setGenerating(true);
    try {
      const selectedPlan = plans.find((p) => p.id === planId);
      const url = await generateInviteToken(gymId, {
        memberName: memberName.trim(),
        phone: phone.trim(),
        planId,
        planName: selectedPlan?.name || "",
      });
      setLink(url);
      startTimer();
      toast.success("Invite link generated!");
    } catch (e) {
      toast.error("Failed to generate link");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `Hi ${memberName || "there"}, please complete your gym registration using this link:\n${link}`
    );
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`💪 *Welcome to UNIVO GYM MANAGEMENT!*\n\nPlease complete your registration form & liability waiver:\n🔗 ${link}\n\n⚠️ Valid for 5 minutes only.`)}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Generate Invite Link</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Inputs */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Member Name (optional)</label>
            <input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">
              WhatsApp Number <span className="text-red-400">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Select Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">â€” No plan selected â€”</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.price ? `â€“ â‚¹${p.price}` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generatingâ€¦" : "Generate Link"}
          </button>

          {/* Generated link area */}
          {link && (
            <div className="mt-2 space-y-3">
              <div
                className={`rounded-xl border p-3 ${
                  expired
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-cyan-500/30 bg-slate-800"
                }`}
              >
                <p className="text-xs text-slate-400 break-all font-mono leading-relaxed">
                  {link}
                </p>
              </div>

              {expired ? (
                <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
                  <Clock className="w-4 h-4" />
                  Link Expired â€” Generate New
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-400 text-sm font-mono">
                    <Clock className="w-4 h-4" />
                    Expires in {fmtCountdown(secondsLeft)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button
                      onClick={handleWhatsApp}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Stats Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    green: "from-green-500/20 to-green-500/5 border-green-500/30 text-green-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400",
  };
  const iconBg = { green: "bg-green-500/20", red: "bg-red-500/20", orange: "bg-orange-500/20", blue: "bg-blue-500/20" };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg[color]} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorMap[color].split(" ")[2]}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

// â”€â”€â”€ Table Row Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RowActions({ member, gymId, plans, onGenerate }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleWA() {
    const msg = encodeURIComponent(`Hi ${member.name}, your membership at the gym.`);
    window.open(`https://wa.me/${(member.phone || "").replace(/\D/g, "")}?text=${msg}`, "_blank");
  }

  return (
    <div className="flex items-center gap-1" ref={ref}>
      <button
        onClick={() => navigate(`/owner/members/${member.id}`)}
        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
        title="View"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        onClick={handleWA}
        className="p-1.5 rounded-lg hover:bg-green-900/30 text-slate-400 hover:text-green-400 transition-colors"
        title="WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
      </button>
      <button
        onClick={() => onGenerate(member)}
        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
        title="Generate Invite"
      >
        <Link2 className="w-4 h-4" />
      </button>
      <div className="relative">
        <button
          onClick={() => setOpen((p) => !p)}
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-8 z-20 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              onClick={() => { navigate(`/owner/members/${member.id}`); setOpen(false); }}
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              onClick={() => { toast.success("Member deactivated (demo)"); setOpen(false); }}
            >
              <UserMinus className="w-4 h-4" /> Deactivate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Member Grid Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MemberGridCard({ member, gymId, plans, onGenerate }) {
  const navigate = useNavigate();
  const status = getMemberStatus(member);
  const days = daysLeft(member);

  function handleWA() {
    const msg = encodeURIComponent(`Hi ${member.name}`);
    window.open(`https://wa.me/${(member.phone || "").replace(/\D/g, "")}?text=${msg}`, "_blank");
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 hover:border-cyan-500/40 transition-all group">
      {/* Avatar + status */}
      <div className="relative mb-4 flex justify-center">
        <div className="relative">
          <Avatar member={member} size="lg" />
          <span
            className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CONFIG[status].cls}`}
          >
            {STATUS_CONFIG[status].label}
          </span>
        </div>
      </div>

      <div className="text-center mb-3">
        <h3 className="font-bold text-white text-base truncate">{member.name}</h3>
        {member.planName && (
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            {member.planName}
          </span>
        )}
        {member.trainerName && (
          <p className="text-xs text-slate-500 mt-1">Trainer: {member.trainerName}</p>
        )}
      </div>

      {/* Expiry */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Expiry</span>
          <span className={days !== null && days < 0 ? "text-red-400" : days !== null && days <= 7 ? "text-orange-400" : "text-slate-400"}>
            {days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`) : "â€”"}
          </span>
        </div>
        <p className="text-xs text-slate-400 text-center">{formatDate(member.expiryDate)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleWA}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-semibold transition-colors border border-green-600/30"
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </button>
        <button
          onClick={() => navigate(`/owner/members/${member.id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition-colors border border-cyan-500/20"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "expiring", label: "Expiring Soon" },
  { key: "inactive", label: "Inactive" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name Aâ†’Z" },
  { value: "name_desc", label: "Name Zâ†’A" },
  { value: "join_desc", label: "Newest First" },
  { value: "join_asc", label: "Oldest First" },
  { value: "expiry_asc", label: "Expiry Soonest" },
];

export default function Members() {
  const { gymId } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table"); // "table" | "grid"
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [planFilter, setPlanFilter] = useState("");
  const [trainerFilter, setTrainerFilter] = useState("");
  const [sortBy, setSortBy] = useState("join_desc");
  const [showInvite, setShowInvite] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState({});

  // Derive plan list from members
  const plans = React.useMemo(() => {
    const seen = new Map();
    members.forEach((m) => {
      if (m.planId && !seen.has(m.planId)) seen.set(m.planId, { id: m.planId, name: m.planName || m.planId, price: m.planPrice });
    });
    return Array.from(seen.values());
  }, [members]);

  useEffect(() => {
    if (!gymId) return;
    setLoading(true);
    Promise.all([getMembers(gymId), getTrainers(gymId)])
      .then(([m, t]) => { setMembers(m); setTrainers(t); })
      .catch(() => toast.error("Failed to load members"))
      .finally(() => setLoading(false));
  }, [gymId]);

  // Stats
  const stats = React.useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let active = 0, expired = 0, expiring = 0, newMonth = 0;
    members.forEach((m) => {
      const s = getMemberStatus(m);
      if (s === "active") active++;
      if (s === "expired") expired++;
      if (s === "expiring") expiring++;
      const created = toDate(m.createdAt);
      if (created && created >= monthStart) newMonth++;
    });
    return { active, expired, expiring, newMonth };
  }, [members]);

  // Tab counts
  const tabCounts = React.useMemo(() => {
    const counts = { all: members.length, active: 0, expired: 0, expiring: 0, inactive: 0 };
    members.forEach((m) => { const s = getMemberStatus(m); if (counts[s] !== undefined) counts[s]++; });
    return counts;
  }, [members]);

  // Filter + search + sort
  const filtered = React.useMemo(() => {
    let list = [...members];
    // search
    const q = search.toLowerCase();
    if (q) list = list.filter((m) => m.name?.toLowerCase().includes(q) || m.phone?.includes(q));
    // status tab
    if (filterTab !== "all") list = list.filter((m) => getMemberStatus(m) === filterTab);
    // plan
    if (planFilter) list = list.filter((m) => m.planId === planFilter);
    // trainer
    if (trainerFilter) list = list.filter((m) => m.trainerId === trainerFilter);
    // sort
    list.sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return (a.name || "").localeCompare(b.name || "");
        case "name_desc": return (b.name || "").localeCompare(a.name || "");
        case "join_asc": return (toDate(a.createdAt) || 0) - (toDate(b.createdAt) || 0);
        case "join_desc": return (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0);
        case "expiry_asc": return (toDate(a.expiryDate) || 0) - (toDate(b.expiryDate) || 0);
        default: return 0;
      }
    });
    return list;
  }, [members, search, filterTab, planFilter, trainerFilter, sortBy]);

  function handleExportCSV() {
    const rows = [
      ["Name", "Phone", "Plan", "Trainer", "Join Date", "Expiry Date", "Status"],
      ...filtered.map((m) => [
        m.name || "",
        m.phone || "",
        m.planName || "",
        m.trainerName || "",
        formatDate(m.createdAt),
        formatDate(m.expiryDate),
        getMemberStatus(m),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "members.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  }

  function openInviteForMember(member) {
    setInvitePrefill({ memberName: member.name, phone: member.phone, planId: member.planId });
    setShowInvite(true);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Members</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-semibold border border-cyan-500/30">
            {members.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => { setInvitePrefill({}); setShowInvite(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white text-sm font-semibold transition-all shadow-lg shadow-cyan-500/20"
          >
            <UserPlus className="w-4 h-4" /> Add Member
          </button>
        </div>
      </div>

      {/* â”€â”€ Stats Cards â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Active Members" value={stats.active} color="green" />
        <StatCard icon={UserX} label="Expired Members" value={stats.expired} color="red" />
        <StatCard icon={AlertTriangle} label="Expiring This Week" value={stats.expiring} color="orange" />
        <StatCard icon={TrendingUp} label="New This Month" value={stats.newMonth} color="blue" />
      </div>

      {/* â”€â”€ Filters Row â”€â”€ */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 space-y-4">
        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phoneâ€¦"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* View toggle */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
              <button
                onClick={() => setView("table")}
                className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-lg transition-colors ${view === "grid" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">All Plans</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">All Trainers</option>
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterTab === tab.key
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterTab === tab.key ? "bg-cyan-500/20" : "bg-slate-700"}`}>
                {tabCounts[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ Content â”€â”€ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No members found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      ) : view === "table" ? (
        /* â”€â”€ Table View â”€â”€ */
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Member</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Phone</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Plan</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Trainer</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Joined</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Expiry</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3.5 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const status = getMemberStatus(m);
                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                        i % 2 === 0 ? "" : "bg-slate-900/20"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar member={m} size="sm" />
                          <div>
                            <p className="font-semibold text-white">{m.name || "â€”"}</p>
                            <p className="text-xs text-slate-500">{m.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{m.phone || "â€”"}</td>
                      <td className="px-4 py-3">
                        {m.planName ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {m.planName}
                          </span>
                        ) : "â€”"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{m.trainerName || "â€”"}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(m.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(m.expiryDate)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          member={m}
                          gymId={gymId}
                          plans={plans}
                          onGenerate={openInviteForMember}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-800/50 text-sm text-slate-500">
            Showing {filtered.length} of {members.length} members
          </div>
        </div>
      ) : (
        /* â”€â”€ Grid View â”€â”€ */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((m) => (
            <MemberGridCard
              key={m.id}
              member={m}
              gymId={gymId}
              plans={plans}
              onGenerate={openInviteForMember}
            />
          ))}
        </div>
      )}

      {/* â”€â”€ Invite Modal â”€â”€ */}
      {showInvite && (
        <InviteLinkModal
          gymId={gymId}
          plans={plans}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

