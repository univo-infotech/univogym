import React, { useState, useEffect } from "react";
import {
  Plus,
  MessageCircle,
  MoreVertical,
  Link2,
  KeyRound,
  CheckCircle2,
  UserPlus,
  Image as ImageIcon,
  Upload,
  Camera,
  Award,
  Trash2,
  Power,
  Eye,
  FileText,
  Mail,
  Phone,
  Briefcase,
  X
} from "lucide-react";
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
    password: "",
    experience: "5 Years",
    bio: "",
    certifications: "",
    photoUrl: "",
    certUrl: "",
    transformations: [
      { id: 1, beforeImg: "", afterImg: "", description: "" }
    ],
  });

  const [linkForm, setLinkForm] = useState({ name: "", phone: "" });

  const handleFileUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error("File is too large. Please select a file under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result }));
      toast.success("File attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleTransformationFile = (e, index, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error("Image is too large. Please select an image under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => {
        const updated = [...prev.transformations];
        updated[index] = { ...updated[index], [type]: reader.result };
        return { ...prev, transformations: updated };
      });
      toast.success(`${type === "beforeImg" ? "Before" : "After"} image uploaded!`);
    };
    reader.readAsDataURL(file);
  };

  const handleTransformationDesc = (val, index) => {
    setForm((prev) => {
      const updated = [...prev.transformations];
      updated[index] = { ...updated[index], description: val };
      return { ...prev, transformations: updated };
    });
  };

  const addMoreTransformation = () => {
    setForm((prev) => ({
      ...prev,
      transformations: [
        ...prev.transformations,
        { id: Date.now(), beforeImg: "", afterImg: "", description: "" }
      ]
    }));
  };

  const removeTransformation = (index) => {
    if (form.transformations.length <= 1) {
      setForm((prev) => ({
        ...prev,
        transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }]
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      transformations: prev.transformations.filter((_, i) => i !== index)
    }));
  };

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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this trainer?")) {
      try {
        await deleteTrainer(gymId || "univo_main", id);
        setTrainers(trainers.filter((t) => t.id !== id));
        toast.success("Trainer deleted");
      } catch (err) {
        toast.error("Failed to delete trainer");
      }
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await updateTrainer(gymId || "univo_main", id, { isActive: !currentStatus });
      setTrainers(
        trainers.map((t) => (t.id === id ? { ...t, isActive: !currentStatus } : t))
      );
      toast.success(currentStatus ? "Trainer deactivated" : "Trainer activated");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and Password are required to create a trainer account.");
      return;
    }

    setLoading(true);
    try {
      const newT = {
        name: form.name,
        specialization: form.specialization,
        phone: form.phone,
        email: form.email,
        experience: form.experience,
        bio: form.bio,
        certifications: form.certifications,
        photoUrl: form.photoUrl || "",
        certUrl: form.certUrl || "",
        transformations: form.transformations.filter(t => t.beforeImg || t.afterImg || t.description),
        membersCount: 0,
        hasLogin: true,
      };
      const trainerId = await addTrainer(gymId || "univo_main", newT);

      // Create Auth User without logging out owner
      await createStaffUser(
        form.email,
        form.password,
        "trainer",
        gymId || "univo_main",
        form.name,
        trainerId
      );

      setTrainers([{ ...newT, id: trainerId }, ...trainers]);
      toast.success("Trainer created & account generated!");
      setModalOpen(false);

      // Reset form
      setForm({
        name: "",
        specialization: "Weight Training & Hypertrophy",
        phone: "",
        email: "",
        password: "",
        experience: "5 Years",
        bio: "",
        certifications: "",
        photoUrl: "",
        certUrl: "",
        transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }],
      });
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
      await createStaffUser(
        loginForm.email,
        loginForm.password,
        "trainer",
        gymId || "univo_main",
        selectedTrainer.name,
        selectedTrainer.id
      );
      await updateTrainer(gymId || "univo_main", selectedTrainer.id, {
        hasLogin: true,
        email: loginForm.email,
      });

      setTrainers(
        trainers.map((t) =>
          t.id === selectedTrainer.id
            ? { ...t, hasLogin: true, email: loginForm.email }
            : t
        )
      );
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

  const filtered = trainers.filter((t) => {
    return (
      (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.specialization || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Trainers Found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            You haven't added any personal trainers yet.
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 text-white font-bold px-6"
          >
            Add Trainer
          </Button>
        </div>
      )}

      {/* Trainer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition group flex flex-col justify-between ${
              t.isActive === false ? "opacity-60 grayscale-[0.5]" : ""
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {t.photoUrl ? (
                    <img
                      src={t.photoUrl}
                      alt={t.name}
                      className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-lg shadow-sm">
                      {(t.name || "C")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
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
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {openDropdown === t.id && (
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden">
                      <button
                        onClick={() => {
                          setViewTrainerModal(t);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition"
                      >
                        <Eye className="w-4 h-4 text-emerald-600" /> View Full Profile
                      </button>
                      <button
                        onClick={() => {
                          handleToggleActive(t.id, t.isActive !== false);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                      >
                        <Power className="w-4 h-4 text-slate-500" />
                        {t.isActive !== false ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => {
                          handleDelete(t.id);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition border-t border-slate-50"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" /> Delete Trainer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Active PT Clients</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {t.membersCount || 0} Members
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Experience</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {t.experience || "N/A"}
                  </p>
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
                    window.open(
                      `https://wa.me/${num}?text=Hi%20${encodeURIComponent(
                        t.name || "Coach"
                      )},%20Checking%20in%20from%20the%20gym!`,
                      "_blank"
                    );
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

      {/* Add Personal Trainer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Personal Trainer"
        maxWidth="max-w-2xl"
      >
        <div className="flex mb-6 bg-slate-100 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === "manual"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Create Manually
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === "link"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Send Invite Link (WhatsApp)
          </button>
        </div>

        {activeTab === "manual" ? (
          <form onSubmit={handleManualAdd} className="space-y-5">
            {/* Top Profile Photo */}
            <div className="flex flex-col items-center justify-center pb-2">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center transition group-hover:shadow-lg group-hover:border-emerald-100">
                  {form.photoUrl ? (
                    <img
                      src={form.photoUrl}
                      alt="Trainer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserPlus className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm group-hover:bg-emerald-600 transition group-hover:scale-105">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={(e) => handleFileUpload(e, "photoUrl")}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-wide">
                Trainer Portrait Photo
              </p>
            </div>

            <div className="flex items-start gap-4 p-3 bg-blue-50/80 border border-blue-100 rounded-2xl">
              <KeyRound className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">Create Login Credentials</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  The trainer will use these to log into their dedicated app dashboard to manage
                  their PT clients.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Login Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="trainer@gym.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Login Password *
                </label>
                <input
                  required
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="Strong password"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Trainer Full Name *
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="e.g. Coach Amit Kumar"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Phone *
                </label>
                <input
                  required
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Experience
                </label>
                <input
                  type="text"
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="e.g. 5 Years"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Specialization
              </label>
              <input
                type="text"
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="e.g. Weight Training & Hypertrophy"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Professional Bio / Description
              </label>
              <textarea
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:bg-white outline-none resize-none"
                placeholder="Short description of the trainer's background, achievements..."
              ></textarea>
            </div>

            {/* Certification Upload Section */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" /> Trainer Certification
              </h4>
              <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-emerald-50/60 hover:border-emerald-300 transition group bg-white shadow-xs">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition">
                  {form.certUrl ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Award className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {form.certUrl ? "Certificate Attached" : "Upload Certification"}
                  </p>
                  <p className="text-[10px] text-slate-500">Supports PDF, JPG, PNG (Max 800KB)</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold group-hover:bg-emerald-500 group-hover:text-white transition">
                  {form.certUrl ? "Change File" : "Browse"}
                </div>
                <input
                  type="file"
                  accept="image/jpeg, image/png, application/pdf"
                  onChange={(e) => handleFileUpload(e, "certUrl")}
                  className="hidden"
                />
              </label>
            </div>

            {/* Transformations / Before-After Section with Add More */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" /> Client Transformation Results
                </h4>
                <button
                  type="button"
                  onClick={addMoreTransformation}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add More Result
                </button>
              </div>

              <div className="space-y-4">
                {form.transformations.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl relative space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700">
                        Result #{idx + 1}
                      </span>
                      {form.transformations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTransformation(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="Remove this transformation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Side-by-side Before & After */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Before Box */}
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-emerald-400 transition text-center bg-slate-50 min-h-[110px]">
                        {item.beforeImg ? (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden">
                            <img
                              src={item.beforeImg}
                              alt="Before"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Before
                            </span>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[11px] font-bold text-slate-700">Before Photo</span>
                            <span className="text-[9px] text-slate-400">Click to upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg, image/png"
                          onChange={(e) => handleTransformationFile(e, idx, "beforeImg")}
                          className="hidden"
                        />
                      </label>

                      {/* After Box */}
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-emerald-400 transition text-center bg-slate-50 min-h-[110px]">
                        {item.afterImg ? (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden">
                            <img
                              src={item.afterImg}
                              alt="After"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              After
                            </span>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-emerald-500 mb-1" />
                            <span className="text-[11px] font-bold text-slate-700">After Photo</span>
                            <span className="text-[9px] text-slate-400">Click to upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg, image/png"
                          onChange={(e) => handleTransformationFile(e, idx, "afterImg")}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Description below */}
                    <div>
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => handleTransformationDesc(e.target.value, idx)}
                        placeholder="e.g. 12 Weeks Fat Loss & Muscle Gain - 14kg down"
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-3.5 mt-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:shadow-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Create Trainer & Account
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-5 pb-2">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Link2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Invite Trainer via WhatsApp</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Send a secure registration link. The trainer can upload their photo, certificates,
                and before/after transformation results.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-left">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Trainer Name
                </label>
                <input
                  type="text"
                  value={linkForm.name}
                  onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="e.g. Rahul Coach"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Trainer WhatsApp Number *
                </label>
                <input
                  type="tel"
                  value={linkForm.phone}
                  onChange={(e) => setLinkForm({ ...linkForm, phone: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!linkForm.phone) {
                  toast.error("Phone number is required");
                  return;
                }
                const token = Math.random().toString(36).substring(2, 10);
                const link = `${window.location.origin}/register-trainer/${gymId || "univo_main"}/${token}`;
                const msg = `Hi ${
                  linkForm.name || "Coach"
                }, please use this link to register your Trainer profile and upload your credentials: ${link}`;
                const num = linkForm.phone.replace(/\D/g, "");
                window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
                setModalOpen(false);
              }}
              className="w-full py-3.5 mt-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-sm transition"
            >
              <MessageCircle className="w-5 h-5" /> Generate & Send on WhatsApp
            </button>
          </div>
        )}
      </Modal>

      {/* Generate Login for Link-Registered Trainer Modal */}
      <Modal
        isOpen={generateLoginModalOpen}
        onClose={() => setGenerateLoginModalOpen(false)}
        title="Generate Login Access"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleGenerateLoginSubmit} className="space-y-4">
          <div className="flex items-start gap-4 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
            <KeyRound className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-900">
                Create Login for {selectedTrainer?.name}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                They registered via link. Now set up their system ID and password so they can log
                into the Trainer Dashboard.
              </p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Login Email *
            </label>
            <input
              required
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
              placeholder="trainer@gym.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Login Password *
            </label>
            <input
              required
              type="text"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
              placeholder="Strong password"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:shadow-lg disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Send Credentials"}
          </button>
        </form>
      </Modal>

      {/* View Full Trainer Profile Modal */}
      <Modal
        isOpen={!!viewTrainerModal}
        onClose={() => setViewTrainerModal(null)}
        title="Trainer Profile & Portfolio"
        maxWidth="max-w-2xl"
      >
        {viewTrainerModal && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {viewTrainerModal.photoUrl ? (
                <img
                  src={viewTrainerModal.photoUrl}
                  alt="Trainer"
                  className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-slate-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-2xl shadow-sm">
                  {(viewTrainerModal.name || "C")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900">{viewTrainerModal.name}</h2>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 mt-1 inline-block">
                  {viewTrainerModal.specialization || "General Trainer"}
                </span>
                <div className="flex flex-wrap gap-4 mt-2 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    Exp: {viewTrainerModal.experience || "N/A"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {viewTrainerModal.phone || "N/A"}
                  </span>
                  {viewTrainerModal.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {viewTrainerModal.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {viewTrainerModal.bio && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Professional Bio
                </p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
                  {viewTrainerModal.bio}
                </div>
              </div>
            )}

            {/* Documents & Results Preview */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Certifications & Transformation Results
              </p>
              
              {/* Certificate */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 mb-2">
                  <Award className="w-4 h-4 text-emerald-600" /> Certificate
                </div>
                {viewTrainerModal.certUrl ? (
                  viewTrainerModal.certUrl.startsWith("data:application/pdf") ? (
                    <a
                      href={viewTrainerModal.certUrl}
                      download="certificate.pdf"
                      className="text-xs font-bold text-emerald-600 underline"
                    >
                      Download PDF Certificate
                    </a>
                  ) : (
                    <img
                      src={viewTrainerModal.certUrl}
                      alt="Certificate"
                      className="w-full max-h-56 object-contain bg-white rounded-xl border border-slate-200"
                    />
                  )
                ) : (
                  <p className="text-xs text-slate-400">No certificate uploaded</p>
                )}
              </div>

              {/* Transformations Gallery */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" /> Client Transformations
                </h5>

                {viewTrainerModal.transformations && viewTrainerModal.transformations.length > 0 ? (
                  <div className="space-y-4">
                    {viewTrainerModal.transformations.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center">
                            <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                              Before
                            </span>
                            {item.beforeImg ? (
                              <img
                                src={item.beforeImg}
                                alt="Before"
                                className="w-full h-36 object-cover rounded-xl border border-slate-100"
                              />
                            ) : (
                              <div className="w-full h-36 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                                No Before Photo
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] font-bold uppercase text-emerald-600 mb-1 block">
                              After
                            </span>
                            {item.afterImg ? (
                              <img
                                src={item.afterImg}
                                alt="After"
                                className="w-full h-36 object-cover rounded-xl border border-emerald-100"
                              />
                            ) : (
                              <div className="w-full h-36 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                                No After Photo
                              </div>
                            )}
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            📝 {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : viewTrainerModal.portfolioUrl ? (
                  <img
                    src={viewTrainerModal.portfolioUrl}
                    alt="Transformation"
                    className="w-full h-44 object-cover rounded-xl border border-slate-200"
                  />
                ) : (
                  <p className="text-xs text-slate-400">No transformation photos added</p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                onClick={() => setViewTrainerModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
