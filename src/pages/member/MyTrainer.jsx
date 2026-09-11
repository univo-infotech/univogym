import React from "react";
import { Dumbbell, Phone, Award } from "lucide-react";
import Button from "../../components/ui/Button";
import { openWhatsApp } from "../../utils/whatsapp";

export default function MyTrainer() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">My Personal Coach</h2>
        <p className="text-slate-400 text-xs mt-1">Connect with your dedicated trainer for diet & form checks</p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-2xl border border-teal-500/30">
            A
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Coach Amit Rawat</h3>
            <p className="text-xs text-teal-400 font-medium">Head Strength & Conditioning Specialist</p>
            <p className="text-xs text-slate-400 mt-1">7+ Years Experience • Certified Sports Nutritionist</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 text-xs text-slate-300 space-y-1">
          <span className="font-bold text-white block">Coach's Advice for this week:</span>
          "Keep water intake above 3.5 liters daily and focus on eccentric phase control on chest press."
        </div>

        <Button variant="whatsapp" fullWidth icon={<Phone className="w-4 h-4" />} onClick={() => openWhatsApp("9876543210", "Hi Coach Amit, I have a quick question regarding my workout routine today!")}>
          Message Coach on WhatsApp
        </Button>
      </div>
    </div>
  );
}
