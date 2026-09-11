import React, { useState, useEffect } from "react";
import { UserPlus, Plus, Phone, CheckCircle, Clock } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getVisits, addVisit, updateVisit } from "../../firebase/visits";
import { openWhatsApp } from "../../utils/whatsapp";

export default function Visits() {
  const [visits, setVisits] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", interestedIn: "Weight Loss / General", demoDate: "", status: "new"
  });

  useEffect(() => {
    async function load() {
      const v = await getVisits("univo_main");
      setVisits(v || []);
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await addVisit("univo_main", form);
    setModalOpen(false);
    const v = await getVisits("univo_main");
    setVisits(v || []);
  };

  const handleConvert = async (id) => {
    await updateVisit("univo_main", id, { status: "converted" });
    const v = await getVisits("univo_main");
    setVisits(v || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Visits & Demo Enquiries</h2>
          <p className="text-slate-400 text-xs mt-1">Track walk-ins, free workout trials and convert to members</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          New Walk-in Enquiry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visits.map((vis) => (
          <div key={vis.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                vis.status === "converted" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
              }`}>
                {vis.status === "converted" ? "CONVERTED" : "TRIAL / DEMO"}
              </span>
              <span className="text-xs text-slate-400">{vis.createdAt?.split("T")[0] || "Today"}</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white">{vis.name}</h4>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {vis.phone}</p>
              <p className="text-xs text-slate-400 mt-0.5">Interested in: {vis.interestedIn}</p>
              {vis.demoDate && <p className="text-xs text-teal-400 mt-0.5">Demo Trial on: {vis.demoDate}</p>}
            </div>
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <Button size="xs" variant="whatsapp" fullWidth onClick={() => openWhatsApp(vis.phone, `Hi ${vis.name}, thank you for visiting UNIVO GYM MANAGEMENT! Let us know when you'd like to book your free demo session 💪`)}>
                WhatsApp
              </Button>
              {vis.status !== "converted" && (
                <Button size="xs" variant="outline" onClick={() => handleConvert(vis.id)}>
                  Convert
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Walk-in / Demo Enquiry">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300">Visitor Name</label>
            <input required type="text" placeholder="Aman Verma" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-300">WhatsApp Phone</label>
            <input required type="text" placeholder="9876543210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Goal / Interest</label>
              <input type="text" placeholder="Muscle building / Weight loss" value={form.interestedIn} onChange={e => setForm({...form, interestedIn: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Trial / Demo Date</label>
              <input type="date" value={form.demoDate} onChange={e => setForm({...form, demoDate: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
          </div>
          <Button fullWidth type="submit">Save Walk-in Visit</Button>
        </form>
      </Modal>
    </div>
  );
}
