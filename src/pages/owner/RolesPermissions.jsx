import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, Check, User, KeyRound, Save, Edit, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getStaffUsers, createStaffUser } from "../../firebase/auth";
import { addStaff } from "../../firebase/staff";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

const MODULES = [
  { id: "dashboard", label: "Dashboard", desc: "Live occupancy, stats & quick overview", noEditDelete: true },
  { id: "members", label: "Members", desc: "View & manage all members" },
  { id: "payments", label: "Fees & Receipts", desc: "Collect fees, invoices & receipts" },
  { id: "trainers", label: "Trainers", desc: "Manage trainers & attendance" },
  { id: "staff", label: "Staff", desc: "Manage staff payroll & records" },
  { id: "memberships", label: "Memberships & Plans", desc: "Create/edit pricing plans" },
  { id: "services", label: "Services", desc: "Extra amenities & services" },
  { id: "stock", label: "Stock & Equipment", desc: "Inventory & maintenance" },
  { id: "expenses", label: "Expenses & Utility", desc: "Track daily gym expenses" },
  { id: "reports", label: "Reports", desc: "Financial & growth analytics", noEditDelete: true },
  { id: "visits", label: "Visit & Demo", desc: "Lead management & followups" },
  { id: "offers", label: "Offer & Broadcast", desc: "Marketing & WhatsApp SMS", noEditDelete: true },
  { id: "settings", label: "Settings", desc: "Gym profile & configurations" }
];

const PRESETS = [
  { 
    id: "receptionist", title: "Receptionist", icon: "🛎️", desc: "Front desk: admission, fee collection, visits & receipts.", 
    perms: {
      dashboard: { view: true },
      members: { view: true, create: true, edit: true, delete: false },
      payments: { view: true, create: true, edit: true, delete: false },
      visits: { view: true, create: true, edit: true, delete: false }
    }
  },
  { 
    id: "manager", title: "Branch Manager", icon: "🏢", desc: "Branch management: admissions, fees, operational reports & expenses.", 
    perms: {
      dashboard: { view: true },
      members: { view: true, create: true, edit: true, delete: true },
      payments: { view: true, create: true, edit: true, delete: true },
      trainers: { view: true, create: true, edit: true, delete: false },
      staff: { view: true, create: true, edit: false, delete: false },
      expenses: { view: true, create: true, edit: true, delete: true },
      reports: { view: true },
      visits: { view: true, create: true, edit: true, delete: true }
    }
  }
];

export default function RolesPermissions() {
  const { gymId, role: currentRole } = useAuth();
  const GID = gymId || "univo_main";
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [showPass, setShowPass] = useState({});
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "Receptionist", status: "Active", permissions: PRESETS[0].perms });
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
      const data = await getStaffUsers(GID);
      setUsers(data.filter(u => u.role !== 'owner')); // Only show staff/managers
    } catch (err) {
      console.error(err);
      toast.error("Failed to load staff accounts");
    } finally {
      setLoading(false);
    }
  }

  const applyPreset = (preset) => {
    setForm(prev => ({ ...prev, role: preset.title, permissions: preset.perms }));
  };

  const handleTogglePerm = (modId, action) => {
    setForm(prev => {
      const currentMod = prev.permissions[modId] || { view: false, create: false, edit: false, delete: false };
      
      let newMod = { ...currentMod, [action]: !currentMod[action] };
      
      // If unchecking view, uncheck everything
      if (action === 'view' && !newMod.view) {
        newMod = { view: false, create: false, edit: false, delete: false };
      }
      // If checking create/edit/delete, auto-check view
      if (action !== 'view' && newMod[action]) {
        newMod.view = true;
      }

      return {
        ...prev,
        permissions: { ...prev.permissions, [modId]: newMod }
      };
    });
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || form.password.length < 6) {
      toast.error("Please provide Name, Email, and Password (min 6 chars)");
      return;
    }
    if (Object.keys(form.permissions).filter(k => form.permissions[k].view).length === 0) {
      toast.error("Please select at least one module permission");
      return;
    }
    
    setCreating(true);
    try {
      const profileId = await addStaff(GID, {
        name: form.name, phone: form.phone, email: form.email,
        role: form.role, salary: "0", joinDate: new Date().toISOString().split("T")[0],
        status: form.status.toLowerCase()
      });

      await createStaffUser(
        form.email, form.password, "staff", GID, form.name, profileId, form.permissions
      );
      
      toast.success("Staff Account Created!");
      setModalOpen(false);
      loadData();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error("Email is already registered.");
      } else {
        toast.error("Failed: " + err.message);
      }
    } finally {
      setCreating(false);
    }
  };

  const copyDetails = (user) => {
    navigator.clipboard.writeText(`Login URL: ${window.location.origin}/#/login\nEmail: ${user.email}\nPassword: [Ask Admin]`);
    toast.success("Login details copied!");
  };

  if (currentRole !== "owner") {
    return <div className="p-10 text-center text-slate-500">Access Denied. Owner only.</div>;
  }

  // Count active modules for display
  const getActiveModulesCount = (perms) => {
    if (Array.isArray(perms)) return perms.length; // old format
    if (!perms) return 0;
    return Object.keys(perms).filter(k => perms[k].view).length;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Role & Permission
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff accounts, edit role templates & configure module permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
              setForm({ name: "", phone: "", email: "", password: "", role: "Receptionist", status: "Active", permissions: PRESETS[0].perms });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow hover:bg-blue-700 transition">
            <User className="w-4 h-4" /> Add Staff Account
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-blue-600" /> Configured Roles & Permissions ({PRESETS.length + 1})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition relative">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="font-bold text-slate-900">Owner (Super Admin)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 h-8">Full access to all revenue, expenses, audit reports & settings.</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">Super</span>
            </div>
          </div>
          {PRESETS.map((p, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <h3 className="font-bold text-slate-900">{p.title}</h3>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4 h-8">{p.desc}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">Standard</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">Configured Staff Accounts ({users.length})</h2>
          <span className="text-xs text-slate-500">Visible ID, Passwords & Access Controls</span>
        </div>
        
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading accounts...</div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No staff accounts configured yet.</p>
            <button onClick={() => setModalOpen(true)} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Create One Now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {users.map((u, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl uppercase">
                      {u.name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{u.name}</h3>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="text-blue-600 font-semibold flex items-center gap-1"><User className="w-3 h-3"/> {u.role}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete is disabled for demo"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Login Credentials</p>
                    <button onClick={() => copyDetails(u)} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                      <Copy className="w-3 h-3" /> Copy Details
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">User ID / Email:</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{u.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Password:</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 font-mono tracking-widest">
                          {showPass[u.uid] ? "********" : "••••••••"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Assigned Module Access ({getActiveModulesCount(u.permissions)} Modules)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(u.permissions || {}).map(p => {
                      if (Array.isArray(u.permissions)) return null; // Skip rendering detailed badges for old array format
                      const mod = MODULES.find(m => m.id === p);
                      const access = u.permissions[p];
                      if (!mod || !access.view) return null;
                      
                      let accessText = "view";
                      if (access.create) accessText += ", create";
                      if (access.edit) accessText += ", edit";
                      if (access.delete) accessText += ", delete";

                      return (
                        <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          <Check className="w-3 h-3" /> {mod.label} <span className="text-emerald-600 font-normal">({accessText})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Account" maxWidth="max-w-4xl">
        <form onSubmit={handleSaveAccount} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Quick Role Preset</label>
            </div>
            <div className="flex flex-wrap gap-3">
              {PRESETS.map(p => (
                <button type="button" key={p.id} onClick={() => applyPreset(p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition ${form.role === p.title ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                  <span>{p.icon}</span> {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Staff Full Name *</label>
              <input required type="text" placeholder="e.g. Rahul Sharma" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Contact Phone *</label>
              <input required type="text" placeholder="9876543210" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div>
              <label className="text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1 block">User ID / Email *</label>
              <input required type="email" placeholder="staff@gym.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1 block">Login Password *</label>
              <input required type="text" placeholder="Min 6 characters" minLength={6} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1 block">Account Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 font-bold text-emerald-700">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>

          {/* Detailed Module Permissions Matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Module Permissions Matrix</label>
            </div>
            
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto bg-slate-50">
              {MODULES.map((mod, i) => {
                const modPerm = form.permissions[mod.id] || { view: false, create: false, edit: false, delete: false };
                const isActive = modPerm.view;
                
                return (
                  <div key={mod.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 ${i !== MODULES.length - 1 ? 'border-b border-slate-200' : ''} ${isActive ? 'bg-white' : ''}`}>
                    <div className="flex items-center gap-4 mb-3 md:mb-0 w-1/3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{mod.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{mod.desc}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.view ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                          checked={modPerm.view} onChange={() => handleTogglePerm(mod.id, 'view')} />
                        View
                      </label>
                      
                      {!mod.noEditDelete && (
                        <>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.create ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                              checked={modPerm.create} onChange={() => handleTogglePerm(mod.id, 'create')} />
                            Create
                          </label>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.edit ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                              checked={modPerm.edit} onChange={() => handleTogglePerm(mod.id, 'edit')} />
                            Edit
                          </label>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.delete ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500" 
                              checked={modPerm.delete} onChange={() => handleTogglePerm(mod.id, 'delete')} />
                            Delete
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow hover:bg-blue-700 transition disabled:opacity-50">
              {creating ? "Saving..." : "Save Staff Permissions"}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
