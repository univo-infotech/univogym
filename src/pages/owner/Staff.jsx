import React, { useState, useEffect } from "react";
import { UserCheck, Plus, Phone, Mail, Calendar, DollarSign } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getStaff, addStaff } from "../../firebase/staff";

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", role: "Trainer", phone: "", email: "", salary: "", joinDate: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    async function load() {
      const data = await getStaff("univo_main");
      setStaffList(data || []);
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await addStaff("univo_main", formData);
    setModalOpen(false);
    const data = await getStaff("univo_main");
    setStaffList(data || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Staff Management</h2>
          <p className="text-slate-400 text-xs mt-1">Manage gym trainers, helpers, receptionists & salaries</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Add Staff Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {staffList.map((s) => (
          <div key={s.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 font-medium">{s.role}</span>
              <span className="text-xs font-semibold text-slate-300">₹{s.salary}/mo</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">{s.name}</h4>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {s.phone}</p>
              {s.email && <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</p>}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Member">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300">Full Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-300">Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white">
              <option>Personal Trainer</option>
              <option>General Trainer</option>
              <option>Receptionist</option>
              <option>Maintenance / Cleaner</option>
              <option>Manager</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300">Phone</label>
              <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Monthly Salary (₹)</label>
              <input required type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white" />
            </div>
          </div>
          <Button fullWidth type="submit">Save Staff Member</Button>
        </form>
      </Modal>
    </div>
  );
}
