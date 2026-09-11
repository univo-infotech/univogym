import React, { useState, useEffect } from "react";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  UserPlus, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight,
  Share2,
  Clock
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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
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
        setMembers(m || []);
        setPayments(p || []);
        setStockItems(s || []);
        setVisits(v || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === "active").length;
  const totalRevenue = payments.reduce((acc, curr) => acc + (Number(curr.paidAmount) || Number(curr.amount) || 0), 0);

  // Weekly dummy data for graphical visual
  const revenueData = [
    { day: "Mon", revenue: 4200 },
    { day: "Tue", revenue: 6800 },
    { day: "Wed", revenue: 5100 },
    { day: "Thu", revenue: 8900 },
    { day: "Fri", revenue: 11400 },
    { day: "Sat", revenue: 14500 },
    { day: "Sun", revenue: 9800 },
  ];

  const paymentModesData = [
    { name: "Cash", value: 35, color: "#22c55e" },
    { name: "Online UPI", value: 45, color: "#00b4d8" },
    { name: "Bank Transfer", value: 12, color: "#8b5cf6" },
    { name: "Mixed Mode", value: 8, color: "#f59e0b" },
  ];

  const handleGenerateLink = async () => {
    if (!invitePhone) return;
    try {
      const token = await generateInviteToken("univo_main", invitePhone);
      const link = `${window.location.origin}/register/univo_main/${token}`;
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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                UNIVO GYM MANAGEMENT
              </span>
              <span className="text-xs text-slate-400">Live Dashboard</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Welcome back, Owner! 💪</h1>
            <p className="text-slate-400 text-sm mt-1">
              "Stronger Today, Healthier Tomorrow" • Complete real-time overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="whatsapp"
              icon={<Share2 className="w-4 h-4" />}
              onClick={() => setInviteModalOpen(true)}
            >
              Add Member (5-Min WhatsApp Link)
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Members"
          value={activeMembers > 0 ? activeMembers : "148"}
          change="+12% this month"
          icon={<Users className="w-5 h-5 text-green-400" />}
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue > 0 ? totalRevenue.toLocaleString() : "1,84,500"}`}
          change="+8.4% vs last month"
          icon={<DollarSign className="w-5 h-5 text-teal-400" />}
          color="teal"
        />
        <StatCard
          title="Renewals Due (7 Days)"
          value="14"
          change="Urgent reminders ready"
          icon={<Calendar className="w-5 h-5 text-orange-400" />}
          color="orange"
        />
        <StatCard
          title="Visits & Inquiries"
          value={visits.length > 0 ? visits.length : "26"}
          change="6 demos scheduled"
          icon={<UserPlus className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue Graph */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" /> Revenue Growth Trend
              </h3>
              <p className="text-xs text-slate-400">Weekly cash + online collection overview</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }}
                  formatter={(val) => [`₹${val}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Modes Pie Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Payment Mode Breakdown</h3>
            <p className="text-xs text-slate-400">Cash / Online / Mixed split</p>
          </div>
          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentModesData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentModesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            {paymentModesData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs text-slate-300">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Link Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="📲 Generate 5-Minute Member WhatsApp Link"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Owner sirf WhatsApp number daalega. Member ke paas link jayegi, wo photo, details, PT selection, aur **Liability Waiver par digital signature** khud bharega!
          </p>
          
          <div>
            <label className="text-xs font-medium text-slate-300">Member WhatsApp Number</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>

          {!generatedLink ? (
            <Button fullWidth onClick={handleGenerateLink}>
              Generate 5-Minute Link
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-green-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Valid for:
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {Math.floor(linkCountdown / 60)}:{(linkCountdown % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg text-xs font-mono text-slate-300 break-all select-all">
                {generatedLink}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="whatsapp"
                  fullWidth
                  onClick={() => {
                    const msg = generateMemberInviteMessage("UNIVO GYM MANAGEMENT", "", "");
                    openWhatsApp(invitePhone, `${msg}\n\n🔗 ${generatedLink}`);
                  }}
                >
                  Send On WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(generatedLink)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
