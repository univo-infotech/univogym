import React, { useState, useEffect } from "react";
import { Package, Plus, Wrench, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getStock, addStockItem, logServiceDone } from "../../firebase/stock";

export default function Stock() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [form, setForm] = useState({
    name: "",
    type: "Machine",
    quantity: 1,
    condition: "Good",
    lastServiceDate: new Date().toISOString().split("T")[0],
    serviceIntervalDays: 90,
  });

  const dummyStock = [
    { id: "s1", name: "Lat Pulldown Machine", type: "Machine", quantity: 2, condition: "Operational", lastServiceDate: "2026-08-15", serviceIntervalDays: 90 },
    { id: "s2", name: "Olympic Barbells & 20kg Plates", type: "Weights", quantity: 12, condition: "Good", lastServiceDate: "2026-07-20", serviceIntervalDays: 120 },
    { id: "s3", name: "Commercial Treadmill T90", type: "Cardio", quantity: 4, condition: "Service Due Soon", lastServiceDate: "2026-06-10", serviceIntervalDays: 90 },
    { id: "s4", name: "Dumbbell Set (2.5kg - 35kg)", type: "Weights", quantity: 24, condition: "Good", lastServiceDate: "2026-08-01", serviceIntervalDays: 180 },
    { id: "s5", name: "Leg Press 45-Degree Machine", type: "Machine", quantity: 1, condition: "Operational", lastServiceDate: "2026-08-20", serviceIntervalDays: 90 },
    { id: "s6", name: "Whey Protein & Pre-Workout Stock", type: "Consumable", quantity: 45, condition: "In Stock", lastServiceDate: "2026-09-01", serviceIntervalDays: 30 },
  ];

  useEffect(() => {
    async function load() {
      try {
        const s = await getStock("univo_main");
        setItems(s && s.length > 0 ? s : dummyStock);
      } catch (err) {
        setItems(dummyStock);
      }
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const newItem = { ...form, id: "s_" + Date.now() };
    try {
      await addStockItem("univo_main", newItem);
    } catch (e) {
      console.warn("Stock add fallback:", e);
    }
    setItems([newItem, ...items]);
    setModalOpen(false);
  };

  const handleMarkServiced = async (id) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      await logServiceDone("univo_main", id);
    } catch (e) {
      console.warn("Service update fallback:", e);
    }
    setItems(items.map((i) => (i.id === id ? { ...i, lastServiceDate: today, condition: "Operational" } : i)));
  };

  const filtered = items.filter((i) => {
    const matchSearch = (i.name || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || i.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock & Equipment Operations</h1>
          <p className="text-slate-500 text-xs mt-1">
            Gym machines, dumbbells, cardio equipment maintenance & service intervals
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Add Equipment / Item
        </Button>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "Machine", "Weights", "Cardio", "Consumable"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                filterType === t
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {t === "all" ? "All Items" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div key={item.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-emerald-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {item.type}
              </span>
              <span className="text-xs font-semibold text-slate-500">Qty: {item.quantity}</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">{item.name}</h4>
              <p className="text-xs text-slate-500 mt-1">Last Serviced: <span className="font-semibold text-slate-700">{item.lastServiceDate || "N/A"}</span></p>
              <p className="text-xs text-slate-500">Service Interval: Every {item.serviceIntervalDays || 90} days</p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className={`text-xs font-bold flex items-center gap-1 ${
                item.condition.includes("Due") ? "text-amber-600" : "text-emerald-600"
              }`}>
                <CheckCircle2 className="w-4 h-4" /> {item.condition}
              </span>
              <button
                onClick={() => handleMarkServiced(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition shadow-sm"
              >
                <Wrench className="w-3.5 h-3.5" /> Serviced Today
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="📦 Add Equipment / Stock Item">
        <form onSubmit={handleAdd} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Item Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Lat Pulldown Machine / 20kg Dumbbell Pair"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Equipment Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option>Machine</option>
                <option>Weights</option>
                <option>Cardio</option>
                <option>Consumable</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Quantity</label>
              <input
                required
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Last Service Date</label>
              <input
                type="date"
                value={form.lastServiceDate}
                onChange={(e) => setForm({ ...form, lastServiceDate: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Service Interval (Days)</label>
              <input
                type="number"
                value={form.serviceIntervalDays}
                onChange={(e) => setForm({ ...form, serviceIntervalDays: Number(e.target.value) })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Stock Item
          </button>
        </form>
      </Modal>
    </div>
  );
}