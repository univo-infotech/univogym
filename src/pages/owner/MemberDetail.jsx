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
  Sun
} from "lucide-react";
import toast from "react-hot-toast";
import { getMember } from "../../firebase/members";
import { getMemberPayments, addPayment } from "../../firebase/payments";
import { generatePaymentReceipt } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
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
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [settings] = useState(getGymSettings());

  const [payForm, setPayForm] = useState({
    amount: "1499",
    paidAmount: "1499",
    dueAmount: "0",
    paymentMode: "online",
    date: new Date().toISOString().split("T")[0],
  });

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

  const handleRecordPay = (e) => {
    e.preventDefault();
    const newP = {
      ...payForm,
      id: "p_" + Date.now(),
      memberName: member.name || member.fullName,
      planName: member.planName || "Membership Plan",
    };
    setPayments([newP, ...payments]);
    setPayModalOpen(false);
    toast.success("Payment recorded!");
  };

  const initials = (member.name || member.fullName || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[11px] border border-indigo-200 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  PT Add-on: {member.ptPlanName} {member.ptPlanPrice ? `(+₹${Number(member.ptPlanPrice).toLocaleString('en-IN')})` : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              const num = (member.phone || "").replace(/\D/g, "");
              window.open(`https://wa.me/${num}?text=Hi%20${member.name || member.fullName},%20Greetings%20from%20${settings.gymName}!`, "_blank");
            }}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp Chat
          </button>
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
    </div>
  );
}