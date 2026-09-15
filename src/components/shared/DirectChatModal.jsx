import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  MessageCircle,
  Dumbbell,
  Apple,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X,
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Volume2
} from "lucide-react";
import Modal from "../ui/Modal";
import {
  getChatRoomId,
  sendChatMessage,
  subscribeChatMessages,
  startCallSession,
  subscribeCallSession,
  updateCallSession,
  endCallSession,
  sendCallSignal,
  addIceCandidate,
  subscribeIceCandidates
} from "../../firebase/chat";
import toast from "react-hot-toast";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

export default function DirectChatModal({
  isOpen,
  onClose,
  gymId = "univo_main",
  currentUser, // { id, name, role: 'trainer' | 'member' }
  targetUser, // { id, name, role: 'trainer' | 'member', photoUrl }
  ptPlanName = ""
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Call States: idle | calling | incoming | connected
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("video"); // 'audio' | 'video'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);

  const roomId = getChatRoomId(
    currentUser?.role === "trainer" ? currentUser?.id : targetUser?.id,
    currentUser?.role === "member" ? currentUser?.id : targetUser?.id
  );

  // Subscribe to text messages
  useEffect(() => {
    if (!isOpen || !roomId) return;
    const unsub = subscribeChatMessages(gymId, roomId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [isOpen, roomId, gymId]);

  // Create Peer Connection with media handlers
  const createPeerConnection = (type) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    // Send local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Receive remote tracks (Audio & Video)
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    };

    // Send ICE candidates to Firestore
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const isCaller = currentUser?.role === "trainer";
        const candidateTarget = isCaller ? "callerCandidates" : "calleeCandidates";
        addIceCandidate(gymId, roomId, candidateTarget, event.candidate);
      }
    };

    return pc;
  };

  // Subscribe to call signaling session
  useEffect(() => {
    if (!isOpen || !roomId) return;

    const unsubCall = subscribeCallSession(gymId, roomId, async (session) => {
      if (!session) {
        if (callState !== "idle") {
          handleCleanupCall();
        }
        return;
      }

      // 1. Incoming call for receiver
      if (session.callerId !== currentUser?.id && session.status === "ringing" && callState === "idle") {
        setCallType(session.type || "video");
        setCallState("incoming");
      }

      // 2. Caller receives Answer from receiver
      if (session.callerId === currentUser?.id && session.status === "accepted" && session.answer && peerConnectionRef.current) {
        if (!peerConnectionRef.current.currentRemoteDescription) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(session.answer));
            setCallState("connected");
            startCallTimer();
          } catch (e) {
            console.warn("setRemoteDescription answer error:", e);
          }
        }
      }

      // 3. Call Ended or Rejected
      if (session.status === "ended" || session.status === "rejected") {
        handleCleanupCall();
      }
    });

    return () => {
      if (typeof unsubCall === "function") unsubCall();
    };
  }, [isOpen, roomId, gymId, currentUser?.id, callState]);

  // Subscribe to ICE candidates
  useEffect(() => {
    if (!isOpen || !roomId || callState === "idle") return;

    const isCaller = currentUser?.role === "trainer";
    const remoteTarget = isCaller ? "calleeCandidates" : "callerCandidates";

    const unsubCand = subscribeIceCandidates(gymId, roomId, remoteTarget, async (cand) => {
      if (peerConnectionRef.current && cand) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn("addIceCandidate error:", e);
        }
      }
    });

    return () => {
      if (typeof unsubCand === "function") unsubCand();
    };
  }, [isOpen, roomId, gymId, callState, currentUser?.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer logic for connected call
  const startCallTimer = () => {
    setCallDuration(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // WebRTC Local Media Stream setup
  const initLocalMedia = async (withVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: withVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && withVideo) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn("Media device access error:", err);
      toast.error(
        withVideo
          ? "Camera / Mic access error. Microphone only enabled."
          : "Microphone permission denied."
      );
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioOnlyStream;
        return audioOnlyStream;
      } catch (e2) {
        return null;
      }
    }
  };

  // Initiate Call (Audio or Video)
  const handleStartCall = async (type) => {
    setCallType(type);
    setCallState("calling");

    const stream = await initLocalMedia(type === "video");
    const pc = createPeerConnection(type);

    // Create and send SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await startCallSession(gymId, roomId, {
      callerId: currentUser?.id,
      callerName: currentUser?.name || (currentUser?.role === "trainer" ? "Coach" : "Athlete"),
      callerRole: currentUser?.role || "trainer",
      receiverId: targetUser?.id,
      receiverName: targetUser?.name || "User",
      type,
      offer: { type: offer.type, sdp: offer.sdp }
    });

    await sendChatMessage(gymId, {
      roomId,
      senderId: currentUser?.id,
      senderName: currentUser?.name,
      senderRole: currentUser?.role,
      text: `📞 Started a 1-on-1 ${type === "video" ? "Video Call" : "Voice Call"}`,
      type: "call_notice"
    });
  };

  // Accept incoming call
  const handleAcceptCall = async () => {
    setCallState("connected");
    const stream = await initLocalMedia(callType === "video");
    const pc = createPeerConnection(callType);

    // Fetch call session with caller's offer
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../../firebase/firebase");
      const callDocRef = doc(db, "gyms", gymId || "univo_main", "chatRooms", roomId, "callSession", "active");
      const snap = await getDoc(callDocRef);

      if (snap.exists() && snap.data().offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(snap.data().offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await sendCallSignal(gymId, roomId, {
          status: "accepted",
          answer: { type: answer.type, sdp: answer.sdp }
        });
        startCallTimer();
      }
    } catch (err) {
      console.error("Accept call WebRTC error:", err);
      toast.error("Failed to establish direct connection.");
    }
  };

  // Reject incoming call
  const handleRejectCall = async () => {
    await updateCallSession(gymId, roomId, { status: "rejected" });
    handleCleanupCall();
  };

  // End active call
  const handleEndCall = async () => {
    await endCallSession(gymId, roomId);
    await sendChatMessage(gymId, {
      roomId,
      senderId: currentUser?.id,
      senderName: currentUser?.name,
      senderRole: currentUser?.role,
      text: `⏹️ ${callType === "video" ? "Video Call" : "Voice Call"} ended (${formatDuration(callDuration)})`,
      type: "call_notice"
    });
    handleCleanupCall();
  };

  const handleCleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    clearInterval(timerRef.current);
    setCallDuration(0);
    setCallState("idle");
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Off
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);
    try {
      await sendChatMessage(gymId, {
        roomId,
        senderId: currentUser?.id || "user",
        senderName: currentUser?.name || (currentUser?.role === "trainer" ? "Coach" : "Athlete"),
        senderRole: currentUser?.role || "member",
        text: inputText.trim(),
        type: "text"
      });
      setInputText("");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const sendQuickNote = async (text) => {
    try {
      await sendChatMessage(gymId, {
        roomId,
        senderId: currentUser?.id || "user",
        senderName: currentUser?.name || (currentUser?.role === "trainer" ? "Coach" : "Athlete"),
        senderRole: currentUser?.role || "member",
        text,
        type: "text"
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const isTrainer = currentUser?.role === "trainer";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (callState !== "idle") handleCleanupCall();
        onClose();
      }}
      title=""
      size="lg"
    >
      <div className="-m-6 flex flex-col h-[640px] max-h-[90vh] bg-slate-950 text-slate-100 rounded-3xl overflow-hidden border border-slate-800 relative">
        {/* Chat Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shadow-md overflow-hidden">
              {targetUser?.photoUrl ? (
                <img src={targetUser.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (targetUser?.name || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white">
                  {targetUser?.name || (isTrainer ? "Athlete" : "Coach")}
                </span>
                <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {targetUser?.role === "trainer" ? "Personal Trainer (Direct)" : (ptPlanName || "PT Athlete")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* CALL BUTTONS */}
            <button
              onClick={() => handleStartCall("audio")}
              title="Voice Call"
              className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition flex items-center gap-1 text-xs font-bold"
            >
              <Phone className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleStartCall("video")}
              title="Video Call"
              className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-white transition flex items-center gap-1 text-xs font-bold"
            >
              <Video className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (callState !== "idle") handleCleanupCall();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* ACTIVE CALL OVERLAY (WHEN CALLING, INCOMING OR CONNECTED) */}
        {/* ---------------------------------------------------------------- */}
        {callState !== "idle" && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-6">
            {/* Call Header */}
            <div className="text-center space-y-1">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-widest">
                {callType === "video" ? "1-on-1 HD Video Call" : "1-on-1 Voice Call"}
              </span>
              <h3 className="text-xl font-black text-white pt-2">
                {targetUser?.name || "User"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {callState === "calling" && "Calling... Waiting for answer"}
                {callState === "incoming" && "Incoming call from..."}
                {callState === "connected" && (
                  <span className="text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Connected • {formatDuration(callDuration)}
                  </span>
                )}
              </p>
            </div>

            {/* Video / Avatar Container (Both Local & Remote Streams) */}
            <div className="w-full max-w-sm flex-1 my-4 flex items-center justify-center relative">
              {/* Invisible autoPlay audio element for remote voice transmission */}
              <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

              {callType === "video" ? (
                <div className="w-full h-72 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 relative flex items-center justify-center shadow-inner">
                  {/* REMOTE PARTNER VIDEO (FULL SCREEN) */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Fallback if remote stream has not arrived yet */}
                  {callState !== "connected" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/80 z-10">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl animate-pulse">
                        {(targetUser?.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-300 font-bold">
                        {callState === "calling" ? "Connecting to partner..." : "Ringing..."}
                      </span>
                    </div>
                  )}

                  {/* LOCAL USER PIP VIDEO (SMALL OVERLAY BOTTOM-RIGHT) */}
                  <div className="absolute bottom-3 right-3 w-24 h-32 bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl z-20">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isVideoOff ? "hidden" : "block"}`}
                    />
                    {isVideoOff && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                        <VideoOff className="w-4 h-4 text-slate-500" />
                        <span className="text-[9px] font-bold mt-1">Off</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1.5 text-[8.5px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                      You
                    </span>
                  </div>

                  <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-white">
                    {targetUser?.name || (isTrainer ? "Athlete" : "Coach")}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-4xl font-black text-white shadow-2xl animate-pulse">
                    {(targetUser?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    {callState === "connected" ? "HD Voice Transmitting (Both Speaking)" : "Connecting Voice..."}
                  </div>
                </div>
              )}
            </div>

            {/* Call Control Action Buttons */}
            <div className="flex items-center gap-4">
              {callState === "incoming" ? (
                <>
                  <button
                    onClick={handleAcceptCall}
                    className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition active:scale-95"
                  >
                    <Phone className="w-4 h-4" /> Accept Call
                  </button>
                  <button
                    onClick={handleRejectCall}
                    className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95"
                  >
                    <PhoneOff className="w-4 h-4" /> Decline
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`p-4 rounded-2xl border transition ${
                      isMuted
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                    }`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {callType === "video" && (
                    <button
                      onClick={toggleVideo}
                      className={`p-4 rounded-2xl border transition ${
                        isVideoOff
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                      }`}
                      title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
                    >
                      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}

                  <button
                    onClick={handleEndCall}
                    className="px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-2 shadow-xl shadow-red-600/40 transition active:scale-95"
                    title="End Call"
                  >
                    <PhoneOff className="w-4 h-4" /> End Call
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Quick Guide:</span>
          {isTrainer ? (
            <>
              <button
                onClick={() => sendQuickNote("🥗 Diet Update: Please check your meal routine for today. Drink at least 3.5L water!")}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 text-[11px] font-medium shrink-0 border border-slate-700/60 transition"
              >
                🥗 Diet Reminder
              </button>
              <button
                onClick={() => sendQuickNote("💪 Workout Schedule: Today we will focus on Hypertrophy & Core. Warm up 10 mins!")}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-teal-500/20 hover:text-teal-300 text-slate-300 text-[11px] font-medium shrink-0 border border-slate-700/60 transition"
              >
                💪 Workout Alert
              </button>
              <button
                onClick={() => sendQuickNote("⚡ Form & Rest: How is your muscle soreness? Take adequate protein and 8 hrs sleep.")}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-purple-500/20 hover:text-purple-300 text-slate-300 text-[11px] font-medium shrink-0 border border-slate-700/60 transition"
              >
                ⚡ Check Recovery
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => sendQuickNote("Coach, today's workout completed! Feeling great 💪")}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 text-[11px] font-medium shrink-0 border border-slate-700/60 transition"
              >
                ✅ Workout Done
              </button>
              <button
                onClick={() => sendQuickNote("Coach, feeling a bit sore in muscles today. Should I take rest or light cardio?")}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-[11px] font-medium shrink-0 border border-slate-700/60 transition"
              >
                ⚠️ Muscle Soreness
              </button>
              <button
                onClick={() => sendQuickNote("Coach, please update my diet meal plan for next week.")}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-blue-500/20 hover:text-blue-300 text-slate-300 text-[11px] font-medium shrink-0 border border-slate-700/60 transition"
              >
                🥗 Need Diet Advice
              </button>
            </>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-3">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">Live 1-on-1 Chat, Voice & Video Started</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Direct interaction between trainer and athlete. Chat, call anytime or launch instant video calls for live form guidance.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderRole === currentUser?.role || m.senderId === currentUser?.id;
              const isCallNotice = m.type === "call_notice";

              if (isCallNotice) {
                return (
                  <div key={m.id} className="flex justify-center my-1">
                    <span className="text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                      {m.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {isMe ? "You" : m.senderName}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium leading-relaxed break-words shadow-sm ${
                      isMe
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none"
                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isTrainer ? "Send workout instructions, diet tips..." : "Message your coach directly..."}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition shadow-lg shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Modal>
  );
}
