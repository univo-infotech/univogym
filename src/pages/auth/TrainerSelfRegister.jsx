import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Dumbbell,
  Camera,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Award,
  Briefcase,
  FileText,
  Upload,
  Image as ImageIcon,
  Plus,
  X
} from "lucide-react";
import { addTrainer } from "../../firebase/trainers";
import toast from "react-hot-toast";

export default function TrainerSelfRegister() {
  const { gymId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    experience: "",
    certifications: "",
    bio: "",
    photoUrl: "",
    certUrl: "",
    transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }],
  });

  const handleFileUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error("File is too large. Please select a file under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: reader.result }));
      toast.success("File attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleTransformationFile = (e, index, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error("Image is too large. Please select an image under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => {
        const updated = [...prev.transformations];
        updated[index] = { ...updated[index], [type]: reader.result };
        return { ...prev, transformations: updated };
      });
      toast.success(`${type === "beforeImg" ? "Before" : "After"} photo uploaded!`);
    };
    reader.readAsDataURL(file);
  };

  const handleTransformationDesc = (val, index) => {
    setForm((prev) => {
      const updated = [...prev.transformations];
      updated[index] = { ...updated[index], description: val };
      return { ...prev, transformations: updated };
    });
  };

  const addMoreTransformation = () => {
    setForm((prev) => ({
      ...prev,
      transformations: [
        ...prev.transformations,
        { id: Date.now(), beforeImg: "", afterImg: "", description: "" }
      ]
    }));
  };

  const removeTransformation = (index) => {
    if (form.transformations.length <= 1) {
      setForm((prev) => ({
        ...prev,
        transformations: [{ id: 1, beforeImg: "", afterImg: "", description: "" }]
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      transformations: prev.transformations.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addTrainer(gymId || "univo_main", {
        name: form.name,
        phone: form.phone,
        email: form.email,
        specialization: form.specialization,
        experience: form.experience,
        certifications: form.certifications,
        bio: form.bio,
        photoUrl: form.photoUrl || "",
        certUrl: form.certUrl || "",
        transformations: form.transformations.filter(t => t.beforeImg || t.afterImg || t.description),
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
            Your trainer profile has been submitted to the gym owner. They will review your details
            and send your Login ID & Password shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <label className="relative cursor-pointer group inline-block mb-3">
            <div className="w-24 h-24 rounded-full bg-white border-4 border-emerald-100 shadow-xl overflow-hidden flex items-center justify-center transition group-hover:shadow-2xl group-hover:border-emerald-200 mx-auto">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Trainer Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-emerald-600" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm group-hover:bg-emerald-600 transition group-hover:scale-105">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <input type="file" accept="image/jpeg, image/png" onChange={(e) => handleFileUpload(e, 'photoUrl')} className="hidden" />
          </label>
          <h2 className="text-3xl font-extrabold text-slate-900">Trainer Registration</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create your coach profile, credentials & transformation portfolio.
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
            <div className="space-y-4 pt-2">
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
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Professional Bio
                </label>
                <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition resize-none" placeholder="Write a short description about yourself and your training philosophy..."></textarea>
              </div>
            </div>

            {/* Certification Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-emerald-600" /> Certifications
              </h3>
              <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition group bg-white shadow-xs">
                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition">
                  {form.certUrl ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <Award className="w-6 h-6 text-slate-400 group-hover:text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">Upload Certificate (PDF, JPG, PNG)</p>
                  <p className="text-xs text-slate-500">Max size 800KB</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold group-hover:bg-emerald-600 group-hover:text-white transition">
                  {form.certUrl ? "Change File" : "Browse"}
                </div>
                <input type="file" accept="image/jpeg, image/png, application/pdf" onChange={(e) => handleFileUpload(e, 'certUrl')} className="hidden" />
              </label>
            </div>

            {/* Side-by-side Transformations Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600" /> Client Transformations
                </h3>
                <button
                  type="button"
                  onClick={addMoreTransformation}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add More Result
                </button>
              </div>

              <div className="space-y-4">
                {form.transformations.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl relative space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700">
                        Transformation #{idx + 1}
                      </span>
                      {form.transformations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTransformation(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Before Box */}
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-emerald-400 transition text-center bg-white min-h-[110px]">
                        {item.beforeImg ? (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden">
                            <img src={item.beforeImg} alt="Before" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Before
                            </span>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-[11px] font-bold text-slate-700">Before Photo</span>
                            <span className="text-[9px] text-slate-400">Click to upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg, image/png"
                          onChange={(e) => handleTransformationFile(e, idx, "beforeImg")}
                          className="hidden"
                        />
                      </label>

                      {/* After Box */}
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-emerald-400 transition text-center bg-white min-h-[110px]">
                        {item.afterImg ? (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden">
                            <img src={item.afterImg} alt="After" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              After
                            </span>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-emerald-500 mb-1" />
                            <span className="text-[11px] font-bold text-slate-700">After Photo</span>
                            <span className="text-[9px] text-slate-400">Click to upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg, image/png"
                          onChange={(e) => handleTransformationFile(e, idx, "afterImg")}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => handleTransformationDesc(e.target.value, idx)}
                        placeholder="e.g. 16 Weeks Transformation - 12kg fat loss"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                disabled={loading}
                type="submit"
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
              >
                {loading ? "Submitting Profile..." : "Submit Trainer Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
