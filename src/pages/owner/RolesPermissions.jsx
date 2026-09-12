import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, Check, User, KeyRound, Save, Edit, Trash2, Copy } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser } from "../../firebase/auth";
import { addStaff } from "../../firebase/staff";
import { getRoles, addRole, updateRole, deleteRole } from "../../firebase/roles";
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

// Removed DEFAULT_PRESETS as it is now seeded dynamically

export default function RolesPermissions() {
  const { gymId, role: currentRole } = useAuth();
  const GID = gymId || "univo_main";
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'staff'|'role', id, name, ... }

  // Forms
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: "", phone: "", email: "", password: "", role: "Receptionist", status: "active", permissions: {} });
  
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ title: "", icon: "💼", desc: "", perms: {} });
  
  const [processing, setProcessing] = useState(false);

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
      const uData = await getStaffUsers(GID);
      let rData = await getRoles(GID);
      
      if (rData.length === 0) {
        // Seed initial default roles
        const rec = { 
          title: "Receptionist", icon: "🛎️", desc: "Front desk: admission, fee collection, visits & receipts.", 
          perms: {
            dashboard: { view: true }, members: { view: true, create: true, edit: true, delete: false },
            payments: { view: true, create: true, edit: true, delete: false }, visits: { view: true, create: true, edit: true, delete: false }
          }
        };
        const man = { 
          title: "Branch Manager", icon: "🏢", desc: "Branch management: admissions, fees, operational reports & expenses.", 
          perms: {
            dashboard: { view: true }, members: { view: true, create: true, edit: true, delete: true },
            payments: { view: true, create: true, edit: true, delete: true }, trainers: { view: true, create: true, edit: true, delete: false },
            staff: { view: true, create: true, edit: false, delete: false }, expenses: { view: true, create: true, edit: true, delete: true },
            reports: { view: true }, visits: { view: true, create: true, edit: true, delete: true }
          }
        };
        await addRole(GID, rec);
        await addRole(GID, man);
        rData = await getRoles(GID);
      }
      
      setUsers(uData.filter(u => u.role !== 'owner'));
      setRoles(rData);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const allPresets = [...roles];

  // --- STAFF FUNCTIONS ---
  const openAddStaff = () => {
    setSelectedStaff(null);
    setStaffForm({ name: "", phone: "", email: "", password: "", role: allPresets[0]?.title || "", status: "active", permissions: allPresets[0]?.perms || {} });
    setStaffModalOpen(true);
  };
  
  const openEditStaff = (u) => {
    setSelectedStaff(u);
    setStaffForm({ 
      name: u.name || "", 
      phone: u.phone || "", // Assuming we add phone tracking or just leave blank
      email: u.email || "", 
      password: "", // Password cannot be edited from this UI easily without Admin SDK, we'll hide it
      role: u.role || "Custom", 
      status: u.status || "active", 
      permissions: u.permissions || {} 
    });
    setStaffModalOpen(true);
  };

  const applyPresetToStaff = (preset) => {
    setStaffForm(prev => ({ ...prev, role: preset.title, permissions: preset.perms }));
  };

  const handleToggleStaffPerm = (modId, action) => {
    setStaffForm(prev => {
      const currentMod = prev.permissions[modId] || { view: false, create: false, edit: false, delete: false };
      let newMod = { ...currentMod, [action]: !currentMod[action] };
      
      if (action === 'view' && !newMod.view) newMod = { view: false, create: false, edit: false, delete: false };
      if (action !== 'view' && newMod[action]) newMod.view = true;

      return { ...prev, permissions: { ...prev.permissions, [modId]: newMod } };
    });
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email) {
      toast.error("Please provide Name and Email");
      return;
    }
    if (!selectedStaff && staffForm.password.length < 6) {
      toast.error("Password must be at least 6 characters for new accounts");
      return;
    }
    
    setProcessing(true);
    try {
      if (selectedStaff) {
        // Update existing
        await updateStaffUser(selectedStaff.uid, selectedStaff.profileId, GID, {
          name: staffForm.name,
          role: staffForm.role,
          status: staffForm.status,
          permissions: staffForm.permissions
        });
        toast.success("Staff Account Updated!");
      } else {
        // Create new
        const profileId = await addStaff(GID, {
          name: staffForm.name, phone: staffForm.phone, email: staffForm.email,
          role: staffForm.role, salary: "0", joinDate: new Date().toISOString().split("T")[0],
          status: staffForm.status
        });
        await createStaffUser(
          staffForm.email, staffForm.password, staffForm.role, GID, staffForm.name, profileId, staffForm.permissions
        );
        toast.success("Staff Account Created!");
      }
      setStaffModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- ROLE FUNCTIONS ---
  const openAddRole = () => {
    setSelectedRole(null);
    setRoleForm({ title: "", icon: "💼", desc: "", perms: {} });
    setRoleModalOpen(true);
  };
  
  const openEditRole = (r) => {
    setSelectedRole(r);
    setRoleForm({ title: r.title, icon: r.icon, desc: r.desc, perms: r.perms || {} });
    setRoleModalOpen(true);
  };

  const handleToggleRolePerm = (modId, action) => {
    setRoleForm(prev => {
      const currentMod = prev.perms[modId] || { view: false, create: false, edit: false, delete: false };
      let newMod = { ...currentMod, [action]: !currentMod[action] };
      
      if (action === 'view' && !newMod.view) newMod = { view: false, create: false, edit: false, delete: false };
      if (action !== 'view' && newMod[action]) newMod.view = true;

      return { ...prev, perms: { ...prev.perms, [modId]: newMod } };
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.title) return toast.error("Role title is required");
    
    setProcessing(true);
    try {
      if (selectedRole) {
        await updateRole(GID, selectedRole.id, roleForm);
        toast.success("Role updated!");
      } else {
        await addRole(GID, roleForm);
        toast.success("New role created!");
      }
      setRoleModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- DELETE FUNCTIONS ---
  const confirmDelete = async () => {
    setProcessing(true);
    try {
      if (deleteConfirm.type === 'staff') {
        await deleteStaffUser(deleteConfirm.uid, deleteConfirm.profileId, GID);
        toast.success("Staff account deleted");
      } else if (deleteConfirm.type === 'role') {
        await deleteRole(GID, deleteConfirm.id);
        toast.success("Role preset deleted");
      }
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setProcessing(false);
    }
  };

  const copyDetails = (user) => {
    navigator.clipboard.writeText(`Login URL: ${window.location.origin}/#/login\nEmail: ${user.email}\nPassword: [Set by Admin]`);
    toast.success("Login details copied!");
  };

  if (currentRole !== "owner") {
    return <div className="p-10 text-center text-slate-500">Access Denied. Owner only.</div>;
  }

  const getActiveModulesCount = (perms) => {
    if (Array.isArray(perms)) return perms.length; 
    if (!perms) return 0;
    return Object.keys(perms).filter(k => perms[k].view).length;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Role & Permission
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff accounts, edit role templates & configure module permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openAddRole} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">
            <Plus className="w-4 h-4" /> Create New Role
          </button>
          <button onClick={openAddStaff} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow hover:bg-blue-700 transition">
            <User className="w-4 h-4" /> Add Staff Account
          </button>
        </div>
      </div>

      {/* Role Presets Section */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-blue-600" /> Configured Roles & Permissions ({allPresets.length + 1})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2"><span className="text-xl">👑</span><h3 className="font-bold text-slate-900">Owner (Super Admin)</h3></div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 h-8">Full access to all revenue, expenses, audit reports & settings.</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">Super System Role</span>
            </div>
          </div>
          
          {allPresets.map((p, i) => {
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition relative flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2"><span className="text-xl">{p.icon}</span><h3 className="font-bold text-slate-900">{p.title}</h3></div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditRole(p)} className="p-1 text-slate-400 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteConfirm({ type: 'role', ...p })} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1">{p.desc}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">Standard Preset</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">{getActiveModulesCount(p.perms)} Modules</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Staff Accounts Section */}
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
            <button onClick={openAddStaff} className="mt-4 text-blue-600 font-bold text-sm hover:underline">Create One Now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {users.map((u, i) => (
              <div key={u.uid} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl uppercase">
                      {u.name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{u.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${u.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                          {u.status || 'active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="text-blue-600 font-semibold flex items-center gap-1"><User className="w-3 h-3"/> {u.role}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditStaff(u)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirm({ type: 'staff', ...u })} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
                        <p className="text-sm font-bold text-slate-800 font-mono tracking-widest">••••••••</p>
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
                      if (Array.isArray(u.permissions)) return null; 
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

      {/* Add/Edit Staff Modal */}
      <Modal isOpen={staffModalOpen} onClose={() => setStaffModalOpen(false)} title={selectedStaff ? `Edit Account: ${selectedStaff.name}` : "Add Staff Account"} maxWidth="max-w-4xl">
        <form onSubmit={handleSaveStaff} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Quick Role Preset</label>
            </div>
            <div className="flex flex-wrap gap-3">
              {allPresets.map(p => (
                <button type="button" key={p.id} onClick={() => applyPresetToStaff(p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition ${staffForm.role === p.title ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                  <span>{p.icon}</span> {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Staff Full Name *</label>
              <input required type="text" placeholder="e.g. Rahul Sharma" value={staffForm.name}
                onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
            </div>
            {!selectedStaff && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Contact Phone *</label>
                <input required type="text" placeholder="9876543210" value={staffForm.phone}
                  onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 ${selectedStaff ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100`}>
            <div>
              <label className="text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1 block">User ID / Email *</label>
              <input required type="email" placeholder="staff@gym.com" value={staffForm.email} disabled={!!selectedStaff}
                onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                className={`w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 ${selectedStaff ? 'opacity-80 font-bold text-slate-800' : ''}`} />
            </div>
            {!selectedStaff && (
              <div>
                <label className="text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1 block">Login Password *</label>
                <input required type="text" placeholder="Min 6 characters" minLength={6} value={staffForm.password}
                  onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            )}
            <div>
              <label className="text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1 block">Account Status</label>
              <select value={staffForm.status} onChange={e => setStaffForm({ ...staffForm, status: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 font-bold text-emerald-700">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Module Permissions Matrix</label>
            </div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto bg-slate-50">
              {MODULES.map((mod, i) => {
                const modPerm = staffForm.permissions[mod.id] || { view: false, create: false, edit: false, delete: false };
                const isActive = modPerm.view;
                return (
                  <div key={mod.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 ${i !== MODULES.length - 1 ? 'border-b border-slate-200' : ''} ${isActive ? 'bg-white' : ''}`}>
                    <div className="flex items-center gap-4 mb-3 md:mb-0 w-1/3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><ShieldCheck className="w-5 h-5" /></div>
                      <div>
                        <p className={`font-bold text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{mod.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{mod.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.view ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                          checked={modPerm.view} onChange={() => handleToggleStaffPerm(mod.id, 'view')} /> View
                      </label>
                      {!mod.noEditDelete && (
                        <>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.create ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" 
                              checked={modPerm.create} onChange={() => handleToggleStaffPerm(mod.id, 'create')} /> Create
                          </label>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.edit ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" 
                              checked={modPerm.edit} onChange={() => handleToggleStaffPerm(mod.id, 'edit')} /> Edit
                          </label>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.delete ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-rose-600 rounded border-slate-300" 
                              checked={modPerm.delete} onChange={() => handleToggleStaffPerm(mod.id, 'delete')} /> Delete
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
            <button type="button" onClick={() => setStaffModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={processing} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow hover:bg-blue-700 transition disabled:opacity-50">
              {processing ? "Saving..." : "Save Staff Permissions"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Role Modal */}
      <Modal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={selectedRole ? `Edit Role: ${selectedRole.title}` : "Create New Role Preset"} maxWidth="max-w-4xl">
        <form onSubmit={handleSaveRole} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Role Name *</label>
              <input required type="text" placeholder="e.g. Sales Manager" value={roleForm.title}
                onChange={e => setRoleForm({ ...roleForm, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Role Icon/Emoji</label>
              <input type="text" placeholder="e.g. 📈" value={roleForm.icon}
                onChange={e => setRoleForm({ ...roleForm, icon: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1 block">Description</label>
              <input type="text" placeholder="What does this role do?" value={roleForm.desc}
                onChange={e => setRoleForm({ ...roleForm, desc: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Default Permissions for this Role</label>
            </div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto bg-slate-50">
              {MODULES.map((mod, i) => {
                const modPerm = roleForm.perms[mod.id] || { view: false, create: false, edit: false, delete: false };
                const isActive = modPerm.view;
                return (
                  <div key={mod.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 ${i !== MODULES.length - 1 ? 'border-b border-slate-200' : ''} ${isActive ? 'bg-white' : ''}`}>
                    <div className="flex items-center gap-4 mb-3 md:mb-0 w-1/3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><ShieldCheck className="w-5 h-5" /></div>
                      <div>
                        <p className={`font-bold text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{mod.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.view ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" 
                          checked={modPerm.view} onChange={() => handleToggleRolePerm(mod.id, 'view')} /> View
                      </label>
                      {!mod.noEditDelete && (
                        <>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.create ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" 
                              checked={modPerm.create} onChange={() => handleToggleRolePerm(mod.id, 'create')} /> Create
                          </label>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.edit ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" 
                              checked={modPerm.edit} onChange={() => handleToggleRolePerm(mod.id, 'edit')} /> Edit
                          </label>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${modPerm.delete ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <input type="checkbox" className="w-4 h-4 text-rose-600 rounded border-slate-300" 
                              checked={modPerm.delete} onChange={() => handleToggleRolePerm(mod.id, 'delete')} /> Delete
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
            <button type="button" onClick={() => setRoleModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" disabled={processing} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow hover:bg-blue-700 transition disabled:opacity-50">
              {processing ? "Saving..." : "Save Role Preset"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Deletion" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            Are you sure you want to delete the {deleteConfirm?.type === 'staff' ? 'staff account' : 'role preset'} <strong>{deleteConfirm?.name || deleteConfirm?.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">Cancel</button>
            <button onClick={confirmDelete} disabled={processing} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition disabled:opacity-50">
              {processing ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
