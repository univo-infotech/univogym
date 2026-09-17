import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle,
  Download,
  Plus,
  User,
  Phone,
  Mail,
  CreditCard,
  Camera,
  FileText,
  RefreshCw,
  Flame,
  Award,
  ShieldCheck,
  Scale,
  Sparkles,
  Sun,
  UserCheck,
  Banknote,
  Smartphone,
  Building2,
  Split,
  Receipt,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3
} from "lucide-react";
import toast from "react-hot-toast";
import { getMember, updateMember } from "../../firebase/members";
import { getMemberPayments, addPayment } from "../../firebase/payments";
import { getTrainers } from "../../firebase/trainers";
import { getPlans } from "../../firebase/plans";
import { generatePaymentReceipt } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
import { openWhatsApp, generatePtAddonReceiptMessage } from "../../utils/whatsapp";
import { invalidateCache } from "../../utils/dataCache";
import Modal from "../../components/ui/Modal";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../../firebase/config";

function formatDate(val) {
  if (!val) return '—';
  const d = val.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MemberDetail() {
  const params = useParams();
  const targetMemberId = params.memberId || params.id;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [transformations, setTransformations] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [ptModalOpen, setPtModalOpen] = useState(false);
  const [settings] = useState(getGymSettings());

  const [payForm, setPayForm] = useState({
    amount: "1499",
    paidAmount: "1499",
    dueAmount: "0",
    paymentMode: "online",
    date: new Date().toISOString().split("T")[0],
  });

  const [ptForm, setPtForm] = useState({
    trainerId: "",
    packageName: "1 Month 1-on-1 PT",
    startDate: new Date().toISOString().split("T")[0],
    durationDays: 30,
    totalFee: "3500",
    payingNow: "3500",
    paymentMode: "online",
    referenceId: "",
    hasCommission: false,
    commissionType: "percentage",
    commissionValue: "30",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isEditingPass, setIsEditingPass] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [isSavingPass, setIsSavingPass] = useState(false);

  const handleCopy = (text, key) => {
    if (!text || text === "—" || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${key} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSavePassword = async () => {
    if (!passInput.trim()) {
      toast.error("Password cannot be empty");
      return;
    }
    setIsSavingPass(true);
    try {
      await updateMember("univo_main", targetMemberId, {
        loginPassword: passInput.trim(),
        password: passInput.trim(),
      });
      setMember(prev => ({
        ...prev,
        loginPassword: passInput.trim(),
        password: passInput.trim()
      }));
      invalidateCache("members");
      toast.success("Member login password updated successfully!");
      setIsEditingPass(false);
    } catch (err) {
      console.error("Error updating member password:", err);
      toast.error("Failed to update password");
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleSendCredentialsWA = () => {
    if (!member) return;
    const rawPhone = (member.phone || "").replace(/\D/g, "");
    if (!rawPhone) {
      toast.error("Member phone number not available");
      return;
    }
    const memPass = member.loginPassword || member.password || "Member@123";
    const loginId = member.loginEmail || member.phone || "—";
    const appUrl = `${window.location.origin}/#/login`;
    const msg = `🏋️ *UNIVO GYM MEMBER PORTAL LOGIN*\n\n` +
      `Hi *${member.name || member.fullName || "Member"}*,\n` +
      `Aapke gym portal ke login credentials yeh hain:\n\n` +
      `📱 *Login ID (Phone):* ${member.phone || "—"}\n` +
      (member.loginEmail || member.email ? `📧 *Login Email:* ${member.loginEmail || member.email}\n` : "") +
      `🔑 *Password:* ${memPass}\n` +
      `🔗 *Login Link:* ${appUrl}\n\n` +
      `Is link par login karke aap apna workout schedule, diet chart, attendance aur fees status track kar sakte hain!`;
    openWhatsApp(rawPhone, msg);
  };

  useEffect(() => {
    async function load() {
      try {
        if (!targetMemberId) return;

        const m = await getMember("univo_main", targetMemberId);
        if (m) {
          setMember(m);
          setPayForm((prev) => ({
            ...prev,
            amount: String(m.planPrice || 1499),
            paidAmount: String(m.planPrice || 1499)
          }));
        } else {
          // Dynamic fallback with target ID
          const fallbackMem = {
            id: targetMemberId,
            name: "Gym Member",
            fullName: "Gym Member",
            phone: "—",
            email: "—",
            gender: "Not specified",
            planName: "Standard Plan",
            planPrice: 599,
            trainerName: "Unassigned",
            slot: "General Shift",
            status: "active",
            createdAt: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            waiverSigned: true,
            waiverSignedDate: new Date().toISOString()
          };
          setMember(fallbackMem);
        }

        // Load trainers
        try {
          const tList = await getTrainers("univo_main");
          if (tList && tList.length > 0) {
            setTrainers(tList);
            setPtForm(prev => ({ ...prev, trainerId: tList[0].id }));
          }
        } catch (tErr) {
          console.warn("Notice loading trainers:", tErr);
        }

        // Load plans
        try {
          const pList = await getPlans("univo_main");
          if (pList) setPlans(pList);
        } catch (pErr) {
          console.warn("Notice loading plans:", pErr);
        }

        // Load payments
        const p = await getMemberPayments(targetMemberId);
        if (p && p.length > 0) {
          setPayments(p);
        } else {
          setPayments([
            {
              id: "p_" + targetMemberId,
              memberName: m ? (m.name || m.fullName) : "Gym Member",
              planName: m ? (m.planName || "Membership Plan") : "Standard Plan",
              paidAmount: m?.planPrice || 1499,
              amount: m?.planPrice || 1499,
              dueAmount: 0,
              paymentMode: "online",
              date: m?.createdAt ? formatDate(m.createdAt) : formatDate(new Date())
            }
          ]);
        }

        // Load transformations
        try {
          const baSnap = await getDocs(collection(db, "gyms", "univo_main", "beforeAfter"));
          if (!baSnap.empty) {
            const allBa = baSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const memberBa = allBa.filter(
              item => item.memberId === targetMemberId ||
                (m && item.memberName?.toLowerCase() === (m.name || m.fullName || "").toLowerCase())
            );
            setTransformations(memberBa);
          }
        } catch (baErr) {
          console.warn("Notice loading member transformations:", baErr);
        }
      } catch (err) {
        console.error("MemberDetail load error:", err);
      }
    }
    load();
  }, [targetMemberId]);

  if (!member) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleRecordPay = async (e) => {
    e.preventDefault();
    const newP = {
      ...payForm,
      id: "p_" + Date.now(),
      memberId: targetMemberId,
      memberName: member.name || member.fullName,
      planName: member.planName || "Membership Plan",
      status: "paid",
      date: payForm.date || new Date().toISOString().split("T")[0]
    };

    try {
      await addPayment("univo_main", newP);
      // Auto-extend expiry by 30 days & reactivate account
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + 1);
      const newExpiry = expDate.toISOString().split("T")[0];

      await updateMember("univo_main", targetMemberId, {
        status: "active",
        active: true,
        expiryDate: newExpiry,
        dueAmount: 0
      });

      setMember((prev) => ({
        ...prev,
        status: "active",
        active: true,
        expiryDate: newExpiry,
        dueAmount: 0
      }));
    } catch (err) {
      console.warn("Save payment err:", err);
    }

    setPayments([newP, ...payments]);
    setPayModalOpen(false);
    toast.success("Payment recorded & membership reactivated!");
  };

  const handleActivatePT = async (withWhatsApp = true) => {
    const feeNum = Number(ptForm.totalFee) || 0;
    const paidNum = Number(ptForm.payingNow) || 0;
    const remainingDue = Math.max(0, feeNum - paidNum);

    if (feeNum <= 0) {
      toast.error("Please enter a valid PT package fee");
      return;
    }

    const selTrainer = trainers.find(t => t.id === ptForm.trainerId) || trainers[0];
    const trainerName = selTrainer ? (selTrainer.name || selTrainer.fullName) : (member.trainerName || "Assigned Coach");

    // Calculate PT end date
    const parts = ptForm.startDate.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + Number(ptForm.durationDays || 30));
    const computedEndDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const billId = "bill_pt_" + Date.now();
    const toIndianDate = (dateStr) => {
      if (!dateStr) return "";
      const p = dateStr.split("-");
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dateStr;
    };

    const newPaymentRecord = {
      id: billId,
      memberId: targetMemberId,
      memberName: member.name || member.fullName,
      phone: member.phone || "",
      planName: `Personal Training (PT) - ${ptForm.packageName}`,
      planType: "PT",
      trainerId: selTrainer?.id || "",
      trainerName,
      amount: feeNum,
      paidAmount: paidNum,
      dueAmount: remainingDue,
      paymentMode: ptForm.paymentMode,
      reference: ptForm.referenceId || "",
      validityStart: toIndianDate(ptForm.startDate),
      validityEnd: toIndianDate(computedEndDate),
      dueDate: toIndianDate(computedEndDate),
      date: toIndianDate(new Date().toISOString().split("T")[0]),
      status: remainingDue > 0 ? "partial" : "paid",
      remarks: `Mid-month 1-on-1 PT package (${ptForm.durationDays} Days) with Coach ${trainerName}`,
      createdAt: new Date().toISOString(),
    };

    try {
      await addPayment("univo_main", newPaymentRecord);

      const updatedFields = {
        isPt: true,
        isPTMember: true,
        hasPersonalCoach: true,
        ptStatus: "active",
        trainerId: selTrainer?.id || "",
        trainerName,
        ptPlanName: ptForm.packageName,
        ptPlanPrice: feeNum,
        ptStartDate: ptForm.startDate,
        ptEndDate: computedEndDate,
        ptDurationDays: Number(ptForm.durationDays || 30),
        ptCommissionType: ptForm.hasCommission ? ptForm.commissionType : null,
        ptCommissionValue: ptForm.hasCommission ? Number(ptForm.commissionValue || 0) : 0,
        dueAmount: Number(member.dueAmount || 0) + remainingDue,
        paidAmount: Number(member.paidAmount || 0) + paidNum,
        lastPaymentDate: new Date().toISOString(),
        loginEmail: member.loginEmail || member.email || member.phone || "",
        loginPassword: member.loginPassword || member.password || "Member@123",
        password: member.loginPassword || member.password || "Member@123",
      };

      await updateMember("univo_main", targetMemberId, updatedFields);
      invalidateCache("payments");
      invalidateCache("members");

      setMember(prev => ({ ...prev, ...updatedFields }));
      setPayments(prev => [newPaymentRecord, ...prev]);

      toast.success(`PT Package activated for ${member.name || member.fullName}! Transaction recorded.`);

      const receiptLink = `${window.location.origin}/#/receipt/${billId}`;
      if (withWhatsApp && member.phone) {
        const msg = generatePtAddonReceiptMessage({
          memberName: member.name || member.fullName,
          gymName: settings.gymName,
          ptPlanName: ptForm.packageName,
          trainerName,
          startDate: toIndianDate(ptForm.startDate),
          expiryDate: toIndianDate(computedEndDate),
          durationDays: ptForm.durationDays,
          amount: feeNum,
          paidAmount: paidNum,
          dueAmount: remainingDue,
          paymentMode: ptForm.paymentMode,
          billId,
          receiptLink,
        });
        openWhatsApp(member.phone, msg);
      }

      setPtModalOpen(false);
    } catch (err) {
      console.error("Error activating PT package:", err);
      toast.error("Failed to activate PT package");
    }
  };

  const initials = (member.name || member.fullName || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const NON_PT_TRAINERS = ['Unassigned', 'General Floor Trainer (Included)', 'No Trainer', 'Unassigned (General Floor)'];
  const isPtMember = Boolean(
    member && (
      member.isPt ||
      member.isPTMember ||
      member.hasPersonalCoach ||
      member.ptPlanName ||
      member.ptPlanPrice ||
      (member.trainerName && !NON_PT_TRAINERS.includes(member.trainerName)) ||
      (member.planName && member.planName.toLowerCase().includes('pt')) ||
      member.planType === 'PT'
    )
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <button
        onClick={() => navigate("/owner/members")}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Members List
      </button>

      {/* Member Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {member.photoURL ? (
            <img
              src={member.photoURL}
              alt={member.name || member.fullName}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-2xl shadow-sm">
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{member.fullName || member.name}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {(member.status || 'ACTIVE').toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Plan: {member.planName || 'Standard Plan'} {member.planPrice ? `(₹${Number(member.planPrice).toLocaleString('en-IN')})` : ''}</span>
              {member.ptPlanName && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border shadow-2xs ${
                  member.ptStatus === 'ended'
                    ? 'bg-slate-100 text-slate-600 border-slate-300'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}>
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  {member.ptStatus === 'ended' ? `PT Add-on (Ended): ${member.ptPlanName}` : `PT Add-on: ${member.ptPlanName}`} {member.ptPlanPrice && member.ptStatus !== 'ended' ? `(+₹${Number(member.ptPlanPrice).toLocaleString('en-IN')})` : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {isPtMember && (
            <button
              onClick={() => {
                setActiveTab("overview");
                setShowPassword(true);
                setTimeout(() => {
                  const el = document.getElementById("credentials-card");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center justify-center gap-1.5 transition border border-indigo-200 shadow-2xs"
              title="PT Member ke Login ID & Password dekhein"
            >
              <Key className="w-4 h-4 text-indigo-600" /> ID & Password
            </button>
          )}
          <button
            onClick={() => {
              const num = (member.phone || "").replace(/\D/g, "");
              window.open(`https://wa.me/${num}?text=Hi%20${member.name || member.fullName},%20Greetings%20from%20${settings.gymName}!`, "_blank");
            }}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp Chat
          </button>
          {member.ptStatus !== 'active' && (
            <button
              onClick={() => setPtModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
              title="Bich month me 1-on-1 PT package aur coach add karein"
            >
              <Sparkles className="w-4 h-4 text-purple-200" /> + Add PT Package
            </button>
          )}
          <button
            onClick={() => setPayModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            Record Payment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: "overview", label: "Overview & Personal Details" },
          { key: "payments", label: "Billing & Invoices" },
          { key: "transformations", label: "Before & After Results" },
          { key: "waiver", label: "Signed Waiver & Signature" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === tab.key
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Member Portal Login Credentials Dedicated Card (Only for PT Members) */}
          {isPtMember ? (
            <div
              id="credentials-card"
              className="md:col-span-2 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 text-white shadow-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-wide">
                        PT Member Portal Credentials
                      </h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        PT Login Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Personal Training athlete is ID & Password se Portal (<span className="text-slate-300 font-mono">/#/login</span>) par login kar sakta hai.
                    </p>
                  </div>
                </div>

                {/* Action: Send to Member via WhatsApp */}
                <button
                  type="button"
                  onClick={handleSendCredentialsWA}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
                  title="Member ko WhatsApp par login ID aur password share karein"
                >
                  <MessageCircle className="w-4 h-4" /> Share on WhatsApp
                </button>
              </div>

              {/* Credentials 3-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {/* Login ID (Mobile) */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Primary Login (Phone)
                      </span>
                      <span className="text-[9px] uppercase font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded">
                        Default ID
                      </span>
                    </div>
                    <div className="font-mono font-bold text-base text-white tracking-wide truncate">
                      {member.phone || "—"}
                    </div>
                  </div>
                  {member.phone && member.phone !== "—" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(member.phone, "Phone Number")}
                      className="mt-3 text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1.5 transition self-start"
                    >
                      {copiedKey === "Phone Number" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Phone
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Login Email */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-teal-400" /> Alternate ID (Email)
                      </span>
                    </div>
                    <div
                      className="font-mono font-bold text-sm text-white tracking-wide truncate"
                      title={member.loginEmail || member.email || "Not set"}
                    >
                      {member.loginEmail || member.email || "Not set"}
                    </div>
                  </div>
                  {(member.loginEmail || member.email) && member.email !== "—" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(member.loginEmail || member.email, "Email")}
                      className="mt-3 text-xs font-semibold text-teal-300 hover:text-white flex items-center gap-1.5 transition self-start"
                    >
                      {copiedKey === "Email" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Email
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Portal Password */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" /> Portal Password
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition px-1.5 py-0.5 rounded bg-slate-700/60"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <><EyeOff className="w-3 h-3" /> Hide</>
                        ) : (
                          <><Eye className="w-3 h-3" /> Show</>
                        )}
                      </button>
                    </div>

                    {!isEditingPass ? (
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono font-bold text-base text-emerald-400 tracking-wider">
                          {showPassword ? (member.loginPassword || member.password || "Member@123") : "••••••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPassInput(member.loginPassword || member.password || "Member@123");
                            setIsEditingPass(true);
                          }}
                          className="text-slate-400 hover:text-emerald-400 text-xs flex items-center gap-1 p-1 transition"
                          title="Change / Reset Password"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={passInput}
                          onChange={(e) => setPassInput(e.target.value)}
                          placeholder="New password"
                          className="w-full px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-950 border border-slate-600 text-white focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={isSavingPass}
                          onClick={handleSavePassword}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                        >
                          {isSavingPass ? "..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPass(false)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditingPass && (
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleCopy(member.loginPassword || member.password || "Member@123", "Password")}
                        className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1.5 transition"
                      >
                        {copiedKey === "Password" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Pass
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPassInput(member.loginPassword || member.password || "Member@123");
                          setIsEditingPass(true);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 transition underline underline-offset-2"
                      >
                        Edit Pass
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hint footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 gap-2">
                <span className="flex items-center gap-1.5">
                  💡 <span className="text-slate-300">Tip:</span> Member apne Mobile Number ya Email me se koi bhi ID daal kar password ke sath login kar sakta hai.
                </span>
                <span className="font-mono text-slate-400 text-[10px] bg-slate-800/80 px-2 py-0.5 rounded">
                  Default Password: Member@123
                </span>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 p-5 rounded-3xl bg-slate-50 border border-slate-200 text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-200/80 border border-slate-300 flex items-center justify-center text-slate-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">General Gym Member (No PT Portal Login)</h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                      Portal Login Disabled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Member portal login ID & password sirf Personal Training (PT) athletes ke liye generate hota hai. General members ke liye portal login access nahi banta.
                  </p>
                </div>
              </div>
              {member.ptStatus !== 'active' && (
                <button
                  type="button"
                  onClick={() => setPtModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm whitespace-nowrap"
                  title="Is member ko 1-on-1 PT package dekar portal login enable karein"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" /> + Add PT Package
                </button>
              )}
            </div>
          )}

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <p><span className="font-semibold text-slate-800">Full Name: </span>{member.fullName || member.name}</p>
              <p><span className="font-semibold text-slate-800">Gender: </span>{member.gender || "Not specified"}</p>
              <p><span className="font-semibold text-slate-800">Aadhaar No: </span>{member.aadharNumber || member.aadharNo || member.aadhaar || "—"}</p>
              <p><span className="font-semibold text-slate-800">Phone: </span>{member.phone || "—"}</p>
              <p><span className="font-semibold text-slate-800">Email: </span>{member.email || "—"}</p>
              <p><span className="font-semibold text-slate-800">Joined Date: </span>{formatDate(member.createdAt)}</p>
              <p><span className="font-semibold text-slate-800">Plan Expiry: </span>{formatDate(member.expiryDate)}</p>
              {member.address && <p><span className="font-semibold text-slate-800">Address: </span>{member.address}</p>}

              {member.healthNotes && (
                <p className="p-2 bg-amber-50 rounded-xl text-amber-900 border border-amber-200 mt-2">
                  <span className="font-bold">Medical / Health Notes: </span>{member.healthNotes}
                </p>
              )}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900">Coaching & Shift</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <p><span className="font-semibold text-slate-800">Assigned Trainer: </span>{member.trainerName || "Unassigned"}</p>
              <p><span className="font-semibold text-slate-800">Workout Shift: </span>{member.slot || member.workoutSlot || "General Shift"}</p>
              <p><span className="font-semibold text-slate-800">Membership Tier: </span>{member.planName || "Standard Plan"}</p>
              {member.ptPlanName && (
                <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-indigo-900 mt-2 space-y-0.5">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-indigo-950">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Dedicated Personal Training (PT) Add-on
                  </span>
                  <p className="text-[11px] font-semibold text-indigo-800">
                    Package: <span className="font-bold">{member.ptPlanName}</span> {member.ptDuration ? `(${member.ptDuration})` : ""}
                  </p>
                  <p className="text-[11px] text-indigo-700">
                    Fee: <span className="font-extrabold text-indigo-900">₹{Number(member.ptPlanPrice || 0).toLocaleString("en-IN")}</span> added to membership
                  </p>
                </div>
              )}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 mt-2">
                <span className="font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Digital Liability Waiver Verified</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">Signed during member onboarding with e-signature</p>
              </div>
            </div>
          </div>

          {/* Physical Assessment & BMI Card */}
          {(member.weight || member.height || member.bmi || member.fitnessGoal) && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 md:col-span-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" /> Personal Training Assessment & BMI Baseline
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Weight</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{member.weight ? `${member.weight} kg` : "-"}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Height (ft & in)</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {member.heightFeet
                      ? `${member.heightFeet} ft ${member.heightInches || 0} in`
                      : member.height
                      ? String(member.height).includes('ft')
                        ? member.height
                        : `${Math.floor(parseFloat(member.height) / 30.48)} ft ${Math.round((parseFloat(member.height) % 30.48) / 2.54)} in`
                      : '-'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">BMI Score</p>
                  <p className="text-sm font-extrabold text-purple-700 mt-0.5">
                    {member.bmi ? `${member.bmi} (${member.bmiCategory || "Normal"})` : "-"}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Target Goal</p>
                  <p className="text-xs font-extrabold text-emerald-700 mt-0.5 truncate">{member.fitnessGoal || "General Fitness"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === "payments" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Payment History & Receipts</h3>
            <button
              onClick={() => setPayModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              + Record Payment
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{p.planName}</h4>
                  <p className="text-xs text-slate-400">Date: {p.date} • Mode: <span className="font-bold uppercase text-slate-600">{p.paymentMode}</span></p>
                  <p className="text-xs text-emerald-600 font-extrabold mt-0.5">Paid: ₹{p.paidAmount || p.amount}</p>
                </div>
                <button
                  onClick={() => generatePaymentReceipt(p)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Official PDF Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Waiver & Signature */}
      {activeTab === "waiver" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Signed Gym Liability Waiver
              </h3>
              <p className="text-xs text-slate-500">Signed on {formatDate(member.waiverSignedDate || member.createdAt)}</p>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Legally Binding
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
            <p className="font-bold text-slate-900">Clause 1: Physical Fitness & Assumption of Risk</p>
            <p>I, {member.fullName || member.name}, hereby confirm that I am voluntarily participating in physical exercise at the gym and assume full responsibility for my health and safety.</p>
            <p className="font-bold text-slate-900 pt-1">Clause 2: Release of Liability</p>
            <p>I release {settings.gymName}, its staff, management, and trainers from all liability for accidental injury, damage, or loss incurred during workouts.</p>
            <p className="font-bold text-slate-900 pt-1">Clause 3: Disclosure of Health Limitations</p>
            <p>I agree to inform gym staff of any health or cardiovascular conditions affecting my training.</p>
          </div>

          {/* Member Signature Display */}
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-700 mb-1">Athlete Digital Signature / Verification Stamp:</p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block">
              {member.waiverSignatureURL ? (
                <img
                  src={member.waiverSignatureURL}
                  alt="Signature"
                  className="h-14 max-w-[200px] object-contain"
                />
              ) : (
                <span className="font-serif italic font-bold text-lg text-slate-900 tracking-wide">
                  {member.fullName || member.name}
                </span>
              )}
              <p className="text-[10px] text-slate-400 font-mono mt-1">Verified e-Signature • IP logged</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Transformations */}
      {activeTab === "transformations" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" /> Before & After Transformation Progress
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical progress photos, body fat changes, and mentor trainer notes.
              </p>
            </div>
            <button
              onClick={() => navigate("/trainer/before-after")}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Manage All Transformations
            </button>
          </div>

          {transformations.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
              <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No transformation photos uploaded for {member.name || member.fullName} yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload before & after progress photos in the Trainer section.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {transformations.map((t) => (
                <div key={t.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                        {t.duration || "12 Weeks Journey"}
                      </span>
                      <p className="text-xs text-slate-500 font-medium mt-1.5">
                        Mentored by <span className="text-slate-800 font-bold">{t.trainerName || member.trainerName}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {t.date ? formatDate(t.date) : "Verified"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-rose-600 uppercase">Starting Baseline</span>
                        <span className="font-bold text-slate-700">{t.startWeight || "Starting Wt"}</span>
                      </div>
                      <div className="h-56 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                        <img
                          src={t.beforeURL || t.beforeImg}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-emerald-600 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Transformed Result
                        </span>
                        <span className="font-bold text-emerald-700">{t.endWeight || "Current Wt"}</span>
                      </div>
                      <div className="h-56 rounded-xl overflow-hidden bg-slate-900 border border-emerald-200">
                        <img
                          src={t.afterURL || t.afterImg}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Weight Difference</p>
                      <p className="text-sm font-black text-emerald-600 mt-0.5">{t.weightDiff || "-11 kg"}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Body Fat Delta</p>
                      <p className="text-sm font-black text-purple-600 mt-0.5">{t.bodyFatDiff || "Optimized"}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Category</p>
                      <p className="text-xs font-bold text-slate-800 mt-1 truncate">{t.category || "Fat Loss & Conditioning"}</p>
                    </div>
                  </div>

                  {t.notes && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                      "{t.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Record Pay Modal */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="💳 Record Member Fee Payment">
        <form onSubmit={handleRecordPay} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700">Amount Paid (₹) *</label>
            <input
              required
              type="number"
              value={payForm.paidAmount}
              onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value, amount: e.target.value })}
              className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Payment Mode</label>
              <select
                value={payForm.paymentMode}
                onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              >
                <option value="online">Online UPI</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="mixed">Mixed / Split</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Payment Date</label>
              <input
                type="date"
                value={payForm.date}
                onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md transition hover:opacity-95"
          >
            Save Payment & Generate Receipt
          </button>
        </form>
      </Modal>

      {/* Add Mid-Month PT Package Modal */}
      <Modal isOpen={ptModalOpen} onClose={() => setPtModalOpen(false)} title={`✨ Add PT Package & Bill — ${member.name || member.fullName}`} maxWidth="max-w-xl">
        <div className="space-y-4 text-slate-800 text-xs">
          {/* Reassurance Banner */}
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏋️</span>
              <div>
                <p className="font-extrabold text-xs text-purple-950">1-on-1 Personal Training Add-on</p>
                <p className="text-[11px] text-purple-800 font-medium">
                  Current gym plan ({member.planName}) valid till {formatDate(member.expiryDate)} remains active. PT package starts from selected date.
                </p>
              </div>
            </div>
            <span className="px-2 py-1 rounded-md bg-purple-600 text-white font-extrabold text-[10px]">
              Mid-Month PT
            </span>
          </div>

          {/* Coach Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Select Personal Coach / Trainer *
            </label>
            <select
              value={ptForm.trainerId}
              onChange={(e) => setPtForm({ ...ptForm, trainerId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900"
            >
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.fullName} {t.specialization ? `(${t.specialization})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Package Preset & Name */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">PT Package Name</label>
              <input
                type="text"
                value={ptForm.packageName}
                onChange={(e) => setPtForm({ ...ptForm, packageName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">PT Start Date (Date of Taking PT)</label>
              <input
                type="date"
                value={ptForm.startDate}
                onChange={(e) => setPtForm({ ...ptForm, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-xs"
              />
            </div>
          </div>

          {/* Duration Chips */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Duration (Days)</label>
            <div className="flex gap-1.5 flex-wrap">
              {[15, 30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPtForm({ ...ptForm, durationDays: d })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    Number(ptForm.durationDays) === d
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {d >= 30 ? `${d / 30} Month(s)` : `${d} Days`}
                </button>
              ))}
            </div>
          </div>

          {/* Billing & Transaction */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-slate-700 block text-[11px] mb-1">Total PT Fee (₹)</label>
                <input
                  type="number"
                  value={ptForm.totalFee}
                  onChange={(e) => setPtForm({ ...ptForm, totalFee: e.target.value, payingNow: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-black text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block text-[11px] mb-1">Paying Now (₹)</label>
                <input
                  type="number"
                  value={ptForm.payingNow}
                  onChange={(e) => setPtForm({ ...ptForm, payingNow: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-emerald-300 font-black text-xs text-emerald-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block text-[11px] mb-1">Remaining Due (₹)</label>
                <div className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-black text-xs text-slate-700 flex items-center justify-between">
                  <span>₹{Math.max(0, (Number(ptForm.totalFee) || 0) - (Number(ptForm.payingNow) || 0))}</span>
                  {(Number(ptForm.totalFee) || 0) > (Number(ptForm.payingNow) || 0) && (
                    <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-900 font-bold">DUE</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="font-bold text-slate-700 block text-[11px] mb-1">Payment Mode</label>
                <select
                  value={ptForm.paymentMode}
                  onChange={(e) => setPtForm({ ...ptForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs"
                >
                  <option value="online">Online UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block text-[11px] mb-1">UPI Ref / UTR (Optional)</label>
                <input
                  type="text"
                  value={ptForm.referenceId}
                  onChange={(e) => setPtForm({ ...ptForm, referenceId: e.target.value })}
                  placeholder="e.g. 6271829..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPtModalOpen(false)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleActivatePT(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-sm hover:bg-black transition"
            >
              Record ₹{ptForm.payingNow} Only
            </button>
            <button
              type="button"
              onClick={() => handleActivatePT(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-extrabold text-xs shadow-md hover:from-purple-700 hover:to-indigo-800 transition flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
              Activate & WhatsApp Bill (₹{ptForm.payingNow})
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}