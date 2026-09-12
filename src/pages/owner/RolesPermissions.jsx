import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, Check, Shield, User, KeyRound, Save } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getStaff } from "../../firebase/staff";
import { createStaffUser } from "../../firebase/auth";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "members", label: "Members" },
  { id: "payments", label: "Fees & Receipts" },
  { id: "trainers", label: "Trainers" },
  { id: "staff", label: "Staff" },
  { id: "memberships", label: "Memberships & Plans" },
  { id: "services", label: "Services" },
  { id: "stock", label: "Stock & Equipment" },
  { id: "expenses", label: "Expenses & Utility" },
  { id: "reports", label: "Reports" },
  { id: "visits", label: "Visit & Demo" },
  { id: "offers", label: "Offer & Broadcast" },
  { id: "settings", label: "Settings" }
];

export default function RolesPermissions() {
  const { gymId, role: currentRole } = useAuth();
  const GID = gymId || "univo_main";
  
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", permissions: [] });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentRole !== "owner") {
      toast.error("Only owner can access Roles & Permissions");
      return;
    }
    loadData();
  }, [GID, currentRole]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getStaff(GID);
      // Optional: you could query `users` collection to check who already has an account
      // but for simplicity, we just list all staff and allow the owner to create logins.
      setStaffList(data);
    } catch (err) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  const handleTogglePerm = (modId) => {
    setForm(prev => {
      const current = prev.permissions;
      if (current.includes(modId)) return { ...prev, permissions: current.filter(id => id !== modId) };
      return { ...prev, permissions: [...current, modId] };
    });
  };

  const handleCreateLogin = async (e) => {
    e.preventDefault();
    if (!form.email || form.password.length < 6) {
      toast.error("Please provide email and a password (min 6 chars)");
      return;
    }
    if (form.permissions.length === 0) {
      toast.error("Please select at least one permission module");
      return;
    }
    
    setCreating(true);
    try {
      // createStaffUser(email, password, role, gymId, name = "", profileId = "", permissions = [])
      await createStaffUser(
        form.email, 
        form.password, 
        "staff", 
        GID, 
        selectedStaff.name, 
        selectedStaff.id, 
        form.permissions
      );
      toast.success("Login created for " + selectedStaff.name);
      setModalOpen(false);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error("Email is already registered. If you want to update permissions, you need to edit the database directly for now.");
      } else {
        toast.error("Failed: " + err.message);
      }
    } finally {
      setCreating(false);
    }
  };

  if (currentRole !== "owner") {
    return <div className="p-10 text-center text-slate-500">Access Denied. Owner only.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" /> Roles & Permissions
        </h1>
        <p className="text-slate-500 text-xs mt-1">Assign Login ID, Passwords, and page access to your staff.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading staff...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] uppercase font-bold">
              <tr>
                <th className="px-5 py-4">Staff Member</th>
                <th className="px-5 py-4">Role / Dept</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map(staff => (
                <tr key={staff.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{staff.name}</p>
                        <p className="text-xs text-slate-500">{staff.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button 
                      onClick={() => {
                        setSelectedStaff(staff);
                        setForm({ email: staff.email || "", password: "", permissions: ["dashboard"] });
                        setModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-sm">
                      <KeyRound className="w-3.5 h-3.5" /> Assign Login & Access
                    </button>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-slate-400">No staff added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Access Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Login Access: ${selectedStaff?.name}`} maxWidth="max-w-2xl">
        <form onSubmit={handleCreateLogin} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Email (Login ID) *</label>
              <input required type="email" placeholder="staff@univo.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Password *</label>
              <input required type="text" placeholder="Min 6 characters" minLength={6} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">Allowed Pages (Permissions)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MODULES.map(mod => {
                const isActive = form.permissions.includes(mod.id);
                return (
                  <button 
                    key={mod.id} type="button"
                    onClick={() => handleTogglePerm(mod.id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isActive 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300"
                    }`}>
                    <span className="text-xs font-bold truncate pr-2">{mod.label}</span>
                    {isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow hover:opacity-90 transition disabled:opacity-50">
              {creating ? "Saving..." : <><Save className="w-4 h-4" /> Save & Create Login</>}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
