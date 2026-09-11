import React, { useState } from "react";
import { User, Phone, Mail, MapPin, Calendar, Heart, Shield, CheckCircle } from "lucide-react";
import Button from "../../components/ui/Button";
import toast from "react-hot-toast";

export default function MemberProfile() {
  const [profile, setProfile] = useState({
    name: "Ajay Prajapati",
    phone: "+91 9196302375",
    email: "ajay@univogym.com",
    gender: "Male",
    dob: "1998-08-15",
    address: "Bhopal, MP",
    emergencyContact: "+91 9876543210",
    fitnessGoal: "Muscle Hypertrophy & Fat Loss",
    planName: "3-Month Pro Transformation",
    expiryDate: "2026-12-10",
  });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Athlete profile updated successfully!");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Athlete Profile</h1>
        <p className="text-slate-500 text-xs mt-1">Manage your contact information, emergency numbers and health details</p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 text-slate-800">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-xl shadow-sm">
            AP
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{profile.name}</h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {profile.planName}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Phone</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Fitness Target</label>
            <input
              type="text"
              value={profile.fitnessGoal}
              onChange={(e) => setProfile({ ...profile, fitnessGoal: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}