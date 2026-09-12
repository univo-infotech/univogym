import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { RotateCcw, Check, PenTool, Sparkles } from "lucide-react";

export default function SignaturePad({ onSave, currentSignature = null, onClear }) {
  const sigPad = useRef(null);
  const containerRef = useRef(null);
  const [penColor, setPenColor] = useState("#0f172a"); // dark slate / ink black
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saved, setSaved] = useState(false);

  // Resize canvas according to container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && sigPad.current) {
        const canvas = sigPad.current.getCanvas();
        if (canvas) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          const width = containerRef.current.offsetWidth;
          const height = 160;
          canvas.width = width * ratio;
          canvas.height = height * ratio;
          canvas.getContext("2d").scale(ratio, ratio);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleClear = () => {
    if (sigPad.current) {
      sigPad.current.clear();
      setHasDrawn(false);
      setSaved(false);
      if (onClear) onClear();
    }
  };

  const handleSave = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL("image/png");
      if (onSave) onSave(dataUrl);
      setSaved(true);
    }
  };

  return (
    <div className="space-y-3 w-full" ref={containerRef}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-indigo-600" /> Draw Digital Signature
          </span>
          {saved && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" /> Signature Captured
            </span>
          )}
        </div>

        {/* Ink Colors Selection */}
        <div className="flex items-center gap-2 bg-slate-100/80 px-2.5 py-1 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Ink Color:</span>
          <button
            type="button"
            onClick={() => setPenColor("#0f172a")}
            className={`w-4 h-4 rounded-full bg-slate-900 border transition ${
              penColor === "#0f172a" ? "ring-2 ring-indigo-500 scale-110" : "opacity-80"
            }`}
            title="Black Ink"
          />
          <button
            type="button"
            onClick={() => setPenColor("#1d4ed8")}
            className={`w-4 h-4 rounded-full bg-blue-700 border transition ${
              penColor === "#1d4ed8" ? "ring-2 ring-indigo-500 scale-110" : "opacity-80"
            }`}
            title="Blue Ink"
          />
          <button
            type="button"
            onClick={() => setPenColor("#047857")}
            className={`w-4 h-4 rounded-full bg-emerald-700 border transition ${
              penColor === "#047857" ? "ring-2 ring-indigo-500 scale-110" : "opacity-80"
            }`}
            title="Green Ink"
          />
        </div>
      </div>

      {/* Signature Canvas Box with Desktop Width and Guide Line */}
      <div className="relative border-2 border-dashed border-indigo-300 rounded-2xl bg-white hover:border-indigo-400 transition overflow-hidden shadow-xs">
        <SignatureCanvas
          ref={sigPad}
          penColor={penColor}
          onBegin={() => {
            setHasDrawn(true);
            setSaved(false);
          }}
          onEnd={handleSave}
          canvasProps={{
            className: "w-full h-40 cursor-crosshair block",
            style: { width: "100%", height: "160px" }
          }}
        />

        {/* Subtle baseline watermark */}
        <div className="absolute bottom-6 left-6 right-6 border-b border-dashed border-slate-200 pointer-events-none flex justify-between items-center text-[10px] text-slate-300">
          <span>X Member Signature Baseline</span>
          <span className="text-[9px]">Verified Digital</span>
        </div>

        {!hasDrawn && !currentSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium gap-1.5 bg-slate-50/30">
            ✍️ Sign here with mouse, finger, or stylus
          </div>
        )}
      </div>

      {/* Actions Toolbar */}
      <div className="flex items-center justify-between pt-0.5">
        <p className="text-[11px] text-slate-500">
          Sign with your mouse or touchpad. It auto-saves as you release.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs ${
              saved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
            }`}
          >
            <Check className="w-3.5 h-3.5" /> {saved ? "Saved" : "Save Signature"}
          </button>
        </div>
      </div>
    </div>
  );
}
