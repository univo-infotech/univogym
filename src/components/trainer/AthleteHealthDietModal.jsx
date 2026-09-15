import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Send,
  Plus,
  Trash2,
  Dumbbell,
  Flame,
  Apple,
  Activity,
  Calendar,
  Clock,
  Scale,
  User,
  Check,
  Sparkles,
  MessageCircle,
  AlertCircle,
  FileText,
  TrendingDown,
  TrendingUp,
  Heart,
  Droplets,
  Zap,
  Target
} from "lucide-react";
import Modal from "../ui/Modal";
import toast from "react-hot-toast";
import { 
  saveMemberDietPlan, 
  logMemberWeight, 
  recordTrainerSessionCompleted,
  saveMemberWorkoutRoutine
} from "../../firebase/trainers";

const DIET_PRESETS = [
  {
    name: "🍗 High Protein Muscle Gain (3000 kcal)",
    calories: 3000,
    protein: 185,
    carbs: 340,
    fats: 65,
    water: 4.0,
    meals: {
      breakfast: "4 Whole Eggs + 2 Egg Whites, 100g Rolled Oats with Milk, 1 Banana, 10 Almonds",
      midMorning: "1 Apple, 1 Scoop Whey Protein in Water, 1 Rice Cake with Peanut Butter",
      lunch: "200g Grilled Chicken Breast / Paneer, 1.5 Cup Brown Rice, 1 Bowl Mixed Green Salad, 1 Bowl Dal",
      preWorkout: "1 Cup Black Coffee + 2 Brown Bread Toasts with 1 tbsp Peanut Butter & 1 Banana",
      postWorkout: "1 Scoop Whey Isolate + 1 Boiled Sweet Potato (150g) + 5g Creatine",
      dinner: "180g Grilled Fish / Soya Chunks Bhurji, 2 Multigrain Rotis, Steamed Broccoli & Beans",
      bedtime: "1 Glass Warm Milk with Turmeric + 5 Soaked Walnuts",
      instructions: "Eat meals every 2.5 - 3 hours. Maintain 4 Liters water intake. Zero processed sugar."
    }
  },
  {
    name: "🥗 Calorie Deficit Fat Loss (1800 kcal)",
    calories: 1800,
    protein: 145,
    carbs: 160,
    fats: 45,
    water: 3.5,
    meals: {
      breakfast: "3 Boiled Egg Whites + 1 Whole Egg Omelette, 40g Oats with Water & Berries, Green Tea",
      midMorning: "1 Cucumber + 1 Citrus Fruit (Orange/Sweet Lime) + 10g Roasted Flax Seeds",
      lunch: "150g Roasted Chicken / Tofu, 1 Small Bowl Quinoa or 1 Roti, Large Cucumber & Tomato Salad",
      preWorkout: "Green Tea or Black Coffee + 1 Small Apple",
      postWorkout: "1 Scoop Whey Isolate in Cold Water (Immediate)",
      dinner: "1 Bowl Lentil / Chicken Soup, 150g Grilled Cottage Cheese or Fish, Stir-fried Vegetables",
      bedtime: "Chamomile Tea or Warm Water with Lemon",
      instructions: "Strict calorie deficit. No sugar or bakery items. Minimum 10,000 steps daily."
    }
  },
  {
    name: "🌱 Pure Veg Fitness Plan (2200 kcal)",
    calories: 2200,
    protein: 130,
    carbs: 260,
    fats: 55,
    water: 3.5,
    meals: {
      breakfast: "Besan Chilla with Paneer Filling (100g Low Fat Paneer), 1 Cup Curd, Handful of Sprouts",
      midMorning: "1 Glass Sattu Drink (30g Sattu with roasted jeera & lemon) or 1 Fresh Fruit",
      lunch: "150g Tofu / Paneer Curry (low oil), 2 Multigrain Rotis, 1 Bowl Yellow Dal, Beetroot Salad",
      preWorkout: "1 Banana + 10 Almonds + Black Coffee",
      postWorkout: "1 Scoop Plant/Whey Protein with Water + 100g Boiled Sweet Potato",
      dinner: "100g Soya Chunks Curry, 1 Bowl Steamed Brown Rice or 1 Roti, Stir-fried Vegetables",
      bedtime: "1 Cup Warm Low-fat Milk with a pinch of Cinnamon",
      instructions: "Focus on rich vegetarian protein (Paneer, Tofu, Soya, Sattu, Lentils & Curd)."
    }
  },
  {
    name: "💪 Lean Bulking Clean Diet (2600 kcal)",
    calories: 2600,
    protein: 165,
    carbs: 310,
    fats: 60,
    water: 4.0,
    meals: {
      breakfast: "3 Whole Eggs + 2 Whites, 2 Slices Whole Grain Bread with Avocado/Butter, 1 Glass Fresh Orange Juice",
      midMorning: "Fruit Salad (Banana, Papaya, Apple) with Chia Seeds + 1 Scoop Protein Shake",
      lunch: "180g Chicken Breast / Paneer Tikka, 1.5 Cup Steamed Rice, 1 Bowl Rajma or Chana, Green Salad",
      preWorkout: "100g Boiled Potato with Pinch of Rock Salt + Black Coffee",
      postWorkout: "1 Scoop Whey Protein + 1 Banana + 5g Glutamine",
      dinner: "150g Grilled Fish / Soya Chunks, 2 Whole Wheat Chapatis, Mixed Vegetable Stir Fry",
      bedtime: "100g Low-fat Greek Yogurt or Curd with Honey & Pumpkin Seeds",
      instructions: "Clean hyper-caloric food only. Heavy compound lifting paired with quality sleep."
    }
  }
];

export default function AthleteHealthDietModal({
  isOpen,
  onClose,
  member,
  gymId = "univo_main",
  onMemberUpdated
}) {
  if (!member) return null;

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'diet' | 'overview' | 'workout'
  const [saving, setSaving] = useState(false);

  // Weight Logging State
  const [weightInput, setWeightInput] = useState(member.weight || "");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split("T")[0]);
  const [weightNote, setWeightNote] = useState("");
  const [weightHistory, setWeightHistory] = useState(
    Array.isArray(member.weightHistory) ? member.weightHistory : []
  );

  // Sessions count
  const [sessionsCount, setSessionsCount] = useState(Number(member.ptCompletedSessions || 0));

  // Diet Plan State
  const existingDiet = member.dietPlan || {};
  const [dietPlan, setDietPlan] = useState({
    presetName: existingDiet.presetName || "Custom Coach Diet",
    calories: existingDiet.calories || 2400,
    protein: existingDiet.protein || 150,
    carbs: existingDiet.carbs || 250,
    fats: existingDiet.fats || 55,
    water: existingDiet.water || 3.5,
    breakfast: existingDiet.breakfast || "4 Egg Whites + 2 Whole Eggs, 80g Oats with Milk & Banana",
    midMorning: existingDiet.midMorning || "1 Apple + Handful of Soaked Almonds",
    lunch: existingDiet.lunch || "150g Grilled Chicken/Paneer, 1 Cup Brown Rice, Dal & Green Salad",
    preWorkout: existingDiet.preWorkout || "Black Coffee + 2 Dates or 1 Banana",
    postWorkout: existingDiet.postWorkout || "1 Scoop Whey Protein in Water + 1 Boiled Sweet Potato",
    dinner: existingDiet.dinner || "150g Fish / Soya Chunks, 2 Multigrain Rotis & Steamed Vegetables",
    bedtime: existingDiet.bedtime || "Warm Turmeric Milk with 5 Walnuts",
    instructions: existingDiet.instructions || "Drink 3.5+ liters water daily. Sleep minimum 7-8 hours for muscle recovery."
  });

  // Workout Split State
  const existingWorkout = member.workoutRoutine || {};
  const [workoutRoutine, setWorkoutRoutine] = useState({
    splitName: existingWorkout.splitName || "4-Day Hypertrophy Push-Pull-Legs",
    monday: existingWorkout.monday || "Push: Bench Press (4x10), Incline Dumbbell Press (3x12), Cable Flies (3x15), Overhead Triceps Extension (4x12)",
    tuesday: existingWorkout.tuesday || "Pull: Lat Pulldown (4x10), Barbell Rows (4x8), Face Pulls (3x15), Dumbbell Bicep Curls (4x12)",
    wednesday: existingWorkout.wednesday || "Active Rest / Mobility & 20 min Core Drills",
    thursday: existingWorkout.thursday || "Legs: Barbell Squats (4x10), Leg Press (4x12), Hamstring Curls (3x12), Standing Calf Raises (4x15)",
    friday: existingWorkout.friday || "Upper Body Pump & Deltoid Focus: Overhead Shoulder Press (4x10), Lateral Raises (4x15), Dips (3x12)",
    saturday: existingWorkout.saturday || "High-Intensity Cardio & Core: 20 min Treadmill Incline Walk + Plank & Hanging Leg Raises",
    sunday: existingWorkout.sunday || "Full Rest & Recovery"
  });

  useEffect(() => {
    if (member) {
      setWeightInput(member.weight || "");
      setWeightHistory(Array.isArray(member.weightHistory) ? member.weightHistory : []);
      setSessionsCount(Number(member.ptCompletedSessions || 0));
      if (member.dietPlan) {
        setDietPlan(member.dietPlan);
      }
      if (member.workoutRoutine) {
        setWorkoutRoutine(member.workoutRoutine);
      }
    }
  }, [member]);

  // Calculate BMI
  const heightM = member.height ? Number(member.height) / 100 : null;
  const currentWeightNum = Number(weightInput || member.weight || 0);
  const bmi = heightM && currentWeightNum > 0 ? (currentWeightNum / (heightM * heightM)).toFixed(1) : null;

  // Calculate PT Timeline ("Kab tak training deni hai")
  const startDate = member.ptStartDate || member.joinDate || "N/A";
  const endDate = member.ptEndDate || member.expiryDate || "N/A";
  let daysLeft = null;
  if (endDate && endDate !== "N/A") {
    const endMs = new Date(endDate).getTime();
    const nowMs = Date.now();
    daysLeft = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24));
  }

  // Handle Session Increment
  const handleAddSession = async () => {
    try {
      const newCount = await recordTrainerSessionCompleted(gymId, member.id);
      setSessionsCount(newCount);
      toast.success(`PT Session logged! (${newCount} completed) 🏋️‍♂️`);
      if (onMemberUpdated) onMemberUpdated({ ...member, ptCompletedSessions: newCount });
    } catch (e) {
      toast.error("Failed to log session");
    }
  };

  // Handle Weight Log
  const handleSaveWeight = async (e) => {
    e.preventDefault();
    if (!weightInput) {
      toast.error("Please enter a valid weight in kg");
      return;
    }
    setSaving(true);
    try {
      await logMemberWeight(gymId, member.id, {
        weight: weightInput,
        date: weightDate,
        note: weightNote
      });

      const newEntry = {
        id: Date.now().toString(),
        weight: Number(weightInput),
        date: weightDate,
        note: weightNote,
      };
      setWeightHistory([newEntry, ...weightHistory]);
      setWeightNote("");
      toast.success("Member weight logged successfully! ⚖️");
      if (onMemberUpdated) onMemberUpdated({ ...member, weight: Number(weightInput) });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save weight entry");
    } finally {
      setSaving(false);
    }
  };

  // Apply Preset Diet
  const handleApplyPreset = (preset) => {
    setDietPlan({
      presetName: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fats: preset.fats,
      water: preset.water,
      ...preset.meals
    });
    toast.success(`Loaded "${preset.name}" preset! 🥗`);
  };

  // Save Diet Plan to Firestore
  const handleSaveDiet = async () => {
    setSaving(true);
    try {
      await saveMemberDietPlan(gymId, member.id, dietPlan);
      toast.success("Custom Diet Plan saved for " + (member.name || "Athlete") + "! 🥗");
      if (onMemberUpdated) onMemberUpdated({ ...member, dietPlan });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save diet plan");
    } finally {
      setSaving(false);
    }
  };

  // Save Workout Routine to Firestore
  const handleSaveWorkout = async () => {
    setSaving(true);
    try {
      await saveMemberWorkoutRoutine(gymId, member.id, workoutRoutine);
      toast.success("Workout Routine saved for " + (member.name || "Athlete") + "! 🏋️");
      if (onMemberUpdated) onMemberUpdated({ ...member, workoutRoutine });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save workout routine");
    } finally {
      setSaving(false);
    }
  };

  // Send Diet Plan to Member via WhatsApp
  const handleSendDietOnWhatsApp = () => {
    const num = (member.phone || "").replace(/\D/g, "");
    if (!num) {
      toast.error("Member phone number is missing");
      return;
    }

    const msg = `🥗 *CUSTOM NUTRITION & DIET PLAN* 🥗
*Athlete:* ${member.name || "Athlete"}
*Coach:* ${member.trainerName || "Your Personal Coach"}
*Goal:* ${member.fitnessGoal || member.goal || "Peak Fitness & Strength"}

🎯 *Daily Macro Targets:*
🔥 *Calories:* ${dietPlan.calories} kcal
🍗 *Protein:* ${dietPlan.protein}g | 🍞 *Carbs:* ${dietPlan.carbs}g | 🥑 *Fats:* ${dietPlan.fats}g
💧 *Hydration:* Drink ${dietPlan.water} Liters water daily

━━━━━━━━━━━━━━━━━━━
🍽️ *MEAL-BY-MEAL SCHEDULE:*

🍳 *1. Breakfast:*
${dietPlan.breakfast}

🍎 *2. Mid-Morning Snack:*
${dietPlan.midMorning}

🍛 *3. Lunch:*
${dietPlan.lunch}

⚡ *4. Pre-Workout Meal:*
${dietPlan.preWorkout}

💪 *5. Post-Workout Recovery:*
${dietPlan.postWorkout}

🍲 *6. Dinner:*
${dietPlan.dinner}

🥛 *7. Bedtime:*
${dietPlan.bedtime}

━━━━━━━━━━━━━━━━━━━
📌 *Coach's Important Notes:*
${dietPlan.instructions}

_Stay disciplined and follow this routine consistently! Feel free to message me your meal pics daily._ 💪🏋️‍♂️`;

    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("Diet Chart sent to athlete on WhatsApp! 📲");
  };

  // Send Workout Split via WhatsApp
  const handleSendWorkoutOnWhatsApp = () => {
    const num = (member.phone || "").replace(/\D/g, "");
    if (!num) {
      toast.error("Member phone number is missing");
      return;
    }

    const msg = `🏋️ *CUSTOM WEEKLY WORKOUT ROUTINE* 🏋️
*Athlete:* ${member.name || "Athlete"}
*Coach:* ${member.trainerName || "Personal Coach"}
*Split:* ${workoutRoutine.splitName}

🗓️ *WEEKLY TRAINING SCHEDULE:*

👉 *Monday:* ${workoutRoutine.monday}
👉 *Tuesday:* ${workoutRoutine.tuesday}
👉 *Wednesday:* ${workoutRoutine.wednesday}
👉 *Thursday:* ${workoutRoutine.thursday}
👉 *Friday:* ${workoutRoutine.friday}
👉 *Saturday:* ${workoutRoutine.saturday}
👉 *Sunday:* ${workoutRoutine.sunday}

━━━━━━━━━━━━━━━━━━━
_Push hard in every set, focus on form and progressive overload! See you at the gym!_ 🔥💪`;

    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("Workout Routine sent on WhatsApp! 📲");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Athlete Performance, Diet & Health Hub"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* ATHLETE HEADER CARD */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-extrabold text-white text-lg shadow">
                  {(member.name || "A").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-white">{member.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {member.status || "Active Athlete"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                  Privacy: <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600 text-[10px]">PT Athlete</span> • PT Plan: <span className="text-emerald-400 font-bold">{member.ptPlanName || member.planName || "1-on-1 PT Coaching"}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Workout Time Slot: <strong className="text-teal-300">{member.preferredTime || member.slot || "Morning Slot (6-9 AM)"}</strong>
                </p>
              </div>
            </div>

            {/* Kab tak training deni hai Timeline Pill */}
            <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl flex flex-col sm:items-end justify-center shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" /> Training Timeline (कब तक ट्रेनिंग देनी है)
              </span>
              <p className="text-xs font-bold text-white mt-0.5">
                {startDate} <span className="text-slate-400">to</span> <span className="text-emerald-400">{endDate}</span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  daysLeft !== null && daysLeft <= 5
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}>
                  {daysLeft !== null ? (daysLeft > 0 ? `⏳ ${daysLeft} Days Left` : "⚠️ Plan Expired") : "Active PT"}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {sessionsCount} Sessions Done
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "profile"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-4 h-4" /> Member Profile
          </button>
          <button
            onClick={() => setActiveTab("diet")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "diet"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Apple className="w-4 h-4" /> Custom Diet Plan Builder
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "overview"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Scale className="w-4 h-4" /> Weight & Body Measurements
          </button>
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "workout"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Dumbbell className="w-4 h-4" /> Workout Routine & Split
          </button>
        </div>

        {/* TAB 0: MEMBER PROFILE (NEW) */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Personal Info Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-emerald-600" /> Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Full Name</span>
                    <strong className="text-slate-900">{member.name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Status</span>
                    <strong className="text-slate-900">{member.status || 'Active'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Email</span>
                    <strong className="text-slate-900">{member.email || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Join Date</span>
                    <strong className="text-slate-900">{member.joinDate || 'N/A'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 font-medium block">Preferred Time/Slot</span>
                    <strong className="text-slate-900">{member.preferredTime || member.slot || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Fitness Info Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Activity className="w-4 h-4 text-emerald-600" /> Fitness Information
                </h4>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div className="col-span-2">
                    <span className="text-slate-500 font-medium block">Fitness Goal</span>
                    <strong className="text-emerald-700">{member.fitnessGoal || member.goal || 'General Fitness'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Height</span>
                    <strong className="text-slate-900">{member.height ? `${member.height} cm` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Weight</span>
                    <strong className="text-slate-900">{currentWeightNum > 0 ? `${currentWeightNum} kg` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">BMI</span>
                    <strong className="text-slate-900">{bmi || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Target Weight</span>
                    <strong className="text-slate-900">{member.targetWeight ? `${member.targetWeight} kg` : 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Plan Info Card */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-sm space-y-3 col-span-1 md:col-span-2">
                <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2 border-b border-emerald-200/60 pb-2">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Plan & Training Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 text-xs">
                  <div>
                    <span className="text-emerald-700/80 font-medium block">PT Plan Name</span>
                    <strong className="text-emerald-950">{member.ptPlanName || member.planName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700/80 font-medium block">Plan Price</span>
                    <strong className="text-emerald-950">{member.ptPlanPrice || member.planAmount ? `₹${member.ptPlanPrice || member.planAmount}` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700/80 font-medium block">Training Timeline</span>
                    <strong className="text-emerald-950">{startDate} - {endDate}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700/80 font-medium block">Days Left</span>
                    <strong className={daysLeft !== null && daysLeft <= 5 ? "text-rose-600" : "text-emerald-950"}>
                      {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} Days` : "Expired") : "N/A"}
                    </strong>
                  </div>
                  <div className="col-span-2 md:col-span-4 mt-2">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
                      <div>
                        <span className="text-emerald-700/80 font-medium block text-[10px] uppercase tracking-wider">Sessions Completed</span>
                        <strong className="text-xl font-black text-emerald-950">{sessionsCount}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSession}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm"
                        title="Mark +1 PT Session Done"
                      >
                        <Plus className="w-4 h-4" /> Mark 1 Session Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CUSTOM DIET PLAN BUILDER */}
        {activeTab === "diet" && (
          <div className="space-y-5">
            {/* Quick Presets Bar */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Diet Presets (आसान डाइट टेम्प्लेट)
                </span>
                <span className="text-[10px] text-slate-500">Click to instantly populate meals</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {DIET_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/60 text-left transition shadow-xs group"
                  >
                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      🔥 {p.calories} kcal • 🍗 {p.protein}g Protein
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Macro Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200">
                <span className="text-[10px] font-bold text-orange-700 uppercase flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" /> Calories
                </span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    value={dietPlan.calories}
                    onChange={(e) => setDietPlan({ ...dietPlan, calories: Number(e.target.value) })}
                    className="w-16 bg-white border border-orange-300 rounded-lg text-center font-black text-sm text-orange-950 px-1 py-0.5 outline-none"
                  />
                  <span className="text-xs text-orange-600 font-bold">kcal</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase flex items-center justify-center gap-1">
                  <Target className="w-3 h-3" /> Protein
                </span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    value={dietPlan.protein}
                    onChange={(e) => setDietPlan({ ...dietPlan, protein: Number(e.target.value) })}
                    className="w-14 bg-white border border-rose-300 rounded-lg text-center font-black text-sm text-rose-950 px-1 py-0.5 outline-none"
                  />
                  <span className="text-xs text-rose-600 font-bold">g</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase">🍞 Carbs</span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    value={dietPlan.carbs}
                    onChange={(e) => setDietPlan({ ...dietPlan, carbs: Number(e.target.value) })}
                    className="w-14 bg-white border border-amber-300 rounded-lg text-center font-black text-sm text-amber-950 px-1 py-0.5 outline-none"
                  />
                  <span className="text-xs text-amber-600 font-bold">g</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-yellow-50/80 border border-yellow-200">
                <span className="text-[10px] font-bold text-yellow-700 uppercase">🥑 Healthy Fats</span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    value={dietPlan.fats}
                    onChange={(e) => setDietPlan({ ...dietPlan, fats: Number(e.target.value) })}
                    className="w-14 bg-white border border-yellow-300 rounded-lg text-center font-black text-sm text-yellow-950 px-1 py-0.5 outline-none"
                  />
                  <span className="text-xs text-yellow-600 font-bold">g</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase flex items-center justify-center gap-1">
                  <Droplets className="w-3 h-3" /> Water Intake
                </span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.5"
                    value={dietPlan.water}
                    onChange={(e) => setDietPlan({ ...dietPlan, water: Number(e.target.value) })}
                    className="w-14 bg-white border border-blue-300 rounded-lg text-center font-black text-sm text-blue-950 px-1 py-0.5 outline-none"
                  />
                  <span className="text-xs text-blue-600 font-bold">Liters</span>
                </div>
              </div>
            </div>

            {/* Meal-by-Meal Schedule Inputs */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Apple className="w-4 h-4 text-emerald-600" /> Daily Meal Schedule (दिनभर का डाइट चार्ट)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    🍳 Meal 1: Breakfast (नाश्ता)
                  </label>
                  <textarea
                    rows={2}
                    value={dietPlan.breakfast}
                    onChange={(e) => setDietPlan({ ...dietPlan, breakfast: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white resize-none"
                    placeholder="e.g. 4 Eggs + 100g Oats with milk + 1 Banana"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    🍏 Meal 2: Mid-Morning Snack
                  </label>
                  <textarea
                    rows={2}
                    value={dietPlan.midMorning}
                    onChange={(e) => setDietPlan({ ...dietPlan, midMorning: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white resize-none"
                    placeholder="e.g. 1 Apple + 10 Soaked Almonds + Green Tea"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    🍛 Meal 3: Lunch (दोपहर का खाना)
                  </label>
                  <textarea
                    rows={2}
                    value={dietPlan.lunch}
                    onChange={(e) => setDietPlan({ ...dietPlan, lunch: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white resize-none"
                    placeholder="e.g. 150g Chicken/Paneer, 1 Cup Rice, 1 Bowl Dal & Salad"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    ⚡ Meal 4: Pre-Workout Energy
                  </label>
                  <textarea
                    rows={2}
                    value={dietPlan.preWorkout}
                    onChange={(e) => setDietPlan({ ...dietPlan, preWorkout: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white resize-none"
                    placeholder="e.g. Black Coffee + 2 Brown Bread Toasts with Peanut Butter"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    💪 Meal 5: Post-Workout Recovery
                  </label>
                  <textarea
                    rows={2}
                    value={dietPlan.postWorkout}
                    onChange={(e) => setDietPlan({ ...dietPlan, postWorkout: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white resize-none"
                    placeholder="e.g. 1 Scoop Whey Isolate + 1 Boiled Sweet Potato"
                  />
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    🍲 Meal 6: Dinner (रात का खाना)
                  </label>
                  <textarea
                    rows={2}
                    value={dietPlan.dinner}
                    onChange={(e) => setDietPlan({ ...dietPlan, dinner: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white resize-none"
                    placeholder="e.g. 150g Fish / Soya Chunks + 2 Rotis + Stir Fried Veggies"
                  />
                </div>
              </div>

              {/* Bedtime & Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    🥛 Meal 7: Bedtime Drink / Snack
                  </label>
                  <input
                    type="text"
                    value={dietPlan.bedtime}
                    onChange={(e) => setDietPlan({ ...dietPlan, bedtime: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
                    placeholder="e.g. Warm Turmeric Milk + 5 Walnuts"
                  />
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    📌 Coach's Special Instructions
                  </label>
                  <input
                    type="text"
                    value={dietPlan.instructions}
                    onChange={(e) => setDietPlan({ ...dietPlan, instructions: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 focus:bg-white"
                    placeholder="e.g. Zero junk food. 8 hours sleep mandatory."
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions for Diet */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSendDietOnWhatsApp}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" /> Send Diet Chart on WhatsApp (व्हाट्सएप भेजें)
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDiet}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving Diet..." : "Save Diet Plan (डाइट सेव करें)"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: WEIGHT & BODY MEASUREMENTS TRACKER */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Current Weight</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{currentWeightNum || "N/A"} <span className="text-xs font-normal text-slate-500">kg</span></p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Target Goal Weight</span>
                <p className="text-xl font-black text-emerald-950 mt-0.5">{member.targetWeight || "70"} <span className="text-xs font-normal text-emerald-700">kg</span></p>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Height & BMI</span>
                <p className="text-xl font-black text-blue-950 mt-0.5">{bmi || "23.4"} <span className="text-xs font-normal text-blue-700">BMI</span></p>
              </div>
            </div>

            {/* Log New Weigh-in Form */}
            <form onSubmit={handleSaveWeight} className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Scale className="w-4 h-4 text-teal-600" /> Log New Weight Check-in (नया वजन दर्ज करें)
                </h4>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                  Weekly Tracking
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Weight (kg) *</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                    placeholder="e.g. 74.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Date of Weigh-in</label>
                  <input
                    type="date"
                    value={weightDate}
                    onChange={(e) => setWeightDate(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Coach Progress Note</label>
                  <input
                    type="text"
                    value={weightNote}
                    onChange={(e) => setWeightNote(e.target.value)}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-teal-500"
                    placeholder="e.g. Down 1.2kg, waist tighter"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Weight Log"}
                </button>
              </div>
            </form>

            {/* Weight History Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" /> Weigh-in History & Progress Trend
              </h4>

              {weightHistory.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-xs">
                  No previous weigh-in records logged yet. Log first check-in above!
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Weight (kg)</th>
                        <th className="p-3">Coach Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {weightHistory.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-semibold text-slate-800">{item.date}</td>
                          <td className="p-3 font-black text-emerald-700">{item.weight} kg</td>
                          <td className="p-3 text-slate-600">{item.note || "Check-in recorded"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WORKOUT SPLIT ROUTINE */}
        {activeTab === "workout" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-1">
              <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                Workout Routine Title
              </label>
              <input
                type="text"
                value={workoutRoutine.splitName}
                onChange={(e) => setWorkoutRoutine({ ...workoutRoutine, splitName: e.target.value })}
                className="w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2 text-xs font-bold text-indigo-950 outline-none focus:border-indigo-500"
                placeholder="e.g. 5-Day Push Pull Legs Hypertrophy Split"
              />
            </div>

            <div className="space-y-2.5">
              {[
                { day: "Monday", key: "monday" },
                { day: "Tuesday", key: "tuesday" },
                { day: "Wednesday", key: "wednesday" },
                { day: "Thursday", key: "thursday" },
                { day: "Friday", key: "friday" },
                { day: "Saturday", key: "saturday" },
                { day: "Sunday", key: "sunday" }
              ].map((d) => (
                <div key={d.key} className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="w-24 text-xs font-black text-slate-800 shrink-0">{d.day}:</span>
                  <input
                    type="text"
                    value={workoutRoutine[d.key]}
                    onChange={(e) => setWorkoutRoutine({ ...workoutRoutine, [d.key]: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder={`Exercises for ${d.day}`}
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200 mt-2 pt-4">
              <button
                type="button"
                onClick={handleSendWorkoutOnWhatsApp}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-indigo-600" /> Send Workout Routine on WhatsApp
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveWorkout}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving Workout..." : "Save Workout Routine"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
