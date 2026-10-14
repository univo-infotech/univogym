import React, { useState, useEffect } from "react";
import { CreditCard, Dumbbell, Calendar, Flame, CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import { useAuth } from "../../contexts/AuthContext";
import { getMember, getMembers } from "../../firebase/members";
import { formatDate } from "../../utils/dateUtils";
import { hasPt, isNonPtTrainer, getDaysRemaining } from "../owner/members/memberUtils";

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { gymId, profileId, user } = useAuth();
  const GID = gymId || "univo_main";

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMember() {
      try {
        let m = null;
        const targetId = profileId || user?.uid;
        if (targetId) {
          try {
            m = await getMember(GID, targetId);
          } catch (e) {}
        }
        const saved = localStorage.getItem("univo_member_session");
        let savedObj = null;
        if (saved) {
          try {
            savedObj = JSON.parse(saved);
          } catch (e) {}
        }
        if (!m && savedObj?.id) {
          try {
            m = await getMember(GID, savedObj.id);
          } catch (e) {}
        }
        if (!m && savedObj) {
          m = savedObj;
        }
        if (m) {
          setMember(m);
          try {
            const currentSess = savedObj || {};
            localStorage.setItem("univo_member_session", JSON.stringify({ ...currentSess, ...m }));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Member load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMember();
  }, [gymId, profileId, user]);

  const athleteName = member?.name || member?.fullName || "Athlete";
  const rawCoachName = member?.personalTrainer || member?.trainerName || member?.trainer || "";
  const hasPtMember = hasPt(member) && !isNonPtTrainer(rawCoachName);
  const coachName = hasPtMember ? rawCoachName : "Floor Coach (Included)";
  const planName = member?.planName || member?.ptPlanName || "Gym Floor Membership";
  const ptPlanName = hasPtMember ? (member?.ptPlanName || "1-on-1 Personal Training") : null;
  const daysRemaining = getDaysRemaining(member?.expiryDate);

  return (
    <div className="space-y-6 pb-12">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
            Member Athlete Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-2">
            Welcome back, {athleteName}! 💪
          </h1>
          <p className="text-emerald-700 font-medium text-sm mt-1">
            UNIVO GYM MANAGEMENT • "Stronger Today, Healthier Tomorrow"
          </p>
        </div>
        <Link
          to={hasPtMember ? "/member/trainer" : "/member/plan"}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 shrink-0"
        >
          {hasPtMember ? (
            <>
              <Dumbbell className="w-4 h-4" /> View My Coach →
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" /> View My Membership →
            </>
          )}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Attendance Streak" 
          value={member?.attendanceStreak ? `${member.attendanceStreak} Days` : "Active"} 
          change="Regular Gym Access" 
          icon={<Flame className="w-5 h-5 text-amber-600" />} 
          color="orange" 
          onClick={() => navigate("/member/profile")}
        />
        <StatCard 
          title="Membership Status" 
          value={hasPtMember ? "PT + Gym Floor" : "General Floor Access"} 
          change="View Plan Details" 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} 
          color="green" 
          onClick={() => navigate("/member/plan")}
        />
        <StatCard 
          title="Plan Expiry" 
          value={daysRemaining !== null ? (daysRemaining > 0 ? `${daysRemaining} Days Left` : daysRemaining === 0 ? "Expires Today" : "Expired") : "Active"} 
          change={member?.expiryDate ? `Valid till ${formatDate(member.expiryDate)}` : "Active Subscription"} 
          icon={<Calendar className="w-5 h-5 text-teal-600" />} 
          color="teal" 
          onClick={() => navigate("/member/plan")}
        />
        <StatCard 
          title={hasPtMember ? "Assigned PT Coach" : "Gym Training"} 
          value={coachName} 
          change={hasPtMember ? "Chat & Workouts" : "Floor Assistance Included"} 
          icon={<Dumbbell className="w-5 h-5 text-blue-600" />} 
          color="blue" 
          onClick={() => navigate(hasPtMember ? "/member/trainer" : "/member/plan")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => navigate("/member/plan")}
          className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 cursor-pointer hover:border-emerald-300 transition group"
          title="Click to view full membership plan"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" /> Active Membership & Training
            </h3>
            <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition flex items-center gap-1">
              My Plan →
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-900">{planName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                ACTIVE
              </span>
            </div>
            {ptPlanName && (
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-semibold flex items-center justify-between">
                <span>Personal Training: {ptPlanName}</span>
                <span className="font-bold text-purple-700">Coach: {coachName}</span>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Valid until: {member?.expiryDate || member?.dueDate ? formatDate(member.expiryDate || member.dueDate) : "Active Subscription"}
            </p>
            <p className="text-xs text-slate-700 pt-2 border-t border-emerald-100">
              Preferred Workout Time: <b>{member?.slot || member?.preferredTime || "Morning (6:00 AM - 9:00 AM)"}</b>
            </p>
          </div>
        </div>

        {hasPtMember ? (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-teal-600" /> 1-on-1 Personal Coaching
              </h3>
              <Link to="/member/trainer" className="text-xs font-bold text-emerald-700 hover:underline">
                Open Chat →
              </Link>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                  {coachName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{coachName}</h4>
                  <p className="text-xs text-emerald-700 font-medium">Head Personal Coach</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Form check, daily attendance motivation and tailored meal plans.
              </p>
              <Link
                to="/member/trainer"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Message Coach & View Diet
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-teal-600" /> Gym Floor Training
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Included
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg">
                  🏋️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Floor Trainers On Duty</h4>
                  <p className="text-xs text-slate-500 font-medium">Machine guidance & workout support</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Floor trainers are available during your gym hours to assist you with equipment setups, spot heavy lifts, and safety form checks.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs text-slate-500">Want 1-on-1 Dedicated PT?</span>
                <Link
                  to="/member/plan"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  Inquire at Reception →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplement Store Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-emerald-100 text-xs font-bold uppercase tracking-wider">
            Gym Member Privilege
          </span>
          <h3 className="text-xl font-extrabold mt-2">Authentic Protein & Pre-Workouts at Reception</h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Avail exclusive discounts on 100% genuine whey proteins, creatine monohydrate & accessories directly verified by our gym trainers.
          </p>
        </div>
        <Link
          to="/member/store"
          className="px-6 py-3 rounded-2xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 transition shadow-md whitespace-nowrap"
        >
          Browse Gym Store & Rates →
        </Link>
      </div>
    </div>
  );
}