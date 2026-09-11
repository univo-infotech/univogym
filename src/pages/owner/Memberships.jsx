import React, { useState, useEffect } from "react";
import { Plus, Check, Shield, Award, Sparkles } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getPlans, addPlan } from "../../firebase/plans";

export default function Memberships() {
  const [plans, setPlans] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    duration: "90",
    price: "6500",
    features: "Cardio Zone,Strength Machines,Locker Room,Steam Bath",
    ptAddon: false,
  });

  const dummyPlans = [
    {
      id: "p1",
      name: "1-Month Basic",
      duration: "30",
      price: "2500",
      features: ["Cardio Zone Access", "Strength Machines", "General Floor Support"],
      ptAddon: false,
    },
    {
      id: "p2",
      name: "3-Month Pro",
      duration: "90",
      price: "6500",
      features: ["All Gym Equipment", "Locker Room", "Diet Guidance", "1 Free PT Session"],
      ptAddon: true,
      popular: true,
    },
    {
      id: "p3",
      name: "6-Month Transformation",
      duration: "180",
      price: "11000",
      features: ["Unlimited Access", "Dedicated Trainer Support", "Bi-weekly Body Assessment", "Steam & Sauna"],
      ptAddon: true,
    },
    {
      id: "p4",
      name: "Annual Elite Plan",
      duration: "365",
      price: "18000",
      features: ["VIP Locker", "Complete Fitness Routine", "Diet & Supplement Plan", "Full Access to All Zones"],
      ptAddon: true,
    },
  ];

  useEffect(() => {
    async function load() {
      try {
        const p = await getPlans("univo_main");
        setPlans(p && p.length > 0 ? p : dummyPlans);
      } catch (err) {
        setPlans(dummyPlans);
      }
    }
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const newPlan = {
      ...form,
      id: "p_" + Date.now(),
      features: form.features.split(",").map((f) => f.trim()),
    };
    try {
      await addPlan("univo_main", newPlan);
    } catch (e) {
      console.warn("Simulated plan save:", e);
    }
    setPlans([newPlan, ...plans]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Membership Packages</h1>
          <p className="text-slate-500 text-xs mt-1">
            Configure gym packages, duration, pricing & personal training add-ons
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Create New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-6 rounded-3xl bg-white border flex flex-col justify-between relative shadow-sm transition hover:shadow-md ${
              p.popular ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
            }`}
          >
            {p.popular && (
              <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Most Popular
              </span>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-600">
                {p.duration} Days Plan
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{p.name}</h3>
              <div className="my-4 text-3xl font-extrabold text-slate-900">₹{p.price}</div>
              <ul className="space-y-2.5 mb-6">
                {(p.features || []).map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <Award className="w-4 h-4 text-emerald-600" />
              {p.ptAddon ? "Includes Trainer Options" : "General Membership"}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="✨ Create Membership Plan">
        <form onSubmit={handleCreate} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Plan Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. 3-Month Pro"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Duration (Days) *</label>
              <input
                required
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Fee (₹) *</label>
              <input
                required
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Features (comma-separated)</label>
            <textarea
              rows={3}
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ptAddon"
              checked={form.ptAddon}
              onChange={(e) => setForm({ ...form, ptAddon: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="ptAddon" className="text-xs font-semibold text-slate-700">
              Personal Trainer (PT) option available
            </label>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Membership Plan
          </button>
        </form>
      </Modal>
    </div>
  );
}