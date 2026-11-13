import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  Shield,
  CheckCircle,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Dumbbell,
  CreditCard,
  Flame,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { getMember, updateMember, saveMemberLocalOverride } from "../../firebase/members";
import { getDisplayMemberId } from "../../utils/idGenerator";
import { formatDate } from "../../utils/dateUtils";

export default function MemberProfile() {
  const { gymId, profileId, user } = useAuth();
  const [member, setMember] = useState(null);
  const [memberId, setMemberId] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "Male",
    dob: "",
    address: "",
    emergencyContact: "",
    fitnessGoal: "Weight Loss & Muscle Building",
    targetWeight: "",
    weight: "",
    height: "",
    bmi: "",
    bmiCategory: "Normal",
  });

  // Password update
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const GID = gymId || "univo_main";
      let m = null;
      if (profileId) {
        try {
          m = await getMember(GID, profileId);
        } catch (e) {}
      }
      if (!m) {
        const saved = localStorage.getItem("univo_member_session");
        if (saved) {
          try {
            m = JSON.parse(saved);
          } catch (e) {}
        }
      }
      if (m) {
        setMember(m);
        setMemberId(m.id || profileId || "");
        setProfile({
          name: m.fullName || m.name || "Athlete",
          phone: m.phone || "",
          email: m.email || m.loginEmail || "",
          gender: m.gender || "Male",
          dob: m.dob || m.dateOfBirth || "",
          address: m.address || "",
          emergencyContact: m.emergencyContact || m.altPhone || "",
          fitnessGoal: m.fitnessGoal || m.goal || "Weight Loss & Muscle Building",
          targetWeight: m.targetWeight || "",
          weight: m.weight || "",
          height: m.height || "",
          bmi: m.bmi || "",
          bmiCategory: m.bmiCategory || "Normal",
        });
      }
    }
    loadProfile();
  }, [gymId, profileId, user]);

  const displayMemberId = getDisplayMemberId(member);

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayMemberId);
    setCopiedId(true);
    toast.success("Member ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (memberId) {
        const GID = gymId || "univo_main";
        saveMemberLocalOverride(memberId, profile);
        await updateMember(GID, memberId, profile);
      }
      const saved = localStorage.getItem("univo_member_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localStorage.setItem("univo_member_session", JSON.stringify({ ...parsed, ...profile }));
        } catch (e) {}
      }
      toast.success("Profile details updated successfully!");
    } catch (err) {
      toast.success("Profile saved locally!");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      toast.error("Password cannot be empty");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const pass = newPassword.trim();
      const GID = gymId || "univo_main";
      saveMemberLocalOverride(memberId, { password: pass, loginPassword: pass });
      await updateMember(GID, memberId, { password: pass, loginPassword: pass });
      setMember(prev => ({ ...prev, password: pass, loginPassword: pass }));
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Login password updated successfully!");
    } catch (err) {
      console.error("Password update error:", err);
      toast.error("Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const initials = (profile.name || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 text-slate-800">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">My Athlete Profile & ID Pass</h1>
        <p className="text-slate-500 text-xs mt-1">
          Manage your personal details, physical fitness metrics and security credentials
        </p>
      </div>

      {/* Digital Member Identity Pass Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {member?.photoURL ? (
              <img
                src={member.photoURL}
                alt={profile.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-2xl shadow-sm">
                {initials}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                  OFFICIAL ATHLETE PASS
                </span>
                <span className="text-[10px] uppercase font-bold text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2 py-0.5 rounded">
                  {member?.status || "ACTIVE"}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{profile.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Unique Login ID:</span>
                <span className="font-mono font-black text-sm text-emerald-400 bg-slate-950/90 px-2 py-0.5 rounded border border-emerald-500/30">
                  {displayMemberId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-xs text-slate-400 hover:text-white transition p-1"
                  title="Copy Member ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-300 space-y-1">
            <div>
              Plan: <strong className="text-white">{member?.planName || "Gym Plan"}</strong>
            </div>
            <div>
              Validity: <strong className="text-white">{member?.expiryDate ? formatDate(member.expiryDate) : "Active"}</strong>
            </div>
            <div>
              Workout Shift: <strong className="text-emerald-400">{member?.slot || member?.preferredTime || "Morning Shift"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Personal & Physical Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Form */}
          <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-emerald-600" /> Personal & Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Registered Phone (Gym Linked)</label>
                <input
                  type="text"
                  disabled
                  value={profile.phone}
                  className="w-full mt-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 font-mono cursor-not-allowed"
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
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Emergency Contact</label>
                <input
                  type="text"
                  value={profile.emergencyContact}
                  onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                  placeholder="Relative / Friend Phone"
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Residential Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="City, Area, Flat number"
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving Changes..." : "Save Contact Details"}
              </button>
            </div>
          </form>

          {/* Physical Goals & Fitness Metrics Form */}
          <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Heart className="w-5 h-5 text-rose-500" /> Physical Assessment & Targets
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Recorded Weight</label>
                <input
                  type="text"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                  placeholder="e.g. 68 kg"
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Height</label>
                <input
                  type="text"
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                  placeholder="e.g. 5 ft 8 in"
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Target Goal Weight</label>
                <input
                  type="text"
                  value={profile.targetWeight}
                  onChange={(e) => setProfile({ ...profile, targetWeight: e.target.value })}
                  placeholder="e.g. 62 kg"
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Primary Fitness Goal</label>
              <input
                type="text"
                value={profile.fitnessGoal}
                onChange={(e) => setProfile({ ...profile, fitnessGoal: e.target.value })}
                placeholder="e.g. Weight Loss & Muscle Tone"
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Updating..." : "Update Fitness Targets"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (1 Col): Security, Portal Credentials & Change Password */}
        <div className="space-y-6">
          {/* Security & Password Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-indigo-600" /> Portal Login Security
            </h3>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Universal Login ID:</span>
                <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {displayMemberId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                🔒 Login is strictly via this Unique Member ID & Password (Phone/Email disabled for cross-gym isolation).
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700">New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 pr-10 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingPassword ? "Updating Password..." : "Update Portal Password"}
              </button>
            </form>
          </div>

          {/* Gym Waiver Status */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" /> Liability Waiver & Agreement
            </h3>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Digitally Signed & Accepted
              </div>
              <p className="text-[11px] text-emerald-700 pt-0.5">
                Gym rules, health safety declarations & facility waiver verified on admission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
