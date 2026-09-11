import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { RotateCcw, Check, PenTool } from "lucide-react";

export default function SignaturePad({ onSave, currentSignature = null, onClear }) {
  const sigPad = useRef(null);
  const [penColor, setPenColor] = useState("#0f172a"); // dark slate / ink black
  const [hasDrawn, setHasDrawn] = useState(false);

  const handleClear = () => {
    if (sigPad.current) {
      sigPad.current.clear();
      setHasDrawn(false);
      if (onClear) onClear();
    }
  };

  const handleSave = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL("image/png");
      if (onSave) onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-indigo-600" /> Draw Official Digital Signature
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Ink:</span>
          <button
            type="button"
            onClick={() => setPenColor("#0f172a")}
            className={`w-4 h-4 rounded-full bg-slate-900 border ${penColor === "#0f172a" ? "ring-2 ring-indigo-500" : ""}`}
            title="Black Ink"
          />
          <button
            type="button"
            onClick={() => setPenColor("#1d4ed8")}
            className={`w-4 h-4 rounded-full bg-blue-700 border ${penColor === "#1d4ed8" ? "ring-2 ring-indigo-500" : ""}`}
            title="Blue Ink"
          />
          <button
            type="button"
            onClick={() => setPenColor("#047857")}
            className={`w-4 h-4 rounded-full bg-emerald-700 border ${penColor === "#047857" ? "ring-2 ring-indigo-500" : ""}`}
            title="Green Official Ink"
          />
        </div>
      </div>

      <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 hover:bg-white transition overflow-hidden">
        <SignatureCanvas
          ref={sigPad}
          penColor={penColor}
          onBegin={() => setHasDrawn(true)}
          canvasProps={{
            className: "w-full h-36 cursor-crosshair",
          }}
        />
        {!hasDrawn && !currentSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
            ✍️ Sign here with mouse, finger, or stylus
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear Canvas
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasDrawn}
          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
        >
          <Check className="w-3.5 h-3.5" /> Save Signature
        </button>
      </div>
    </div>
  );
}
