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
import { getSessionCachedData, setCachedData } from '../../utils/dataCache';

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
import ReceiptModal from './members/modals/ReceiptModal';

export default function Members() {
  const navigate = useNavigate();
  const { gymId } = useAuth();
  const targetGymId = gymId || 'univo_main';

  // Data state with session cache initialization
  const [members, setMembers] = useState(() => getSessionCachedData('members_' + targetGymId) || []);
  const [trainers, setTrainers] = useState(() => getSessionCachedData('trainers_' + targetGymId) || []);
  const [plans, setPlans] = useState(() => getSessionCachedData('plans_' + targetGymId) || []);
  const [loading, setLoading] = useState(false);

  // View, search, and tab state
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'table'));
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('active');
  const [dueSubFilter, setDueSubFilter] = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [slotFilter, setSlotFilter] = useState('all');
  const [expireFilter, setExpireFilter] = useState('all');

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
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptMember, setReceiptMember] = useState(null);

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
        setCachedData('members_' + targetGymId, reconciledMembers);
        setCachedData('trainers_' + targetGymId, trainersData || []);
        setCachedData('plans_' + targetGymId, plansData || []);
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

      // 2. Trainer Filter
      if (trainerFilter !== 'all') {
        const tName = m.trainerName || '';
        if (trainerFilter === 'unassigned') {
          if (tName && !['Unassigned', 'General Floor Trainer (Included)', 'No Trainer'].includes(tName)) return false;
        } else if (tName !== trainerFilter) {
          return false;
        }
      }

      // 3. Slot Filter
      if (slotFilter !== 'all') {
        const memberSlot = (m.slot || m.workoutSlot || m.preferredTime || '').toLowerCase();
        if (slotFilter === 'morning' && !memberSlot.includes('morn') && !memberSlot.includes('6:00') && !memberSlot.includes('am')) return false;
        if (slotFilter === 'afternoon' && !memberSlot.includes('after') && !memberSlot.includes('12:00')) return false;
        if (slotFilter === 'evening' && !memberSlot.includes('even') && !memberSlot.includes('pm') && !memberSlot.includes('4:00')) return false;
        if (slotFilter === 'night' && !memberSlot.includes('night') && !memberSlot.includes('7:00')) return false;
      }

      // 4. Expire In Filter
      if (expireFilter !== 'all') {
        const daysLeft = getDaysRemaining(m.expiryDate);
        if (daysLeft === null) return false;
        if (expireFilter === '3d' && (daysLeft < 0 || daysLeft > 3)) return false;
        if (expireFilter === '7d' && (daysLeft < 0 || daysLeft > 7)) return false;
        if (expireFilter === '15d' && (daysLeft < 0 || daysLeft > 15)) return false;
        if (expireFilter === '30d' && (daysLeft < 0 || daysLeft > 30)) return false;
        if (expireFilter === 'overdue' && daysLeft >= 0) return false;
      }

      // 5. Tab Filter
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
  }, [members, search, filterTab, dueSubFilter, trainerFilter, slotFilter, expireFilter]);

  // ─── Modal Success Handlers ────────────────────────────────────────────────
  const handleExtendSuccess = useCallback((memberId, updatedFieldsOrExpiry, createdPayment) => {
    const newFields = typeof updatedFieldsOrExpiry === 'object'
      ? updatedFieldsOrExpiry
      : { expiryDate: updatedFieldsOrExpiry, status: 'active', active: true };

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, ...newFields }
          : m
      )
    );

    if (createdPayment) {
      setReceiptPayment(createdPayment);
      setMembers((prev) => {
        const found = prev.find((m) => m.id === memberId);
        setReceiptMember(found || null);
        return prev;
      });
    }
  }, []);

  const handlePlanSuccess = useCallback((memberId, updatedFields, createdPayment) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );

    if (createdPayment) {
      setReceiptPayment(createdPayment);
      setMembers((prev) => {
        const found = prev.find((m) => m.id === memberId);
        setReceiptMember(found || updatedFields);
        return prev;
      });
    }
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
    onDelete: (m) => setDeleteTargetMember(m)
  }), [navigate, handleRestartPT, handleReactivate]);

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
          {/* Primary View Segmented Control (Active, Left / Inactive, All) */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setFilterTab('active')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                filterTab === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({counts.activeCount})
            </button>

            <button
              onClick={() => setFilterTab('left')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                filterTab === 'left'
                  ? 'bg-white text-rose-700 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Left / Inactive ({counts.leftCount})
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
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

        {/* Row 2: Screenshot Matching Dropdown Filters (Trainers, Slots, Expire In) & Showing Count */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Trainer Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={trainerFilter}
                onChange={(e) => setTrainerFilter(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Trainers</option>
                <option value="unassigned">General Floor / Unassigned</option>
                {trainers.map((t) => (
                  <option key={t.id || t.name} value={t.name}>
                    Coach {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift / Slot Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Shifts / Slots</option>
                <option value="morning">Morning (6:00 AM - 9:00 AM)</option>
                <option value="afternoon">Afternoon (12:00 PM - 3:00 PM)</option>
                <option value="evening">Evening (4:00 PM - 7:00 PM)</option>
                <option value="night">Night (7:00 PM - 10:00 PM)</option>
              </select>
            </div>

            {/* Expire In Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={expireFilter}
                onChange={(e) => setExpireFilter(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">Expire In: All</option>
                <option value="3d">Expiring in 3 days</option>
                <option value="7d">Expiring in 7 days</option>
                <option value="15d">Expiring in 15 days</option>
                <option value="30d">Expiring in 30 days</option>
                <option value="overdue">Overdue / Expired</option>
              </select>
            </div>

            {/* Reset Filters button if any filter is set */}
            {(trainerFilter !== 'all' || slotFilter !== 'all' || expireFilter !== 'all' || search) && (
              <button
                onClick={() => {
                  setTrainerFilter('all');
                  setSlotFilter('all');
                  setExpireFilter('all');
                  setSearch('');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition border border-slate-200"
                title="Clear all filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Showing Count (matches reference screenshot) */}
          <div className="text-xs font-semibold text-slate-400">
            Showing <span className="font-bold text-slate-700">{filteredMembers.length}</span> members
          </div>
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

      {/* Official Fee & Extension Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          isOpen={Boolean(receiptPayment)}
          onClose={() => {
            setReceiptPayment(null);
            setReceiptMember(null);
          }}
          payment={receiptPayment}
          member={receiptMember}
        />
      )}
    </div>
  );
}