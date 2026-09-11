import React, { useState, useEffect } from "react";
import { Plus, MessageCircle, MoreVertical, Link2, KeyRound, CheckCircle2, UserPlus, Image as ImageIcon, Upload, Camera } from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { getTrainers, addTrainer, updateTrainer, deleteTrainer } from "../../firebase/trainers";

import { createStaffUser } from "../../firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function Trainers() {
  const { gymId } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [openDropdown, setOpenDropdown] = useState(null);

  const [viewTrainerModal, setViewTrainerModal] = useState(null);


  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this trainer?")) {
      try {
        await deleteTrainer(gymId || "univo_main", id);
        setTrainers(trainers.filter(t => t.id !== id));
        toast.success("Trainer deleted");
      } catch (err) {
        toast.error("Failed to delete trainer");
      }
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await updateTrainer(gymId || "univo_main", id, { isActive: !currentStatus });
      setTrainers(trainers.map(t => t.id === id ? { ...t, isActive: !currentStatus } : t));
      toast.success(currentStatus ? "Trainer deactivated" : "Trainer activated");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const [loading, setLoading] = useState(false);
  const [generateLoginModalOpen, setGenerateLoginModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });


  // Modal Tabs: "manual" | "link"
  const [activeTab, setActiveTab] = useState("manual");
  const [inviteLink, setInviteLink] = useState("");

  const [form, setForm] = useState({
    name: "",
    specialization: "Weight Training & Hypertrophy",
    phone: "",
    email: "",
    password: "", // ID Password generation
    experience: "5 Years",
    bio: "",
    certifications: "",
  });

  

  useEffect(() => {
    async function load() {
      try {
        const t = await getTrainers(gymId || "univo_main");
        setTrainers(t && t.length > 0 ? t : []);
      } catch (e) {
        setTrainers([]);
      }
    }
    if (gymId) load();
  }, [gymId]);

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and Password are required to create a trainer account.");
      return;
    }

    setLoading(true);
    try {
      // 1. Add trainer doc first
      const newT = { 
        name: form.name,
        specialization: form.specialization,
        phone: form.phone,
        email: form.email,
        experience: form.experience,
        bio: form.bio,
        certifications: form.certifications,
        membersCount: 0,
        hasLogin: true 
      };
      const trainerId = await addTrainer(gymId || "univo_main", newT);
      
      // 2. Create Auth User without logging out owner
      await createStaffUser(form.email, form.password, "trainer", gymId || "univo_main", form.name, trainerId);
      
      setTrainers([{ ...newT, id: trainerId }, ...trainers]);
      toast.success("Trainer created & account generated!");
      setModalOpen(false);
      
      // Reset form
      setForm({ name: "", specialization: "Weight Training & Hypertrophy", phone: "", email: "", password: "", experience: "5 Years", bio: "", certifications: "" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create trainer");
    } finally {
      setLoading(false);
    }
  };


  const handleGenerateLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error("Email and Password are required");
      return;
    }
    setLoading(true);
    try {
      await createStaffUser(loginForm.email, loginForm.password, "trainer", gymId || "univo_main", selectedTrainer.name, selectedTrainer.id);
      await updateTrainer(gymId || "univo_main", selectedTrainer.id, { hasLogin: true, email: loginForm.email });
      
      setTrainers(trainers.map(t => t.id === selectedTrainer.id ? { ...t, hasLogin: true, email: loginForm.email } : t));
      toast.success("Trainer login created successfully!");
      setGenerateLoginModalOpen(false);
      setLoginForm({ email: "", password: "" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create login");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = () => {
    // In a real app, generate a 5-min token in Firestore.
    // For now, generate a mock link
    const token = Math.random().toString(36).substring(2, 10);
    const link = `${window.location.origin}/register-trainer?t=${token}`;
    setInviteLink(link);
  };

  const filtered = trainers.filter((t) => {
    return (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
           (t.specialization || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personal Trainers & Coaches</h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage fitness coaches, PT allocations & create trainer accounts
          </p>
        </div>
        <Button
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => {
            setActiveTab("manual");
            setInviteLink("");
            setModalOpen(true);
          }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Add Trainer
        </Button>
      </div>

      {/* Trainer Cards Grid */}

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Trainers Found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">You haven't added any personal trainers yet.</p>
          <Button onClick={() => setModalOpen(true)} className="bg-emerald-600 text-white font-bold px-6">Add Trainer</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.map((t) => (
          <div key={t.id} className={`p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition group flex flex-col justify-between ${t.isActive === false ? "opacity-60 grayscale-[0.5]" : ""}`}>
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {t.photoUrl ? (
                    <img src={t.photoUrl} alt={t.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-lg shadow-sm">
                      {(t.name || "C").split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">{t.name}</h3>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1 inline-block">
                      {t.specialization}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === t.id ? null : t.id)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {openDropdown === t.id && (
                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-100 z-10 py-1 overflow-hidden">
                      <button 
                        onClick={() => { handleToggleActive(t.id, t.isActive !== false); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {t.isActive !== false ? "Deactivate" : "Activate"}
                      </button>
                      <button 
                        onClick={() => { handleDelete(t.id); setOpenDropdown(null); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        Delete Trainer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Active PT Clients</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{t.membersCount || 0} Members</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Experience</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{t.experience || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              
              {t.hasLogin === false ? (
                <button
                  onClick={() => {
                    setSelectedTrainer(t);
                    setLoginForm({ email: t.email || "", password: "" });
                    setGenerateLoginModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <KeyRound className="w-4 h-4 text-amber-600" /> Create ID & Password
                </button>
              ) : (
                <button
                  onClick={() => {
                    const num = (t.phone || "").replace(/\D/g, "");
                    window.open(`https://wa.me/${num}?text=Hi%20${t.name},%20Checking%20in%20from%20the%20gym!`, "_blank");
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Message on WhatsApp
                </button>
              )}

            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Personal Trainer">
        <div className="flex mb-5 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === "manual" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Create Manually
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === "link" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Send Invite Link
          </button>
        </div>

        {activeTab === "manual" ? (
          <form onSubmit={handleManualAdd} className="space-y-4">
            <div className="flex items-start gap-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <KeyRound className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">Create Login Credentials</p>
                <p className="text-[11px] text-blue-700 mt-0.5">The trainer will use these to log into their dedicated app dashboard to manage their PT clients.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Login Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="trainer@gym.com" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Login Password *</label>
                <input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="Strong password" />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Trainer Full Name *</label>
              <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="e.g. Coach Amit Kumar" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Specialization</label>
                <input type="text" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Experience</label>
                <input type="text" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="e.g. 5 Years" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Phone *</label>
                <input required type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="9876543210" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Certifications</label>
                <input type="text" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="ACE, ISSA, etc." />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Bio / Description</label>
              <textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none resize-none" placeholder="Short description of the trainer's background..."></textarea>
            </div>

            <button disabled={loading} type="submit" className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:shadow-lg disabled:opacity-50">
              {loading ? "Creating Account..." : "Create Trainer & Account"}
            </button>
          </form>
        ) : (
          <div className="space-y-5 text-center pb-2">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Link2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Invite Trainer via Link</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Generate a secure registration link. The trainer will be able to set up their own profile, upload photos, and create a password securely.
              </p>
            </div>

            {!inviteLink ? (
              <button onClick={handleGenerateLink} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md transition hover:bg-slate-800 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Generate Secure Link
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl break-all text-xs font-medium text-emerald-800 text-left">
                  {inviteLink}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied!");
                  }} className="py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50">
                    Copy Link
                  </button>
                  <button onClick={() => {
                    window.open(`https://wa.me/?text=Hi! Please use this secure link to register your Trainer profile at the Gym: ${inviteLink}`, "_blank");
                  }} className="py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-sm">
                    <MessageCircle className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={generateLoginModalOpen} onClose={() => setGenerateLoginModalOpen(false)} title="Generate Login">
        <form onSubmit={handleGenerateLoginSubmit} className="space-y-4">
          <div className="flex items-start gap-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <KeyRound className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-900">Create Login for {selectedTrainer?.name}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">They registered via link. Now create their system ID and password so they can log into the Trainer Dashboard.</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Login Email *</label>
            <input required type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="trainer@gym.com" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Login Password *</label>
            <input required type="text" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none" placeholder="Strong password" />
          </div>

          <button disabled={loading} type="submit" className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:shadow-lg disabled:opacity-50">
            {loading ? "Creating..." : "Create & Send Credentials"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
