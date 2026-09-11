import React, { useState, useEffect } from "react";
import { Plus, Search, Users, Phone, MessageCircle, Eye, Dumbbell } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getTrainers, addTrainer } from "../../firebase/trainers";

export default function Trainers() {
  const [trainers, setTrainers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    specialization: "Weight Training & Hypertrophy",
    phone: "",
    email: "",
    experience: "5 Years",
    bio: "Certified fitness coach specializing in bodybuilding, fat loss and strength building.",
  });

  const dummyTrainers = [
    { id: "t1", name: "Coach Amit Kumar", specialization: "Weight Training & Powerlifting", phone: "+91 9876500111", email: "amit.trainer@univogym.com", experience: "7 Years", membersCount: 18 },
    { id: "t2", name: "Coach Sneha Rao", specialization: "Yoga, Core & Functional Cardio", phone: "+91 9811200222", email: "sneha.trainer@univogym.com", experience: "5 Years", membersCount: 14 },
    { id: "t3", name: "Coach Rohan Joshi", specialization: "CrossFit & Athletic Conditioning", phone: "+91 9988700333", email: "rohan.trainer@univogym.com", experience: "4 Years", membersCount: 12 },
  ];

  useEffect(() => {
    async function load() {
      try {
        const t = await getTrainers("univo_main");
        setTrainers(t && t.length > 0 ? t : dummyTrainers);
      } catch (e) {
        setTrainers(dummyTrainers);
      }
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const newT = { ...form, id: "t_" + Date.now(), membersCount: 0 };
    try {
      await addTrainer("univo_main", newT);
    } catch (err) {
      console.warn(err);
    }
    setTrainers([newT, ...trainers]);
    setModalOpen(false);
    setForm({ name: "", specialization: "Weight Training & Hypertrophy", phone: "", email: "", experience: "5 Years", bio: "" });
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
            Manage gym fitness coaches, client allocations & specializations
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Add Trainer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.map((t) => (
          <div key={t.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-emerald-300 transition">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-lg shadow-sm">
                {(t.name || "Coach").split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.name}</h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {t.specialization}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <p className="text-slate-500">Active PT Clients</p>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{t.membersCount || 12} Members</p>
              </div>
              <div>
                <p className="text-slate-500">Experience</p>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{t.experience || "5 Years"}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const num = (t.phone || "").replace(/\D/g, "");
                  window.open(`https://wa.me/${num}?text=Hi%20${t.name},%20Greetings%20from%20Gym%20Management!`, "_blank");
                }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="🏋️ Add Personal Trainer">
        <form onSubmit={handleAdd} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Trainer Full Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Coach Amit Kumar"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Specialization</label>
              <input
                type="text"
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Experience</label>
              <input
                type="text"
                placeholder="e.g. 5 Years"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Phone *</label>
              <input
                required
                type="text"
                placeholder="9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                placeholder="amit@univogym.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Trainer Profile
          </button>
        </form>
      </Modal>
    </div>
  );
}