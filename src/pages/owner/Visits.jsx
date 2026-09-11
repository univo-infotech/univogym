import React, { useState, useEffect } from "react";
import { UserPlus, Plus, Phone, CheckCircle, Clock, MessageCircle, Search } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getVisits, addVisit, updateVisit } from "../../firebase/visits";
import { openWhatsApp } from "../../utils/whatsapp";

export default function Visits() {
  const [visits, setVisits] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    interestedIn: "Weight Loss & Transformation",
    demoDate: new Date().toISOString().split("T")[0],
    status: "new",
  });

  const dummyVisits = [
    { id: "v1", name: "Sunil Kapoor", phone: "+91 9711002233", interestedIn: "Weight Loss Trial", status: "demo_done", createdAt: "2026-09-11", demoDate: "2026-09-12" },
    { id: "v2", name: "Kavita Rao", phone: "+91 9822334455", interestedIn: "Personal Training", status: "new", createdAt: "2026-09-12", demoDate: "2026-09-13" },
    { id: "v3", name: "Deepak Choudhary", phone: "+91 9911882233", interestedIn: "Strength & Muscle Gain", status: "converted", createdAt: "2026-09-09", demoDate: "2026-09-10" },
    { id: "v4", name: "Ritu Verma", phone: "+91 9877001122", interestedIn: "Cardio & Yoga Classes", status: "demo_done", createdAt: "2026-09-10", demoDate: "2026-09-11" },
  ];

  useEffect(() => {
    async function load() {
      try {
        const v = await getVisits("univo_main");
        setVisits(v && v.length > 0 ? v : dummyVisits);
      } catch (err) {
        setVisits(dummyVisits);
      }
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const newVisit = {
      ...form,
      id: "v_" + Date.now(),
      createdAt: new Date().toISOString(),
    };
    try {
      await addVisit("univo_main", newVisit);
    } catch (e) {
      console.warn("Simulated visit add:", e);
    }
    setVisits([newVisit, ...visits]);
    setModalOpen(false);
    setForm({ name: "", phone: "", interestedIn: "Weight Loss & Transformation", demoDate: new Date().toISOString().split("T")[0], status: "new" });
  };

  const handleConvert = async (id) => {
    try {
      await updateVisit("univo_main", id, { status: "converted" });
    } catch (e) {
      console.warn("Simulated visit convert:", e);
    }
    setVisits(visits.map((v) => (v.id === id ? { ...v, status: "converted" } : v)));
  };

  const filtered = visits.filter((v) => {
    const matchSearch = (v.name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (v.phone || "").includes(search);
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visits & Walk-in Trials</h1>
          <p className="text-slate-500 text-xs mt-1">
            Track inquiries, demo sessions, follow-ups & conversion to full members
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          New Walk-in Enquiry
        </Button>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitor name or phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {["all", "new", "demo_done", "converted"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {st === "demo_done" ? "Demo Done" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.map((vis) => (
          <div key={vis.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 hover:border-emerald-300 transition">
            <div className="flex justify-between items-center">
              <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase ${
                vis.status === "converted"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : vis.status === "demo_done"
                  ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {vis.status === "converted" ? "CONVERTED" : vis.status === "demo_done" ? "TRIAL COMPLETED" : "NEW INQUIRY"}
              </span>
              <span className="text-xs text-slate-400">{vis.createdAt?.split("T")[0] || "Today"}</span>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">{vis.name}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{vis.phone}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Goal: {vis.interestedIn}</p>
              <p className="text-xs text-slate-400">Trial Date: {vis.demoDate || "Not set"}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const waPhone = (vis.phone || "").replace(/\D/g, "");
                  window.open(`https://wa.me/${waPhone}?text=Hi%20${vis.name},%20Thank%20you%20for%20visiting%20UNIVO%20GYM!`, "_blank");
                }}
                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
              </button>
              {vis.status !== "converted" && (
                <button
                  onClick={() => handleConvert(vis.id)}
                  className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
                >
                  Mark Converted
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="🚶 New Walk-in / Trial Enquiry">
        <form onSubmit={handleAdd} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Visitor Full Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Sunil Kapoor"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Phone Number *</label>
            <input
              required
              type="text"
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Interested Program</label>
              <input
                type="text"
                value={form.interestedIn}
                onChange={(e) => setForm({ ...form, interestedIn: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Trial / Demo Date</label>
              <input
                type="date"
                value={form.demoDate}
                onChange={(e) => setForm({ ...form, demoDate: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Walk-in Lead
          </button>
        </form>
      </Modal>
    </div>
  );
}