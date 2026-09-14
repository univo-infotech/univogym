import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  UserPlus, 
  AlertTriangle, 
  TrendingUp, 
  Share2,
  Clock,
  CheckCircle2,
  Wrench,
  ArrowRight,
  ChevronRight,
  MessageCircle,
  Bell,
  Check,
  QrCode,
  Copy,
  Sparkles
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";
import { getMembers, generateInviteToken } from "../../firebase/members";
import { getTrainers } from "../../firebase/trainers";
import { getAllPayments } from "../../firebase/payments";
import { getStock } from "../../firebase/stock";
import { getVisits } from "../../firebase/visits";
import { getPlans } from "../../firebase/plans";
import { openWhatsApp, generateMemberInviteMessage, generateRenewalReminderMessage } from "../../utils/whatsapp";
import { getGymSettings } from "../../utils/settings";
import DirectAddMemberModal from "../../components/shared/DirectAddMemberModal";
import { useAuth } from "../../contexts/AuthContext";

export default function Dashboard() {
  const { gymId: currentGymId } = useAuth();
  const gymId = currentGymId || "univo_main";

  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [visits, setVisits] = useState([]);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState(getGymSettings());

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [directAddOpen, setDirectAddOpen] = useState(false);
  const [renewalsModalOpen, setRenewalsModalOpen] = useState(false);
  const [directMember, setDirectMember] = useState({ name: "", phone: "", email: "", planName: "3-Month Pro", gender: "Male" });

  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [isPT, setIsPT] = useState(false);
  const [trainersList, setTrainersList] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("Member@123");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCountdown, setLinkCountdown] = useState(600);

  useEffect(() => {
    setSettings(getGymSettings());
    async function loadData() {
      try {
        const [m, p, s, v, pl, tr] = await Promise.all([
          getMembers(gymId),
          getAllPayments(gymId),
          getStock(gymId),
          getVisits(gymId),
          getPlans(gymId),
          getTrainers(gymId)
        ]);

        if (pl && pl.length > 0) {
          const activeOnly = pl.filter(item => item.isActive !== false);
          setPlans(activeOnly.length > 0 ? activeOnly : pl);
        }
        
        setMembers(m || []);
        setPayments(p || []);
        setStockItems(s || []);
        setVisits(v || []);
        setTrainersList(tr || []);
        if (tr && tr.length > 0) setSelectedTrainerId(tr[0].id);
      } catch (err) {
        console.error("Dashboard load data error:", err);
      }
    }
    loadData();
  }, [gymId]);

  const totalMembers = members.length;
  // Real active members (status !== 'left' and status !== 'inactive')
  const activeMembers = members.filter((m) => {
    if (m.status === "left" || m.active === false || m.status === "inactive") return false;
    if (m.status === "active") return true;
    if (!m.expiryDate) return true;
    const exp = new Date(m.expiryDate?.seconds ? m.expiryDate.seconds * 1000 : m.expiryDate);
    return isNaN(exp.getTime()) ? true : exp >= new Date();
  }).length;

  const totalRevenue = payments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || Number(curr.amount) || 0), 0);
  
  // Real expiring members calculation (within next 7 days or status === 'expiring')
  const expiringMembers = members.filter((m) => {
    if (m.status === "left" || m.status === "inactive") return false;
    if (m.status === "expiring") return true;
    if (!m.expiryDate) return false;
    const exp = new Date(m.expiryDate?.seconds ? m.expiryDate.seconds * 1000 : m.expiryDate);
    if (isNaN(exp.getTime())) return false;
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Calculate real payment modes breakdown from payments
  const paymentModesData = useMemo(() => {
    if (!payments || payments.length === 0) {
      return [{ name: "No Payments", value: 100, color: "#e2e8f0" }];
    }

    let upiCount = 0;
    let cashCount = 0;
    let bankCount = 0;
    let splitCount = 0;

    payments.forEach((p) => {
      const mode = (p.paymentMode || "").toLowerCase();
      if (mode === "online" || mode === "upi") upiCount++;
      else if (mode === "cash") cashCount++;
      else if (mode === "bank") bankCount++;
      else splitCount++;
    });

    const total = upiCount + cashCount + bankCount + splitCount || 1;
    return [
      { name: "Online UPI", value: Math.round((upiCount / total) * 100), color: "#10b981" },
      { name: "Cash", value: Math.round((cashCount / total) * 100), color: "#06b6d4" },
      { name: "Bank Transfer", value: Math.round((bankCount / total) * 100), color: "#8b5cf6" },
      { name: "Mixed Mode", value: Math.round((splitCount / total) * 100), color: "#f59e0b" },
    ].filter(item => item.value > 0);
  }, [payments]);

  // Compute dynamic daily revenue for last 7 days from actual payments
  const revenueData = useMemo(() => {
    const daysArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = daysArr[d.getDay()];
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const dayNum = String(d.getDate()).padStart(2, "0");
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const indianDateStr = `${dayNum}/${monthNum}/${d.getFullYear()}`;

      // Sum payments matching this day
      let daySum = 0;
      payments.forEach((p) => {
        const pDate = p.date || p.createdAt || "";
        const amount = Number(p.paidAmount || p.amount || 0);
        if (pDate.includes(dateStr) || pDate.includes(indianDateStr)) {
          daySum += amount;
        }
      });

      result.push({ day: dayName, revenue: daySum });
    }

    return result;
  }, [payments]);

  const handleGenerateLink = async () => {
    if (!invitePhone.trim()) {
      toast.error("Enter WhatsApp phone number first!");
      return;
    }
    const selTrainer = trainersList.find((t) => t.id === selectedTrainerId);
    const link = await generateInviteToken("univo_main", {
      memberName: inviteName.trim(),
      phone: invitePhone.trim(),
      isPT,
      trainerId: isPT ? selectedTrainerId : "",
      trainerName: isPT ? (selTrainer?.name || "") : "",
      loginEmail: isPT ? (loginEmail.trim() || invitePhone.trim()) : "",
      loginPassword: isPT ? (loginPassword.trim() || "Member@123") : "",
    });
    setGeneratedLink(link);
    setLinkCountdown(600);
    toast.success(isPT ? "PT 10-Minute Link & Credentials Ready!" : "10-Minute Invite Link & QR Code Generated!");
  };

  const handleSendReminder = (m) => {
    const rawNum = (m.phone || "").replace(/\D/g, "");
    const msg = generateRenewalReminderMessage(m.fullName || m.name, m.planName, m.expiryDate || "soon", m.renewalFee || "2500");
    openWhatsApp(rawNum, msg);
    toast.success(`WhatsApp reminder sent to ${m.fullName || m.name}!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action Buttons */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-md">
              Gym Owner Portal • {settings.gymName}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">
              Welcome back, Manager! ⚡
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
              {settings.tagline} • All-in-one smart dashboard
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setGeneratedLink("");
                setInvitePhone("");
                setInviteModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-emerald-800 text-xs sm:text-sm font-bold shadow-md hover:bg-emerald-50 transition"
            >
              <Share2 className="w-4 h-4 text-emerald-600" /> Share 10-Min WhatsApp Link
            </button>

            <button
              onClick={() => setDirectAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-950/40 text-white border border-white/30 text-xs sm:text-sm font-bold backdrop-blur-md hover:bg-emerald-950/60 transition"
            >
              <UserPlus className="w-4 h-4" /> Add Member Directly
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Members"
          value={activeMembers}
          change="+14% this month"
          icon={<Users className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Total Monthly Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          change="+18.4% vs last month"
          icon={<DollarSign className="w-5 h-5" />}
          color="teal"
        />
        <div 
          onClick={() => setRenewalsModalOpen(true)}
          className="cursor-pointer transition hover:scale-[1.02]"
        >
          <StatCard
            title="Renewals Due (Click to Remind)"
            value={`${expiringMembers.length} Members`}
            change="Click to WhatsApp remind"
            icon={<Bell className="w-5 h-5 text-amber-600" />}
            color="orange"
          />
        </div>
        <StatCard
          title="Walk-ins & Trials"
          value={`${visits.length} Enquiries`}
          change="4 trials scheduled today"
          icon={<UserPlus className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Graphical Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue Graph */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue Growth Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Weekly collection breakdown across all plans</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGradLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(val) => [`₹${val.toLocaleString()}`, "Collection"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#revGradLight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Modes Pie Chart */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Payment Modes Split</h3>
            <p className="text-xs text-slate-500 mt-0.5">UPI, Cash, Bank and Partial payments</p>
          </div>
          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentModesData}
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {paymentModesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
            {paymentModesData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs font-semibold text-slate-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Members & Equipment Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recently Enrolled Members</h3>
              <p className="text-xs text-slate-500">Live athletes registered in gym system</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              {members.length} Total
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {members.slice(0, 4).map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                    {m.name?.[0] || "M"}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{m.fullName || m.name}</h5>
                    <p className="text-xs text-slate-400">{m.phone} • {m.planName}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  m.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {m.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment & Machine Alerts */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Equipment & Service Status</h3>
              <p className="text-xs text-slate-500">Machine maintenance and safety tracker</p>
            </div>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {stockItems.map((item) => (
              <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-slate-900">{item.name}</h5>
                  <p className="text-xs text-slate-400">Category: {item.type} • Last service: {item.lastServiceDate}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white text-emerald-700 border border-emerald-200 shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {item.condition}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal 1: WhatsApp 10-Min Invite Link */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="📲 Generate 10-Minute Member WhatsApp Link & QR"
      >
        <div className="space-y-4 text-slate-800">
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px] text-emerald-900">
              Owner sirf Name aur WhatsApp number daalega. Member link ya <strong>QR Code scan</strong> karke photo, plan, trainer aur digital waiver khud bharega!
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Member Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Member WhatsApp Number *</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={invitePhone}
              onChange={(e) => {
                setInvitePhone(e.target.value);
                if (!loginEmail) setLoginEmail(e.target.value);
              }}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* PT Membership & Credentials Configuration */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPT}
                onChange={(e) => setIsPT(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Is this link for a Personal Training (PT) Member?
              </span>
            </label>

            {isPT && (
              <div className="space-y-2.5 pt-2 border-t border-indigo-200/70">
                <p className="text-[11px] text-indigo-900 leading-tight">
                  PT member ke liye Portal Login ID aur Password set karein jisse wo apne coach se live chat, diet aur workout le sake:
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assign Personal Trainer / Coach
                  </label>
                  <select
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {trainersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialization || 'Fitness Coach'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Member Login ID / Phone
                    </label>
                    <input
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={invitePhone || '9876543210'}
                      className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Portal Login Password
                    </label>
                    <input
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Member@123"
                      className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!generatedLink ? (
            <button
              onClick={handleGenerateLink}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition"
            >
              {isPT ? "⚡ Generate PT Link, QR & Credentials" : "Generate Link & QR Code"}
            </button>
          ) : (
            <div className="space-y-3.5 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4 text-emerald-600" /> Active 10-Minute Link:
                </span>
                <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full ${linkCountdown <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-900'}`}>
                  {linkCountdown <= 0 ? 'EXPIRED' : `${String(Math.floor(linkCountdown / 60)).padStart(2, '0')}:${String(linkCountdown % 60).padStart(2, '0')} Left`}
                </span>
              </div>

              {isPT && (
                <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>PT Login: <strong>{loginEmail.trim() || invitePhone.trim()}</strong> | Pass: <strong className="font-mono text-emerald-700">{loginPassword.trim() || 'Member@123'}</strong></span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 shrink-0">PT Link</span>
                </div>
              )}

              {/* Link & QR Code 2-column view */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center pt-1">
                {/* Left Column: Link input & buttons */}
                <div className="space-y-2.5 flex flex-col justify-center">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Direct Registration Link</label>
                    <input
                      readOnly
                      value={generatedLink}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono select-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        toast.success("Link copied!");
                      }}
                      className="w-full py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <button
                      onClick={() => {
                        const rawNum = invitePhone.replace(/\D/g, "");
                        const waPhone = rawNum.length === 10 ? `91${rawNum}` : rawNum;
                        const selTrainer = trainersList.find((t) => t.id === selectedTrainerId);

                        let extraPtMsg = "";
                        if (isPT) {
                          const userLogin = loginEmail.trim() || invitePhone.trim();
                          const passLogin = loginPassword.trim() || "Member@123";
                          const coachName = selTrainer?.name ? `Coach ${selTrainer.name}` : "Personal Trainer";
                          extraPtMsg = `\n\n🔑 *Your PT Member App Login Credentials:*\n• Login ID / User: *${userLogin}*\n• Password: *${passLogin}*\n• Dedicated Coach: *${coachName}*\n_Use these credentials to log into your portal to chat with your coach & view customized meal & workout plans!_`;
                        }

                        const msg = encodeURIComponent(
                          `💪 *Welcome to ${settings.gymName || 'UNIVO GYM'}!*\n\nHi ${inviteName || 'Athlete'},\nPlease complete your gym registration form, choose your membership plan & trainer, and sign your liability waiver using this direct link:\n\n🔗 ${generatedLink}${extraPtMsg}\n\n⚠️ *Important:* This secure registration link expires in 10 minutes.`
                        );
                        window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank");
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <MessageCircle className="w-4 h-4" /> Send via WhatsApp
                    </button>
                  </div>
                </div>

                {/* Right Column: Instant QR Code Box */}
                <div className="p-3 bg-white border-2 border-emerald-100 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                  <p className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Scan to Register
                  </p>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                    <QRCodeSVG
                      value={generatedLink}
                      size={135}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 max-w-[180px] leading-tight">
                    Scan with mobile camera to create ID instantly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 2: Direct Add Member by Owner with complete registration flow */}
      <DirectAddMemberModal
        isOpen={directAddOpen}
        onClose={() => setDirectAddOpen(false)}
        onSuccess={(newMem) => setMembers([newMem, ...members])}
        plans={plans}
      />

      {/* Modal 3: Renewals & WhatsApp Reminders Blast */}
      <Modal
        isOpen={renewalsModalOpen}
        onClose={() => setRenewalsModalOpen(false)}
        title="🔔 3-Day Renewals & WhatsApp Reminder Blast"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-xs text-slate-500">
            List of members whose gym membership is expiring within 3 to 7 days. Send official WhatsApp renewal reminders in 1-click:
          </p>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {expiringMembers.map((m) => {
              const expFormatted = m.expiryDate
                ? new Date(m.expiryDate?.seconds ? m.expiryDate.seconds * 1000 : m.expiryDate).toLocaleDateString("en-IN")
                : "Soon";
              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{m.fullName || m.name}</h4>
                    <p className="text-xs text-slate-500">{m.planName} • Expiring: <span className="font-bold text-amber-600">{expFormatted}</span></p>
                    <p className="text-xs text-emerald-700 font-semibold">Renewal Fee: ₹{m.renewalFee || "2,500"}</p>
                  </div>
                  <button
                    onClick={() => handleSendReminder(m)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" /> Send Reminder
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                expiringMembers.forEach(m => handleSendReminder(m));
                toast.success("Broadcast initiated for all expiring members!");
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-sm"
            >
              🚀 Send WhatsApp Reminders to All Expiring
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}