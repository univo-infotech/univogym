import React from "react";
import { Dumbbell, Phone, MessageCircle, Star, Award } from "lucide-react";

export default function MyTrainer() {
  const trainer = {
    name: "Coach Amit Kumar",
    specialization: "Hypertrophy & Functional Strength",
    phone: "+91 9876500111",
    experience: "7 Years Experience",
    bio: "Head Fitness Coach at Univo Gym. Trained over 450+ athletes to reach peak physical conditioning.",
    schedule: "06:00 AM - 11:00 AM & 05:00 PM - 09:30 PM",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Dedicated Personal Coach</h1>
        <p className="text-slate-500 text-xs mt-1">Your 1-on-1 coach for form guidance, diet plan & motivation</p>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-xl shadow-sm">
            AK
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{trainer.name}</h3>
            <p className="text-xs font-semibold text-emerald-700">{trainer.specialization}</p>
            <p className="text-xs text-slate-400 mt-0.5">{trainer.experience}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          {trainer.bio}
        </p>

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs">
          <span className="font-bold text-emerald-800">Available Slot: </span>
          <span className="text-emerald-700">{trainer.schedule}</span>
        </div>

        <button
          onClick={() => {
            const num = trainer.phone.replace(/\D/g, "");
            window.open(`https://wa.me/${num}?text=Hi%20Coach%20Amit,%20I%20have%20a%20question%20regarding%20my%20workout!`, "_blank");
          }}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" /> Message Coach on WhatsApp
        </button>
      </div>
    </div>
  );
}