import React, { useState, useEffect, useMemo } from "react";
import {
  Medal,
  Users,
  Dumbbell,
  DollarSign,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  X,
  MessageCircle,
  RefreshCw,
  Eye,
  HandCoins,
  Percent,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  Award,
  UserCheck,
  ShieldCheck,
  Flame,
  Phone,
  AlertTriangle
} from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { getMembers, updateMember } from "../../firebase/members";
import { getTrainers, updateTrainer } from "../../firebase/trainers";
import { addPayment } from "../../firebase/payments";
import { getGymSettings } from "../../utils/settings";
import toast from "react-hot-toast";

export default function PtMemberships() {
  const { gymId } = useAuth();
  const GID = gymId || "univo_main";

  // Core data states
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: "clients" (Active PT Clients) or "packages" (Trainer Packages Catalog)
  const [activeTab, setActiveTab] = useState("clients");

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, ending_soon, expired

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [quickExtendModal, setQuickExtendModal] = useState(null);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersData, trainersData] = await Promise.all([
        getMembers(GID),
        getTrainers(GID)
      ]);
      setMembers(membersData || []);
      setTrainers(trainersData || []);
    } catch (err) {
      console.error("Error loading PT Memberships data:", err);
      toast.error("Failed to load PT data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [GID]);

  // Derive All PT Clients
  // A member is a PT client if hasPersonalCoach is true OR ptPlanName is set OR trainerName is personal trainer
  const ptClients = useMemo(() => {
    return members.filter((m) => {
      const hasPtFlag = m.hasPersonalCoach === true || Boolean(m.ptPlanName) || (Number(m.ptPlanPrice) > 0);
      const isNotGeneral = m.trainerName && m.trainerName !== "General Floor Trainer (Included)" && m.trainerName !== "General Floor Trainer";
      return hasPtFlag || isNotGeneral;
    }).map((m) => {
      // Determine PT Status
      const now = new Date();
      let status = "active";
      let daysRemaining = null;

      const expDate = m.ptExpiryDate || m.expiryDate;
      if (expDate) {
        const d = new Date(expDate);
        if (!isNaN(d.getTime())) {
          const diffMs = d.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (daysRemaining < 0) {
            status = "expired";
          } else if (daysRemaining <= 7) {
            status = "ending_soon";
          } else {
            status = "active";
          }
        }
      }

      // Matched trainer object
      const assignedTrainer = trainers.find((t) => t.id === m.trainerId || (t.name || t.fullName) === m.trainerName);

      return {
        ...m,
        ptStatus: status,
        daysRemaining,
        assignedTrainer
      };
    });
  }, [members, trainers]);

  // Filtered PT Clients
  const filteredClients = useMemo(() => {
    return ptClients.filter((c) => {
      const nameMatch = (c.name || c.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || "").includes(search) ||
        (c.trainerName || "").toLowerCase().includes(search.toLowerCase());
      
      const trainerMatch = selectedTrainerFilter === "all" || 
        c.trainerId === selectedTrainerFilter || 
        (c.trainerName && c.assignedTrainer?.id === selectedTrainerFilter);

      const statusMatch = statusFilter === "all" || c.ptStatus === statusFilter;

      return nameMatch && trainerMatch && statusMatch;
    });
  }, [ptClients, search, selectedTrainerFilter, statusFilter]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const totalClients = ptClients.length;
    const activeClients = ptClients.filter((c) => c.ptStatus === "active").length;
    const endingSoonClients = ptClients.filter((c) => c.ptStatus === "ending_soon").length;

    let totalRevenue = 0;
    let ownerCommissionTotal = 0;
    let trainerPayoutTotal = 0;

    ptClients.forEach((c) => {
      const price = Number(c.ptPlanPrice || 0);
      totalRevenue += price;

      const ownerCut = Number(c.ptOwnerCommission || 0);
      const trainerCut = Number(c.ptTrainerPayout || 0);

      if (ownerCut > 0 || trainerCut > 0) {
        ownerCommissionTotal += ownerCut;
        trainerPayoutTotal += trainerCut;
      } else if (price > 0) {
        // Fallback calculation using trainer's commission setting or default 30/70
        const trainer = c.assignedTrainer;
        const commType = trainer?.commissionType || "percentage";
        const commVal = trainer?.commissionValue !== undefined ? Number(trainer.commissionValue) : 30;
        if (commType === "fixed") {
          const oCut = Math.min(price, commVal);
          ownerCommissionTotal += oCut;
          trainerPayoutTotal += Math.max(0, price - oCut);
        } else {
          const oCut = Math.round(price * (commVal / 100));
          ownerCommissionTotal += oCut;
          trainerPayoutTotal += Math.max(0, price - oCut);
        }
      }
    });

    return {
      totalClients,
      activeClients,
      endingSoonClients,
      totalRevenue,
      ownerCommissionTotal,
      trainerPayoutTotal
    };
  }, [ptClients]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Medal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Personal Training (PT) Memberships
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage 1-on-1 trainer packages, client allocations, and commission splits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchData}
            className="text-xs font-bold"
          >
            Refresh
          </Button>
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setAssignModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm"
          >
            Enroll / Assign PT
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Active PT Clients */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active PT Clients
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.activeClients}</span>
            <span className="text-xs font-bold text-slate-400">/ {stats.totalClients} total</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.endingSoonClients > 0 ? (
              <span className="text-amber-600 font-bold">⚠️ {stats.endingSoonClients} ending this week</span>
            ) : (
              <span className="text-emerald-600 font-bold">All client passes valid</span>
            )}
          </p>
        </div>

        {/* Total PT Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total PT Volume
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ₹{stats.totalRevenue.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-slate-500">
            Value of current active & ongoing PT packages
          </p>
        </div>

        {/* Gym Owner Cut */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 border border-indigo-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">
              🏢 Gym Owner Share
            </span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-950">
            ₹{stats.ownerCommissionTotal.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-indigo-700 font-medium">
            Gym revenue share retained from PT sales
          </p>
        </div>

        {/* Trainer Payouts */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider">
              🏋️ Trainer Payouts
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-950">
            ₹{stats.trainerPayoutTotal.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium">
            Trainer earnings from 1-on-1 coaching
          </p>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "clients"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Active PT Clients ({ptClients.length})
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "packages"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Trainer Packages & Deals ({trainers.length} Coaches)
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE PT CLIENTS */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search athlete, phone, trainer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Trainer Filter */}
              <select
                value={selectedTrainerFilter}
                onChange={(e) => setSelectedTrainerFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Trainers</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.fullName}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Pass</option>
                <option value="ending_soon">Ending Soon (≤ 7 Days)</option>
                <option value="expired">Expired Pass</option>
              </select>
            </div>
          </div>

          {/* PT Clients Table */}
          {loading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mb-2"></div>
              <p className="text-xs font-bold text-slate-500">Loading PT memberships...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto text-purple-600">
                <Medal className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">No PT Clients Found</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {search || selectedTrainerFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters or search keyword."
                    : "No members are currently enrolled in a Personal Training plan."}
                </p>
              </div>
              <Button
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setAssignModalOpen(true)}
                className="bg-purple-600 text-white text-xs font-bold"
              >
                Enroll First PT Client
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Athlete / Member</th>
                      <th className="py-3 px-4">Assigned Trainer</th>
                      <th className="py-3 px-4">PT Package</th>
                      <th className="py-3 px-4">Fee & Split</th>
                      <th className="py-3 px-4">Validity / Status</th>
                      <th className="py-3 px-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => {
                      const expDate = client.ptExpiryDate || client.expiryDate;
                      const formattedExp = expDate ? new Date(expDate).toLocaleDateString("en-IN") : "N/A";
                      const ptFee = Number(client.ptPlanPrice || 0);

                      // Owner and Trainer split
                      const ownerCut = Number(client.ptOwnerCommission || 0);
                      const trainerCut = Number(client.ptTrainerPayout || 0);

                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-purple-50/30 transition group"
                        >
                          {/* Member */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden shadow-2xs">
                                {client.photoURL ? (
                                  <img
                                    src={client.photoURL}
                                    alt={client.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  (client.name || "U")[0].toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                  {client.name || client.fullName}
                                  {client.gender && (
                                    <span className="text-[10px] font-normal text-slate-400">
                                      ({client.gender})
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {client.phone || "No phone"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Trainer */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Dumbbell className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">
                                  {client.trainerName || "Unassigned"}
                                </p>
                                {client.assignedTrainer?.specialization && (
                                  <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                    {client.assignedTrainer.specialization}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Package */}
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-purple-950 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-lg inline-block">
                              {client.ptPlanName || "Custom 1-on-1 PT"}
                            </span>
                            {client.ptDuration && (
                              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                ⏱️ {client.ptDuration}
                              </p>
                            )}
                          </td>

                          {/* Fee & Split */}
                          <td className="py-3.5 px-4">
                            <p className="font-black text-slate-900 text-xs">
                              ₹{ptFee.toLocaleString("en-IN")}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                              <span className="text-indigo-700 font-bold">
                                Gym: ₹{ownerCut.toLocaleString("en-IN")}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="text-emerald-700 font-bold">
                                Coach: ₹{trainerCut.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </td>

                          {/* Validity / Status */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {client.ptStatus === "active" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active ({client.daysRemaining !== null ? `${client.daysRemaining} days left` : "Valid"})
                                </span>
                              ) : client.ptStatus === "ending_soon" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock3 className="w-3 h-3" />
                                  Ending Soon ({client.daysRemaining} days)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Expired
                                </span>
                              )}
                              <p className="text-[10px] text-slate-400">
                                Valid Till: {formattedExp}
                              </p>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Contact */}
                              {client.phone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cleanPhone = client.phone.replace(/\D/g, "");
                                    const msg = encodeURIComponent(
                                      `Hi ${client.name || "Athlete"}, this is regarding your Personal Training sessions at the gym. How is your workout progress going? 💪`
                                    );
                                    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
                                  }}
                                  title="WhatsApp Athlete"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition border border-emerald-200"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Quick Renew / Extend */}
                              <button
                                type="button"
                                onClick={() => setQuickExtendModal(client)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                              >
                                Renew PT
                              </button>

                              {/* View Detail Modal */}
                              <button
                                type="button"
                                onClick={() => setSelectedClientDetail(client)}
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition border border-slate-200"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRAINER PACKAGES & COMMISSION CATALOG */}
      {activeTab === "packages" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-100">
            <h3 className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-600" /> Trainer PT Packages & Revenue Sharing Structure
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Every trainer can have their own custom personal training packages and commission split agreement with the gym owner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainers.map((t) => {
              const coachClients = ptClients.filter(
                (c) => c.trainerId === t.id || (c.trainerName && c.trainerName === (t.name || t.fullName))
              );
              const commType = t.commissionType || "percentage";
              const commVal = t.commissionValue !== undefined ? Number(t.commissionValue) : 30;

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5 flex flex-col justify-between hover:border-purple-300 transition"
                >
                  <div className="space-y-3">
                    {/* Header: Photo, Name, Specialization */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden shadow-2xs">
                        {t.photoUrl ? (
                          <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          (t.name || "T")[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">
                          {t.name || t.fullName}
                        </h4>
                        <p className="text-[11px] text-emerald-700 font-semibold truncate">
                          {t.specialization || "Fitness Coach"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {coachClients.length} Active PT Athletes
                        </p>
                      </div>
                    </div>

                    {/* Commission Deal Pill */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-indigo-950 flex items-center gap-1">
                          <HandCoins className="w-3.5 h-3.5 text-indigo-600" /> Deal Structure:
                        </span>
                        <span className="text-indigo-700 font-black">
                          {commType === "percentage" ? `${commVal}% Gym / ${100 - commVal}% Coach` : `₹${commVal.toLocaleString("en-IN")} Flat Gym Cut`}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {commType === "percentage"
                          ? `Gym retains ${commVal}% of package fee; trainer gets ${100 - commVal}%.`
                          : `Gym retains flat ₹${commVal.toLocaleString("en-IN")} per admission.`}
                      </p>
                    </div>

                    {/* PT Packages List */}
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Dumbbell className="w-3 h-3 text-slate-400" /> Active PT Packages:
                      </h5>
                      {Array.isArray(t.ptPlans) && t.ptPlans.length > 0 ? (
                        <div className="space-y-2">
                          {t.ptPlans.map((pkg, pidx) => (
                            <div
                              key={pkg.id || pidx}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900">{pkg.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  {pkg.duration || "Custom duration"}
                                </p>
                              </div>
                              <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/60">
                                ₹{Number(pkg.price || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic py-2">
                          No custom packages listed. Custom 1-on-1 PT enabled.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Enroll button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAssignModalOpen(true);
                    }}
                    className="w-full text-xs font-bold text-purple-700 border-purple-200 hover:bg-purple-50"
                  >
                    Enroll Member with {t.name?.split(" ")[0] || "Trainer"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ENROLL / ASSIGN PT TO MEMBER */}
      {assignModalOpen && (
        <AssignPtModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          members={members}
          trainers={trainers}
          gymId={GID}
          onSuccess={() => {
            fetchData();
            setAssignModalOpen(false);
          }}
        />
      )}

      {/* MODAL 2: QUICK RENEW / EXTEND PT */}
      {quickExtendModal && (
        <QuickRenewPtModal
          isOpen={Boolean(quickExtendModal)}
          onClose={() => setQuickExtendModal(null)}
          client={quickExtendModal}
          trainers={trainers}
          gymId={GID}
          onSuccess={() => {
            fetchData();
            setQuickExtendModal(null);
          }}
        />
      )}

      {/* MODAL 3: CLIENT PT DETAILS */}
      {selectedClientDetail && (
        <Modal
          isOpen={Boolean(selectedClientDetail)}
          onClose={() => setSelectedClientDetail(null)}
          title={`🏋️ PT Details: ${selectedClientDetail.name || selectedClientDetail.fullName}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            {/* Athlete Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900 text-sm">
                  {selectedClientDetail.name || selectedClientDetail.fullName}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  📞 {selectedClientDetail.phone || "No phone"} | {selectedClientDetail.email || "No email"}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                selectedClientDetail.ptStatus === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : selectedClientDetail.ptStatus === "ending_soon"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}>
                {selectedClientDetail.ptStatus?.toUpperCase()}
              </span>
            </div>

            {/* Package & Coach */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200">
                <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">
                  Assigned Coach
                </span>
                <p className="font-black text-purple-950 text-sm mt-0.5">
                  {selectedClientDetail.trainerName || "Unassigned"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200">
                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                  PT Package
                </span>
                <p className="font-black text-indigo-950 text-sm mt-0.5">
                  {selectedClientDetail.ptPlanName || "1-on-1 Coaching"}
                </p>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-100 shadow-2xs space-y-2">
              <h5 className="font-extrabold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Payment & Commission Split</span>
                <span className="text-purple-700">₹{Number(selectedClientDetail.ptPlanPrice || 0).toLocaleString("en-IN")}</span>
              </h5>
              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                  <p className="text-[10px] text-indigo-700 font-bold">Gym Owner Cut</p>
                  <p className="text-sm font-black text-indigo-950 mt-0.5">
                    ₹{Number(selectedClientDetail.ptOwnerCommission || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-bold">Trainer Payout</p>
                  <p className="text-sm font-black text-emerald-950 mt-0.5">
                    ₹{Number(selectedClientDetail.ptTrainerPayout || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            {/* Health & Fitness Goals */}
            {(selectedClientDetail.fitnessGoal || selectedClientDetail.healthNotes) && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-bold text-slate-700">🎯 Fitness Goal & Notes:</p>
                <p className="text-slate-600">
                  {selectedClientDetail.fitnessGoal || "General conditioning"}
                </p>
                {selectedClientDetail.healthNotes && (
                  <p className="text-slate-500 text-[11px] italic">
                    Note: {selectedClientDetail.healthNotes}
                  </p>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClientDetail(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 text-white font-bold"
                onClick={() => {
                  const client = selectedClientDetail;
                  setSelectedClientDetail(null);
                  setQuickExtendModal(client);
                }}
              >
                Renew PT Plan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =========================================================================
// MODAL COMPONENT: ENROLL / ASSIGN PT TO A MEMBER
// =========================================================================
function AssignPtModal({ isOpen, onClose, members = [], trainers = [], gymId, onSuccess }) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState(trainers[0]?.id || "");
  const [selectedPkgIndex, setSelectedPkgIndex] = useState(0);

  // Custom overrides
  const [customPrice, setCustomPrice] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [saving, setSaving] = useState(false);

  // Settings & Slots
  const gymSettings = useMemo(() => getGymSettings(), []);
  const activeSlots = useMemo(() => {
    const configured = gymSettings?.workoutSlots;
    if (Array.isArray(configured) && configured.length > 0) {
      return configured.map((s) => ({
        id: s.id || s.label,
        label: s.label,
        time: s.time
      }));
    }
    return [
      { id: "morning", label: "Morning", time: "6:00 AM - 9:00 AM" },
      { id: "afternoon", label: "Afternoon", time: "12:00 PM - 3:00 PM" },
      { id: "evening", label: "Evening", time: "4:00 PM - 7:00 PM" },
      { id: "night", label: "Night", time: "7:00 PM - 10:00 PM" }
    ];
  }, [gymSettings]);

  const [selectedSlot, setSelectedSlot] = useState(
    activeSlots[0] ? `${activeSlots[0].label} (${activeSlots[0].time})` : "Morning (6:00 AM - 9:00 AM)"
  );

  // Current chosen trainer
  const currentTrainer = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];

  // Calculate live occupancy for the selected trainer
  const trainerSlotOccupancy = useMemo(() => {
    if (!currentTrainer) return {};
    const tName = currentTrainer.name || currentTrainer.fullName;
    const tId = currentTrainer.id;

    const assigned = (members || []).filter((m) => {
      const match = m.trainerId === tId || m.trainerName === tName;
      return match && m.status !== "left" && m.active !== false;
    });

    const map = {};
    assigned.forEach((m) => {
      const rawSlot = (m.ptSlot || m.slot || m.workoutSlot || m.preferredTime || "").trim();
      if (!rawSlot) return;
      if (!map[rawSlot]) map[rawSlot] = [];
      map[rawSlot].push(m.name || m.fullName || "Member");
    });
    return map;
  }, [currentTrainer, members]);

  const trainerPlans = currentTrainer?.ptPlans || [
    { id: 1, name: "1 Month 1-on-1 PT", duration: "1 Month (24 Sessions)", price: 4500 },
    { id: 2, name: "3 Months Transformation PT", duration: "3 Months (72 Sessions)", price: 11000 }
  ];

  const currentPkg = trainerPlans[selectedPkgIndex] || trainerPlans[0];
  const effectivePrice = Number(customPrice) > 0 ? Number(customPrice) : Number(currentPkg?.price || 4500);

  // Commission computation
  const commType = currentTrainer?.commissionType || "percentage";
  const commVal = currentTrainer?.commissionValue !== undefined ? Number(currentTrainer.commissionValue) : 30;

  const ownerCut = commType === "percentage"
    ? Math.round(effectivePrice * (commVal / 100))
    : Math.min(effectivePrice, commVal);
  const trainerCut = Math.max(0, effectivePrice - ownerCut);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error("Please select a member");
      return;
    }
    if (!currentTrainer) {
      toast.error("Please select a trainer");
      return;
    }

    setSaving(true);
    try {
      const member = members.find((m) => m.id === selectedMemberId);
      if (!member) throw new Error("Member not found");

      // Calculate PT Expiry date
      const exp = new Date();
      exp.setDate(exp.getDate() + Number(validityDays || 30));

      const updatedPayload = {
        hasPersonalCoach: true,
        trainerId: currentTrainer.id,
        trainerName: currentTrainer.name || currentTrainer.fullName,
        ptPlanId: currentPkg?.id || "custom_pt",
        ptPlanName: currentPkg?.name || "1-on-1 Personal Training",
        ptPlanPrice: effectivePrice,
        ptDuration: currentPkg?.duration || `${validityDays} Days`,
        ptStartDate: new Date().toISOString(),
        ptExpiryDate: exp.toISOString(),
        ptSlot: selectedSlot,
        preferredTime: selectedSlot,
        slot: selectedSlot,
        workoutSlot: selectedSlot,
        ptCommissionType: commType,
        ptCommissionValue: commVal,
        ptOwnerCommission: ownerCut,
        ptTrainerPayout: trainerCut
      };

      // 1. Update Member document
      await updateMember(selectedMemberId, updatedPayload);

      // 2. Record Payment for this PT Membership
      await addPayment(gymId, {
        memberId: member.id,
        memberName: member.name || member.fullName,
        amount: effectivePrice,
        paidAmount: effectivePrice,
        dueAmount: 0,
        paymentMode: "cash",
        planName: `PT: ${currentPkg?.name || "Personal Training"} (${currentTrainer.name})`,
        status: "paid",
        date: new Date().toISOString(),
        notes: `PT enrollment with coach ${currentTrainer.name}. Slot: ${selectedSlot}. Gym cut: ₹${ownerCut}, Coach cut: ₹${trainerCut}`
      });

      toast.success(`PT Assigned! Gym Share: ₹${ownerCut.toLocaleString("en-IN")}, Trainer Share: ₹${trainerCut.toLocaleString("en-IN")}`);
      onSuccess();
    } catch (err) {
      console.error("Failed to assign PT:", err);
      toast.error(err.message || "Failed to assign PT");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏅 Enroll Member in Personal Training (PT)"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Member Select */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Select Member / Athlete *
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
          >
            <option value="">-- Choose Member --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.fullName} ({m.phone || "No phone"}) {m.trainerName ? `[Current: ${m.trainerName}]` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Trainer Select */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Select Personal Trainer (कोच चुनें) *
          </label>
          <select
            value={selectedTrainerId}
            onChange={(e) => {
              setSelectedTrainerId(e.target.value);
              setSelectedPkgIndex(0);
              setCustomPrice("");
            }}
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
          >
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.fullName} {t.specialization ? `— ${t.specialization}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Workout Time Slot with Live Coach Schedule & Availability */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Training Slot / Timing *
            </label>
            <span className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg">
              Live Coach Schedule: {currentTrainer?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {activeSlots.map((s) => {
              const fullText = `${s.label} (${s.time})`;
              const isSelected = selectedSlot === fullText;
              const bookedAthletes = trainerSlotOccupancy[fullText] || trainerSlotOccupancy[s.label] || trainerSlotOccupancy[s.time] || [];
              const bookedCount = bookedAthletes.length;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSlot(fullText)}
                  className={`p-2 rounded-xl text-left border transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-purple-100 border-purple-600 ring-2 ring-purple-400/20"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 text-xs">{s.label}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wide shrink-0 ${
                          bookedCount === 0
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : bookedCount === 1
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-rose-100 text-rose-900 border border-rose-300 animate-pulse"
                        }`}
                      >
                        {bookedCount === 0 ? "🟢 Free" : bookedCount === 1 ? "🟡 1 Booked" : `🔴 ${bookedCount} Busy`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{s.time}</p>
                  </div>
                  {bookedCount > 0 && (
                    <div className="mt-1 pt-1 border-t border-slate-100 text-[9px] text-slate-600 truncate">
                      🏋️ {bookedAthletes.join(", ")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Overbooking Alert Warning */}
          {(() => {
            const curBooked = trainerSlotOccupancy[selectedSlot] || [];
            if (curBooked.length >= 2) {
              return (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-1.5 text-rose-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-[10.5px]">
                    <strong>Slot Full Warning: </strong> Coach {currentTrainer?.name} already has {curBooked.length} athletes booked at this time ({curBooked.join(", ")}).
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Trainer's PT Packages Cards */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
            Choose Trainer's PT Package:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trainerPlans.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                onClick={() => {
                  setSelectedPkgIndex(idx);
                  setCustomPrice("");
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                  selectedPkgIndex === idx
                    ? "bg-purple-100/70 border-purple-600 ring-2 ring-purple-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-slate-900">{pkg.name}</p>
                  <span className="font-black text-purple-700">
                    ₹{Number(pkg.price || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  ⏱️ {pkg.duration || "Standard duration"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Price & Days override */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Custom PT Fee (₹) [Optional]:
            </label>
            <input
              type="number"
              min="0"
              placeholder={String(currentPkg?.price || 4500)}
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Validity Days (दिन):
            </label>
            <input
              type="number"
              min="1"
              value={validityDays}
              onChange={(e) => setValidityDays(Number(e.target.value) || 30)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Live Deal Breakdown Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 border border-indigo-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950 border-b border-indigo-100 pb-1.5">
            <span>Commission Breakdown ({commType === "percentage" ? `${commVal}% Gym Share` : `₹${commVal} Fixed Cut`})</span>
            <span className="text-purple-700 font-extrabold">Total: ₹{effectivePrice.toLocaleString("en-IN")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
            <div className="p-2 rounded-xl bg-indigo-50/90 border border-indigo-200/70">
              <p className="text-[10px] font-bold text-indigo-700">🏢 Gym Owner Cut</p>
              <p className="text-sm font-black text-indigo-950 mt-0.5">₹{ownerCut.toLocaleString("en-IN")}</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50/90 border border-emerald-200/70">
              <p className="text-[10px] font-bold text-emerald-700">🏋️ Trainer Earning</p>
              <p className="text-sm font-black text-emerald-950 mt-0.5">₹{trainerCut.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
          >
            {saving ? "Enrolling & Recording Payment..." : "Confirm & Enroll PT"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// =========================================================================
// MODAL COMPONENT: QUICK RENEW PT
// =========================================================================
function QuickRenewPtModal({ isOpen, onClose, client, trainers = [], gymId, onSuccess }) {
  const [extensionDays, setExtensionDays] = useState(30);
  const [renewPrice, setRenewPrice] = useState(Number(client?.ptPlanPrice || 4500));
  const [saving, setSaving] = useState(false);

  // Compute coach and commission
  const coach = trainers.find((t) => t.id === client?.trainerId || (t.name || t.fullName) === client?.trainerName);
  const commType = coach?.commissionType || client?.ptCommissionType || "percentage";
  const commVal = coach?.commissionValue !== undefined ? Number(coach.commissionValue) : 30;

  const ownerCut = commType === "percentage"
    ? Math.round(Number(renewPrice) * (commVal / 100))
    : Math.min(Number(renewPrice), commVal);
  const trainerCut = Math.max(0, Number(renewPrice) - ownerCut);

  const handleRenew = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Calculate new expiry date starting from current expiry or now
      const baseDate = client.ptExpiryDate && new Date(client.ptExpiryDate) > new Date()
        ? new Date(client.ptExpiryDate)
        : new Date();

      baseDate.setDate(baseDate.getDate() + Number(extensionDays || 30));

      const updatedPayload = {
        hasPersonalCoach: true,
        ptExpiryDate: baseDate.toISOString(),
        ptPlanPrice: Number(renewPrice),
        ptOwnerCommission: ownerCut,
        ptTrainerPayout: trainerCut
      };

      // 1. Update Member
      await updateMember(client.id, updatedPayload);

      // 2. Record Payment
      await addPayment(gymId, {
        memberId: client.id,
        memberName: client.name || client.fullName,
        amount: Number(renewPrice),
        paidAmount: Number(renewPrice),
        dueAmount: 0,
        paymentMode: "cash",
        planName: `PT Renewal: ${client.ptPlanName || "Personal Training"} (+${extensionDays} Days)`,
        status: "paid",
        date: new Date().toISOString(),
        notes: `PT renewed with coach ${client.trainerName}. Gym cut: ₹${ownerCut}, Coach cut: ₹${trainerCut}`
      });

      toast.success(`PT Renewed for ${extensionDays} days!`);
      onSuccess();
    } catch (err) {
      console.error("Renewal failed:", err);
      toast.error(err.message || "Failed to renew PT");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔄 Renew PT: ${client?.name || client?.fullName}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleRenew} className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
          <p className="font-extrabold text-purple-950">
            Coach: {client?.trainerName || "Current Trainer"}
          </p>
          <p className="text-[11px] text-purple-700 mt-0.5">
            Package: {client?.ptPlanName || "1-on-1 PT"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Add Days (विस्तार दिन) *
            </label>
            <input
              type="number"
              min="1"
              value={extensionDays}
              onChange={(e) => setExtensionDays(Number(e.target.value) || 30)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Renewal Fee (₹) *
            </label>
            <input
              type="number"
              min="0"
              value={renewPrice}
              onChange={(e) => setRenewPrice(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-indigo-700">🏢 Gym Cut</p>
            <p className="text-xs font-black text-indigo-950">₹{ownerCut.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-700">🏋️ Coach Cut</p>
            <p className="text-xs font-black text-emerald-950">₹{trainerCut.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
          >
            {saving ? "Renewing..." : `Confirm +${extensionDays} Days Extension`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
