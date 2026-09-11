import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Dumbbell, Camera, CheckCircle2, User, Phone, Mail, Award, Briefcase, FileText, Upload, Image as ImageIcon } from "lucide-react";
import { addTrainer } from "../../firebase/trainers";
import toast from "react-hot-toast";

export default function TrainerSelfRegister() {
  const { gymId, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "", // Just for contact, not auth yet
    specialization: "",
    experience: "",
    certifications: "",
    bio: "",
    photoUrl: "",
    certUrl: "",
    portfolioUrl: "",
  });

  const handleFileUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result }));
      toast.success("File attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create trainer profile in Firestore.
      // We set hasLogin: false because the owner will create the ID/password later.
      await addTrainer(gymId || "univo_main", {
        ...form,
        hasLogin: false,
        membersCount: 0
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Profile Submitted!</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Your trainer profile has been sent to the gym owner. They will review it and provide you with your Login ID and Password shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">Trainer Registration</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create your professional trainer profile. You can update these details later once you receive your login credentials.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-emerald-600" /> Personal Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Full Name *</label>
                  <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition" placeholder="e.g. Coach Amit Kumar" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Phone Number *</label>
                  <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition" placeholder="9876543210" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Email Address (Optional)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition" placeholder="you@example.com" />
              </div>
            </div>

            {/* Professional Details */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Briefcase className="w-4 h-4 text-emerald-600" /> Professional Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Specialization</label>
                  <input type="text" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition" placeholder="e.g. Hypertrophy, CrossFit" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Years of Experience</label>
                  <input type="text" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition" placeholder="e.g. 5 Years" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-slate-400" /> Certifications
                </label>
                <input type="text" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition" placeholder="e.g. ACE Certified, ISSA, CPR" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Professional Bio
                </label>
                <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition resize-none" placeholder="Write a short description about yourself and your training style..."></textarea>
              </div>
            </div>


            {/* Uploads Section */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Upload className="w-4 h-4 text-emerald-600" /> Documents & Portfolio
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition text-center">
                  <Camera className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">{form.photoUrl ? "Profile Photo Added" : "Upload Profile Photo"}</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photoUrl')} className="hidden" />
                </label>
                
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition text-center">
                  <Award className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">{form.certUrl ? "Certificate Added" : "Upload Certificate"}</span>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'certUrl')} className="hidden" />
                </label>
                
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition text-center">
                  <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">{form.portfolioUrl ? "Before/After Added" : "Before/After Result"}</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'portfolioUrl')} className="hidden" />
                </label>
              </div>
            </div>
            <div className="pt-6">
              <button disabled={loading} type="submit" className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50">
                {loading ? "Submitting Profile..." : "Submit Trainer Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
