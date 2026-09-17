import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  LayoutGrid,
  LayoutList,
  Share2,
  AlertTriangle,
  X,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

// Firebase services
import { getMembers, updateMember } from '../../firebase/members';
import { getTrainers } from '../../firebase/trainers';
import { getPlans } from '../../firebase/plans';
import { getAllPayments } from '../../firebase/payments';
import { useAuth } from '../../contexts/AuthContext';
import { getSessionCachedData } from '../../utils/dataCache';

// WhatsApp helpers
import {
  openWhatsApp,
  generateRenewalReminderMessage,
  generatePtRenewalReminderMessage,
  generatePartialDueReminderMessage,
  generateOverdueReminderMessage
} from '../../utils/whatsapp';

// Member utilities (Single Source of Truth)
import {
  toDate,
  formatDate,
  getName,
  getGymStatus,
  getPtStatus,
  getMemberStatus,
  hasPt,
  isPtActive,
  isPaid,
  isPartial,
  isLeft,
  isEnded,
  isInactive
} from './members/memberUtils';

// Subcomponents
import MemberKpiBar from './members/MemberKpiBar';
import MemberTable from './members/MemberTable';
import MemberGrid from './members/MemberGrid';

// Modals
import CollectFeeModal from './members/modals/CollectFeeModal';
import AddPtPackageModal from './members/modals/AddPtPackageModal';
import EditMemberModal from './members/modals/EditMemberModal';
import ExtendModal from './members/modals/ExtendModal';
import { LeftModal, EndMembershipModal, DeleteConfirmModal } from './members/modals/LifecycleModals';
import InviteLinkModal from './members/modals/InviteLinkModal';
import DirectAddMemberModal from '../../components/shared/DirectAddMemberModal';

export default function Members() {
  const navigate = useNavigate();
  const { gymId } = useAuth();

  // Data state with session cache initialization
  const [members, setMembers] = useState(() => getSessionCachedData('members_' + gymId) || []);
  const [trainers, setTrainers] = useState(() => getSessionCachedData('trainers_' + gymId) || []);
  const [plans, setPlans] = useState(() => getSessionCachedData('plans_' + gymId) || []);
  const [loading, setLoading] = useState(false);

  // View, search, and tab state
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'));
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('active');
  const [dueSubFilter, setDueSubFilter] = useState('all');

  // Modals state
  const [showInvite, setShowInvite] = useState(false);
  const [showDirectAdd, setShowDirectAdd] = useState(false);
  const [extendMember, setExtendMember] = useState(null);
  const [planMember, setPlanMember] = useState(null);       // Used for Fee Collect, Gym Renew & Due Balance
  const [ptAddonMember, setPtAddonMember] = useState(null);   // Used for +PT & PT Renew
  const [editMember, setEditMember] = useState(null);
  const [leftMember, setLeftMember] = useState(null);
  const [endMember, setEndMember] = useState(null);
  const [deleteTargetMember, setDeleteTargetMember] = useState(null);

  // ─── Data Loading & Payment Reconciliation ──────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const targetGymId = gymId || 'univo_main';
        const [membersData, trainersData, plansData, paymentsData] = await Promise.all([
          getMembers(targetGymId).catch(() => []),
          getTrainers(targetGymId).catch(() => []),
          getPlans(targetGymId).catch(() => []),
          getAllPayments(targetGymId).catch(() => [])
        ]);

        if (!isMounted) return;

        // Reconcile payments: match latest payment record for each member
        const reconciledMembers = (membersData || []).map((m) => {
          const memberPayments = (paymentsData || []).filter(
            (p) => (p.memberId === m.id || p.memberId === m.memberId) && (p.createdAt || p.date)
          );
          if (memberPayments.length === 0) return m;

          // Sort descending by date
          memberPayments.sort((a, b) => {
            const tA = toDate(a.createdAt || a.date)?.getTime() || 0;
            const tB = toDate(b.createdAt || b.date)?.getTime() || 0;
            return tB - tA;
          });

          const latest = memberPayments[0];
          return {
            ...m,
            dueAmount: latest.dueAmount !== undefined ? latest.dueAmount : m.dueAmount,
            paidAmount: latest.paidAmount !== undefined ? latest.paidAmount : m.paidAmount,
            lastPaymentDate: latest.date || latest.createdAt || m.lastPaymentDate
          };
        });

        setMembers(reconciledMembers);
        setTrainers(trainersData || []);
        setPlans(plansData || []);
      } catch (err) {
        console.error('Failed to load members data:', err);
        toast.error('Failed to load member data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [gymId]);

  // ─── Memoized KPI Counts ───────────────────────────────────────────────────
  const counts = useMemo(() => {
    let paidCount = 0;
    let partialCount = 0;
    let ptCount = 0;
    let activeCount = 0;
    let endingSoonCount = 0;
    let expiredCount = 0;
    let dueCount = 0;
    let leftCount = 0;
    let endedCount = 0;
    let gymDueCount = 0;
    let ptDueCount = 0;

    for (const m of members) {
      const inactive = isInactive(m);
      const gStat = getGymStatus(m);
      const pStat = getPtStatus(m);
      const hasPaidOnce = !!m.lastPaymentDate;
      const dueAmt = Number(m.dueAmount || 0);

      if (isLeft(m)) leftCount++;
      if (isEnded(m) || m.ptStatus === 'ended') endedCount++;

      if (!inactive) {
        if (isPaid(m)) paidCount++;
        if (isPartial(m)) partialCount++;
        if (isPtActive(m)) ptCount++;
        if (gStat === 'active' || pStat === 'active') activeCount++;
        if (gStat === 'ending_soon' || pStat === 'ending_soon') endingSoonCount++;
        if (gStat === 'expired' || pStat === 'expired') expiredCount++;

        const isDue = gStat === 'due' || pStat === 'due' || (dueAmt > 0 && hasPaidOnce);
        if (isDue) {
          dueCount++;
          if (gStat === 'due' || !isPtActive(m)) gymDueCount++;
          if (pStat === 'due' || (isPtActive(m) && dueAmt > 0)) ptDueCount++;
        }
      }
    }

    return {
      paidCount,
      partialCount,
      ptCount,
      activeCount,
      endingSoonCount,
      expiredCount,
      dueCount,
      leftCount,
      endedCount,
      gymDueCount,
      ptDueCount
    };
  }, [members]);

  // ─── Filter Tabs List ──────────────────────────────────────────────────────
  const FILTER_TABS = useMemo(() => [
    { key: 'active', label: `Active (${counts.activeCount})` },
    { key: 'pt', label: `🏋️ PT Members (${counts.ptCount})` },
    { key: 'paid', label: `Paid (${counts.paidCount})` },
    { key: 'ending_soon', label: `Ending Soon (${counts.endingSoonCount})` },
    { key: 'expired', label: `Expired (${counts.expiredCount})` },
    { key: 'due', label: `⚠️ Due (${counts.dueCount})` },
    { key: 'partial', label: `Partial Fee (${counts.partialCount})` },
    { key: 'left', label: `🚪 Left (${counts.leftCount})` },
    { key: 'ended', label: `🛑 End (${counts.endedCount})` },
    { key: 'all', label: `All (${members.length})` }
  ], [counts, members.length]);

  // ─── Filtered Members List ─────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return members.filter((m) => {
      // 1. Text Search matching name or phone
      if (q) {
        const name = (m.name || m.fullName || '').toLowerCase();
        const phone = (m.phone || '');
        if (!name.includes(q) && !phone.includes(q)) return false;
      }

      const inactive = isInactive(m);
      const gStat = getGymStatus(m);
      const pStat = getPtStatus(m);
      const isDue = gStat === 'due' || pStat === 'due' || (Number(m.dueAmount || 0) > 0 && !!m.lastPaymentDate);

      // 2. Tab Filter
      switch (filterTab) {
        case 'all':
          return true;
        case 'left':
          return isLeft(m);
        case 'ended':
          return isEnded(m) || m.ptStatus === 'ended';
        case 'pt':
          return isPtActive(m) && !inactive;
        case 'paid':
          return isPaid(m) && !inactive;
        case 'partial':
          return isPartial(m) && !inactive;
        case 'ending_soon':
          return (gStat === 'ending_soon' || pStat === 'ending_soon') && !inactive;
        case 'expired':
          return (gStat === 'expired' || pStat === 'expired') && !inactive;
        case 'due': {
          if (!isDue || inactive) return false;
          if (dueSubFilter === 'gym') return gStat === 'due' || !isPtActive(m);
          if (dueSubFilter === 'pt') return pStat === 'due' || (isPtActive(m) && Number(m.dueAmount || 0) > 0);
          return true;
        }
        case 'active':
        default:
          return (gStat === 'active' || pStat === 'active') && !inactive;
      }
    });
  }, [members, search, filterTab, dueSubFilter]);

  // ─── Modal Success Handlers ────────────────────────────────────────────────
  const handleExtendSuccess = useCallback((memberId, newExpiryIso) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, expiryDate: newExpiryIso, status: 'active', active: true }
          : m
      )
    );
  }, []);

  const handlePlanSuccess = useCallback((memberId, updatedFields) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );
  }, []);

  const handleEditSuccess = useCallback((memberId, updatedFields) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );
  }, []);

  const handlePtAddonSuccess = useCallback((memberId, updatedFields) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );
  }, []);

  const handleLeftSuccess = useCallback((memberId, reason) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, status: 'left', active: false, leftReason: reason }
          : m
      )
    );
  }, []);

  const handleEndSuccess = useCallback((memberId, result) => {
    const isPtOnly = typeof result === 'object' ? result.ptOnly : false;
    const reason = typeof result === 'object' ? result.reason : result;

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        if (isPtOnly) {
          return {
            ...m,
            ptStatus: 'ended',
            ptEndedAt: new Date().toISOString(),
            ptEndReason: reason,
            status: 'active',
            active: true,
            previousPtPlanName: m.ptPlanName || '1-on-1 PT'
          };
        }
        return {
          ...m,
          status: 'ended',
          ptStatus: 'ended',
          active: false,
          endReason: reason,
          endedAt: new Date().toISOString()
        };
      })
    );
  }, []);

  const handleRestartPT = useCallback(async (m) => {
    try {
      await updateMember(gymId || 'univo_main', m.id, {
        ptStatus: 'active',
        status: 'active',
        active: true,
        ptRestartedAt: new Date().toISOString()
      });

      setMembers((prev) =>
        prev.map((item) =>
          item.id === m.id
            ? { ...item, ptStatus: 'active', status: 'active', active: true }
            : item
        )
      );

      toast.success(`${getName(m)} PT package reactivated!`);
    } catch (err) {
      toast.error('Failed to reactivate PT package');
    }
  }, [gymId]);

  const handleReactivate = useCallback(async (m) => {
    try {
      const now = new Date();
      const currentExp = toDate(m.expiryDate);
      const newExp = (!currentExp || currentExp < now)
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : m.expiryDate;

      await updateMember(gymId || 'univo_main', m.id, {
        status: 'active',
        active: true,
        expiryDate: newExp,
        ptStatus: m.ptStatus === 'ended' ? 'active' : m.ptStatus,
        reactivatedAt: new Date().toISOString()
      });

      setMembers((prev) =>
        prev.map((item) =>
          item.id === m.id
            ? { ...item, status: 'active', active: true, expiryDate: newExp, ptStatus: m.ptStatus === 'ended' ? 'active' : m.ptStatus }
            : item
        )
      );

      toast.success(`${getName(m)} reactivated as Active!`);
    } catch (err) {
      toast.error('Failed to reactivate member');
    }
  }, [gymId]);

  const handleDeleteSuccess = useCallback((memberId) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  // ─── WhatsApp Reminder Action ───────────────────────────────────────────────
  const handleSendIndividualReminder = useCallback((m) => {
    const rawNum = (m.phone || '').replace(/\D/g, '');
    const name = getName(m);
    if (!rawNum) {
      toast.error(`No valid phone number for ${name}`);
      return;
    }

    const stat = getMemberStatus(m);
    let message = '';
    const expiry = toDate(m.expiryDate);
    const diff = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : 0;
    const daysOverdue = Math.abs(diff);

    const planTitle = m.ptPlanName
      ? `${m.planName || 'Gym'} + 1-on-1 PT (${m.ptPlanName})`
      : (m.planName || 'Gym Plan');

    const totalPlanAmount = (Number(m.planPrice || 0) + Number(m.ptPlanPrice || 0)) || '2,500';

    if (Number(m.dueAmount || 0) > 0 && !!m.lastPaymentDate) {
      message = generatePartialDueReminderMessage(name, m.dueAmount, planTitle);
    } else if (hasPt(m) && (!m.planName || m.ptPlanName)) {
      message = generatePtRenewalReminderMessage(
        name,
        m.ptPlanName || '1-on-1 PT Plan',
        m.trainerName || 'Assigned Coach',
        formatDate(m.expiryDate),
        totalPlanAmount
      );
    } else if (stat === 'due' || stat === 'overdue') {
      message = generateOverdueReminderMessage(name, planTitle, daysOverdue, totalPlanAmount);
    } else {
      message = generateRenewalReminderMessage(name, planTitle, formatDate(m.expiryDate), totalPlanAmount);
    }

    openWhatsApp(rawNum, message);
    toast.success(`WhatsApp reminder opened for ${name}`);
  }, []);

  // ─── Unified Action Handlers passed to Table / Grid ────────────────────────
  const actionHandlers = useMemo(() => ({
    onView: (m) => navigate(`/owner/members/${m.id}`),
    onExtend: (m) => setExtendMember(m),
    onGymRenew: (m) => setPlanMember(m),
    onPtRenew: (m) => setPtAddonMember(m),
    onCollect: (m) => setPlanMember(m),
    onEdit: (m) => setEditMember(m),
    onLeft: (m) => setLeftMember(m),
    onEnd: (m) => setEndMember(m),
    onAddPt: (m) => setPtAddonMember(m),
    onRestartPt: handleRestartPT,
    onReturn: handleReactivate,
    onDelete: (m) => setDeleteTargetMember(m),
    onWhatsApp: handleSendIndividualReminder
  }), [navigate, handleRestartPT, handleReactivate, handleSendIndividualReminder]);

  return (
    <div className="space-y-6">
      {/* ─── Header & Top Actions ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Member Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              {members.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage member admissions, membership plans, extensions, shift timings & profiles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Share 10-Min Link</span>
          </button>
          <button
            onClick={() => setShowDirectAdd(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Member</span>
          </button>
        </div>
      </div>

      {/* ─── 7 KPI Metric Cards Row ────────────────────────────────────────── */}
      <MemberKpiBar
        {...counts}
        activeTab={filterTab}
        onSelectTab={(tabKey) => setFilterTab(tabKey)}
      />

      {/* ─── Systematic Filter & Search Bar ───────────────────────────────── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        {/* Row 1: Primary View Tabs + Search Input + Table/Grid Switcher */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Primary View Segmented Control */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                filterTab === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({counts.activeCount})
            </button>

            <button
              onClick={() => setFilterTab('pt')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                filterTab === 'pt'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏋️ PT Members</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                filterTab === 'pt' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {counts.ptCount}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({members.length})
            </button>
          </div>

          {/* Search & View Toggle Group */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 md:py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Clear Search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setView('table')}
                className={`p-1.5 rounded-lg transition ${
                  view === 'table' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View (Desktop)"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded-lg transition ${
                  view === 'grid' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Card View (Mobile/Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Categorized Quick Filters (Alerts · Fees · Exited) */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-0.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Filters:</span>
            </span>

            {/* 1. Renewal Alerts Group */}
            <div className="inline-flex items-center gap-1 bg-amber-50/60 p-1 rounded-xl border border-amber-200/60">
              <button
                onClick={() => setFilterTab('ending_soon')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterTab === 'ending_soon'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-900 hover:bg-amber-100/70'
                }`}
                title="Expiring within 3 days"
              >
                <span>⏰ Ending Soon</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-extrabold">
                  {counts.endingSoonCount}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('due')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterTab === 'due'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-800 hover:bg-red-100/70'
                }`}
                title="Overdue by 2+ days"
              >
                <span>⚠️ Due</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-900 font-extrabold">
                  {counts.dueCount}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('expired')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterTab === 'expired'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-rose-800 hover:bg-rose-100/70'
                }`}
                title="Expired 1-2 days ago"
              >
                <span>🔴 Expired</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-900 font-extrabold">
                  {counts.expiredCount}
                </span>
              </button>
            </div>

            {/* 2. Fee Collection Group */}
            <div className="inline-flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl border border-slate-200/70">
              <button
                onClick={() => setFilterTab('paid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterTab === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
                title="Fully paid active members"
              >
                <span>✓ Paid</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-extrabold">
                  {counts.paidCount}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('partial')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterTab === 'partial'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-100/60'
                }`}
                title="Members with remaining due balance"
              >
                <span>₹ Partial Fee</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-extrabold">
                  {counts.partialCount}
                </span>
              </button>
            </div>

            {/* 3. Exited / Inactive Group */}
            <div className="inline-flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl border border-slate-200/70">
              <button
                onClick={() => setFilterTab('left')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterTab === 'left'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Members who left the gym"
              >
                <span>🚪 Left</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-extrabold">
                  {counts.leftCount}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('ended')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  filterTab === 'ended'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-purple-800 hover:bg-purple-100'
                }`}
                title="Members whose PT package ended"
              >
                <span>🛑 PT Ended</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-900 font-extrabold">
                  {counts.endedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Reset Filter Action (Visible when any sub-filter is active) */}
          {filterTab !== 'active' && (
            <button
              onClick={() => setFilterTab('active')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition border border-slate-200 shrink-0"
              title="Reset view to Active Members"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Due Category Sub-Filter (Gym vs PT Due) ────────────────────────── */}
      {filterTab === 'due' && (
        <div className="p-3 rounded-2xl bg-red-50/90 border border-red-200/90 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="font-bold text-red-950">Overdue Renewal Filter:</span>
              <span className="text-[11px] text-red-800/90 ml-1.5 hidden sm:inline">
                Membership expired over 2 days ago. Check whether Gym or PT plan is due:
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setDueSubFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                dueSubFilter === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-red-100/60 border border-red-200'
              }`}
            >
              All Due ({counts.dueCount})
            </button>
            <button
              onClick={() => setDueSubFilter('gym')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                dueSubFilter === 'gym'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              🏋️ Gym Due ({counts.gymDueCount})
            </button>
            <button
              onClick={() => setDueSubFilter('pt')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                dueSubFilter === 'pt'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-purple-50 border border-slate-200'
              }`}
            >
              ✨ PT Due ({counts.ptDueCount})
            </button>
          </div>
        </div>
      )}

      {/* ─── Directory Body: Table or Grid ─────────────────────────────────── */}
      {view === 'table' ? (
        <MemberTable
          members={filteredMembers}
          actionHandlers={actionHandlers}
        />
      ) : (
        <MemberGrid
          members={filteredMembers}
          actionHandlers={actionHandlers}
        />
      )}

      {/* ─── Modals ────────────────────────────────────────────────────────── */}

      {/* Extend Membership Modal */}
      {extendMember && (
        <ExtendModal
          member={extendMember}
          gymId={gymId}
          onClose={() => setExtendMember(null)}
          onSave={handleExtendSuccess}
        />
      )}

      {/* Collect Fee, Renew Gym Plan & Due Settlement Modal */}
      {planMember && (
        <CollectFeeModal
          member={planMember}
          gymId={gymId}
          trainers={trainers}
          plans={plans}
          onClose={() => setPlanMember(null)}
          onSave={handlePlanSuccess}
        />
      )}

      {/* 3-Tab Member Profile Editor */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          initialTab="personal"
          trainers={trainers}
          plans={plans}
          existingMembers={members}
          onClose={() => setEditMember(null)}
          onSave={handleEditSuccess}
        />
      )}

      {/* Left Member Modal (Gym) */}
      {leftMember && (
        <LeftModal
          member={leftMember}
          onClose={() => setLeftMember(null)}
          onSave={handleLeftSuccess}
        />
      )}

      {/* Mid-Month PT Add-on & PT Renewal Modal */}
      {ptAddonMember && (
        <AddPtPackageModal
          member={ptAddonMember}
          gymId={gymId}
          trainers={trainers}
          plans={plans}
          onClose={() => setPtAddonMember(null)}
          onSave={handlePtAddonSuccess}
        />
      )}

      {/* End PT Membership Modal */}
      {endMember && (
        <EndMembershipModal
          member={endMember}
          gymId={gymId}
          onClose={() => setEndMember(null)}
          onSave={handleEndSuccess}
        />
      )}

      {/* Delete Member Confirmation Modal */}
      {deleteTargetMember && (
        <DeleteConfirmModal
          member={deleteTargetMember}
          onClose={() => setDeleteTargetMember(null)}
          onConfirm={handleDeleteSuccess}
        />
      )}

      {/* 10-Minute WhatsApp Invite Modal */}
      {showInvite && (
        <InviteLinkModal
          gymId={gymId}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Direct Add Member Modal */}
      <DirectAddMemberModal
        isOpen={showDirectAdd}
        onClose={() => setShowDirectAdd(false)}
        onSuccess={(newMem) => setMembers([newMem, ...members])}
        plans={plans}
        trainers={trainers}
        existingMembers={members}
      />
    </div>
  );
}