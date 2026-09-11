import React, { useState, useEffect } from "react";
import { Plus, Check, Shield } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getPlans, addPlan } from "../../firebase/plans";

export default function Memberships() {
  const [plans, setPlans] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", duration: "30", price: "", features: "Cardio,Weight Training,Locker", ptAddon: false });

  useEffect(() => {
    async function load() {
      const p = await getPlans("univo_main");
      setPlans(p || []);
    }
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await addPlan("univo_main", {
      ...form,
      features: form.features.split(",").map(f => f.trim())
    });
    setModalOpen(false);
    const p = await getPlans("univo_main");
    setPlans(p || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Membership Plans</h2>
          <p className="text-slate-400 text-xs mt-1">Configure packages, pricing & PT add-ons</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Create New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-green-400">{p.duration} Days</span>
              <h3 className="text-xl font-bold text-white mt-1">{p.name}</h3>
              <div className="my-4 text-3xl font-extrabold text-white">₹{p.price}</div>
              <ul className="space-y-2 mb-6">
                {(p.features || []).map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-green-400 shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
              {p.ptAddon ? "⭐ Includes Personal Trainer option" : "General Membership"}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Membership Plan">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300">Plan Name</label>
            <input required type="text" placeholder="e.g. 3 Months Pro Transformation" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Duration (Days)</label>
              <input required type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Price (₹)</label>
              <input required type="number" placeholder="2500" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-300">Features (Comma separated)</label>
            <input type="text" value={form.features} onChange={e => setForm({...form, features: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <Button fullWidth type="submit">Publish Plan</Button>
        </form>
      </Modal>
    </div>
  );
}
