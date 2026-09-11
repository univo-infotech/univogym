import React, { useState } from "react";
import { Plus, Star, CheckCircle, Dumbbell } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function Services() {
  const [services, setServices] = useState([
    { name: "Personal Training (1-on-1 PT)", desc: "Dedicated coach, custom workout program, form monitoring & daily motivation", price: "₹4,000 / mo" },
    { name: "Diet & Nutrition Counseling", desc: "Weekly macro planning, body fat analysis, supplement advice by certified nutritionist", price: "₹1,500 / session" },
    { name: "Steam & Sauna Detox Bath", desc: "Post-workout recovery, muscle relaxation and toxin flush session", price: "₹200 / session" },
    { name: "Personal Locker Facility", desc: "Secure digital locker for shoes, gym kit, supplements and shaker", price: "₹500 / mo" },
    { name: "Physiotherapy & Injury Rehab", desc: "Targeted mobility drills and recovery for joint/muscle strain", price: "₹800 / session" },
    { name: "Zumba & Functional Batch", desc: "High energy weekend group dance and endurance cardio classes", price: "₹1,200 / mo" },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", desc: "", price: "" });

  const handleAdd = (e) => {
    e.preventDefault();
    setServices([...services, form]);
    setModalOpen(false);
    setForm({ name: "", desc: "", price: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gym Services & PT Add-ons</h1>
          <p className="text-slate-500 text-xs mt-1">
            Specialized personal coaching, lockers, steam bath, rehab and nutrition services
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Add New Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((s, idx) => (
          <div key={idx} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-300 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-emerald-600" />
                </span>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {s.price}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">{s.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Active Gym Facility
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="✨ Add Gym Service / Add-on">
        <form onSubmit={handleAdd} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Service Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Steam & Sauna Detox"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Price / Charge *</label>
            <input
              required
              type="text"
              placeholder="e.g. ₹500 / mo"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Service Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of the service..."
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Service
          </button>
        </form>
      </Modal>
    </div>
  );
}