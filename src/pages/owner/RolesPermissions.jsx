import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, Plus, Check, User, KeyRound, Save, Edit, Trash2, Copy, 
  Search, CheckCircle2, XCircle, Shield, Sparkles, Filter, CheckSquare, 
  Square, AlertCircle, ArrowRight, Lock, Eye, EyeOff
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser } from "../../firebase/auth";
import { addStaff } from "../../firebase/staff";
import { getRoles, addRole, updateRole, deleteRole } from "../../firebase/roles";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

const MODULES = [
  { id: "dashboard", label: "Dashboard", desc: "Live occupancy, overview metrics and quick stats", noEditDelete: true },
  { id: "members", label: "Members", desc: "View, register, edit and manage gym members" },
  { id: "payments", label: "Fees & Receipts", desc: "Collect payments, record receipts and track dues" },
  { id: "trainers", label: "Trainers", desc: "Manage fitness coaches and workout assignments" },
  { id: "staff", label: "Staff Management", desc: "Payroll, records and attendance tracking" },
  { id: "memberships", label: "Memberships & Plans", desc: "Pricing tiers, packages and membership terms" },
  { id: "services", label: "Services & Amenities", desc: "Extra facilities, lockers and add-on services" },
  { id: "stock", label: "Stock & Equipment", desc: "Machines, inventory and maintenance schedules" },
  { id: "expenses", label: "Expenses & Utility", desc: "Daily gym expenses, utility bills and operational costs" },
  { id: "reports", label: "Reports & Analytics", desc: "Financial P&L, membership growth and exports", noEditDelete: true },
  { id: "visits", label: "Visits & Demos", desc: "Walk-in inquiries, demo sessions and follow-ups" },
  { id: "offers", label: "Offers & Broadcast", desc: "Marketing campaigns, discounts and WhatsApp SMS", noEditDelete: true },
  { id: "settings", label: "Gym Settings", desc: "Profile details, branding and system preferences" }
];

export default function RolesPermissions() {
  const { gymId, role: currentRole } = useAuth();
  const GID = gymId || "univo_main";
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter for Staff Accounts
  const [staffSearch, setStaffSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Forms
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({ 
    name: "", phone: "", email: "", password: "", role: "Receptionist", status: "active", permissions: {} 
  });
  
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ title: "", icon: "💼", desc: "", perms: {} });
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (currentRole !== "owner") {
      toast.error("Access restricted: Owner authorization required");
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
        const rec = { 
          title: "Receptionist", icon: "🛎️", desc: "Front desk operations: admission, fee collection, inquiries & receipts.", 
          perms: {
            dashboard: { view: true }, 
            members: { view: true, create: true, edit: true, delete: false },
            payments: { view: true, create: true, edit: true, delete: false }, 
            visits: { view: true, create: true, edit: true, delete: false }
          }
        };
        const man = { 
          title: "Branch Manager", icon: "🏢", desc: "Complete operational management: admissions, fees, staff, expenses & reports.", 
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
        };
        await addRole(GID, rec);
        await addRole(GID, man);
        rData = await getRoles(GID);
      }
      
      setUsers(uData.filter(u => u.role !== 'owner'));
      setRoles(rData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load roles and permissions data");
    } finally {
      setLoading(false);
    }
  }

  const allPresets = roles;

  // Filtered staff list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = (u.name || "").toLowerCase().includes(staffSearch.toLowerCase()) ||
                          (u.email || "").toLowerCase().includes(staffSearch.toLowerCase()) ||
                          (u.role || "").toLowerCase().includes(staffSearch.toLowerCase());
      const matchStatus = statusFilter === "all" || (u.status || "active") === statusFilter;
      const matchRole = roleFilter === "all" || (u.role || "") === roleFilter;
      return matchSearch && matchStatus && matchRole;
    });
  }, [users, staffSearch, statusFilter, roleFilter]);

  // --- STAFF HANDLERS ---
  const openAddStaff = () => {
    setSelectedStaff(null);
    const firstRole = allPresets[0] || { title: "Receptionist", perms: {} };
    setStaffForm({ 
      name: "", phone: "", email: "", password: "", 
      role: firstRole.title, status: "active", permissions: firstRole.perms || {} 
    });
    setStaffModalOpen(true);
  };
  
  const openEditStaff = (u) => {
    setSelectedStaff(u);
    setStaffForm({ 
      name: u.name || "", 
      phone: u.phone || "", 
      email: u.email || "", 
      password: "", 
      role: u.role || "Custom", 
      status: u.status || "active", 
      permissions: u.permissions || {} 
    });
    setStaffModalOpen(true);
  };

  const applyPresetToStaff = (preset) => {
    setStaffForm(prev => ({ ...prev, role: preset.title, permissions: preset.perms || {} }));
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

  const handleStaffSelectAll = (checkAll) => {
    const newPerms = {};
    MODULES.forEach(mod => {
      newPerms[mod.id] = checkAll 
        ? { view: true, create: !mod.noEditDelete, edit: !mod.noEditDelete, delete: !mod.noEditDelete }
        : { view: false, create: false, edit: false, delete: false };
    });
    setStaffForm(prev => ({ ...prev, permissions: newPerms }));
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.email) {
      toast.error("Please provide both Full Name and Login Email");
      return;
    }
    if (!selectedStaff && staffForm.password.length < 6) {
      toast.error("Password must contain at least 6 characters");
      return;
    }
    
    setProcessing(true);
    try {
      if (selectedStaff) {
        await updateStaffUser(selectedStaff.uid, selectedStaff.profileId, GID, {
          name: staffForm.name,
          role: staffForm.role,
          status: staffForm.status,
          permissions: staffForm.permissions
        });
        toast.success("Staff permissions updated successfully");
      } else {
        const profileId = await addStaff(GID, {
          name: staffForm.name, phone: staffForm.phone, email: staffForm.email,
          role: staffForm.role, salary: "0", joinDate: new Date().toISOString().split("T")[0],
          status: staffForm.status
        });
        await createStaffUser(
          staffForm.email, staffForm.password, staffForm.role, GID, staffForm.name, profileId, staffForm.permissions
        );
        toast.success("Staff account provisioned with access");
      }
      setStaffModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Action failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- ROLE HANDLERS ---
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

  const handleRoleSelectAll = (checkAll) => {
    const newPerms = {};
    MODULES.forEach(mod => {
      newPerms[mod.id] = checkAll 
        ? { view: true, create: !mod.noEditDelete, edit: !mod.noEditDelete, delete: !mod.noEditDelete }
        : { view: false, create: false, edit: false, delete: false };
    });
    setRoleForm(prev => ({ ...prev, perms: newPerms }));
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.title.trim()) return toast.error("Role title is required");
    
    setProcessing(true);
    try {
      if (selectedRole) {
        await updateRole(GID, selectedRole.id, roleForm);
        toast.success("Role template updated");
      } else {
        await addRole(GID, roleForm);
        toast.success("New role template created");
      }
      setRoleModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- DELETE HANDLER ---
  const confirmDelete = async () => {
    setProcessing(true);
    try {
      if (deleteConfirm.type === 'staff') {
        await deleteStaffUser(deleteConfirm.uid, deleteConfirm.profileId, GID);
        toast.success("Staff access credentials removed");
      } else if (deleteConfirm.type === 'role') {
        await deleteRole(GID, deleteConfirm.id);
        toast.success("Role preset deleted");
      }
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      toast.error("Deletion failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyDetails = (user) => {
    const text = `Univo Gym Portal Credentials:\nPortal: ${window.location.origin}/#/login\nEmail / User ID: ${user.email}\nRole: ${user.role}\nPassword: [Contact Admin]`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.uid);
    toast.success("Login credentials copied to clipboard");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getActiveModulesCount = (perms) => {
    if (Array.isArray(perms)) return perms.length; 
    if (!perms) return 0;
    return Object.keys(perms).filter(k => perms[k]?.view).length;
  };

  if (currentRole !== "owner") {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Roles and Permission management is exclusive to gym owners and administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* ============================================================
          TOP HERO & STATS HEADER
      ============================================================ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Access Control & Governance
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Role & Permission Central
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Design granular authorization presets, grant module privileges, and manage secure credentials for all staff members.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button 
              onClick={openAddRole}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur transition shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 text-blue-300" /> Create Role Preset
            </button>
            <button 
              onClick={openAddStaff}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              <User className="w-4 h-4" /> Add Staff Account
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Configured Roles</p>
            <p className="text-2xl font-black text-white mt-1">{allPresets.length + 1}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Staff Accounts</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{users.length}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Active Logins</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {users.filter(u => (u.status || "active") === "active").length}
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Protected Modules</p>
            <p className="text-2xl font-black text-indigo-300 mt-1">{MODULES.length}</p>
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 1: ROLE PRESETS (CARDS)
      ============================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> Configured Roles & Presets ({allPresets.length + 1})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Preset templates speed up account creation and ensure uniform access.</p>
          </div>
          <button 
            onClick={openAddRole}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New Role
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Super Admin / Owner Card */}
          <div className="bg-white border-2 border-amber-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 rounded-xl bg-amber-50 border border-amber-100">👑</span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Owner</h3>
                    <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Super Administrator</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2 mb-4">
                Full authority over revenue, bank accounts, audit reports, system settings and role creation.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg uppercase">
                All 13 Modules
              </span>
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> System Locked
              </span>
            </div>
          </div>

          {/* Dynamic / Custom Roles */}
          {allPresets.map((p) => {
            const activeCount = getActiveModulesCount(p.perms);
            return (
              <div 
                key={p.id} 
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-100">{p.icon || "💼"}</span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{p.title}</h3>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">Role Preset</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button 
                        onClick={() => openEditRole(p)} 
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition" 
                        title="Edit Role Template"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ type: 'role', ...p })} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition" 
                        title="Delete Role Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed my-3 line-clamp-2">{p.desc || "Configured permissions preset for staff accounts."}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                    {activeCount} Modules Allowed
                  </span>
                  <button 
                    onClick={() => {
                      setSelectedStaff(null);
                      setStaffForm({ 
                        name: "", phone: "", email: "", password: "", 
                        role: p.title, status: "active", permissions: p.perms || {} 
                      });
                      setStaffModalOpen(true);
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition"
                  >
                    Assign Staff <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          SECTION 2: CONFIGURED STAFF ACCOUNTS
      ============================================================ */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" /> Configured Staff Accounts ({filteredUsers.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Staff members with personalized login credentials and custom view/edit rights.</p>
          </div>

          {/* Search & Filter controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search staff by name, email..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Staff Cards View */}
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading staff authorization data...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <User className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Staff Accounts Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              {staffSearch || statusFilter !== "all" 
                ? "No accounts matched your search filters. Try clearing search filters." 
                : "Create login credentials for your front desk, managers or trainers to let them access permitted pages."}
            </p>
            <button 
              onClick={openAddStaff} 
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700 transition"
            >
              + Add First Staff Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredUsers.map((u) => {
              const activeCount = getActiveModulesCount(u.permissions);
              const isActive = (u.status || "active") === "active";
              
              return (
                <div 
                  key={u.uid} 
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base truncate">{u.name}</h3>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isActive 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{u.role || "Staff"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => openEditStaff(u)} 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                          title="Edit Permissions & Status"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ type: 'staff', ...u })} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Revoke & Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Credentials Box */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 mb-4">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-slate-400" /> Portal Credentials
                        </span>
                        <button 
                          onClick={() => copyDetails(u)} 
                          className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition"
                        >
                          {copiedId === u.uid ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
                            </span>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Details
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <p className="text-[10px] text-slate-400 font-medium mb-0.5">User ID / Email</p>
                          <p className="font-bold text-slate-800 truncate select-all">{u.email}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <p className="text-[10px] text-slate-400 font-medium mb-0.5">Password</p>
                          <p className="font-mono font-bold text-slate-700 tracking-wider">••••••••••</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Summary Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        Assigned Privileges ({activeCount} of {MODULES.length})
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {Object.keys(u.permissions || {}).map(p => {
                        if (Array.isArray(u.permissions)) return null; 
                        const mod = MODULES.find(m => m.id === p);
                        const access = u.permissions[p];
                        if (!mod || !access?.view) return null;
                        
                        const actions = [];
                        if (access.create) actions.push("C");
                        if (access.edit) actions.push("E");
                        if (access.delete) actions.push("D");
                        const tag = actions.length ? `(${actions.join("")})` : "";

                        return (
                          <span 
                            key={p} 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold"
                          >
                            <Check className="w-3 h-3 text-emerald-600" /> {mod.label} 
                            {tag && <span className="text-emerald-600 font-mono text-[10px]">{tag}</span>}
                          </span>
                        );
                      })}
                      {activeCount === 0 && (
                        <span className="text-xs text-slate-400 italic">No page access granted yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL 1: ADD / EDIT STAFF ACCOUNT
      ============================================================ */}
      <Modal 
        isOpen={staffModalOpen} 
        onClose={() => setStaffModalOpen(false)} 
        title={selectedStaff ? `Edit Privileges: ${selectedStaff.name}` : "Provision New Staff Account"} 
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveStaff} className="space-y-6">
          
          {/* Quick Role Preset Picker */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> Quick Role Presets
              </label>
              <span className="text-[11px] text-slate-400">Click to autofill recommended module matrix</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {allPresets.map(p => {
                const isSelected = staffForm.role === p.title;
                return (
                  <button 
                    type="button" 
                    key={p.id} 
                    onClick={() => applyPresetToStaff(p)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                      isSelected 
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" 
                        : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{p.icon || "💼"}</span> {p.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Full Name *</label>
              <input 
                required 
                type="text" 
                placeholder="e.g. Rahul Sharma" 
                value={staffForm.name}
                onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition" 
              />
            </div>
            {!selectedStaff ? (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Contact Phone *</label>
                <input 
                  required 
                  type="tel" 
                  placeholder="9876543210" 
                  value={staffForm.phone}
                  onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition" 
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Assigned Role Label</label>
                <input 
                  type="text" 
                  value={staffForm.role}
                  onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition" 
                />
              </div>
            )}
          </div>

          {/* Credentials and Status Grid */}
          <div className={`grid grid-cols-1 ${selectedStaff ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100`}>
            <div>
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-1 block">User ID / Email *</label>
              <input 
                required 
                type="email" 
                placeholder="staff@gym.com" 
                value={staffForm.email} 
                disabled={!!selectedStaff}
                onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                className={`w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 ${
                  selectedStaff ? "opacity-80 font-bold text-slate-800 cursor-not-allowed" : ""
                }`} 
              />
            </div>

            {!selectedStaff && (
              <div>
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-1 block">Login Password *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Min 6 characters" 
                  minLength={6} 
                  value={staffForm.password}
                  onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" 
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-1 block">Account Access Status</label>
              <select 
                value={staffForm.status} 
                onChange={e => setStaffForm({ ...staffForm, status: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 font-bold text-slate-800"
              >
                <option value="active">Active (Permit Access)</option>
                <option value="inactive">Inactive (Revoke Access)</option>
              </select>
            </div>
          </div>

          {/* Module Permissions Matrix */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Module Permissions Matrix
                </label>
                <p className="text-[11px] text-slate-500">Configure page visibility and write/edit rights per module</p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => handleStaffSelectAll(true)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Select All
                </button>
                <button 
                  type="button" 
                  onClick={() => handleStaffSelectAll(false)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto bg-slate-50">
              {MODULES.map((mod, i) => {
                const modPerm = staffForm.permissions[mod.id] || { view: false, create: false, edit: false, delete: false };
                const isActive = modPerm.view;

                return (
                  <div 
                    key={mod.id} 
                    className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 sm:p-4 gap-3 transition ${
                      i !== MODULES.length - 1 ? 'border-b border-slate-200' : ''
                    } ${isActive ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <div className="flex items-center gap-3.5 md:w-5/12">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs sm:text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                          {mod.label}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{mod.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                        modPerm.view ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}>
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                          checked={modPerm.view} 
                          onChange={() => handleToggleStaffPerm(mod.id, 'view')} 
                        />
                        View
                      </label>

                      {!mod.noEditDelete && (
                        <>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            modPerm.create ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300" 
                              checked={modPerm.create} 
                              onChange={() => handleToggleStaffPerm(mod.id, 'create')} 
                            />
                            Create
                          </label>

                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            modPerm.edit ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-amber-600 rounded border-slate-300" 
                              checked={modPerm.edit} 
                              onChange={() => handleToggleStaffPerm(mod.id, 'edit')} 
                            />
                            Edit
                          </label>

                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            modPerm.delete ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300" 
                              checked={modPerm.delete} 
                              onChange={() => handleToggleStaffPerm(mod.id, 'delete')} 
                            />
                            Delete
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 sticky bottom-0 bg-white py-2">
            <button 
              type="button" 
              onClick={() => setStaffModalOpen(false)} 
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition text-center"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={processing} 
              className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow hover:opacity-90 transition disabled:opacity-50 text-center"
            >
              {processing ? "Saving..." : "Save Staff Permissions"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================
          MODAL 2: CREATE / EDIT ROLE TEMPLATE
      ============================================================ */}
      <Modal 
        isOpen={roleModalOpen} 
        onClose={() => setRoleModalOpen(false)} 
        title={selectedRole ? `Edit Role Template: ${selectedRole.title}` : "Create New Role Preset"} 
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Role Title *</label>
              <input 
                required 
                type="text" 
                placeholder="e.g. Senior Fitness Coach" 
                value={roleForm.title}
                onChange={e => setRoleForm({ ...roleForm, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Emoji / Icon</label>
              <input 
                type="text" 
                placeholder="e.g. 🏋️ or 🛎️" 
                value={roleForm.icon}
                onChange={e => setRoleForm({ ...roleForm, icon: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">Role Description</label>
              <input 
                type="text" 
                placeholder="Summary of responsibilities and authorization boundaries..." 
                value={roleForm.desc}
                onChange={e => setRoleForm({ ...roleForm, desc: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition" 
              />
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Default Module Matrix for this Role
                </label>
                <p className="text-[11px] text-slate-500">Any staff member assigned to this role will inherit these settings</p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => handleRoleSelectAll(true)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Select All
                </button>
                <button 
                  type="button" 
                  onClick={() => handleRoleSelectAll(false)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto bg-slate-50">
              {MODULES.map((mod, i) => {
                const modPerm = roleForm.perms[mod.id] || { view: false, create: false, edit: false, delete: false };
                const isActive = modPerm.view;

                return (
                  <div 
                    key={mod.id} 
                    className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 sm:p-4 gap-3 transition ${
                      i !== MODULES.length - 1 ? 'border-b border-slate-200' : ''
                    } ${isActive ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <div className="flex items-center gap-3.5 md:w-5/12">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs sm:text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                          {mod.label}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{mod.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                        modPerm.view ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}>
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                          checked={modPerm.view} 
                          onChange={() => handleToggleRolePerm(mod.id, 'view')} 
                        />
                        View
                      </label>

                      {!mod.noEditDelete && (
                        <>
                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            modPerm.create ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300" 
                              checked={modPerm.create} 
                              onChange={() => handleToggleRolePerm(mod.id, 'create')} 
                            />
                            Create
                          </label>

                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            modPerm.edit ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-amber-600 rounded border-slate-300" 
                              checked={modPerm.edit} 
                              onChange={() => handleToggleRolePerm(mod.id, 'edit')} 
                            />
                            Edit
                          </label>

                          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            modPerm.delete ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300" 
                              checked={modPerm.delete} 
                              onChange={() => handleToggleRolePerm(mod.id, 'delete')} 
                            />
                            Delete
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 sticky bottom-0 bg-white py-2">
            <button 
              type="button" 
              onClick={() => setRoleModalOpen(false)} 
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition text-center"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={processing} 
              className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow hover:opacity-90 transition disabled:opacity-50 text-center"
            >
              {processing ? "Saving..." : "Save Role Template"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================
          MODAL 3: DELETE CONFIRMATION
      ============================================================ */}
      <Modal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        title="Confirm Permanent Deletion" 
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-slate-900">
              Delete {deleteConfirm?.type === 'staff' ? 'Staff Login' : 'Role Preset'}?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <strong>{deleteConfirm?.name || deleteConfirm?.title}</strong>? 
              {deleteConfirm?.type === 'staff' 
                ? " This staff member will immediately lose access to all gym dashboards." 
                : " This role will no longer be available for assigning to staff."}
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setDeleteConfirm(null)} 
              className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition text-center"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={confirmDelete} 
              disabled={processing} 
              className="w-full sm:flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition disabled:opacity-50 shadow-sm text-center"
            >
              {processing ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
