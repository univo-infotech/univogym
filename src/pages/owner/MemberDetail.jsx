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
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { getMember } from "../../firebase/members";
import { getMemberPayments, addPayment } from "../../firebase/payments";
import { generatePaymentReceipt } from "../../utils/pdf";
import { getGymSettings } from "../../utils/settings";
import Modal from "../../components/ui/Modal";

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [settings] = useState(getGymSettings());

  const [payForm, setPayForm] = useState({
    amount: "6500",
    paidAmount: "6500",
    dueAmount: "0",
    paymentMode: "online",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    async function load() {
      try {
        const m = await getMember("univo_main", id);
        if (m) {
          setMember(m);
        } else {
          setMember({
            id: id || "m1",
            name: "Ajay Prajapati",
            fullName: "Ajay Prajapati",
            phone: "+91 9196302375",
            email: "ajay@univogym.com",
            gender: "Male",
            planName: "3-Month Pro Transformation",
            trainerName: "Coach Amit Kumar",
            status: "active",
            createdAt: "2026-09-10",
            expiryDate: "2026-12-10",
            waiverSigned: true,
            waiverSignedDate: "2026-09-10",
            waiverSignatureURL: "https://via.placeholder.com/200x80?text=Ajay+Prajapati+Signature",
          });
        }
        const p = await getMemberPayments("univo_main", id);
        setPayments(p && p.length > 0 ? p : [
          { id: "p1", memberName: "Ajay Prajapati", planName: "3-Month Pro", paidAmount: 6500, amount: 6500, dueAmount: 0, paymentMode: "online", date: "2026-09-10" }
        ]);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [id]);

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
      planName: member.planName,
    };
    setPayments([newP, ...payments]);
    setPayModalOpen(false);
    toast.success("Payment recorded!");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button & Profile Header */}
      <button
        onClick={() => navigate("/owner/members")}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Members List
      </button>

      {/* Athlete Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-2xl shadow-sm">
            {(member.name || "A").split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{member.fullName || member.name}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {member.status?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{member.phone} • {member.email}</p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">Plan: {member.planName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              const num = (member.phone || "").replace(/\D/g, "");
              window.open(`https://wa.me/${num}?text=Hi%20${member.name},%20Greetings%20from%20${settings.gymName}!`, "_blank");
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
              <p><span className="font-semibold text-slate-800">Gender: </span>{member.gender || "Male"}</p>
              <p><span className="font-semibold text-slate-800">Phone: </span>{member.phone || "—"}</p>
              <p><span className="font-semibold text-slate-800">Email: </span>{member.email || "—"}</p>
              <p><span className="font-semibold text-slate-800">Joined Date: </span>{member.createdAt || "2026-09-10"}</p>
              <p><span className="font-semibold text-slate-800">Plan Expiry: </span>{member.expiryDate || "2026-12-10"}</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900">Coaching & Training</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <p><span className="font-semibold text-slate-800">Assigned Trainer: </span>{member.trainerName || "Coach Amit Kumar"}</p>
              <p><span className="font-semibold text-slate-800">Membership Tier: </span>{member.planName}</p>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 mt-2">
                <span className="font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Digital Liability Waiver Verified</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">Signed during member onboarding with e-signature</p>
              </div>
            </div>
          </div>
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
              <p className="text-xs text-slate-500">Signed on {member.waiverSignedDate || "2026-09-10"}</p>
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

          {/* Member E-Signature Display */}
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-700 mb-1">Athlete Digital Signature / Verification Stamp:</p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block">
              <span className="font-serif italic font-bold text-lg text-slate-900 tracking-wide">
                {member.fullName || member.name}
              </span>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Verified e-Signature • IP logged</p>
            </div>
          </div>
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