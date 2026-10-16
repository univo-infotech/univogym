import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard, Check, Calendar, ShieldCheck, Sparkles,
  Apple, Dumbbell, Flame, Target, Droplets, Clock,
  Activity, Scale, User, Zap, ChevronRight, Award, Utensils,
  BookOpen, ArrowRight, MessageCircle, HelpCircle, Info, QrCode
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getMember } from "../../firebase/members";
import { getRenewalRequests } from "../../firebase/renewalRequests";
import OnlineRenewalModal from "../../components/member/OnlineRenewalModal";
import { formatDate } from "../../utils/dateUtils";
import { hasPt, isNonPtTrainer } from "../owner/members/memberUtils";

// --- Gym Standard Workout Splits (for General Floor Members & Self-Training) ---
const STANDARD_WORKOUT_SPLITS = [
  {
    id: "3day_fullbody",
    name: "3-Day Full Body Compound",
    badge: "Beginner Friendly",
    daysPerWeek: "3 Days / Week",
    description: "Compound multi-joint movements for maximum muscle activation, calorie burn, and steady strength building.",
    days: [
      {
        name: "Day 1: Chest, Back & Core",
        color: "bg-blue-50 text-blue-800 border-blue-200",
        exercises: [
          { name: "Barbell / Dumbbell Flat Bench Press", sets: "3 sets x 10-12 reps", rest: "60-90s", tip: "Keep shoulder blades retracted and feet planted flat." },
          { name: "Lat Pulldown (Wide Grip)", sets: "3 sets x 10-12 reps", rest: "60s", tip: "Pull down to upper chest, squeeze lats at the bottom." },
          { name: "Seated Cable Row / Dumbbell Row", sets: "3 sets x 12 reps", rest: "60s", tip: "Do not swing your lower back; squeeze mid-back." },
          { name: "Incline Push-ups or Dumbbell Press", sets: "3 sets x 12 reps", rest: "60s", tip: "Focus on upper chest contraction." },
          { name: "Plank Hold", sets: "3 sets x 45-60 sec", rest: "45s", tip: "Engage glutes and core throughout the hold." }
        ]
      },
      {
        name: "Day 2: Shoulders, Arms & Abs",
        color: "bg-emerald-50 text-emerald-800 border-emerald-200",
        exercises: [
          { name: "Dumbbell Overhead Shoulder Press", sets: "3 sets x 10-12 reps", rest: "60-90s", tip: "Press straight overhead without hyperextending back." },
          { name: "Dumbbell Lateral Raises (Side Delts)", sets: "4 sets x 12-15 reps", rest: "45s", tip: "Lead with elbows for wide rounded shoulders." },
          { name: "Barbell / Dumbbell Bicep Curls", sets: "3 sets x 12 reps", rest: "60s", tip: "Strict form, avoid using momentum." },
          { name: "Tricep Rope Pushdowns", sets: "3 sets x 12-15 reps", rest: "60s", tip: "Flare rope at the bottom for full tricep peak." },
          { name: "Hanging Knee Raises / Floor Crunches", sets: "3 sets x 15 reps", rest: "45s", tip: "Slow controlled tempo on every crunch." }
        ]
      },
      {
        name: "Day 3: Legs & Lower Back",
        color: "bg-purple-50 text-purple-800 border-purple-200",
        exercises: [
          { name: "Leg Press Machine / Goblet Squats", sets: "4 sets x 10-12 reps", rest: "90s", tip: "Drive through heels, keep knees aligned with toes." },
          { name: "Leg Extension (Quads)", sets: "3 sets x 12-15 reps", rest: "60s", tip: "Pause 1 second at full extension." },
          { name: "Lying or Seated Hamstring Curls", sets: "3 sets x 12 reps", rest: "60s", tip: "Control the eccentric lowering phase." },
          { name: "Dumbbell Romanian Deadlifts", sets: "3 sets x 10 reps", rest: "90s", tip: "Hinge at hips, keep spine neutral to feel hamstrings." },
          { name: "Standing Calf Raises", sets: "4 sets x 15-20 reps", rest: "45s", tip: "Full stretch at bottom, strong squeeze at top." }
        ]
      },
      {
        name: "Rest & Active Recovery Days",
        color: "bg-slate-50 text-slate-700 border-slate-200",
        exercises: [
          { name: "Cardio (Treadmill Incline Walk / Cycling)", sets: "20-25 mins", rest: "Steady Pace", tip: "Keep heart rate in fat-burn zone." },
          { name: "Full Body Dynamic Stretching & Foam Rolling", sets: "10-15 mins", rest: "Continuous", tip: "Relieves muscle tightness and soreness." }
        ]
      }
    ]
  },
  {
    id: "4day_ppl",
    name: "4-Day Push - Pull - Legs (PPL)",
    badge: "Most Popular",
    daysPerWeek: "4 Days / Week",
    description: "Optimal balance of training frequency, muscle overload, and recovery across major movement patterns.",
    days: [
      {
        name: "Day 1: Push (Chest, Front Delts & Triceps)",
        color: "bg-rose-50 text-rose-800 border-rose-200",
        exercises: [
          { name: "Flat Barbell / Dumbbell Bench Press", sets: "4 sets x 8-10 reps", rest: "90s", tip: "Touch chest gently, press with power." },
          { name: "Incline Dumbbell Press", sets: "3 sets x 10-12 reps", rest: "60s", tip: "Target upper clavicular head." },
          { name: "Seated Dumbbell Shoulder Press", sets: "3 sets x 10 reps", rest: "60s", tip: "Lower weights to ear level before pressing up." },
          { name: "Cable Chest Flyes", sets: "3 sets x 12-15 reps", rest: "45s", tip: "Maintain a slight bend in elbows, hug the tree." },
          { name: "Overhead Tricep Extension / Rope Pushdown", sets: "3 sets x 12 reps", rest: "60s", tip: "Keep elbows fixed next to ears/ribs." }
        ]
      },
      {
        name: "Day 2: Pull (Back, Rear Delts & Biceps)",
        color: "bg-blue-50 text-blue-800 border-blue-200",
        exercises: [
          { name: "Lat Pulldown or Assisted Pull-ups", sets: "4 sets x 8-10 reps", rest: "90s", tip: "Drive elbows down towards hips." },
          { name: "Seated Cable Row / T-Bar Row", sets: "3 sets x 10-12 reps", rest: "60s", tip: "Maintain upright chest, pull into naval." },
          { name: "One-Arm Dumbbell Row", sets: "3 sets x 10 reps/side", rest: "60s", tip: "Full stretch forward, pull elbow back high." },
          { name: "Face Pulls (Posture & Rear Delts)", sets: "4 sets x 15 reps", rest: "45s", tip: "Pull towards forehead and rotate hands out." },
          { name: "Incline Dumbbell Curls & Hammer Curls", sets: "3 sets x 12 reps", rest: "60s", tip: "Hammer grip targets brachialis & forearm." }
        ]
      },
      {
        name: "Day 3: Legs & Core Power",
        color: "bg-amber-50 text-amber-800 border-amber-200",
        exercises: [
          { name: "Barbell Back Squats or Hack Squats", sets: "4 sets x 8-10 reps", rest: "90-120s", tip: "Break at hips first, keep chest tall." },
          { name: "Leg Press (Feet Shoulder Width)", sets: "3 sets x 12 reps", rest: "75s", tip: "Do not lock out knees at top." },
          { name: "Romanian Deadlift (Hamstrings & Glutes)", sets: "3 sets x 10 reps", rest: "90s", tip: "Push hips back until hamstrings stretch." },
          { name: "Leg Curls & Leg Extensions Superset", sets: "3 sets x 12 reps each", rest: "60s", tip: "Great pump to finish quads and hams." },
          { name: "Standing Calf Raises & Hanging Leg Raises", sets: "3 sets x 15 reps", rest: "45s", tip: "Full range of motion." }
        ]
      },
      {
        name: "Day 4: Upper Body Conditioning & Arms",
        color: "bg-teal-50 text-teal-800 border-teal-200",
        exercises: [
          { name: "Dumbbell Incline Bench Press", sets: "3 sets x 10-12 reps", rest: "60s", tip: "30-degree incline bench." },
          { name: "Close Grip Lat Pulldown", sets: "3 sets x 10-12 reps", rest: "60s", tip: "Target lower lat insertion." },
          { name: "Dumbbell Lateral Raises (Drop Set on last)", sets: "4 sets x 15 reps", rest: "45s", tip: "Pyramid down weight for intense burn." },
          { name: "EZ-Bar Preacher Curls", sets: "3 sets x 12 reps", rest: "60s", tip: "Isolates the short head of the bicep." },
          { name: "Dips or Cable Tricep Pushdowns", sets: "3 sets x 12-15 reps", rest: "60s", tip: "Lock out triceps with control." }
        ]
      }
    ]
  },
  {
    id: "5day_hypertrophy",
    name: "5-Day Body-Part Split",
    badge: "Muscle Building",
    daysPerWeek: "5 Days / Week",
    description: "Classic bodybuilding isolation split targeting one major muscle group daily for maximum growth.",
    days: [
      { name: "Monday: Chest Focus", color: "bg-red-50 text-red-800 border-red-200", exercises: [{ name: "Flat Barbell Press", sets: "4 sets x 8-10 reps", rest: "90s", tip: "Heavy compound load." }, { name: "Incline DB Press", sets: "3 sets x 10 reps", rest: "60s", tip: "Upper shelf focus." }, { name: "Cable Crossover", sets: "3 sets x 15 reps", rest: "45s", tip: "Peak contraction squeeze." }, { name: "Parallel Dips", sets: "3 sets to failure", rest: "60s", tip: "Lean forward to hit chest." }] },
      { name: "Tuesday: Back & Lats", color: "bg-blue-50 text-blue-800 border-blue-200", exercises: [{ name: "Deadlifts or Rack Pulls", sets: "4 sets x 6-8 reps", rest: "120s", tip: "Full body posterior chain strength." }, { name: "Wide Grip Lat Pulldown", sets: "3 sets x 10 reps", rest: "60s", tip: "V-taper width builder." }, { name: "Barbell Bent-Over Row", sets: "3 sets x 10 reps", rest: "75s", tip: "Thick back density." }, { name: "Straight Arm Pulldowns", sets: "3 sets x 12 reps", rest: "45s", tip: "Finisher burn." }] },
      { name: "Wednesday: Shoulders & Traps", color: "bg-orange-50 text-orange-800 border-orange-200", exercises: [{ name: "Overhead Military Press", sets: "4 sets x 8-10 reps", rest: "90s", tip: "Overhead pushing strength." }, { name: "Lateral Raises (DB)", sets: "4 sets x 15 reps", rest: "45s", tip: "Strict lateral motion." }, { name: "Rear Delt Reverse Flyes", sets: "4 sets x 15 reps", rest: "45s", tip: "Round shoulder 3D look." }, { name: "Dumbbell Shrugs", sets: "4 sets x 12 reps", rest: "45s", tip: "Hold 2 seconds at top." }] },
      { name: "Thursday: Legs & Calves", color: "bg-emerald-50 text-emerald-800 border-emerald-200", exercises: [{ name: "Barbell Squats", sets: "4 sets x 8-10 reps", rest: "120s", tip: "Go below parallel safely." }, { name: "Leg Press", sets: "3 sets x 12 reps", rest: "75s", tip: "Quad burn." }, { name: "Walking Dumbbell Lunges", sets: "3 sets x 12 steps/leg", rest: "60s", tip: "Glute and quad stabilizer." }, { name: "Hamstring Curls & Calf Raises", sets: "4 sets x 15 reps", rest: "45s", tip: "Complete leg developer." }] },
      { name: "Friday: Arms Blast (Biceps & Triceps)", color: "bg-purple-50 text-purple-800 border-purple-200", exercises: [{ name: "Barbell Bicep Curls", sets: "3 sets x 10 reps", rest: "60s", tip: "No swinging." }, { name: "Skull Crushers (Triceps)", sets: "3 sets x 10 reps", rest: "60s", tip: "Control the stretch." }, { name: "Incline DB Hammer Curls", sets: "3 sets x 12 reps", rest: "45s", tip: "Forearm & outer bicep." }, { name: "Cable Tricep Pushdown", sets: "3 sets x 15 reps", rest: "45s", tip: "Lock out elbows." }] }
    ]
  }
];

// --- Gym Standard Nutrition Guide (for General Floor Members) ---
const STANDARD_NUTRITION_GOALS = [
  {
    id: "fat_loss",
    label: "Fat Loss & Lean Muscle",
    badge: "Weight Loss",
    calories: "1,800 - 2,100 kcal",
    protein: "120 - 140g",
    water: "3.5 - 4.0 Litres",
    meals: [
      { name: "Breakfast (8:00 AM)", item: "Oats with skimmed milk or water + 4 egg whites (or 1 scoop whey / 100g low-fat paneer)", note: "Rich in complex carbs & lean protein" },
      { name: "Mid-Morning (11:00 AM)", item: "1 Apple or Orange + 10 soaked almonds + Green tea", note: "Antioxidants and steady energy without sugar spikes" },
      { name: "Lunch (1:30 PM)", item: "2 Multigrain rotis OR 1 bowl brown rice + 150g grilled chicken/soya/dal + Big bowl green cucumber & tomato salad", note: "Fibrous carbs & high satiety" },
      { name: "Pre-Workout (45m prior)", item: "1 medium banana + 1 cup black coffee (no sugar)", note: "Fast energy & caffeine kick for workout intensity" },
      { name: "Post-Workout (within 30m)", item: "1 scoop Whey Protein with cold water OR 4 egg whites + 1 glass coconut water", note: "Immediate muscle recovery & electrolytes" },
      { name: "Dinner (8:00 PM)", item: "Grilled chicken breast / roasted paneer / boiled chana salad with sauteed vegetables + light vegetable soup", note: "Low-carb dinner for overnight fat burn" },
      { name: "Bedtime (10:00 PM)", item: "Warm cup of cinnamon water or 150ml skimmed turmeric milk", note: "Promotes deep sleep & muscle repair" }
    ]
  },
  {
    id: "muscle_gain",
    label: "Muscle Building & Strength",
    badge: "Hypertrophy",
    calories: "2,500 - 2,800 kcal",
    protein: "140 - 170g",
    water: "4.0 Litres",
    meals: [
      { name: "Breakfast (8:00 AM)", item: "3 whole eggs + 2 brown bread slices with peanut butter + 1 glass banana oatmeal shake", note: "High calorie & anabolic fuel" },
      { name: "Mid-Morning (11:00 AM)", item: "Handful of roasted chana + mixed nuts (walnuts, almonds) + 1 seasonal fruit", note: "Clean micronutrients and healthy fats" },
      { name: "Lunch (1:30 PM)", item: "3 rotis + 1 bowl rice + 200g chicken curry / paneer bhurji / rajma + curd (dahi)", note: "Heavy energy & protein reload" },
      { name: "Pre-Workout (45m prior)", item: "2 boiled eggs or peanut butter toast + black coffee", note: "Sustained workout stamina and power output" },
      { name: "Post-Workout (within 30m)", item: "1 scoop Whey Protein + 1 banana or 2 dates", note: "Rapid glycogen & protein replenishment" },
      { name: "Dinner (8:30 PM)", item: "2-3 rotis + 150g grilled chicken / tofu / dal tadka + green vegetables", note: "Nighttime protein rebuilding" },
      { name: "Bedtime (10:30 PM)", item: "1 glass warm milk + 4-5 soaked almonds", note: "Slow digesting casein protein during sleep" }
    ]
  },
  {
    id: "maintenance",
    label: "General Fitness & Stamina",
    badge: "Balanced Health",
    calories: "2,000 - 2,300 kcal",
    protein: "90 - 110g",
    water: "3.0 - 3.5 Litres",
    meals: [
      { name: "Breakfast (8:00 AM)", item: "Poha / Upma / Idli / Oats with boiled eggs or sprouts chaat", note: "Balanced daily breakfast" },
      { name: "Mid-Morning (11:00 AM)", item: "Seasonal fruit bowl + Green tea", note: "Hydration & natural vitamins" },
      { name: "Lunch (1:30 PM)", item: "2 rotis + 1 small bowl rice + Dal / Fish / Paneer + Fresh cucumber & tomato salad", note: "Wholesome balanced diet" },
      { name: "Pre-Workout (45m prior)", item: "Handful of roasted nuts or 1 small fruit", note: "Light digestible energy" },
      { name: "Post-Workout (within 30m)", item: "Protein shake OR boiled sprouts with lemon + coconut water", note: "Hydration & recovery" },
      { name: "Dinner (8:00 PM)", item: "2 rotis + mixed vegetable sabzi + 1 bowl curd / grilled paneer", note: "Easily digestible light dinner" },
      { name: "Bedtime (10:00 PM)", item: "Herbal chamomile tea or warm water with lemon", note: "Digestion & restful sleep" }
    ]
  }
];

export default function MyPlan() {
  const { gymId, profileId, user } = useAuth();
  const [member, setMember] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [selectedSplitId, setSelectedSplitId] = useState("4day_ppl");
  const [selectedNutritionGoal, setSelectedNutritionGoal] = useState("fat_loss");
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [pendingRenewal, setPendingRenewal] = useState(null);

  const checkPendingRenewal = async (mId) => {
    if (!mId) return;
    try {
      const reqs = await getRenewalRequests(gymId || "univo_main", { memberId: mId });
      const pending = (reqs || []).find((r) => r.status === "pending");
      setPendingRenewal(pending || null);
    } catch (e) {
      console.warn("Could not check pending renewal:", e);
    }
  };

  useEffect(() => {
    async function loadPlan() {
      const GID = gymId || "univo_main";
      let m = null;
      const targetId = profileId || user?.uid;

      if (targetId) {
        try {
          m = await getMember(GID, targetId);
        } catch (e) {}
      }

      // If not found yet, check saved session for id or phone to fetch fresh from Firestore
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
        checkPendingRenewal(m.id);
        try {
          const currentSess = savedObj || {};
          localStorage.setItem("univo_member_session", JSON.stringify({ ...currentSess, ...m }));
        } catch (e) {}
      }
    }
    loadPlan();
  }, [gymId, profileId, user]);

  if (!member) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500 text-sm">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading plan details...
      </div>
    );
  }

  const rawCoach = member.personalTrainer || member.trainerName || member.trainer || "";
  const memberHasPt = hasPt(member) && !isNonPtTrainer(rawCoach);
  const planTitle = (memberHasPt && member.ptPlanName) ? member.ptPlanName : (member.planName || member.ptPlanName || "Gym Floor Membership");
  const coachLabel = memberHasPt ? `Coach ${rawCoach}` : "General Floor Training (Included)";
  const joinDate = formatDate(member.joinDate, "--");
  const expiryDate = formatDate(member.expiryDate, "--");
  
  const dietPlan = member.dietPlan;
  const workoutRoutine = member.workoutRoutine;

  const currentSplit = STANDARD_WORKOUT_SPLITS.find(s => s.id === selectedSplitId) || STANDARD_WORKOUT_SPLITS[1];
  const currentNutrition = STANDARD_NUTRITION_GOALS.find(g => g.id === selectedNutritionGoal) || STANDARD_NUTRITION_GOALS[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Header & Tabs */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-600" />
              My Fitness Journey
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {memberHasPt ? "1-on-1 PT Coaching • Custom Diet & Routine" : "Gym Floor Membership • Routines & Nutrition Guides"}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold border ${memberHasPt ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {memberHasPt ? "⭐ 1-on-1 PT Athlete" : "🏋️ Gym Floor Member"}
          </span>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-px">
          {[
            { id: 'plan', label: 'My Plan', icon: ShieldCheck },
            { id: 'workout', label: memberHasPt && workoutRoutine ? 'My Custom Routine' : 'Workout Splits', icon: Dumbbell },
            { id: 'diet', label: memberHasPt && dietPlan ? 'My Custom Diet' : 'Nutrition Guide', icon: Apple }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all flex items-center gap-2
                  ${activeTab === t.id 
                    ? 'bg-slate-900 text-emerald-400 shadow-sm' 
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent border-b-0'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: MY PLAN */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Pending Online Renewal Banner */}
          {pendingRenewal && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-400 text-amber-950 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-800">
                  <Clock className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                      Renewal Pending Owner Approval
                    </span>
                    <span className="text-xs text-amber-700">
                      Submitted: {formatDate(pendingRenewal.createdAt)}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 mt-1">
                    {pendingRenewal.planName} • ₹{pendingRenewal.amount}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    12-digit UTR: <span className="font-mono font-bold text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded">{pendingRenewal.utr}</span>. The gym owner is verifying this payment in their bank app.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-200/70 border border-amber-300 text-amber-900 text-xs font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                  Under Verification ⏳
                </span>
              </div>
            </div>
          )}

          {/* Premium Plan Card */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="w-32 h-32 text-emerald-500" />
            </div>
            
            <div className="p-8 relative z-10 text-white">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
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
                <User className="w-4 h-4" /> {coachLabel}
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
                  <p className="text-xs text-slate-400 font-medium mb-1">{memberHasPt ? "PT Sessions" : "Membership"}</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Zap className="w-4 h-4 text-emerald-400" /> {memberHasPt ? `${member.ptCompletedSessions || 0} Completed` : "Floor Access"}</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 font-medium mb-1">Status</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${member.status === 'inactive' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                    {member.status === 'inactive' ? 'Inactive' : 'Active'}
                  </p>
                </div>
              </div>

              {/* Instant Renewal / Upgrade Bar */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  <span className="text-white font-bold">Renew or Upgrade:</span> Scan gym QR code, enter UTR & submit directly.
                </div>
                <button
                  onClick={() => setRenewalModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <QrCode className="w-4 h-4" />
                  Renew / Upgrade via UPI QR →
                </button>
              </div>
            </div>
            
            <div className="bg-emerald-900/40 p-6 border-t border-emerald-900/50">
              <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Full Gym floor access (Cardio + Free weights)</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {memberHasPt ? "Dedicated 1-on-1 PT Coach guidance" : "General floor trainer safety guidance"}</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {memberHasPt ? "Live Chat & direct consultation" : "Locker room & hydration amenities"}</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {memberHasPt ? "Tailored diet & workout plan updates" : "Member athlete portal access"}</li>
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

          {/* PT Upgrade Prompt for Floor Members */}
          {!memberHasPt && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-200">Personal Coaching Add-on</span>
                </div>
                <h4 className="text-lg font-bold">Accelerate your transformation with 1-on-1 PT</h4>
                <p className="text-xs text-purple-200 max-w-xl">
                  Get a dedicated coach, tailored macro nutrition targets, daily form checks, and direct chat guidance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRenewalModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-md hover:from-amber-300 hover:to-amber-400 transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <QrCode className="w-4 h-4" />
                  Enroll in PT via QR →
                </button>
                <Link
                  to="/member/trainer"
                  className="px-4 py-2.5 rounded-2xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition whitespace-nowrap"
                >
                  Meet Coaches
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY DIET PLAN */}
      {activeTab === 'diet' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {dietPlan ? (
            <>
              {/* Coach Custom Diet */}
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <span className="text-xs font-bold text-purple-900">Custom Meal Plan Assigned by Coach {rawCoach}</span>
                </div>
                {member.dietPlanUpdatedAt && (
                  <span className="text-[11px] text-purple-700 font-medium">Updated: {formatDate(member.dietPlanUpdatedAt)}</span>
                )}
              </div>

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
            </>
          ) : (
            <>
              {/* Gym Nutrition & Meal Guide for Floor Members */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20">
                  Gym Nutrition Blueprint
                </span>
                <h3 className="text-xl font-extrabold">Healthy Eating & Macro Guide</h3>
                <p className="text-xs text-emerald-100 max-w-2xl">
                  Fuel your workouts with balanced whole foods. Select your target goal below to see sample daily meal timings and portion recommendations.
                </p>
              </div>

              {/* Goal Pills */}
              <div className="flex flex-wrap gap-2">
                {STANDARD_NUTRITION_GOALS.map(goal => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedNutritionGoal(goal.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                      selectedNutritionGoal === goal.id
                        ? "bg-slate-900 text-emerald-400 border-slate-900 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    {goal.label}
                  </button>
                ))}
              </div>

              {/* Target Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900 text-white p-4 rounded-2xl text-center">
                  <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <span className="text-base font-bold">{currentNutrition.calories}</span>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Estimated Daily Intake</span>
                </div>
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center">
                  <Target className="w-4 h-4 text-red-600 mx-auto mb-1" />
                  <span className="text-base font-bold text-red-950">{currentNutrition.protein}</span>
                  <span className="block text-[10px] text-red-600 font-bold uppercase">Target Protein</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center">
                  <Droplets className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <span className="text-base font-bold text-blue-950">{currentNutrition.water}</span>
                  <span className="block text-[10px] text-blue-600 font-bold uppercase">Daily Hydration Goal</span>
                </div>
              </div>

              {/* Meals List */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-teal-600" /> Daily Meal Schedule for {currentNutrition.label}
                </h4>

                {currentNutrition.meals.map((meal, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{meal.name}</h5>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">{meal.item}</p>
                    </div>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 shrink-0 self-start sm:self-auto">
                      {meal.note}
                    </span>
                  </div>
                ))}
              </div>

              {/* PT Nutrition Consultation Prompt */}
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-amber-900">
                    <b>Looking for tailored calorie counting?</b> Our certified personal trainers can calculate your exact BMR and prepare customized meal-by-meal gram targets.
                  </p>
                </div>
                <Link
                  to="/member/trainer"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl whitespace-nowrap shadow-sm transition"
                >
                  Consult a Coach →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: MY WORKOUT */}
      {activeTab === 'workout' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {workoutRoutine ? (
            <>
              {/* Custom Coach Routine */}
              <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                    <Activity className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Personal Coach Routine</span>
                    <h3 className="text-2xl font-extrabold mt-1">{workoutRoutine.splitName || "Custom Workout Plan"}</h3>
                  </div>
                </div>
                {member.workoutRoutineUpdatedAt && (
                  <span className="text-xs text-slate-400 font-medium">Updated: {formatDate(member.workoutRoutineUpdatedAt)}</span>
                )}
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
            </>
          ) : (
            <>
              {/* Gym Standard Workout Splits for Floor Members */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Gym Floor Training Splits
                </span>
                <h3 className="text-xl font-extrabold">Verified Workout Programs</h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Choose a workout routine split that fits your schedule. Floor trainers are available to help you with machine setups and proper form.
                </p>
              </div>

              {/* Split Picker Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STANDARD_WORKOUT_SPLITS.map(split => (
                  <button
                    key={split.id}
                    onClick={() => setSelectedSplitId(split.id)}
                    className={`p-4 rounded-2xl text-left border transition relative ${
                      selectedSplitId === split.id
                        ? "bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block ${
                      selectedSplitId === split.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {split.badge}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900">{split.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{split.daysPerWeek}</p>
                  </button>
                ))}
              </div>

              {/* Active Split Days */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-emerald-600" />
                    {currentSplit.name} Routine
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">{currentSplit.description}</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {currentSplit.days.map((d, dIdx) => (
                    <div key={dIdx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                      <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border inline-block ${d.color}`}>
                        {d.name}
                      </span>

                      <div className="space-y-2 pt-1">
                        {d.exercises.map((ex, exIdx) => (
                          <div key={exIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-slate-900">{ex.name}</span>
                              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap text-[11px]">
                                {ex.sets}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                              <span>Rest: {ex.rest}</span>
                              <span className="italic text-slate-400">{ex.tip}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PT Upgrade Prompt */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" /> Want a Custom Split for Your Body Type?
                  </h4>
                  <p className="text-xs text-purple-200 mt-1 max-w-xl">
                    Enroll in 1-on-1 Personal Training to get custom periodized splits, weekly progressive overload adjustments, and 1-on-1 technique spotting.
                  </p>
                </div>
                <Link
                  to="/member/trainer"
                  className="px-5 py-2.5 rounded-xl bg-white text-purple-900 font-extrabold text-xs hover:bg-purple-50 transition shadow whitespace-nowrap"
                >
                  Explore Personal Training →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Online UPI Renewal Modal */}
      <OnlineRenewalModal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        member={member}
        gymId={gymId || "univo_main"}
        onSuccess={() => {
          if (member?.id) {
            checkPendingRenewal(member.id);
          }
        }}
      />

    </div>
  );
}
