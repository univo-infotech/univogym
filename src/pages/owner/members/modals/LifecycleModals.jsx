import React, { useState } from 'react';
import { LogOut, Sparkles, CheckCircle, UserX } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateMember, deleteMember } from '../../../../firebase/members';
import Modal from '../../../../components/ui/Modal';
import { getName, hasPt } from '../memberUtils';

function broadcastForceLogout(memberId) {
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("univo_session_channel");
      channel.postMessage({ type: "FORCE_LOGOUT", memberId, reason: "pt_ended" });
      channel.close();
    }
    localStorage.setItem("univo_force_logout", `${memberId}_${Date.now()}`);
  } catch (e) {}

  try {
    const sessStr = localStorage.getItem("univo_member_session");
    if (sessStr) {
      const sess = JSON.parse(sessStr);
      if (sess.id === memberId) {
        localStorage.removeItem("univo_member_session");
        if (localStorage.getItem("univo_active_role") === "member") {
          localStorage.removeItem("univo_active_role");
        }
      }
    }
  } catch (e) {}
}

export function LeftModal({ member, gymId, onClose, onSave }) {
  const [reason, setReason] = useState('Stopped coming / Gym left');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const presetReasons = [
    'Stopped coming / Gym left',
    'Membership expired & did not renew',
    'Relocated / Out of town',
    'Personal / Family reason',
    'Health / Injury break',
    'Discontinued by Gym Management',
    'Other'
  ];

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalReason = reason === 'Other' ? (customReason || 'Other') : reason;
      const updatedFields = {
        status: 'left',
        active: false,
        leftAt: new Date().toISOString(),
        leftReason: finalReason,
        previousTrainerId: member.trainerId || null,
        previousTrainerName: member.trainerName || member.personalTrainer || null,
        previousPtSlot: member.ptSlot || member.preferredTime || member.slot || null,
        trainerId: '',
        trainerName: 'Unassigned (Left Gym)',
        personalTrainer: 'Unassigned (Left Gym)',
        ptSlot: null,
        preferredTime: null,
        ptShift: null,
        memberPortalAccess: false,
        ...(hasPt(member) ? { ptStatus: 'ended', ptEndedAt: new Date().toISOString(), ptEndReason: `Gym Left: ${finalReason}` } : {})
      };

      await updateMember(gymId || 'univo_main', member.id, updatedFields);
      broadcastForceLogout(member.id);

      toast.success(`${getName(member)} marked as Left. Coach shift freed & Member portal logged out!`);
      onSave(member.id, finalReason, updatedFields);
      onClose();
    } catch (err) {
      console.error('Error marking member as left:', err);
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🚪 Mark Gym Member as Left"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className='space-y-4 text-slate-800'>
        <div className='p-3.5 bg-slate-100 border border-slate-300 rounded-2xl flex items-start gap-2.5'>
          <LogOut className='w-5 h-5 text-slate-700 flex-shrink-0 mt-0.5' />
          <div className='text-xs'>
            <p className='font-bold text-slate-900'>Mark {getName(member)} as Left?</p>
            <p className='text-slate-600 mt-0.5 leading-relaxed'>
              Inka Gym Membership chhoot gaya hai. Yeh member Active list se hat kar <strong>🚪 Left</strong> filter tab me chala jayega. Aap jab chahe wapas reactivate kar sakte hain.
            </p>
          </div>
        </div>

        <div>
          <label className='block text-xs font-bold text-slate-700 mb-1.5'>Reason for Leaving</label>
          <div className='space-y-1.5 max-h-56 overflow-y-auto pr-1'>
            {presetReasons.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                  reason === r
                    ? 'bg-slate-200/70 border-slate-400 text-slate-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type='radio'
                  name='leftReason'
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className='accent-slate-700'
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <input
              type='text'
              placeholder='Specify reason...'
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className='mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-500'
              autoFocus
            />
          )}
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={loading}
            className='flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-md disabled:opacity-50'
          >
            {loading ? 'Marking...' : '🚪 Confirm Mark as Left'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function EndMembershipModal({ member, gymId, onClose, onSave }) {
  const isBoth = (() => {
    const isPt = hasPt(member);
    const hasGymPlan = !!member.planName && member.planName !== 'PT Only' && member.planName !== '1-on-1 PT';
    return isPt && hasGymPlan;
  })();

  const [endScope, setEndScope] = useState(isBoth ? 'pt_only' : 'all');
  const [reason, setReason] = useState('PT / 1-on-1 Training Package Completed');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const presetReasons = [
    'PT / 1-on-1 Training Package Completed',
    'PT membership expired & did not renew',
    'Switched to General Gym only (No PT)',
    'Goal achieved / Transformation complete',
    'Personal / Schedule / Relocation break',
    'Discontinued by Gym Management',
    'Other'
  ];

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalReason = reason === 'Other' ? (customReason || 'Other') : reason;

      if (endScope === 'pt_only') {
        const updatedFields = {
          ptStatus: 'ended',
          ptEndedAt: new Date().toISOString(),
          ptEndReason: finalReason,
          status: 'active',
          active: true,
          previousPtPlanName: member.ptPlanName || '1-on-1 PT',
          previousTrainerId: member.trainerId || null,
          previousTrainerName: member.trainerName || member.personalTrainer || null,
          previousPtSlot: member.ptSlot || member.preferredTime || member.slot || null,
          trainerId: '',
          trainerName: 'Unassigned (No PT)',
          personalTrainer: 'Unassigned (No PT)',
          ptSlot: null,
          preferredTime: null,
          ptShift: null,
          memberPortalAccess: false,
        };

        await updateMember(gymId || 'univo_main', member.id, updatedFields);
        broadcastForceLogout(member.id);

        toast.success(`PT package ended for ${getName(member)}. Coach shift freed & Member portal logged out! Gym stays ACTIVE 🏋️`);
        onSave(member.id, { ptOnly: true, reason: finalReason, updatedFields });
      } else {
        const updatedFields = {
          status: 'ended',
          ptStatus: 'ended',
          active: false,
          endedAt: new Date().toISOString(),
          endReason: finalReason,
          previousPtPlanName: member.ptPlanName || '1-on-1 PT',
          previousTrainerId: member.trainerId || null,
          previousTrainerName: member.trainerName || member.personalTrainer || null,
          previousPtSlot: member.ptSlot || member.preferredTime || member.slot || null,
          trainerId: '',
          trainerName: 'Unassigned (No PT)',
          personalTrainer: 'Unassigned (No PT)',
          ptSlot: null,
          preferredTime: null,
          ptShift: null,
          memberPortalAccess: false,
        };

        await updateMember(gymId || 'univo_main', member.id, updatedFields);
        broadcastForceLogout(member.id);

        toast.success(`${getName(member)} membership ended. Coach freed & portal access logged out`);
        onSave(member.id, { ptOnly: false, reason: finalReason, updatedFields });
      }

      onClose();
    } catch (err) {
      console.error('Error ending PT membership:', err);
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🛑 End PT Membership"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className='space-y-4 text-slate-800'>
        {isBoth && (
          <div className='p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2'>
            <p className='text-xs font-bold text-slate-800'>
              Kisko End Karna Chahte Hain?
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <button
                type='button'
                onClick={() => setEndScope('pt_only')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  endScope === 'pt_only'
                    ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-200 text-purple-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs'>
                  <Sparkles className='w-4 h-4 text-purple-600' />
                  <span>✨ Sirf PT End Karein</span>
                </div>
                <p className='text-[11px] text-purple-800/80 mt-1 leading-snug'>
                  Gym Membership <strong>Active</strong> rahegi ({member.planName || 'Gym'}). Member Active list me hi rahega.
                </p>
              </button>

              <button
                type='button'
                onClick={() => setEndScope('all')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  endScope === 'all'
                    ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-200 text-rose-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs'>
                  <LogOut className='w-4 h-4 text-rose-600' />
                  <span>🚪 Gym + PT Dono End</span>
                </div>
                <p className='text-[11px] text-rose-800/80 mt-1 leading-snug'>
                  Gym aur PT dono end ho jayenge. Member End tab me chala jayega.
                </p>
              </button>
            </div>
          </div>
        )}

        {endScope === 'pt_only' ? (
          <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5'>
            <CheckCircle className='w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5' />
            <div className='text-xs'>
              <p className='font-bold text-emerald-950'>Gym Membership Active Rahegi 🏋️</p>
              <p className='text-emerald-800/90 mt-0.5 leading-relaxed'>
                {getName(member)} ka sirf 1-on-1 PT package complete hoga. Inka <strong>{member.planName || 'Gym Plan'}</strong> active rahega aur workout continue rahega.
              </p>
            </div>
          </div>
        ) : (
          <div className='p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-2.5'>
            <UserX className='w-4.5 h-4.5 text-purple-600 flex-shrink-0 mt-0.5' />
            <div className='text-xs'>
              <p className='font-bold text-purple-950'>End Full Membership for {getName(member)}?</p>
              <p className='text-purple-800/90 mt-0.5 leading-relaxed'>
                Yeh member Active list se hat kar <strong>🛑 End</strong> filter tab me chala jayega.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className='block text-xs font-bold text-slate-700 mb-1.5'>Reason for Ending PT</label>
          <div className='space-y-1.5 max-h-56 overflow-y-auto pr-1'>
            {presetReasons.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                  reason === r
                    ? 'bg-purple-50 border-purple-300 text-purple-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type='radio'
                  name='endReason'
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className='accent-purple-600'
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <input
              type='text'
              placeholder='Specify reason...'
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className='mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500'
              autoFocus
            />
          )}
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md disabled:opacity-50 ${
              endScope === 'pt_only'
                ? 'bg-purple-700 hover:bg-purple-800'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {loading ? 'Processing...' : endScope === 'pt_only' ? '🛑 Confirm End PT (Keep Gym Active)' : '🛑 Confirm Complete End'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteConfirmModal({ member, gymId, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteMember(gymId || 'univo_main', member.id);
      toast.success(`${getName(member)} permanently deleted`);
      onConfirm(member.id);
      onClose();
    } catch (err) {
      toast.error('Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="🗑️ Delete Member"
      maxWidth="max-w-sm"
    >
      <div className='space-y-4 text-slate-800'>
        <p className='text-xs text-slate-600 leading-relaxed'>
          Are you sure you want to permanently delete <strong>{getName(member)}</strong>? This action cannot be undone.
        </p>

        <div className='flex items-center gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleDelete}
            disabled={loading}
            className='flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50'
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
