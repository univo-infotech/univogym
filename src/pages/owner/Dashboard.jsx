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
  ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { getMembers, generateInviteToken } from "../../firebase/members";
import { getAllPayments } from "../../firebase/payments";
import { getStock } from "../../firebase/stock";
import { getVisits } from "../../firebase/visits";
import { openWhatsApp, generateMemberInviteMessage } from "../../utils/whatsapp";

export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [visits, setVisits] = useState([]);

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [directAddOpen, setDirectAddOpen] = useState(false);
  const [directMember, setDirectMember] = useState({ name: "", phone: "", email: "", planName: "3-Month Pro", gender: "Male" });

  const [invitePhone, setInvitePhone] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCountdown, setLinkCountdown] = useState(300);

  useEffect(() => {
    async function loadData() {
      try {
        const m = await getMembers("univo_main");
        const p = await getAllPayments("univo_main");
        const s = await getStock("univo_main");
        const v = await getVisits("univo_main");
        setMembers(m && m.length > 0 ? m : [
          { id: "m1", fullName: "Ajay Prajapati", name: "Ajay Prajapati", phone: "+91 9196302375", planName: "3-Month Pro", status: "active", createdAt: "2026-09-10" },
          { id: "m2", fullName: "Rahul Verma", name: "Rahul Verma", phone: "+91 9876543210", planName: "Annual Elite", status: "active", createdAt: "2026-09-08" },
          { id: "m3", fullName: "Priya Sharma", name: "Priya Sharma", phone: "+91 9811223344", planName: "6-Month Transformation", status: "active", createdAt: "2026-09-05" },
          { id: "m4", fullName: "Aman Gupta", name: "Aman Gupta", phone: "+91 9988776655", planName: "1-Month Basic", status: "expiring", createdAt: "2026-08-14" },
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
    if (!invitePhone) return;
    try {
      const token = await generateInviteToken("univo_main", { phone: invitePhone });
      const link = `${window.location.origin}/#/register/univo_main/${token}`;
      setGeneratedLink(link);
      setLinkCountdown(300);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!generatedLink || linkCountdown <= 0) return;
    const interval = setInterval(() => {
      setLinkCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [generatedLink, linkCountdown]);

  return (
    <div className="space-y-8">
      {/* Welcome Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white shadow-lg shadow-emerald-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3">
              <span>UNIVO GYM MANAGEMENT</span>
              <span>•</span>
              <span className="text-emerald-100 font-medium">Live Dashboard</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Welcome, Gym Owner! 💪</h1>
            <p className="text-emerald-50 text-sm mt-1 max-w-xl">
              "Stronger Today, Healthier Tomorrow" — Real-time overview of members, revenues, trainers, and equipment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 shadow-md transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4 text-emerald-600" /> Share 5-Min WhatsApp Link
            </button>
            <button
              onClick={() => setDirectAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 border border-white/30 text-white font-bold text-xs backdrop-blur-md transition-all active:scale-95"
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
        <StatCard
          title="Renewals Due (7 Days)"
          value="8 Members"
          change="Reminders ready to blast"
          icon={<Calendar className="w-5 h-5" />}
          color="orange"
        />
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

      {/* Recent Members & Recent Billing Row */}
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
        title="📲 Generate 5-Minute Member WhatsApp Link"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-xs text-slate-500">
            Owner sirf WhatsApp number daalega. Member ke paas link jayegi, wo photo (Gallery ya Camera), details, PT selection, aur **Liability Waiver par digital signature** khud bharega!
          </p>
          
          <div>
            <label className="text-xs font-bold text-slate-700">Member WhatsApp Number</label>
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
            >
              Generate 5-Minute Link
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Link Valid for:
                </span>
                <span className="font-mono text-amber-700 font-bold">
                  {Math.floor(linkCountdown / 60)}:{(linkCountdown % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 break-all select-all">
                {generatedLink}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const msg = `💪 *Welcome to UNIVO GYM MANAGEMENT!*\n\nPlease complete your registration form & liability waiver:\n🔗 ${generatedLink}\n\n⚠️ Valid for 5 minutes only.`;
                    openWhatsApp(invitePhone, msg);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" /> Send on WhatsApp
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedLink)}
                  className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 2: Direct Add Member by Owner */}
      <Modal
        isOpen={directAddOpen}
        onClose={() => setDirectAddOpen(false)}
        title="➕ Add Member Directly (By Owner)"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const { addMember } = await import("../../firebase/members");
            const newMem = {
              fullName: directMember.name,
              name: directMember.name,
              phone: directMember.phone,
              email: directMember.email,
              planName: directMember.planName,
              gender: directMember.gender,
              status: "active",
              registeredBy: "owner",
              createdAt: new Date().toISOString()
            };
            await addMember("univo_main", newMem);
            setMembers([newMem, ...members]);
            setDirectAddOpen(false);
          }}
          className="space-y-4 text-slate-800"
        >
          <div>
            <label className="text-xs font-bold text-slate-700">Full Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Ajay Prajapati"
              value={directMember.name}
              onChange={(e) => setDirectMember({ ...directMember, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Phone Number *</label>
              <input
                required
                type="text"
                placeholder="9876543210"
                value={directMember.phone}
                onChange={(e) => setDirectMember({ ...directMember, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Gender</label>
              <select
                value={directMember.gender}
                onChange={(e) => setDirectMember({ ...directMember, gender: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                placeholder="ajay@gmail.com"
                value={directMember.email}
                onChange={(e) => setDirectMember({ ...directMember, email: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Membership Plan</label>
              <select
                value={directMember.planName}
                onChange={(e) => setDirectMember({ ...directMember, planName: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option>1-Month Basic</option>
                <option>3-Month Pro</option>
                <option>6-Month Transformation</option>
                <option>Annual Elite Plan</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save & Add Member to Gym
          </button>
        </form>
      </Modal>
    </div>
  );
}
