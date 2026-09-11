import React, { useState, useEffect } from "react";
import { UserCheck, Plus, Phone, Mail, Calendar, DollarSign, Search } from "lucide-react";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { getStaff, addStaff } from "../../firebase/staff";

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    role: "Senior Trainer",
    phone: "",
    email: "",
    salary: "25000",
    joinDate: new Date().toISOString().split("T")[0],
  });

  const dummyStaff = [
    { id: "st1", name: "Coach Amit Kumar", role: "Head Trainer", phone: "+91 9876500111", email: "amit.gym@univogym.com", salary: "35000", joinDate: "2025-01-15" },
    { id: "st2", name: "Coach Sneha Rao", role: "Female Trainer & Yoga", phone: "+91 9811200222", email: "sneha.gym@univogym.com", salary: "30000", joinDate: "2025-03-01" },
    { id: "st3", name: "Coach Rohan Joshi", role: "Strength & Conditioning", phone: "+91 9988700333", email: "rohan.gym@univogym.com", salary: "28000", joinDate: "2025-06-10" },
    { id: "st4", name: "Kunal Sharma", role: "Reception & Operations", phone: "+91 9711000444", email: "kunal@univogym.com", salary: "18000", joinDate: "2025-08-01" },
  ];

  useEffect(() => {
    async function load() {
      try {
        const data = await getStaff("univo_main");
        setStaffList(data && data.length > 0 ? data : dummyStaff);
      } catch (err) {
        setStaffList(dummyStaff);
      }
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const newS = { ...formData, id: "st_" + Date.now() };
    try {
      await addStaff("univo_main", newS);
    } catch (e) {
      console.warn("Simulated staff add:", e);
    }
    setStaffList([newS, ...staffList]);
    setModalOpen(false);
    setFormData({ name: "", role: "Senior Trainer", phone: "", email: "", salary: "25000", joinDate: new Date().toISOString().split("T")[0] });
  };

  const totalSalary = staffList.reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0);

  const filtered = staffList.filter((s) => {
    return (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
           (s.role || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Coaches Management</h1>
          <p className="text-slate-500 text-xs mt-1">
            Trainers, receptionists, floor coaches & monthly payroll tracking
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
        >
          Add Staff Member
        </Button>
      </div>

      {/* Salary Overview Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Monthly Payroll Budget</p>
            <h3 className="text-2xl font-extrabold text-slate-900">₹{totalSalary.toLocaleString()} / mo</h3>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
          {staffList.length} Active Staff
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map((s) => (
          <div key={s.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 hover:border-emerald-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {s.role}
              </span>
              <span className="text-xs font-bold text-slate-700">₹{Number(s.salary).toLocaleString()}</span>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">{s.name}</h4>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {s.phone}
              </p>
              {s.email && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {s.email}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
              <span>Joined: {s.joinDate}</span>
              <span className="text-emerald-600 font-bold">Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="👤 Add Staff Member">
        <form onSubmit={handleAdd} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Full Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Coach Amit Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option>Head Trainer</option>
                <option>Senior Trainer</option>
                <option>Female Fitness Coach</option>
                <option>Reception & Operations</option>
                <option>Nutritionist</option>
                <option>Maintenance & Cleaning</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Monthly Salary (₹)</label>
              <input
                required
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
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
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Staff Member
          </button>
        </form>
      </Modal>
    </div>
  );
}