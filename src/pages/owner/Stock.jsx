import React, { useState, useEffect } from "react";
import { Package, Plus, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getStock, addStockItem, logServiceDone } from "../../firebase/stock";

export default function Stock() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "Machine", quantity: 1, condition: "Good",
    lastServiceDate: new Date().toISOString().split("T")[0], serviceIntervalDays: 90
  });

  useEffect(() => {
    async function load() {
      const s = await getStock("univo_main");
      setItems(s || []);
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await addStockItem("univo_main", form);
    setModalOpen(false);
    const s = await getStock("univo_main");
    setItems(s || []);
  };

  const handleMarkServiced = async (id) => {
    await logServiceDone("univo_main", id);
    const s = await getStock("univo_main");
    setItems(s || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Stock & Equipment Operations</h2>
          <p className="text-slate-400 text-xs mt-1">Manage machines, dumbbells, weights & service reminders</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Add Equipment / Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-400">{item.type}</span>
              <span className="text-xs text-slate-400">Qty: {item.quantity}</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white">{item.name}</h4>
              <p className="text-xs text-slate-400 mt-1">Last Serviced: {item.lastServiceDate || "N/A"}</p>
              <p className="text-xs text-slate-400">Service Interval: Every {item.serviceIntervalDays || 90} days</p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {item.condition || "Operational"}
              </span>
              <Button size="xs" variant="outline" icon={<Wrench className="w-3 h-3" />} onClick={() => handleMarkServiced(item.id)}>
                Mark Serviced
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Equipment / Stock Item">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300">Item Name</label>
            <input required type="text" placeholder="e.g. Lat Pulldown Machine / 20kg Dumbbell Pair" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Category / Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white">
                <option>Machine</option>
                <option>Dumbbell Set</option>
                <option>Barbell & Plates</option>
                <option>Cardio (Treadmill/Cycle)</option>
                <option>Consumables / Towels</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300">Quantity</label>
              <input required type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-300">Service Interval (Days)</label>
            <input type="number" placeholder="90" value={form.serviceIntervalDays} onChange={e => setForm({...form, serviceIntervalDays: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <Button fullWidth type="submit">Save to Stock</Button>
        </form>
      </Modal>
    </div>
  );
}
