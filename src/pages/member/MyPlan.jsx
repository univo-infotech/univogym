import React, { useState, useEffect } from "react";
import {
  CreditCard, Check, Calendar, ShieldCheck, Sparkles,
  Apple, Dumbbell, Flame, Target, Droplets, Clock,
  Activity, Scale, User, Zap
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getMember } from "../../firebase/members";

export default function MyPlan() {
  const { gymId, profileId, user } = useAuth();
  const [member, setMember] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");

  useEffect(() => {
    async function loadPlan() {
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
      if (m) setMember(m);
    }
    loadPlan();
  }, [gymId, profileId, user]);

  if (!member) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500 text-sm">
        Loading plan details...
      </div>
    );
  }

  const planTitle = member.ptPlanName || member.planName || "Personal Training Transformation";
  const coach = member.personalTrainer || member.trainerName || member.trainer || "Assigned Coach";
  const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "--";
  const expiryDate = member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "--";
  
  const dietPlan = member.dietPlan;
  const workoutRoutine = member.workoutRoutine;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Header & Tabs */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-600" />
          My Fitness Journey
        </h2>
        <p className="text-slate-500 text-sm mt-1">View your plan, diet, and workout details</p>
        
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-px">
          {['plan', 'diet', 'workout'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2
                ${activeTab === tab 
                  ? 'bg-slate-900 text-emerald-400' 
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent border-b-0'
                }`}
            >
              {tab === 'plan' && <ShieldCheck className="w-4 h-4" />}
              {tab === 'diet' && <Apple className="w-4 h-4" />}
              {tab === 'workout' && <Dumbbell className="w-4 h-4" />}
              {tab === 'plan' ? 'My Plan' : tab === 'diet' ? 'My Diet Plan' : 'My Workout'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MY PLAN */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Premium Plan Card */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="w-32 h-32 text-emerald-500" />
            </div>
            
            <div className="p-8 relative z-10 text-white">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider border border-emerald-500/30">
                  Active Package
                </span>
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 bg-slate-800/50 px-3 py-1 rounded-full">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> 
                  {joinDate} - {expiryDate}
                </span>
              </div>
              
              <h3 className="text-3xl font-extrabold text-white mb-2">{planTitle}</h3>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <User className="w-4 h-4" /> Coach {coach}
              </div>
              
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">Time Slot</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-400" /> {member.slot || member.preferredTime || "--"}</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">Fitness Goal</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Target className="w-4 h-4 text-emerald-400" /> {member.goal || member.fitnessGoal || "--"}</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">PT Sessions</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Zap className="w-4 h-4 text-emerald-400" /> {member.ptCompletedSessions || 0} Completed</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">Status</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${member.status === 'inactive' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                    {member.status === 'inactive' ? 'Inactive' : 'Active'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-900/40 p-6 border-t border-emerald-900/50">
              <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Full Gym floor access (Cardio + Free weights)</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Dedicated 1-on-1 PT Coach guidance</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Live Chat & direct consultation</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Body assessment & weekly tracking</li>
              </ul>
            </div>
          </div>
          
          {/* Member Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <Scale className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Weight</p>
              <p className="text-lg font-bold text-slate-900">{member.weight ? `${member.weight} kg` : '--'}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Height</p>
              <p className="text-lg font-bold text-slate-900">{member.height ? `${member.height} cm` : '--'}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">BMI</p>
              <p className="text-lg font-bold text-slate-900">{member.bmi || '--'}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY DIET PLAN */}
      {activeTab === 'diet' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!dietPlan ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Apple className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Diet Plan Assigned</h3>
              <p className="text-slate-500 text-sm">Your coach hasn't assigned a diet plan yet. Stay tuned! 🥗</p>
            </div>
          ) : (
            <>
              {/* Macros */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Flame className="w-5 h-5 text-orange-400 mb-2" />
                  <span className="text-lg font-bold">{dietPlan.calories || '-'}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Calories</span>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl flex flex-col items-center justify-center text-center border border-red-100">
                  <span className="text-lg font-bold text-red-950">{dietPlan.protein || '-'}</span>
                  <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Protein (g)</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl flex flex-col items-center justify-center text-center border border-amber-100">
                  <span className="text-lg font-bold text-amber-950">{dietPlan.carbs || '-'}</span>
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Carbs (g)</span>
                </div>
                <div className="bg-yellow-50 p-4 rounded-2xl flex flex-col items-center justify-center text-center border border-yellow-100">
                  <span className="text-lg font-bold text-yellow-950">{dietPlan.fats || '-'}</span>
                  <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Fats (g)</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl flex flex-col items-center justify-center text-center border border-blue-100 col-span-2 md:col-span-1">
                  <Droplets className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-lg font-bold text-blue-950">{dietPlan.water || '-'}</span>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Water (L)</span>
                </div>
              </div>

              {/* Meals */}
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{dietPlan.presetName || "Custom Diet Plan"}</h3>
                
                {[
                  { key: 'breakfast', label: 'Breakfast', emoji: '🍳' },
                  { key: 'midMorning', label: 'Mid-Morning', emoji: '🍎' },
                  { key: 'lunch', label: 'Lunch', emoji: '🍱' },
                  { key: 'preWorkout', label: 'Pre-Workout', emoji: '⚡' },
                  { key: 'postWorkout', label: 'Post-Workout', emoji: '🥤' },
                  { key: 'dinner', label: 'Dinner', emoji: '🥗' },
                  { key: 'bedtime', label: 'Bedtime', emoji: '🌙' },
                ].map(meal => dietPlan[meal.key] ? (
                  <div key={meal.key} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-2xl flex-shrink-0 pt-0.5">{meal.emoji}</div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{meal.label}</h4>
                      <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap">{dietPlan[meal.key]}</p>
                    </div>
                  </div>
                ) : null)}
              </div>

              {/* Instructions */}
              {dietPlan.instructions && (
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Coach's Instructions
                  </h4>
                  <p className="text-sm text-emerald-900 whitespace-pre-wrap">{dietPlan.instructions}</p>
                </div>
              )}

              {member.dietPlanUpdatedAt && (
                <p className="text-xs text-center text-slate-400">
                  Last updated: {new Date(member.dietPlanUpdatedAt).toLocaleDateString()}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: MY WORKOUT */}
      {activeTab === 'workout' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!workoutRoutine ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Workout Routine Assigned</h3>
              <p className="text-slate-500 text-sm">Your coach hasn't assigned a workout routine yet. Stay tuned! 🏋️</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                  <Activity className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Current Split</span>
                  <h3 className="text-2xl font-extrabold mt-1">{workoutRoutine.splitName || "Custom Workout Plan"}</h3>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'monday', label: 'Monday', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                  { key: 'tuesday', label: 'Tuesday', color: 'bg-purple-100 text-purple-800 border-purple-200' },
                  { key: 'wednesday', label: 'Wednesday', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                  { key: 'thursday', label: 'Thursday', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                  { key: 'friday', label: 'Friday', color: 'bg-rose-100 text-rose-800 border-rose-200' },
                  { key: 'saturday', label: 'Saturday', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
                  { key: 'sunday', label: 'Sunday', color: 'bg-slate-100 text-slate-800 border-slate-200' },
                ].map(day => workoutRoutine[day.key] ? (
                  <div key={day.key} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border w-fit mb-3 ${day.color}`}>
                      {day.label}
                    </span>
                    <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap flex-grow">{workoutRoutine[day.key]}</p>
                  </div>
                ) : null)}
              </div>
              
              {member.workoutRoutineUpdatedAt && (
                <p className="text-xs text-center text-slate-400">
                  Last updated: {new Date(member.workoutRoutineUpdatedAt).toLocaleDateString()}
                </p>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
