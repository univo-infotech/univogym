import React, { useState, useEffect } from "react";
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
  Copy
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
import { getAllPayments } from "../../firebase/payments";
import { getStock } from "../../firebase/stock";
import { getVisits } from "../../firebase/visits";
import { openWhatsApp, generateMemberInviteMessage, generateRenewalReminderMessage } from "../../utils/whatsapp";
import { getGymSettings } from "../../utils/settings";
import DirectAddMemberModal from "../../components/shared/DirectAddMemberModal";

export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [visits, setVisits] = useState([]);
  const [settings, setSettings] = useState(getGymSettings());

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [directAddOpen, setDirectAddOpen] = useState(false);
  const [renewalsModalOpen, setRenewalsModalOpen] = useState(false);
  const [directMember, setDirectMember] = useState({ name: "", phone: "", email: "", planName: "3-Month Pro", gender: "Male" });

  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCountdown, setLinkCountdown] = useState(300);

  useEffect(() => {
    setSettings(getGymSettings());
    async function loadData() {
      try {
        const m = await getMembers("univo_main");
        const p = await getAllPayments("univo_main");
        const s = await getStock("univo_main");
        const v = await getVisits("univo_main");
        setMembers(m && m.length > 0 ? m : [
          { id: "m1", fullName: "Ajay Prajapati", name: "Ajay Prajapati", phone: "+91 9196302375", planName: "3-Month Pro", status: "active", createdAt: "2026-09-10", expiryDate: "2026-12-10", renewalFee: "6500" },
          { id: "m2", fullName: "Rahul Verma", name: "Rahul Verma", phone: "+91 9876543210", planName: "Annual Elite", status: "active", createdAt: "2026-09-08", expiryDate: "2027-09-08", renewalFee: "18000" },
          { id: "m3", fullName: "Priya Sharma", name: "Priya Sharma", phone: "+91 9811223344", planName: "6-Month Transformation", status: "active", createdAt: "2026-09-05", expiryDate: "2027-03-05", renewalFee: "11000" },
          { id: "m4", fullName: "Aman Gupta", name: "Aman Gupta", phone: "+91 9988776655", planName: "1-Month Basic", status: "expiring", createdAt: "2026-08-14", expiryDate: "2026-09-14", renewalFee: "2500" },
          { id: "m5", fullName: "Karan Johar", name: "Karan Johar", phone: "+91 9711003322", planName: "3-Month Pro", status: "expiring", createdAt: "2026-06-15", expiryDate: "2026-09-15", renewalFee: "6500" },
        ]);
        setPayments(p && p.length > 0 ? p : [
          { id: "p1", memberName: "Ajay Prajapati", planName: "3-Month Pro", paidAmount: 6500, amount: 6500, dueAmount: 0, paymentMode: "online", date: "12 Sep 2026" },
          { id: "p2", memberName: "Rahul Verma", planName: "Annual Elite", paidAmount: 18000, amount: 18000, dueAmount: 0, paymentMode: "cash", date: "11 Sep 2026" },
          { id: "p3", memberName: "Priya Sharma", planName: "6-Month Transformation", paidAmount: 8000, amount: 11000, dueAmount: 3000, paymentMode: "mixed", date: "10 Sep 2026" },
        ]);
        setStockItems(s && s.length > 0 ? s : [
          { id: "s1", name: "Lat Pulldown Machine", type: "Machine", condition: "Operational", lastServiceDate: "2026-08-15" },
          { id: "s2", name: "Olympic Barbell & 20kg Plates", type: "Weights", condition: "Good", lastServiceDate: "2026-07-20" },
          { id: "s3", name: "Commercial Treadmill T90", type: "Cardio", condition: "Service Due Soon", lastServiceDate: "2026-06-10" },
        ]);
        setVisits(v && v.length > 0 ? v : [
          { id: "v1", name: "Sunil Kapoor", phone: "+91 9711002233", interestedIn: "Weight Loss Trial", status: "demo_done", createdAt: "2026-09-11" },
          { id: "v2", name: "Kavita Rao", phone: "+91 9822334455", interestedIn: "Personal Training", status: "new", createdAt: "2026-09-12" },
        ]);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === "active").length || 148;
  const totalRevenue = payments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || Number(curr.amount) || 0), 0) || 184500;
  const expiringMembers = members.filter(m => m.status === "expiring" || m.id === "m4" || m.id === "m5");

  // Chart dummy data
  const revenueData = [
    { day: "Mon", revenue: 8200 },
    { day: "Tue", revenue: 12400 },
    { day: "Wed", revenue: 9800 },
    { day: "Thu", revenue: 15600 },
    { day: "Fri", revenue: 21400 },
    { day: "Sat", revenue: 28900 },
    { day: "Sun", revenue: 19500 },
  ];

  const paymentModesData = [
    { name: "Online UPI", value: 52, color: "#10b981" },
    { name: "Cash", value: 30, color: "#06b6d4" },
    { name: "Bank Transfer", value: 11, color: "#8b5cf6" },
    { name: "Mixed Mode", value: 7, color: "#f59e0b" },
  ];

  const handleGenerateLink = async () => {
    if (!invitePhone.trim()) {
      toast.error("Enter WhatsApp phone number first!");
      return;
    }
    const link = await generateInviteToken("univo_main", {
      memberName: inviteName.trim(),
      phone: invitePhone.trim(),
    });
    setGeneratedLink(link);
    setLinkCountdown(300);
    toast.success("5-Minute Invite Link & QR Code Generated!");
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
              <Share2 className="w-4 h-4 text-emerald-600" /> Share 5-Min WhatsApp Link
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

      {/* Modal 1: WhatsApp 5-Min Invite Link */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="📲 Generate 5-Minute Member WhatsApp Link & QR"
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
              onChange={(e) => setInvitePhone(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {!generatedLink ? (
            <button
              onClick={handleGenerateLink}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition"
            >
              Generate Link & QR Code
            </button>
          ) : (
            <div className="space-y-3.5 pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4 text-emerald-600" /> Active 5-Minute Link:
                </span>
                <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full ${linkCountdown <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-900'}`}>
                  {linkCountdown <= 0 ? 'EXPIRED' : `${String(Math.floor(linkCountdown / 60)).padStart(2, '0')}:${String(linkCountdown % 60).padStart(2, '0')} Left`}
                </span>
              </div>

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
                        const msg = encodeURIComponent(
                          `💪 *Welcome to ${settings.gymName || 'UNIVO GYM'}!*\n\nHi ${inviteName || 'Athlete'},\nPlease complete your gym registration form, choose your membership plan & trainer, and sign your liability waiver using this direct link:\n\n🔗 ${generatedLink}\n\n⚠️ *Important:* This secure registration link expires in 5 minutes.`
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
            {expiringMembers.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{m.fullName || m.name}</h4>
                  <p className="text-xs text-slate-500">{m.planName} • Expiring: <span className="font-bold text-amber-600">{m.expiryDate}</span></p>
                  <p className="text-xs text-emerald-700 font-semibold">Renewal Fee: ₹{m.renewalFee || "2,500"}</p>
                </div>
                <button
                  onClick={() => handleSendReminder(m)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Send Reminder
                </button>
              </div>
            ))}
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