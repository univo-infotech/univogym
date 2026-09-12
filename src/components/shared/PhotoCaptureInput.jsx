import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Upload, 
  Camera, 
  Trash2, 
  RotateCcw, 
  Check, 
  X, 
  User, 
  Sparkles,
  AlertCircle,
  Maximize2
} from "lucide-react";
import toast from "react-hot-toast";

/**
 * Optimizes an image (from File or DataURL) to max dimensions & quality.
 * Prevents Firestore document size bloat while keeping crystal clear quality.
 */
function compressImage(source, maxWidth = 900, maxHeight = 900, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(source);
    img.src = source;
  });
}

/**
 * Reusable PhotoCaptureInput Component
 * Supports:
 * 1. Upload from Gallery / Device files
 * 2. Live Camera / Webcam Snapshot (with retake & switch camera)
 *
 * @param {string} value - current photo data URL or URL
 * @param {function} onChange - callback(base64Url)
 * @param {string} label - Title label
 * @param {string} subLabel - Optional description
 * @param {"circle" | "rounded" | "rect"} shape - preview shape
 * @param {"square" | "wide" | "tall"} aspectRatio - container ratio
 * @param {boolean} required - whether required
 * @param {string} className - extra wrapper classes
 */
export default function PhotoCaptureInput({
  value,
  onChange,
  label = "Photo",
  subLabel = "Upload from device or take live camera snap",
  shape = "circle", // "circle" | "rounded" | "rect"
  aspectRatio = "square", // "square" | "wide" | "tall"
  required = false,
  className = ""
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedSnap, setCapturedSnap] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("user"); // "user" | "environment"
  const [cameraError, setCameraError] = useState(null);
  const [loadingCamera, setLoadingCamera] = useState(false);

  const fileInputRef = useRef(null);
  const fallbackCameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Stop active camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start live camera stream
  const startCamera = useCallback(async (facing = "user") => {
    stopStream();
    setCameraError(null);
    setLoadingCamera(true);
    setCapturedSnap(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Web camera not supported in this browser. Opening device camera...");
      }

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoadingCamera(false);
    } catch (err) {
      console.warn("Live camera init error:", err);
      setLoadingCamera(false);
      setCameraError(err.message || "Unable to access camera.");
      // Auto-fallback to native camera file input if permissions blocked or unsupported
      toast("Using device camera fallback...", { icon: "📸" });
      fallbackCameraInputRef.current?.click();
      setCameraOpen(false);
    }
  }, [stopStream]);

  // Handle open camera
  const handleOpenCamera = () => {
    setCameraOpen(true);
    startCamera(cameraFacing);
  };

  // Close camera modal
  const handleCloseCamera = () => {
    stopStream();
    setCapturedSnap(null);
    setCameraOpen(false);
  };

  // Toggle front / back camera (mobile)
  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Snap current frame from video stream
  const handleSnap = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    // Mirror horizontal if using front camera
    if (cameraFacing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawData = canvas.toDataURL("image/jpeg", 0.9);
    const compressed = await compressImage(rawData, 900, 900, 0.85);
    setCapturedSnap(compressed);
  };

  // Confirm captured photo
  const handleConfirmSnap = () => {
    if (capturedSnap) {
      onChange(capturedSnap);
      toast.success("Photo captured!");
      handleCloseCamera();
    }
  };

  // Retake snap
  const handleRetakeSnap = () => {
    setCapturedSnap(null);
  };

  // File upload handler (from gallery / files)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const compressed = await compressImage(ev.target.result, 900, 900, 0.85);
        onChange(compressed);
        toast.success("Photo attached!");
      } catch (err) {
        onChange(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  // Preview shape styling
  const shapeClasses = 
    shape === "circle" 
      ? "w-24 h-24 rounded-full" 
      : shape === "rounded" 
        ? aspectRatio === "wide" ? "w-full sm:w-48 h-28 rounded-2xl" : "w-28 h-28 rounded-2xl"
        : "w-full h-36 rounded-2xl";

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label Header */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {value && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              ✓ Attached
            </span>
          )}
        </div>
      )}

      {/* Hidden File Inputs */}
      {/* 1. Gallery / Standard File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* 2. Direct Camera Fallback Input */}
      <input
        type="file"
        ref={fallbackCameraInputRef}
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Container */}
      {value ? (
        /* ACTIVE PHOTO PREVIEW CARD */
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`relative overflow-hidden border-2 border-emerald-500 shadow-sm bg-slate-100 flex-shrink-0 ${shapeClasses}`}>
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Photo Captured</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ready for profile & records</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-bold transition shadow-sm"
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold transition shadow-sm"
                >
                  Retake Camera
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChange("")}
            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex-shrink-0"
            title="Remove photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* DUAL OPTION SELECTION CARDS (UPLOAD & CAMERA) */
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* OPTION 1: UPLOAD FROM DEVICE */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group p-3.5 sm:p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center text-center text-slate-700 active:scale-[0.98] shadow-sm"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition mb-1.5 shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Upload Photo</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Gallery / Files</span>
            </button>

            {/* OPTION 2: LIVE CAMERA SNAPSHOT */}
            <button
              type="button"
              onClick={handleOpenCamera}
              className="group p-3.5 sm:p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/30 transition-all flex flex-col items-center justify-center text-center text-slate-700 active:scale-[0.98] shadow-sm"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition mb-1.5 shadow-sm">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Take Live Photo</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Camera / Webcam</span>
            </button>
          </div>
          {subLabel && (
            <p className="text-[10px] text-slate-400 text-center sm:text-left">{subLabel}</p>
          )}
        </div>
      )}

      {/* ============================================================
          LIVE CAMERA CAPTURE MODAL
      ============================================================ */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
            {/* Camera Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live Camera Capture</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  title="Switch Camera (Front/Back)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseCamera}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewfinder Area */}
            <div className="relative aspect-video sm:aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
              {capturedSnap ? (
                /* Snapped Still Frame */
                <img
                  src={capturedSnap}
                  alt="Captured Snap"
                  className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-150"
                />
              ) : (
                /* Live Video Stream */
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
                  />
                  {/* Portrait Guide Ring */}
                  {shape === "circle" && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-56 h-56 rounded-full border-2 border-white/60 border-dashed animate-pulse" />
                    </div>
                  )}
                </>
              )}

              {loadingCamera && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-white gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Starting Camera...
                </div>
              )}
            </div>

            {/* Camera Actions Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              {capturedSnap ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetakeSnap}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retake Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSnap}
                    className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
                  >
                    <Check className="w-4 h-4" /> Use This Photo
                  </button>
                </>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleSnap}
                    disabled={loadingCamera}
                    className="group relative flex items-center justify-center p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition disabled:opacity-50"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-500 group-hover:bg-emerald-400 flex items-center justify-center text-white shadow-xl transition active:scale-90">
                      <Camera className="w-6 h-6" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
