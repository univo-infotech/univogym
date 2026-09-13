import React, { useState, useEffect } from "react";
import {
  Plus,
  MessageCircle,
  MoreVertical,
  Link2,
  KeyRound,
  ShieldCheck,
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
  X,
  Copy,
  Send,
  Edit,
  Tag,
  Dumbbell,
  IndianRupee,
  Sparkles,
  Calculator,
  Calendar,
  Clock,
  Percent,
  HandCoins,
  TrendingUp
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import PhotoCaptureInput from "../../components/shared/PhotoCaptureInput";
import { getTrainers, addTrainer, updateTrainer, deleteTrainer } from "../../firebase/trainers";
import { getMembers } from "../../firebase/members";
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

  // Modal Tabs: "manual" | "link"
  const [activeTab, setActiveTab] = useState("manual");
  const [inviteLink, setInviteLink] = useState("");

  const [form, setForm] = useState({
    name: "",
    specialization: "Weight Training & Hypertrophy",
    phone: "",
    email: "",
    password: "Coach@123",
    experience: "5 Years",
    bio: "",
    certifications: "",
    photoUrl: "",
    certUrl: "",
    // PT Commission Deal (Percentage or Fixed amount given by trainer to owner per membership sale)
    commissionType: "percentage", // "percentage" or "fixed"
    commissionValue: 30, // e.g. 30% or ₹1500
    ptPlans: [
      {
        id: 1,
        name: "1 Month 1-on-1 PT",
        durationType: "months",
        durationValue: 1,
        sessionsCount: 24,
        duration: "1 Month (24 Sessions)",
        price: 4500,
        description: "Personalized workout routine, daily form check & diet guidance"
      },
      {
        id: 2,
        name: "3 Months Transformation PT",
        durationType: "months",
        durationValue: 3,
        sessionsCount: 72,
        duration: "3 Months (72 Sessions)",
        price: 11000,
        description: "Dedicated 1-on-1 coaching, supplement strategy & weekly body fat audit"
      }
    ],
    transformations: [
      { id: 1, beforeImg: "", afterImg: "", description: "" }
    ],
  });

  const [editTrainerModalOpen, setEditTrainerModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    specialization: "Weight Training & Hypertrophy",
    phone: "",
    email: "",
    experience: "5 Years",
    salary: "",
    bio: "",
    certifications: "",
    photoUrl: "",
    certUrl: "",
    commissionType: "percentage",
    commissionValue: 30,
    ptPlans: [],
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

  const updateTransformationPhoto = (index, type, url) => {
    setForm((prev) => {
      const updated = [...prev.transformations];
      updated[index] = { ...updated[index], [type]: url };
      return { ...prev, transformations: updated };
    });
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

  // --- PT MEMBERSHIP PACKAGE HELPERS & HANDLERS ---
  const formatPtDuration = (type, value, sessions) => {
    const val = Number(value) || 1;
    let durText = "";
    if (type === "days") {
      durText = `${val} Day${val > 1 ? "s" : ""}`;
    } else if (type === "years") {
      durText = `${val} Year${val > 1 ? "s" : ""}`;
    } else {
      durText = `${val} Month${val > 1 ? "s" : ""}`;
    }

    if (sessions && Number(sessions) > 0) {
      return `${durText} (${sessions} Sessions)`;
    }
    return durText;
  };

  const getPtTotalDays = (type, value) => {
    const val = Number(value) || 1;
    if (type === "days") return val;
    if (type === "years") return val * 365;
    return val * 30; // months
  };

  const handlePtPlanChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.ptPlans];
      const plan = { ...updated[index], [field]: value };

      // Recalculate duration text if durationType, durationValue, or sessionsCount changed
      if (field === "durationType" || field === "durationValue" || field === "sessionsCount") {
        const dType = field === "durationType" ? value : (plan.durationType || "months");
        const dVal = field === "durationValue" ? value : (plan.durationValue || 1);
        const sess = field === "sessionsCount" ? value : plan.sessionsCount;
        plan.duration = formatPtDuration(dType, dVal, sess);
      }

      updated[index] = plan;
      return { ...prev, ptPlans: updated };
    });
  };

  const applyPtPreset = (index, presetType, presetVal, presetSess) => {
    setForm((prev) => {
      const updated = [...prev.ptPlans];
      const plan = { ...updated[index] };
      plan.durationType = presetType;
      plan.durationValue = presetVal;
      plan.sessionsCount = presetSess;
      plan.duration = formatPtDuration(presetType, presetVal, presetSess);
      if (!plan.name || plan.name.includes("Month") || plan.name.includes("Year") || plan.name.includes("Day")) {
        const prefix = presetType === "years" ? `${presetVal} Year` : presetType === "days" ? `${presetVal} Days` : `${presetVal} Month`;
        plan.name = `${prefix} 1-on-1 PT`;
      }
      updated[index] = plan;
      return { ...prev, ptPlans: updated };
    });
  };

  const addPtPlan = () => {
    setForm((prev) => ({
      ...prev,
      ptPlans: [
        ...prev.ptPlans,
        {
          id: Date.now(),
          name: "1 Month 1-on-1 PT",
          durationType: "months",
          durationValue: 1,
          sessionsCount: 24,
          duration: "1 Month (24 Sessions)",
          price: "",
          description: "1-on-1 personalized training & diet tracking"
        }
      ]
    }));
  };

  const removePtPlan = (index) => {
    setForm((prev) => ({
      ...prev,
      ptPlans: prev.ptPlans.filter((_, i) => i !== index)
    }));
  };

  // --- EDIT TRAINER HANDLERS ---
  const handleOpenEdit = (trainer) => {
    setEditingTrainer(trainer);
    setEditForm({
      name: trainer.name || "",
      specialization: trainer.specialization || "Weight Training & Hypertrophy",
      phone: trainer.phone || "",
      email: trainer.email || "",
      password: trainer.password || trainer.loginPassword || "Coach@123",
      experience: trainer.experience || "5 Years",
      salary: trainer.salary || "",
      bio: trainer.bio || "",
      certifications: trainer.certifications || "",
      photoUrl: trainer.photoUrl || "",
      certUrl: trainer.certUrl || "",
      commissionType: trainer.commissionType || "percentage",
      commissionValue: trainer.commissionValue !== undefined ? trainer.commissionValue : 30,
      ptPlans: Array.isArray(trainer.ptPlans) && trainer.ptPlans.length > 0
        ? trainer.ptPlans.map((p, idx) => ({
            id: p.id || idx + 1,
            name: p.name || "",
            durationType: p.durationType || (p.duration?.toLowerCase().includes("year") ? "years" : p.duration?.toLowerCase().includes("day") ? "days" : "months"),
            durationValue: p.durationValue || (p.duration?.toLowerCase().includes("3 month") ? 3 : p.duration?.toLowerCase().includes("6 month") ? 6 : p.duration?.toLowerCase().includes("1 year") ? 1 : 1),
            sessionsCount: p.sessionsCount || (p.duration?.match(/\d+(?=\s*sessions)/i)?.[0] ? Number(p.duration.match(/\d+(?=\s*sessions)/i)[0]) : 24),
            duration: p.duration || "1 Month (24 Sessions)",
            price: p.price || "",
            description: p.description || ""
          }))
        : [
            {
              id: 1,
              name: "1 Month 1-on-1 PT",
              durationType: "months",
              durationValue: 1,
              sessionsCount: 24,
              duration: "1 Month (24 Sessions)",
              price: 4500,
              description: "Personalized workout routine, form guidance & diet"
            }
          ],
      transformations:
        trainer.transformations && trainer.transformations.length > 0
          ? trainer.transformations.map((t, idx) => ({ id: t.id || idx + 1, beforeImg: t.beforeImg || t.beforeURL || "", afterImg: t.afterImg || t.afterURL || "", description: t.description || t.notes || "" }))
          : [{ id: 1, beforeImg: "", afterImg: "", description: "" }],
    });
    setOpenDropdown(null);
    setEditTrainerModalOpen(true);
  };

  // --- PT MEMBERSHIP PACKAGE HANDLERS (EDIT FORM) ---
  const handleEditPtPlanChange = (index, field, value) => {
    setEditForm((prev) => {
      const updated = [...prev.ptPlans];
      const plan = { ...updated[index], [field]: value };

      if (field === "durationType" || field === "durationValue" || field === "sessionsCount") {
        const dType = field === "durationType" ? value : (plan.durationType || "months");
        const dVal = field === "durationValue" ? value : (plan.durationValue || 1);
        const sess = field === "sessionsCount" ? value : plan.sessionsCount;
        plan.duration = formatPtDuration(dType, dVal, sess);
      }

      updated[index] = plan;
      return { ...prev, ptPlans: updated };
    });
  };

  const applyEditPtPreset = (index, presetType, presetVal, presetSess) => {
    setEditForm((prev) => {
      const updated = [...prev.ptPlans];
      const plan = { ...updated[index] };
      plan.durationType = presetType;
      plan.durationValue = presetVal;
      plan.sessionsCount = presetSess;
      plan.duration = formatPtDuration(presetType, presetVal, presetSess);
      if (!plan.name || plan.name.includes("Month") || plan.name.includes("Year") || plan.name.includes("Day")) {
        const prefix = presetType === "years" ? `${presetVal} Year` : presetType === "days" ? `${presetVal} Days` : `${presetVal} Month`;
        plan.name = `${prefix} 1-on-1 PT`;
      }
      updated[index] = plan;
      return { ...prev, ptPlans: updated };
    });
  };

  const addEditPtPlan = () => {
    setEditForm((prev) => ({
      ...prev,
      ptPlans: [
        ...prev.ptPlans,
        {
          id: Date.now(),
          name: "1 Month 1-on-1 PT",
          durationType: "months",
          durationValue: 1,
          sessionsCount: 24,
          duration: "1 Month (24 Sessions)",
          price: "",
          description: "1-on-1 coaching & diet tracking"
        }
      ]
    }));
  };

  const removeEditPtPlan = (index) => {
    setEditForm((prev) => ({
      ...prev,
      ptPlans: prev.ptPlans.filter((_, i) => i !== index)
    }));
  };

  const updateEditTransformationPhoto = (index, type, url) => {
    setEditForm((prev) => {
      const updated = [...prev.transformations];
      updated[index] = { ...updated[index], [type]: url };
      return { ...prev, transformations: updated };
    });
  };

  const handleEditTransformationDesc = (val, index) => {
    setEditForm((prev) => {
      const updated = [...prev.transformations];
      updated[index] = { ...updated[index], description: val };
      return { ...prev, transformations: updated };
    });
  };

  const addMoreEditTransformation = () => {
    setEditForm((prev) => ({
      ...prev,
      transformations: [
        ...prev.transformations,
        { id: Date.now(), beforeImg: "", afterImg: "", description: "" }
      ]
    }));
  };

  const removeEditTransformation = (index) => {
    if (editForm.transformations.length <= 1) {
      setEditForm((prev) => ({
        ...prev,
        transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }]
      }));
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      transformations: prev.transformations.filter((_, i) => i !== index)
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name) {
      toast.error("Trainer name is required.");
      return;
    }

    setLoading(true);
    try {
      const updatedData = {
        name: editForm.name,
        specialization: editForm.specialization,
        phone: editForm.phone,
        email: editForm.email,
        loginEmail: editForm.email,
        password: editForm.password || editingTrainer.password || editingTrainer.loginPassword || "Coach@123",
        loginPassword: editForm.password || editingTrainer.password || editingTrainer.loginPassword || "Coach@123",
        experience: editForm.experience,
        salary: editForm.salary ? Number(editForm.salary) : 0,
        bio: editForm.bio,
        certifications: editForm.certifications,
        photoUrl: editForm.photoUrl || "",
        certUrl: editForm.certUrl || "",
        commissionType: editForm.commissionType || "percentage",
        commissionValue: Number(editForm.commissionValue) || 0,
        ptPlans: (editForm.ptPlans || [])
          .filter((p) => p.name && p.price)
          .map((p) => ({ ...p, price: Number(p.price) })),
        transformations: editForm.transformations.filter(
          (t) => t.beforeImg || t.afterImg || t.description
        ),
      };

      await updateTrainer(gymId || "univo_main", editingTrainer.id, updatedData);

      setTrainers((prev) =>
        prev.map((t) =>
          t.id === editingTrainer.id ? { ...t, ...updatedData } : t
        )
      );

      if (viewTrainerModal && viewTrainerModal.id === editingTrainer.id) {
        setViewTrainerModal((prev) => ({ ...prev, ...updatedData }));
      }

      toast.success("Trainer profile, PT membership packages & transformations updated! ✨");
      setEditTrainerModalOpen(false);
      setEditingTrainer(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update trainer: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const [t, m] = await Promise.all([
          getTrainers(gymId || "univo_main"),
          getMembers(gymId || "univo_main")
        ]);

        const allMembers = m || [];
        const enrichedTrainers = (t || []).map((tr) => {
          const assignedMembers = allMembers.filter((mem) => {
            const matchId = tr.id && (mem.trainerId === tr.id || mem.coachId === tr.id);
            const trName = tr.name || tr.fullName || "";
            const matchName = trName && mem.trainerName && (
              mem.trainerName.toLowerCase() === trName.toLowerCase() ||
              mem.trainerName.toLowerCase().includes(trName.toLowerCase()) ||
              trName.toLowerCase().includes(mem.trainerName.toLowerCase())
            );
            return matchId || matchName;
          });

          return {
            ...tr,
            membersCount: assignedMembers.length,
            assignedMembers
          };
        });

        setTrainers(enrichedTrainers);
      } catch (e) {
        console.warn("Could not load trainers/members:", e);
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
    if (!form.name || !form.phone) {
      toast.error("Trainer name and phone number are required.");
      return;
    }

    setLoading(true);
    try {
      const newT = {
        name: form.name,
        specialization: form.specialization,
        phone: form.phone,
        email: form.email || "",
        loginEmail: form.email || "",
        password: form.password || "Coach@123",
        loginPassword: form.password || "Coach@123",
        experience: form.experience,
        bio: form.bio,
        certifications: form.certifications,
        photoUrl: form.photoUrl || "",
        certUrl: form.certUrl || "",
        commissionType: form.commissionType || "percentage",
        commissionValue: Number(form.commissionValue) || 0,
        ptPlans: (form.ptPlans || [])
          .filter((p) => p.name && p.price)
          .map((p) => ({ ...p, price: Number(p.price) })),
        transformations: form.transformations.filter(t => t.beforeImg || t.afterImg || t.description),
        membersCount: 0,
        payoutsPaid: 0,
      };
      const trainerId = await addTrainer(gymId || "univo_main", newT);

      setTrainers([{ ...newT, id: trainerId }, ...trainers]);
      toast.success("Trainer created with Login ID & PT packages!");
      setModalOpen(false);

      // Reset form
      setForm({
        name: "",
        specialization: "Weight Training & Hypertrophy",
        phone: "",
        email: "",
        password: "Coach@123",
        experience: "5 Years",
        bio: "",
        certifications: "",
        photoUrl: "",
        certUrl: "",
        commissionType: "percentage",
        commissionValue: 30,
        ptPlans: [
          {
            id: 1,
            name: "1 Month 1-on-1 PT",
            durationType: "months",
            durationValue: 1,
            sessionsCount: 24,
            duration: "1 Month (24 Sessions)",
            price: 4500,
            description: "Personalized workout routine, daily form check & diet guidance"
          },
          {
            id: 2,
            name: "3 Months Transformation PT",
            durationType: "months",
            durationValue: 3,
            sessionsCount: 72,
            duration: "3 Months (72 Sessions)",
            price: 11000,
            description: "Dedicated 1-on-1 coaching, supplement strategy & weekly body fat audit"
          }
        ],
        transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }],
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create trainer");
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
                        onClick={() => handleOpenEdit(t)}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition"
                      >
                        <Edit className="w-4 h-4 text-emerald-600" /> Edit Trainer Profile
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

              <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
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

              {/* PT Packages Pill */}
              <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                  {t.ptPlans && t.ptPlans.length > 0
                    ? `${t.ptPlans.length} PT Packages`
                    : "Custom PT Available"}
                </span>
                <span className="font-extrabold text-emerald-700">
                  {t.ptPlans && t.ptPlans.length > 0
                    ? `From ₹${Math.min(...t.ptPlans.map((p) => Number(p.price) || 0)).toLocaleString("en-IN")}`
                    : "Flexible"}
                </span>
              </div>

              {/* Commission Deal Pill */}
              <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-200/70 flex items-center justify-between text-[11px]">
                <span className="font-bold text-indigo-900 flex items-center gap-1">
                  <HandCoins className="w-3.5 h-3.5 text-indigo-600" /> PT Deal:
                </span>
                <span className="font-black text-indigo-800">
                  {t.commissionType === "fixed"
                    ? `Flat ₹${Number(t.commissionValue || 0).toLocaleString("en-IN")} Gym Cut`
                    : `${t.commissionValue !== undefined ? t.commissionValue : 30}% Gym / ${100 - (t.commissionValue !== undefined ? t.commissionValue : 30)}% Trainer`}
                </span>
              </div>

              {/* Login Credentials & Quick WhatsApp Share */}
              <div className="mt-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-slate-600 truncate text-[10px]">
                    ID: <strong className="text-slate-900">{t.email || t.loginEmail || "N/A"}</strong> • Pass: <span className="font-mono text-emerald-700 font-bold">{t.password || t.loginPassword || "Coach@123"}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const num = (t.phone || "").replace(/\D/g, "");
                    const msg = encodeURIComponent(
                      `🏋️ *UNIVO GYM TRAINER PORTAL LOGIN*\n\nHi Coach *${t.name}*,\nHere are your login credentials to access your Trainer Portal:\n\n👤 *Login ID:* ${t.email || t.loginEmail}\n🔑 *Password:* ${t.password || t.loginPassword || "Coach@123"}\n🔗 *Login Link:* ${window.location.origin}/#/login\n\nYou can now log in, view your assigned PT athletes, track their progress, and create custom diet plans!`
                    );
                    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
                  }}
                  className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition ml-1"
                  title="Share Login Credentials via WhatsApp"
                >
                  <Send className="w-2.5 h-2.5" /> Share
                </button>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(t)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Edit className="w-3.5 h-3.5 text-emerald-600" /> Edit Profile
                </button>
                <button
                  onClick={() => setViewTrainerModal(t)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" /> View Profile
                </button>
              </div>

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
                className="w-full py-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" /> Message on WhatsApp
              </button>
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
            <div>
              <PhotoCaptureInput
                value={form.photoUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, photoUrl: url }))}
                label="Trainer Portrait Photo"
                subLabel="Upload trainer picture or take live camera photo"
                shape="circle"
              />
            </div>

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

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Phone Number (WhatsApp) *
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

            {/* Trainer Portal Login Access */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" /> Trainer Portal Login ID & Password
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                  Coach App Access
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Coach will use these credentials to log in to their personal Trainer Portal to manage assigned members & diet plans.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">
                    Login ID / Email *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 outline-none"
                    placeholder="coach@univogym.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">
                    Login Password *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 outline-none font-mono font-bold text-emerald-800"
                    placeholder="e.g. Coach@123"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Gym Owner & Trainer PT Commission & Revenue Share Deal */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border-2 border-indigo-200/90 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <HandCoins className="w-4 h-4 text-indigo-600" /> Gym Owner & Trainer PT Commission Deal (कमीशन समझौता)
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    PT membership sale hone par Trainer dwara Gym Owner ko diya jane wala share:
                  </p>
                </div>
                <div className="flex rounded-xl overflow-hidden border border-indigo-200 text-[11px] font-bold self-start sm:self-auto bg-white">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, commissionType: "percentage" }))}
                    className={`px-3 py-1.5 transition flex items-center gap-1 ${
                      form.commissionType === "percentage"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-indigo-50"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" /> Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, commissionType: "fixed" }))}
                    className={`px-3 py-1.5 transition flex items-center gap-1 ${
                      form.commissionType === "fixed"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-indigo-50"
                    }`}
                  >
                    <IndianRupee className="w-3.5 h-3.5" /> Fixed Amount (₹)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {form.commissionType === "percentage" ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Gym Owner Share (%):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.commissionValue}
                        onChange={(e) => setForm((prev) => ({ ...prev, commissionValue: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-black text-indigo-950 focus:outline-none focus:border-indigo-500 pr-8"
                        placeholder="30"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Gym ko <strong>{form.commissionValue || 0}%</strong> milega, Trainer ka <strong>{Math.max(0, 100 - (form.commissionValue || 0))}%</strong> bachega.
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Gym Owner Fixed Cut per PT Sale (₹):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={form.commissionValue}
                        onChange={(e) => setForm((prev) => ({ ...prev, commissionValue: Math.max(0, Number(e.target.value)) }))}
                        className="w-full bg-white border border-indigo-200 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-indigo-950 focus:outline-none focus:border-indigo-500"
                        placeholder="1500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Har PT admission par flat <strong>₹{Number(form.commissionValue || 0).toLocaleString("en-IN")}</strong> Gym ka share hoga.
                    </span>
                  </div>
                )}

                {/* Live Split Example Simulation */}
                <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-100 pb-1">
                    <span>Example on ₹5,000 PT Sale:</span>
                    <span className="text-indigo-600 font-extrabold">Auto Split</span>
                  </div>
                  {(() => {
                    const samplePrice = 5000;
                    const ownerCut = form.commissionType === "percentage"
                      ? Math.round(samplePrice * ((Number(form.commissionValue) || 0) / 100))
                      : Math.min(samplePrice, Number(form.commissionValue) || 0);
                    const trainerCut = Math.max(0, samplePrice - ownerCut);

                    return (
                      <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                        <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70">
                          <p className="text-[10px] font-bold text-indigo-700">🏢 Gym Owner Cut</p>
                          <p className="text-xs font-black text-indigo-950 mt-0.5">₹{ownerCut.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                          <p className="text-[10px] font-bold text-emerald-700">🏋️ Trainer Earning</p>
                          <p className="text-xs font-black text-emerald-950 mt-0.5">₹{trainerCut.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Trainer PT Membership Packages (Custom Packages per Trainer) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Trainer PT Packages (व्यक्तिगत प्रशिक्षण पैकेज)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Define custom membership & PT pricing packages specific to this trainer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPtPlan}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add PT Package
                </button>
              </div>

              <div className="space-y-3">
                {form.ptPlans.map((plan, idx) => (
                  <div
                    key={plan.id || idx}
                    className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl relative space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Dumbbell className="w-3 h-3 text-emerald-600" /> Package #{idx + 1}
                      </span>
                      {form.ptPlans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePtPlan(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="Remove package"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Quick Duration Presets */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
                        <Clock className="w-3 h-3 text-emerald-600" /> Quick Duration Presets (तुरंत पैकेज चुनें):
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { label: "1 Month", type: "months", val: 1, sess: 24 },
                          { label: "3 Months", type: "months", val: 3, sess: 72 },
                          { label: "6 Months", type: "months", val: 6, sess: 144 },
                          { label: "1 Year", type: "years", val: 1, sess: 288 }
                        ].map((preset) => {
                          const isMatch = (plan.durationType || "months") === preset.type && Number(plan.durationValue || 1) === preset.val;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => applyPtPreset(idx, preset.type, preset.val, preset.sess)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
                                isMatch
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              {preset.label}
                              <span className={`block text-[9px] font-normal ${isMatch ? "text-emerald-100" : "text-slate-400"}`}>
                                ({preset.sess} sessions)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Package Name */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">
                          Package Name *
                        </label>
                        <input
                          required
                          type="text"
                          value={plan.name}
                          onChange={(e) => handlePtPlanChange(idx, "name", e.target.value)}
                          placeholder="e.g. 1 Month 1-on-1 PT"
                          className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                        />
                      </div>

                      {/* Month / Year / Days Value & Unit */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> Month / Year Duration *
                        </label>
                        <div className="flex gap-1.5 mt-1">
                          <input
                            required
                            type="number"
                            min="1"
                            value={plan.durationValue || 1}
                            onChange={(e) => handlePtPlanChange(idx, "durationValue", Math.max(1, Number(e.target.value)))}
                            className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none text-center"
                          />
                          <select
                            value={plan.durationType || "months"}
                            onChange={(e) => handlePtPlanChange(idx, "durationType", e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 outline-none"
                          >
                            <option value="months">Month(s)</option>
                            <option value="years">Year(s)</option>
                            <option value="days">Day(s)</option>
                          </select>
                        </div>
                      </div>

                      {/* Planned Sessions */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">
                          Sessions
                        </label>
                        <input
                          type="number"
                          value={plan.sessionsCount || 24}
                          onChange={(e) => handlePtPlanChange(idx, "sessionsCount", Number(e.target.value))}
                          placeholder="24"
                          className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 outline-none text-center font-bold"
                        />
                      </div>

                      {/* Package Total Fees */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase">
                          Fees (₹) *
                        </label>
                        <div className="relative mt-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                            ₹
                          </span>
                          <input
                            required
                            type="number"
                            value={plan.price}
                            onChange={(e) => handlePtPlanChange(idx, "price", e.target.value)}
                            placeholder="4500"
                            className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Automatic Calculation Banner */}
                    <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Calculator className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-emerald-950">
                            {plan.duration || formatPtDuration(plan.durationType || "months", plan.durationValue || 1, plan.sessionsCount)}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium ml-1.5">
                            (Total: ~{getPtTotalDays(plan.durationType || "months", plan.durationValue || 1)} Days valid)
                          </span>
                        </div>
                      </div>

                      {plan.price && Number(plan.price) > 0 && (
                        <div className="flex items-center gap-3 font-semibold text-[11px] text-emerald-900 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-100">
                          {/* Per Month Calculation if > 1 month or year */}
                          {(plan.durationType === "years" || (plan.durationType === "months" && Number(plan.durationValue) > 1)) && (
                            <span>
                              Monthly Rate: <strong className="text-emerald-700 font-extrabold">₹{Math.round(Number(plan.price) / ((plan.durationType === "years" ? Number(plan.durationValue || 1) * 12 : Number(plan.durationValue || 1)))).toLocaleString("en-IN")}/mo</strong>
                            </span>
                          )}
                          {/* Per Session Calculation */}
                          {plan.sessionsCount && Number(plan.sessionsCount) > 0 && (
                            <span>
                              Per Session: <strong className="text-emerald-700 font-extrabold">₹{Math.round(Number(plan.price) / Number(plan.sessionsCount)).toLocaleString("en-IN")}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        What's Included / Description
                      </label>
                      <input
                        type="text"
                        value={plan.description}
                        onChange={(e) => handlePtPlanChange(idx, "description", e.target.value)}
                        placeholder="e.g. Customized workout split, daily form check & personalized diet plan"
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <PhotoCaptureInput
                        value={item.beforeImg}
                        onChange={(url) => updateTransformationPhoto(idx, "beforeImg", url)}
                        label="Before Transformation"
                        subLabel="Upload file or take live snap"
                        shape="rounded"
                        aspectRatio="square"
                      />
                      <PhotoCaptureInput
                        value={item.afterImg}
                        onChange={(url) => updateTransformationPhoto(idx, "afterImg", url)}
                        label="After Transformation"
                        subLabel="Upload file or take live snap"
                        shape="rounded"
                        aspectRatio="square"
                      />
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
                  onChange={(e) => {
                    setLinkForm({ ...linkForm, name: e.target.value });
                    if (inviteLink) setInviteLink("");
                  }}
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
                  onChange={(e) => {
                    setLinkForm({ ...linkForm, phone: e.target.value });
                    if (inviteLink) setInviteLink("");
                  }}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                  placeholder="9876543210"
                />
              </div>
            </div>

            {inviteLink && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Registration Link Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Link copied to clipboard!");
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                </div>
                <div className="bg-white border border-emerald-200/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 break-all select-all">
                  {inviteLink}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!linkForm.phone.trim()) {
                    toast.error("Trainer WhatsApp number is required");
                    return;
                  }
                  const token = Math.random().toString(36).substring(2, 10);
                  const generatedLink = `${window.location.origin}/#/register-trainer/${gymId || "univo_main"}/${token}`;
                  setInviteLink(generatedLink);

                  const rawNum = linkForm.phone.replace(/\D/g, "");
                  const waNum = rawNum.length === 10 ? `91${rawNum}` : rawNum;
                  const msg = `Hi ${
                    linkForm.name || "Coach"
                  },\n\nPlease use this link to complete your Trainer profile and upload your certificates & transformations on UNIVO GYM:\n\n${generatedLink}`;

                  window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
                  toast.success("Opening WhatsApp & link ready!");
                }}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-sm transition"
              >
                <MessageCircle className="w-5 h-5" /> Send on WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!linkForm.phone.trim()) {
                    toast.error("Trainer WhatsApp number is required");
                    return;
                  }
                  const token = Math.random().toString(36).substring(2, 10);
                  const generatedLink = `${window.location.origin}/#/register-trainer/${gymId || "univo_main"}/${token}`;
                  setInviteLink(generatedLink);
                  navigator.clipboard.writeText(generatedLink);
                  toast.success("Link generated & copied!");
                }}
                className="px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 flex items-center justify-center gap-2 transition"
              >
                <Copy className="w-4 h-4" /> Generate Link
              </button>
            </div>
          </div>
        )}
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

            {/* Gym Owner & Trainer Commission Deal Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <HandCoins className="w-4 h-4 text-indigo-600" /> Gym & Trainer Commission Deal
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-white text-indigo-800 border border-indigo-200">
                  {viewTrainerModal.commissionType === "fixed" ? "Fixed Amount Deal" : "Percentage Share Deal"}
                </span>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed font-semibold">
                {viewTrainerModal.commissionType === "fixed" ? (
                  <>
                    Gym Owner receives <span className="font-extrabold text-indigo-950">₹{Number(viewTrainerModal.commissionValue || 0).toLocaleString("en-IN")} flat</span> on every PT membership sold by {viewTrainerModal.name}.
                  </>
                ) : (
                  <>
                    Gym Owner Share: <span className="font-extrabold text-indigo-950">{viewTrainerModal.commissionValue !== undefined ? viewTrainerModal.commissionValue : 30}%</span> • Trainer Payout: <span className="font-extrabold text-indigo-950">{100 - (viewTrainerModal.commissionValue !== undefined ? viewTrainerModal.commissionValue : 30)}%</span>
                  </>
                )}
              </p>
            </div>

            {/* Assigned PT Athletes / Members Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-emerald-600" /> Assigned Athletes / PT Members
                </p>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {viewTrainerModal.assignedMembers?.length || viewTrainerModal.membersCount || 0} Active Clients
                </span>
              </div>

              {viewTrainerModal.assignedMembers && viewTrainerModal.assignedMembers.length > 0 ? (
                <div className="space-y-2">
                  {viewTrainerModal.assignedMembers.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        {mem.photoURL || mem.photo ? (
                          <img
                            src={mem.photoURL || mem.photo}
                            alt={mem.name || mem.fullName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-xs">
                            {(mem.name || mem.fullName || "M").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{mem.name || mem.fullName}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>{mem.phone || "No phone"}</span>
                            <span>•</span>
                            <span className="font-semibold text-indigo-700">{mem.slot || "General Shift"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-extrabold text-[10px] border border-purple-200 block mb-1">
                          {mem.ptPlanName || "1-on-1 PT"}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Paid: ₹{(Number(mem.paidAmount || 0) || Number(mem.ptPlanPrice || 0) + Number(mem.planPrice || 0)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
                  No athletes currently assigned to this trainer.
                </div>
              )}
            </div>

            {/* Custom Trainer PT Membership Packages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Personal Training (PT) Packages
                </p>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {viewTrainerModal.ptPlans?.length || 0} Packages Available
                </span>
              </div>

              {viewTrainerModal.ptPlans && viewTrainerModal.ptPlans.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewTrainerModal.ptPlans.map((plan, idx) => {
                    const price = Number(plan.price || 0);
                    const durType = plan.durationType || (plan.duration?.toLowerCase().includes("year") ? "years" : "months");
                    const durVal = Number(plan.durationValue) || (plan.duration?.toLowerCase().includes("3 month") ? 3 : plan.duration?.toLowerCase().includes("6 month") ? 6 : plan.duration?.toLowerCase().includes("1 year") ? 1 : 1);
                    const sessCount = Number(plan.sessionsCount) || (plan.duration?.match(/\d+(?=\s*sessions)/i)?.[0] ? Number(plan.duration.match(/\d+(?=\s*sessions)/i)[0]) : 0);
                    const totalMonths = durType === "years" ? durVal * 12 : durVal;
                    const perMonth = (totalMonths > 1 && price > 0) ? Math.round(price / totalMonths) : null;
                    const perSession = (sessCount > 0 && price > 0) ? Math.round(price / sessCount) : null;

                    return (
                      <div
                        key={plan.id || idx}
                        className="p-4 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition flex flex-col justify-between group shadow-xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 leading-snug group-hover:text-emerald-900">
                              {plan.name || `Package #${idx + 1}`}
                            </span>
                            <span className="text-xs font-extrabold text-emerald-600 shrink-0 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                              ₹{price.toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              {plan.duration || `${durVal} ${durType}`}
                            </span>
                            {perMonth && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded-md">
                                ₹{perMonth.toLocaleString("en-IN")}/mo
                              </span>
                            )}
                            {perSession && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                                ₹{perSession.toLocaleString("en-IN")}/session
                              </span>
                            )}
                          </div>

                          {plan.description && (
                            <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed bg-white/90 p-2.5 rounded-xl border border-slate-100">
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
                  No custom PT packages configured for this trainer yet. Click Edit to add packages.
                </div>
              )}
            </div>

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

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  const tr = viewTrainerModal;
                  setViewTrainerModal(null);
                  handleOpenEdit(tr);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-4 h-4" /> Edit Profile & Results
              </button>
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

      {/* Edit Personal Trainer Modal */}
      <Modal
        isOpen={editTrainerModalOpen}
        onClose={() => {
          setEditTrainerModalOpen(false);
          setEditingTrainer(null);
        }}
        title={`✏️ Edit Trainer Profile: ${editingTrainer?.name || ""}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-5">
          {/* Top Profile Photo */}
          <div>
            <PhotoCaptureInput
              value={editForm.photoUrl}
              onChange={(url) => setEditForm((prev) => ({ ...prev, photoUrl: url }))}
              label="Trainer Portrait Photo"
              subLabel="Upload trainer picture or take live camera photo"
              shape="circle"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Trainer Full Name *
              </label>
              <input
                required
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="e.g. Vikramaditya Singh"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Primary Specialization *
              </label>
              <select
                value={editForm.specialization}
                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
              >
                <option value="Weight Training & Hypertrophy">Weight Training & Hypertrophy</option>
                <option value="Fat Loss & HIIT Conditioning">Fat Loss & HIIT Conditioning</option>
                <option value="Powerlifting & Strength">Powerlifting & Strength</option>
                <option value="CrossFit & Functional Fitness">CrossFit & Functional Fitness</option>
                <option value="Yoga & Flexibility Specialist">Yoga & Flexibility Specialist</option>
                <option value="Clinical Rehab & Posture Correction">Clinical Rehab & Posture Correction</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Login Email / ID *
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="trainer@gym.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Login Password *
              </label>
              <input
                type="text"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none font-mono font-bold text-emerald-800"
                placeholder="Coach@123"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Phone Number (WhatsApp) *
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Experience
              </label>
              <input
                type="text"
                value={editForm.experience}
                onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="e.g. 5 Years"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Monthly Salary (₹)
              </label>
              <input
                type="number"
                value={editForm.salary}
                onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none"
                placeholder="30000"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Trainer Bio / Profile Description
            </label>
            <textarea
              rows={3}
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Short description of trainer's background, achievements, client success..."
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white outline-none resize-none"
            />
          </div>

          {/* Trainer Certification File */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <FileText className="w-4 h-4 text-emerald-600" /> Trainer Certification
            </label>
            <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 border-dashed rounded-2xl cursor-pointer hover:bg-slate-100 transition">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white shadow-xs text-slate-500 border border-slate-200">
                  <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {editForm.certUrl ? "Certification File Attached" : "Upload Certification"}
                  </p>
                  <p className="text-[10px] text-slate-400">Supports PDF, JPG, PNG (Max 800KB)</p>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
                {editForm.certUrl ? "Change File" : "Browse"}
              </div>
              <input
                type="file"
                accept="image/jpeg, image/png, application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 800 * 1024) {
                    toast.error("File is too large. Please select under 800KB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setEditForm((prev) => ({ ...prev, certUrl: reader.result }));
                    toast.success("Certificate attached!");
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Gym Owner & Trainer PT Commission & Revenue Share Deal (Edit) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border-2 border-indigo-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <HandCoins className="w-4 h-4 text-indigo-600" /> Gym Owner & Trainer PT Commission Deal (कमीशन समझौता)
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  PT membership sale hone par Trainer dwara Gym Owner ko diya jane wala share:
                </p>
              </div>
              <div className="flex rounded-xl overflow-hidden border border-indigo-200 text-[11px] font-bold self-start sm:self-auto bg-white">
                <button
                  type="button"
                  onClick={() => setEditForm((prev) => ({ ...prev, commissionType: "percentage" }))}
                  className={`px-3 py-1.5 transition flex items-center gap-1 ${
                    editForm.commissionType === "percentage"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-indigo-50"
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" /> Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm((prev) => ({ ...prev, commissionType: "fixed" }))}
                  className={`px-3 py-1.5 transition flex items-center gap-1 ${
                    editForm.commissionType === "fixed"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-indigo-50"
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Fixed Amount (₹)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {editForm.commissionType === "percentage" ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Gym Owner Share (%):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.commissionValue ?? 30}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, commissionValue: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-black text-indigo-950 focus:outline-none focus:border-indigo-500 pr-8"
                      placeholder="30"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Gym ko <strong>{editForm.commissionValue || 0}%</strong> milega, Trainer ka <strong>{Math.max(0, 100 - (editForm.commissionValue || 0))}%</strong> bachega.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Gym Owner Fixed Cut per PT Sale (₹):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={editForm.commissionValue ?? 1500}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, commissionValue: Math.max(0, Number(e.target.value)) }))}
                      className="w-full bg-white border border-indigo-200 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-indigo-950 focus:outline-none focus:border-indigo-500"
                      placeholder="1500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Har PT admission par flat <strong>₹{Number(editForm.commissionValue || 0).toLocaleString("en-IN")}</strong> Gym ka share hoga.
                  </span>
                </div>
              )}

              {/* Live Split Example Simulation */}
              <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-slate-100 pb-1">
                  <span>Example on ₹5,000 PT Sale:</span>
                  <span className="text-indigo-600 font-extrabold">Auto Split</span>
                </div>
                {(() => {
                  const samplePrice = 5000;
                  const ownerCut = editForm.commissionType === "percentage"
                    ? Math.round(samplePrice * ((Number(editForm.commissionValue) || 0) / 100))
                    : Math.min(samplePrice, Number(editForm.commissionValue) || 0);
                  const trainerCut = Math.max(0, samplePrice - ownerCut);

                  return (
                    <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                      <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70">
                        <p className="text-[10px] font-bold text-indigo-700">🏢 Gym Owner Cut</p>
                        <p className="text-xs font-black text-indigo-950 mt-0.5">₹{ownerCut.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                        <p className="text-[10px] font-bold text-emerald-700">🏋️ Trainer Earning</p>
                        <p className="text-xs font-black text-emerald-950 mt-0.5">₹{trainerCut.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Trainer PT Membership Packages (Custom Packages per Trainer) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Trainer PT Packages (व्यक्तिगत प्रशिक्षण पैकेज)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Customize fees and training packages specific to {editForm.name || "this trainer"}.
                </p>
              </div>
              <button
                type="button"
                onClick={addEditPtPlan}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add PT Package
              </button>
            </div>

            <div className="space-y-3">
              {(editForm.ptPlans || []).map((plan, idx) => (
                <div
                  key={plan.id || idx}
                  className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl relative space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Dumbbell className="w-3 h-3 text-emerald-600" /> Package #{idx + 1}
                    </span>
                    {(editForm.ptPlans || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEditPtPlan(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="Remove package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Quick Duration Presets */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1.5">
                      <Clock className="w-3 h-3 text-emerald-600" /> Quick Duration Presets (तुरंत पैकेज चुनें):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { label: "1 Month", type: "months", val: 1, sess: 24 },
                        { label: "3 Months", type: "months", val: 3, sess: 72 },
                        { label: "6 Months", type: "months", val: 6, sess: 144 },
                        { label: "1 Year", type: "years", val: 1, sess: 288 }
                      ].map((preset) => {
                        const isMatch = (plan.durationType || "months") === preset.type && Number(plan.durationValue || 1) === preset.val;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => applyEditPtPreset(idx, preset.type, preset.val, preset.sess)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
                              isMatch
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                            }`}
                          >
                            {preset.label}
                            <span className={`block text-[9px] font-normal ${isMatch ? "text-emerald-100" : "text-slate-400"}`}>
                              ({preset.sess} sessions)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Package Name */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        Package Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={plan.name}
                        onChange={(e) => handleEditPtPlanChange(idx, "name", e.target.value)}
                        placeholder="e.g. 1 Month 1-on-1 PT"
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    {/* Month / Year / Days Value & Unit */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> Month / Year Duration *
                      </label>
                      <div className="flex gap-1.5 mt-1">
                        <input
                          required
                          type="number"
                          min="1"
                          value={plan.durationValue || 1}
                          onChange={(e) => handleEditPtPlanChange(idx, "durationValue", Math.max(1, Number(e.target.value)))}
                          className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-emerald-500 outline-none text-center"
                        />
                        <select
                          value={plan.durationType || "months"}
                          onChange={(e) => handleEditPtPlanChange(idx, "durationType", e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:border-emerald-500 outline-none"
                        >
                          <option value="months">Month(s)</option>
                          <option value="years">Year(s)</option>
                          <option value="days">Day(s)</option>
                        </select>
                      </div>
                    </div>

                    {/* Planned Sessions */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        Sessions
                      </label>
                      <input
                        type="number"
                        value={plan.sessionsCount || 24}
                        onChange={(e) => handleEditPtPlanChange(idx, "sessionsCount", Number(e.target.value))}
                        placeholder="24"
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 outline-none text-center font-bold"
                      />
                    </div>

                    {/* Package Total Fees */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        Fees (₹) *
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          ₹
                        </span>
                        <input
                          required
                          type="number"
                          value={plan.price}
                          onChange={(e) => handleEditPtPlanChange(idx, "price", e.target.value)}
                          placeholder="4500"
                          className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automatic Calculation Banner */}
                  <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Calculator className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-emerald-950">
                          {plan.duration || formatPtDuration(plan.durationType || "months", plan.durationValue || 1, plan.sessionsCount)}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium ml-1.5">
                          (Total: ~{getPtTotalDays(plan.durationType || "months", plan.durationValue || 1)} Days valid)
                        </span>
                      </div>
                    </div>

                    {plan.price && Number(plan.price) > 0 && (
                      <div className="flex items-center gap-3 font-semibold text-[11px] text-emerald-900 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-100">
                        {/* Per Month Calculation if > 1 month or year */}
                        {(plan.durationType === "years" || (plan.durationType === "months" && Number(plan.durationValue) > 1)) && (
                          <span>
                            Monthly Rate: <strong className="text-emerald-700 font-extrabold">₹{Math.round(Number(plan.price) / ((plan.durationType === "years" ? Number(plan.durationValue || 1) * 12 : Number(plan.durationValue || 1)))).toLocaleString("en-IN")}/mo</strong>
                          </span>
                        )}
                        {/* Per Session Calculation */}
                        {plan.sessionsCount && Number(plan.sessionsCount) > 0 && (
                          <span>
                            Per Session: <strong className="text-emerald-700 font-extrabold">₹{Math.round(Number(plan.price) / Number(plan.sessionsCount)).toLocaleString("en-IN")}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      What's Included / Description
                    </label>
                    <input
                      type="text"
                      value={plan.description}
                      onChange={(e) => handleEditPtPlanChange(idx, "description", e.target.value)}
                      placeholder="e.g. Customized workout split, daily form check & personalized diet plan"
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transformations / Before-After Section with Add More */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" /> Client Transformation Results
              </h4>
              <button
                type="button"
                onClick={addMoreEditTransformation}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add More Result
              </button>
            </div>

            <div className="space-y-4">
              {editForm.transformations.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl relative space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700">
                      Result #{idx + 1}
                    </span>
                    {editForm.transformations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEditTransformation(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                        title="Remove this transformation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Side-by-side Before & After: 2 upload options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PhotoCaptureInput
                      value={item.beforeImg}
                      onChange={(url) => updateEditTransformationPhoto(idx, "beforeImg", url)}
                      label="Before Transformation"
                      subLabel="Upload file or take live snap"
                      shape="rounded"
                      aspectRatio="square"
                    />
                    <PhotoCaptureInput
                      value={item.afterImg}
                      onChange={(url) => updateEditTransformationPhoto(idx, "afterImg", url)}
                      label="After Transformation"
                      subLabel="Upload file or take live snap"
                      shape="rounded"
                      aspectRatio="square"
                    />
                  </div>

                  {/* Description below */}
                  <div>
                    <input
                      type="text"
                      value={item.description || ""}
                      onChange={(e) => handleEditTransformationDesc(e.target.value, idx)}
                      placeholder="e.g. 12 Weeks Fat Loss & Muscle Gain - 14kg down"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setEditTrainerModalOpen(false);
                setEditingTrainer(null);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              {loading ? "Saving Changes..." : "Save Changes & Update Trainer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
