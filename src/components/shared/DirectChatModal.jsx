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
  X
} from "lucide-react";
import Modal from "../ui/Modal";
import { getChatRoomId, sendChatMessage, subscribeChatMessages } from "../../firebase/chat";
import toast from "react-hot-toast";

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

  const roomId = getChatRoomId(
    currentUser?.role === "trainer" ? currentUser?.id : targetUser?.id,
    currentUser?.role === "member" ? currentUser?.id : targetUser?.id
  );

  useEffect(() => {
    if (!isOpen || !roomId) return;
    const unsub = subscribeChatMessages(gymId, roomId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [isOpen, roomId, gymId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      onClose={onClose}
      title=""
      size="lg"
    >
      <div className="-m-6 flex flex-col h-[600px] max-h-[85vh] bg-slate-950 text-slate-100 rounded-3xl overflow-hidden border border-slate-800">
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
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
              <p className="text-sm font-bold text-slate-300">Live 1-on-1 Chat Started</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Direct communication between personal trainer and athlete. All messages, nutrition guidelines and instructions are securely stored.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderRole === currentUser?.role || m.senderId === currentUser?.id;
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
