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
  Filter,
  Dumbbell,
  Sparkles,
  Clock,
  AlertCircle
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
  getPhone,
  toIndianDate,
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
import AddServiceModal from './members/modals/AddServiceModal';

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
  const [endingSoonSubFilter, setEndingSoonSubFilter] = useState('all');
  const [expiredSubFilter, setExpiredSubFilter] = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [slotFilter, setSlotFilter] = useState('all');
  const [expireFilter, setExpireFilter] = useState('all');

  // Modals state
  const [showInvite, setShowInvite] = useState(false);
  const [showDirectAdd, setShowDirectAdd] = useState(false);
  const [extendMember, setExtendMember] = useState(null);
  const [planMember, setPlanMember] = useState(null);       // Used for Fee Collect, Gym Renew & Due Balance
  const [ptAddonMember, setPtAddonMember] = useState(null);   // Used for +PT & PT Renew
  const [serviceAddonMember, setServiceAddonMember] = useState(null); // Used for +Facility/Service Add-on
  const [editMember, setEditMember] = useState(null);
  const [leftMember, setLeftMember] = useState(null);
  const [endMember, setEndMember] = useState(null);
  const [deleteTargetMember, setDeleteTargetMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptMember, setReceiptMember] = useState(null);

  // --- Data Loading & Payment Reconciliation ---
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
        setPayments(paymentsData || []);
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

  // --- Memoized KPI Counts ---
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
    let gymEndingSoonCount = 0;
    let ptEndingSoonCount = 0;
    let gymExpiredCount = 0;
    let ptExpiredCount = 0;
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

        const isEndingSoon = gStat === 'ending_soon' || pStat === 'ending_soon';
        if (isEndingSoon) {
          endingSoonCount++;
          if (gStat === 'ending_soon') gymEndingSoonCount++;
          if (pStat === 'ending_soon') ptEndingSoonCount++;
        }

        const isExpired = gStat === 'expired' || pStat === 'expired';
        if (isExpired) {
          expiredCount++;
          if (gStat === 'expired') gymExpiredCount++;
          if (pStat === 'expired') ptExpiredCount++;
        }

        const isDue = gStat === 'due' || pStat === 'due';
        if (isDue) {
          dueCount++;
          if (gStat === 'due') gymDueCount++;
          if (pStat === 'due') ptDueCount++;
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
      gymEndingSoonCount,
      ptEndingSoonCount,
      gymExpiredCount,
      ptExpiredCount,
      gymDueCount,
      ptDueCount
    };
  }, [members]);

  // ─── Filter Tabs List ────────────────────────────────────────────────
  const FILTER_TABS = useMemo(() => [
    { key: 'active', label: `Active (${counts.activeCount})` },
    { key: 'pt', label: `⭐ PT Members (${counts.ptCount})` },
    { key: 'paid', label: `Paid (${counts.paidCount})` },
    { key: 'ending_soon', label: `Ending Soon (${counts.endingSoonCount})` },
    { key: 'expired', label: `Expired (${counts.expiredCount})` },
    { key: 'due', label: `⚠️ Overdue (${counts.dueCount})` },
    { key: 'partial', label: `Partial Fee (${counts.partialCount})` },
    { key: 'left', label: `🚪 Left (${counts.leftCount})` },
    { key: 'ended', label: `🛑 End (${counts.endedCount})` },
    { key: 'all', label: `All (${members.length})` }
  ], [counts, members.length]);

  // ─── Filtered Members List ──────────────────────────────────────────
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
      const isDue = gStat === 'due' || pStat === 'due' || Number(m.dueAmount || 0) > 0;

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
        case 'ending_soon': {
          const isEndingSoon = gStat === 'ending_soon' || pStat === 'ending_soon';
          if (!isEndingSoon || inactive) return false;
          if (endingSoonSubFilter === 'gym') return gStat === 'ending_soon';
          if (endingSoonSubFilter === 'pt') return pStat === 'ending_soon';
          return true;
        }
        case 'expired': {
          const isExp = gStat === 'expired' || pStat === 'expired';
          if (!isExp || inactive) return false;
          if (expiredSubFilter === 'gym') return gStat === 'expired';
          if (expiredSubFilter === 'pt') return pStat === 'expired';
          return true;
        }
        case 'due': {
          const isRenewalDue = gStat === 'due' || pStat === 'due';
          if (!isRenewalDue || inactive) return false;
          if (dueSubFilter === 'gym') return gStat === 'due';
          if (dueSubFilter === 'pt') return pStat === 'due';
          return true;
        }
        case 'active':
        default:
          return (gStat === 'active' || pStat === 'active') && !inactive;
      }
    });
  }, [members, search, filterTab, dueSubFilter, endingSoonSubFilter, expiredSubFilter, trainerFilter, slotFilter, expireFilter]);

  // --- Modal Success Handlers ---
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
      setPayments((prev) => [createdPayment, ...(prev || [])]);
      setReceiptPayment(createdPayment);
      setMembers((prev) => {
        const found = prev.find((m) => m.id === memberId);
        setReceiptMember(found ? { ...found, ...newFields } : { id: memberId, ...newFields });
        return prev;
      });
    }
  }, []);

  const handlePlanSuccess = useCallback((memberId, updatedFields, createdPayment) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );

    if (createdPayment) {
      setPayments((prev) => [createdPayment, ...(prev || [])]);
      setReceiptPayment(createdPayment);
      setMembers((prev) => {
        const found = prev.find((m) => m.id === memberId);
        setReceiptMember(found ? { ...found, ...updatedFields } : { id: memberId, ...updatedFields });
        return prev;
      });
    }
  }, []);

  const handleEditSuccess = useCallback((memberId, updatedFields) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );
  }, []);

  const handlePtAddonSuccess = useCallback((memberId, updatedFields, createdPayment) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
    );

    if (createdPayment) {
      setPayments((prev) => [createdPayment, ...(prev || [])]);
      setReceiptPayment(createdPayment);
      setMembers((prev) => {
        const found = prev.find((m) => m.id === memberId);
        setReceiptMember(found ? { ...found, ...updatedFields } : { id: memberId, ...updatedFields });
        return prev;
      });
    }
  }, []);

  const handleLeftSuccess = useCallback((memberId, reason, updatedFields) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              ...(updatedFields || {}),
              status: 'left',
              active: false,
              leftReason: reason,
              trainerName: 'Unassigned (Left Gym)',
              trainerId: '',
              ptSlot: null,
              preferredTime: null,
              ptShift: null,
              memberPortalAccess: false,
              ...(hasPt(m) ? { ptStatus: 'ended' } : {})
            }
          : m
      )
    );
  }, []);

  const handleEndSuccess = useCallback((memberId, result) => {
    const isPtOnly = typeof result === 'object' ? result.ptOnly : false;
    const reason = typeof result === 'object' ? result.reason : result;
    const updatedFields = typeof result === 'object' ? result.updatedFields : null;

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        if (isPtOnly) {
          return {
            ...m,
            ...(updatedFields || {}),
            ptStatus: 'ended',
            ptEndedAt: new Date().toISOString(),
            ptEndReason: reason,
            status: 'active',
            active: true,
            previousPtPlanName: m.ptPlanName || '1-on-1 PT',
            trainerName: 'Unassigned (No PT)',
            trainerId: '',
            ptSlot: null,
            preferredTime: null,
            ptShift: null,
            memberPortalAccess: false,
          };
        }
        return {
          ...m,
          ...(updatedFields || {}),
          status: 'ended',
          ptStatus: 'ended',
          active: false,
          endReason: reason,
          endedAt: new Date().toISOString(),
          trainerName: 'Unassigned (No PT)',
          trainerId: '',
          ptSlot: null,
          preferredTime: null,
          ptShift: null,
          memberPortalAccess: false,
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

  // --- Unified Action Handlers passed to Table / Grid ---
  const actionHandlers = useMemo(() => ({
    onView: (m) => navigate(`/owner/members/${m.id}`),
    onExtend: (m) => setExtendMember(m),
    onGymRenew: (m) => setPlanMember(m),
    onPtRenew: (m) => setPtAddonMember(m),
    onCollect: (m) => setPlanMember(m),
    onEdit: (m) => setEditMember(m),
    onLeft: (m) => setLeftMember(m),
    onEnd: (m) => setEndMember(m),
    onDelete: (m) => setDeleteTargetMember(m),
    onAddPt: (m) => setPtAddonMember(m),
    onAddService: (m) => setServiceAddonMember(m),
    onRestartPt: handleRestartPT,
    onReturn: (m) => setPlanMember(m),
    onReactivate: (m) => setPlanMember(m),
    onReceipt: (m, typeOrPayment) => {
      const memberPayments = (payments || []).filter(
        (p) => (p.memberId === m.id || (m.phone && p.phone === m.phone))
      );

      // If a specific payment object was passed
      if (typeOrPayment && typeof typeOrPayment === 'object') {
        setReceiptPayment(typeOrPayment);
        setReceiptMember(m);
        return;
      }

      // If user specifically clicked PT bill button
      if (typeOrPayment === 'pt') {
        const ptPayment = memberPayments.find(
          (p) => p.isPtOnly || p.planType === 'PT' || (p.planName && p.planName.toLowerCase().includes('personal training'))
        );
        if (ptPayment) {
          setReceiptPayment(ptPayment);
          setReceiptMember(m);
          return;
        } else {
          // Construct synthetic PT bill if not found in ledger
          const synthPtPayment = {
            id: 'bill_pt_' + (m.id || Date.now()),
            receiptNo: 'REC-PT-' + Date.now().toString().slice(-6),
            memberId: m.id,
            memberName: getName(m),
            phone: getPhone(m),
            slot: m.slot || m.workoutSlot || 'General Shift',
            planName: `Personal Training (PT) - ${m.ptPlanName || '1-on-1 PT'}`,
            planType: 'PT',
            isPtOnly: true,
            ptPlanName: m.ptPlanName || '1-on-1 PT',
            ptPlanPrice: Number(m.ptPlanPrice || 4500),
            planPrice: 0,
            amount: Number(m.ptPlanPrice || 4500),
            paidAmount: Number(m.ptPlanPrice || 4500),
            dueAmount: 0,
            trainerName: m.trainerName || 'Assigned Coach',
            paymentMode: m.paymentMode || 'cash',
            date: toIndianDate(m.ptStartDate || m.lastPaymentDate || new Date()),
            validityStart: toIndianDate(m.ptStartDate || new Date()),
            validityEnd: toIndianDate(m.ptEndDate || new Date()),
            status: 'paid'
          };
          setReceiptPayment(synthPtPayment);
          setReceiptMember(m);
          return;
        }
      }

      // Default: Find the latest payment
      let chosenPayment = null;
      if (memberPayments.length > 0) {
        const sorted = [...memberPayments].sort((a, b) => {
          const tA = toDate(a.createdAt || a.date)?.getTime() || 0;
          const tB = toDate(b.createdAt || b.date)?.getTime() || 0;
          return tB - tA;
        });
        chosenPayment = sorted[0];
      }

      setReceiptPayment(
        chosenPayment || {
          id: 'bill_' + (m.id || Date.now()),
          memberId: m.id,
          memberName: getName(m),
          phone: getPhone(m),
          planName: m.planName || m.plan || 'Gym Membership Plan',
          amount: Number(m.totalAmount || m.planPrice || 2500),
          paidAmount: Number(m.paidAmount || m.totalAmount || m.planPrice || 2500),
          dueAmount: Number(m.dueAmount || 0),
          paymentMode: m.paymentMode || 'cash',
          date: toIndianDate(m.lastPaymentDate || m.createdAt || new Date()),
          validityStart: toIndianDate(m.joiningDate || m.joinDate || m.createdAt || new Date()),
          validityEnd: toIndianDate(m.expiryDate || new Date()),
          status: Number(m.dueAmount || 0) > 0 ? 'partial' : 'paid'
        }
      );
      setReceiptMember(m);
    }
  }), [navigate, handleRestartPT, handleReactivate, payments]);

  return (
    <div className="space-y-6">
      {/* Header & Top Actions */}
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
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          FILTER & SEARCH BAR: MOBILE COMPACT CARD VIEW (< md)
          Exact match with user design specification
      ========================================================= */}
      <div className="block md:hidden p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
        {/* Row 1: Primary View Segmented Control (Active, PT Members, All) */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-2xl w-full">
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`py-1.5 px-2 text-center rounded-xl transition flex items-center justify-center gap-1 ${
              filterTab === 'active'
                ? 'bg-white text-emerald-800 font-extrabold shadow-2xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <span className="text-xs font-extrabold text-emerald-800">
              Active ({counts.activeCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('pt')}
            className={`py-1.5 px-2 text-center rounded-xl transition flex items-center justify-center gap-1.5 ${
              filterTab === 'pt'
                ? 'bg-white text-purple-900 font-extrabold shadow-2xs ring-1 ring-purple-200'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <span className="text-xs flex items-center gap-1 font-bold text-slate-800">
              <span className="text-sm">🏋️</span>
              <span>PT</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700">
              {counts.ptCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`py-1.5 px-2 text-center rounded-xl transition flex items-center justify-center gap-1 ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 font-extrabold shadow-2xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <span className="text-xs font-bold text-slate-700">
              All ({members.length})
            </span>
          </button>
        </div>

        {/* Row 2: Search Input (Full Width for mobile) */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 3: Filter Groups - Exact 3 Containers matching UI reference */}
        <div className="space-y-2 pt-0.5">
          {/* Container 1: Renewal Alerts Box (Yellow/Cream Card) - Exact 3-column fit with zero scroll */}
          <div className="bg-[#fffdf2] border border-amber-200/80 rounded-2xl p-1.5 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab('ending_soon')}
              className={`w-full py-1.5 px-1 rounded-xl transition flex flex-col items-center justify-center text-center cursor-pointer ${
                filterTab === 'ending_soon'
                  ? 'bg-amber-100 border-2 border-amber-400 text-amber-950 shadow-2xs font-black'
                  : 'bg-white/90 hover:bg-amber-50 text-amber-900 border border-amber-200/60 font-bold'
              }`}
              title="Expiring within 3 days"
            >
              <div className="flex items-center gap-1 leading-none">
                <span className="text-xs">⏰</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#fef3c7] text-amber-900 border border-amber-300/80">
                  {counts.endingSoonCount}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold mt-1 text-amber-950 leading-tight">
                Ending Soon
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('expired')}
              className={`w-full py-1.5 px-1 rounded-xl transition flex flex-col items-center justify-center text-center cursor-pointer ${
                filterTab === 'expired'
                  ? 'bg-rose-100 border-2 border-rose-400 text-rose-950 shadow-2xs font-black'
                  : 'bg-white/90 hover:bg-rose-50 text-rose-900 border border-rose-200/60 font-bold'
              }`}
              title="Expired members"
            >
              <div className="flex items-center gap-1 leading-none">
                <span className="text-xs">🔴</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#fee2e2] text-rose-900 border border-rose-300/80">
                  {counts.expiredCount}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold mt-1 text-red-950 leading-tight">
                Expired
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('due')}
              className={`w-full py-1.5 px-1 rounded-xl transition flex flex-col items-center justify-center text-center cursor-pointer ${
                filterTab === 'due'
                  ? 'bg-red-100 border-2 border-red-400 text-red-950 shadow-2xs font-black'
                  : 'bg-white/90 hover:bg-red-50 text-red-900 border border-red-200/60 font-bold'
              }`}
              title="Overdue members"
            >
              <div className="flex items-center gap-1 leading-none">
                <span className="text-xs">⚠️</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#fee2e2] text-red-900 border border-red-300/80">
                  {counts.dueCount}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold mt-1 text-amber-950 leading-tight">
                Overdue
              </span>
            </button>
          </div>

          {/* Container 2: Payment Status Box (Paid, Partial Fee) */}
          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-full py-1.5 px-3 flex items-center justify-around">
            <button
              type="button"
              onClick={() => setFilterTab('paid')}
              className={`py-1 px-3 rounded-full text-xs font-extrabold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterTab === 'paid'
                  ? 'bg-emerald-50 ring-2 ring-emerald-500 shadow-2xs'
                  : 'hover:bg-slate-200/50'
              }`}
              title="Fully paid members"
            >
              <span className="flex items-center gap-1 text-emerald-900 font-extrabold">
                <span className="text-emerald-700 font-extrabold text-sm leading-none">✓</span>
                <span>Paid</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                {counts.paidCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('partial')}
              className={`py-1 px-3 rounded-full text-xs font-extrabold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterTab === 'partial'
                  ? 'bg-amber-50 ring-2 ring-amber-500 shadow-2xs'
                  : 'hover:bg-slate-200/50'
              }`}
              title="Partial paid members"
            >
              <span className="flex items-center gap-1 text-amber-950 font-extrabold">
                <span className="text-amber-900 font-extrabold text-sm leading-none">₹</span>
                <span>Partial Fee</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                {counts.partialCount}
              </span>
            </button>
          </div>

          {/* Container 3: Lifecycle Status Box (Left, PT Ended) */}
          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-full py-1.5 px-3 flex items-center justify-around">
            <button
              type="button"
              onClick={() => setFilterTab('left')}
              className={`py-1 px-3 rounded-full text-xs font-extrabold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterTab === 'left'
                  ? 'bg-slate-200 ring-2 ring-slate-400 shadow-2xs'
                  : 'hover:bg-slate-200/50'
              }`}
              title="Members who left the gym"
            >
              <span className="flex items-center gap-1 text-slate-800 font-extrabold">
                <span className="text-sm leading-none">🚪</span>
                <span>Left</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800">
                {counts.leftCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('ended')}
              className={`py-1 px-3 rounded-full text-xs font-extrabold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterTab === 'ended'
                  ? 'bg-purple-50 ring-2 ring-purple-500 shadow-2xs'
                  : 'hover:bg-slate-200/50'
              }`}
              title="Members whose PT package ended"
            >
              <span className="flex items-center gap-1 text-purple-900 font-extrabold">
                <span className="text-sm leading-none">🛑</span>
                <span>PT Ended</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900">
                {counts.endedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Row 4: Showing Count & Reset Filter */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5 px-1">
          <div>
            Showing <strong className="text-slate-700 font-bold">{filteredMembers.length}</strong> members
          </div>
          {filterTab !== 'active' && (
            <button
              type="button"
              onClick={() => setFilterTab('active')}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 cursor-pointer"
              title="Reset view to Active Members"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          FILTER & SEARCH BAR: ORIGINAL DESKTOP VIEW (≥ md)
          Exact original desktop horizontal layout
      ========================================================= */}
      <div className="hidden md:block p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        {/* Row 1: Primary View Tabs + Search Input + Table/Grid Switcher */}
        <div className="flex flex-row gap-3 items-center justify-between">
          {/* Primary View Segmented Control (Active, PT Members, All) */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFilterTab('active')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition ${
                filterTab === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({counts.activeCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('pt')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                filterTab === 'pt'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏋️ PT Members</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filterTab === 'pt' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {counts.ptCount}
              </span>
            </button>

            <button
              type="button"
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
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition"
              />
              {search && (
                <button
                  type="button"
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
                type="button"
                onClick={() => setView('table')}
                className={`p-1.5 rounded-lg transition ${
                  view === 'table' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View (Desktop)"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
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
              <span>FILTERS:</span>
            </span>

            {/* 1. Renewal Alerts Group (Yellow/Amber container) */}
            <div className="inline-flex items-center gap-1 bg-amber-50/60 p-1 rounded-xl border border-amber-200/60">
              <button
                type="button"
                onClick={() => setFilterTab('ending_soon')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
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
                type="button"
                onClick={() => setFilterTab('expired')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterTab === 'expired'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-rose-800 hover:bg-rose-100/70'
                }`}
                title="Expired members"
              >
                <span>🔴 Expired</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-900 font-extrabold">
                  {counts.expiredCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('due')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterTab === 'due'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-800 hover:bg-red-100/70'
                }`}
                title="Overdue members"
              >
                <span>⚠️ Overdue</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-900 font-extrabold">
                  {counts.dueCount}
                </span>
              </button>
            </div>

            {/* 2. Fee Collection Group (Light Slate/Green container) */}
            <div className="inline-flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setFilterTab('paid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterTab === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
                title="Fully paid members"
              >
                <span>✓ Paid</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-extrabold">
                  {counts.paidCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('partial')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterTab === 'partial'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-100/60'
                }`}
                title="Partial paid members"
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
                type="button"
                onClick={() => setFilterTab('left')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
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
                type="button"
                onClick={() => setFilterTab('ended')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
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

          {/* Right: Reset Filters or Showing Count */}
          <div className="flex items-center gap-2">
            {filterTab !== 'active' && (
              <button
                type="button"
                onClick={() => setFilterTab('active')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition border border-slate-200 shrink-0 cursor-pointer"
                title="Reset view to Active Members"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
            <div className="text-xs font-semibold text-slate-400">
              Showing <span className="font-bold text-slate-700">{filteredMembers.length}</span> members
            </div>
          </div>
        </div>
      </div>

      {/* --- Ending Soon Category Sub-Filter (Gym vs PT) --- */}
      {filterTab === 'ending_soon' && (
        <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-950">Ending Soon Renewal Filter:</span>
              <span className="text-[11px] text-amber-800/90 ml-1.5 hidden sm:inline">
                Expiring within 3 days. Check whether Gym or PT plan is ending:
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5">
            <button
              onClick={() => setEndingSoonSubFilter('all')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition flex items-center justify-center text-center cursor-pointer ${
                endingSoonSubFilter === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-amber-100/60 border border-amber-200'
              }`}
            >
              <span className="truncate">All <span className="hidden sm:inline">Ending Soon</span> ({counts.endingSoonCount})</span>
            </button>
            <button
              onClick={() => setEndingSoonSubFilter('gym')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition inline-flex items-center justify-center gap-1 text-center cursor-pointer ${
                endingSoonSubFilter === 'gym'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Gym <span className="hidden sm:inline">Ending</span> ({counts.gymEndingSoonCount})</span>
            </button>
            <button
              onClick={() => setEndingSoonSubFilter('pt')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition inline-flex items-center justify-center gap-1 text-center cursor-pointer ${
                endingSoonSubFilter === 'pt'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-purple-50 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">PT <span className="hidden sm:inline">Ending</span> ({counts.ptEndingSoonCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Expired Category Sub-Filter (Gym vs PT) --- */}
      {filterTab === 'expired' && (
        <div className="p-2.5 sm:p-3 rounded-2xl bg-rose-50/90 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold text-rose-950">Expired Renewal Filter:</span>
              <span className="text-[11px] text-rose-800/90 ml-1.5 hidden sm:inline">
                Expired members. Check whether Gym or PT plan has expired:
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5">
            <button
              onClick={() => setExpiredSubFilter('all')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition flex items-center justify-center text-center cursor-pointer ${
                expiredSubFilter === 'all'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-rose-100/60 border border-rose-200'
              }`}
            >
              <span className="truncate">All <span className="hidden sm:inline">Expired</span> ({counts.expiredCount})</span>
            </button>
            <button
              onClick={() => setExpiredSubFilter('gym')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition inline-flex items-center justify-center gap-1 text-center cursor-pointer ${
                expiredSubFilter === 'gym'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Gym <span className="hidden sm:inline">Expired</span> ({counts.gymExpiredCount})</span>
            </button>
            <button
              onClick={() => setExpiredSubFilter('pt')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition inline-flex items-center justify-center gap-1 text-center cursor-pointer ${
                expiredSubFilter === 'pt'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-purple-50 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">PT <span className="hidden sm:inline">Expired</span> ({counts.ptExpiredCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Due Category Sub-Filter (Gym vs PT Due) --- */}
      {filterTab === 'due' && (
        <div className="p-2.5 sm:p-3 rounded-2xl bg-red-50/90 border border-red-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="font-bold text-red-950">Overdue Renewal Filter:</span>
              <span className="text-[11px] text-red-800/90 ml-1.5 hidden sm:inline">
                Membership expired over 2 days ago. Check whether Gym or PT plan is overdue:
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5">
            <button
              onClick={() => setDueSubFilter('all')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition flex items-center justify-center text-center cursor-pointer ${
                dueSubFilter === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-red-100/60 border border-red-200'
              }`}
            >
              <span className="truncate">All <span className="hidden sm:inline">Overdue</span> ({counts.dueCount})</span>
            </button>
            <button
              onClick={() => setDueSubFilter('gym')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition inline-flex items-center justify-center gap-1 text-center cursor-pointer ${
                dueSubFilter === 'gym'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Gym <span className="hidden sm:inline">Overdue</span> ({counts.gymDueCount})</span>
            </button>
            <button
              onClick={() => setDueSubFilter('pt')}
              className={`px-1.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition inline-flex items-center justify-center gap-1 text-center cursor-pointer ${
                dueSubFilter === 'pt'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-purple-50 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">PT <span className="hidden sm:inline">Overdue</span> ({counts.ptDueCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* --- Directory Body: Table or Grid --- */}
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

      {/* --- Modals --- */}

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
          gymId={gymId}
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
          existingMembers={members}
          onClose={() => setPtAddonMember(null)}
          onSave={handlePtAddonSuccess}
        />
      )}

      {/* Mid-Plan Facility & Service Add-on Modal */}
      {serviceAddonMember && (
        <AddServiceModal
          isOpen={Boolean(serviceAddonMember)}
          member={serviceAddonMember}
          gymId={gymId}
          plans={plans}
          onClose={() => setServiceAddonMember(null)}
          onSave={(updatedMem) => {
            setMembers((prev) => prev.map((m) => m.id === updatedMem.id ? { ...m, ...updatedMem } : m));
            setServiceAddonMember(null);
            // Refresh payments list to include new service bill
            getAllPayments(targetGymId).then(setPayments).catch(console.warn);
          }}
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
          gymId={gymId}
          onClose={() => setDeleteTargetMember(null)}
          onConfirm={handleDeleteSuccess}
        />
      )}

      {/* 10-Minute WhatsApp Invite Modal */}
      {showInvite && (
        <InviteLinkModal
          gymId={gymId}
          onClose={() => setShowInvite(false)}
          existingMembers={members}
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
          allPayments={payments}
          onSelectPayment={(p) => setReceiptPayment(p)}
        />
      )}
    </div>
  );
}
