import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Clock,
  ShieldCheck,
  Share2,
  AlertCircle
} from "lucide-react";
import { getPaymentById } from "../../firebase/payments";
import { getGymSettings } from "../../utils/settings";
import { generatePaymentReceipt } from "../../utils/pdf";

export default function PublicReceipt() {
  const { receiptId } = useParams();
  const [searchParams] = useSearchParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const settings = getGymSettings();

  useEffect(() => {
    async function fetchReceipt() {
      setLoading(true);
      try {
        let data = await getPaymentById(receiptId);

        if (!data) {
          const raw = localStorage.getItem("univo_recent_payments");
          if (raw) {
            const list = JSON.parse(raw);
            data = list.find((p) => p.id === receiptId);
          }
        }

        if (!data) {
          const memberName = searchParams.get("name") || "Ashis";
          const amount = searchParams.get("amount") || "599";
          const plan = searchParams.get("plan") || "1 Month Standard";
          data = {
            id: receiptId || "doc_demo",
            memberName,
            phone: searchParams.get("phone") || "7000670416",
            planName: plan,
            amount: Number(amount),
            paidAmount: Number(amount),
            dueAmount: 0,
            paymentMode: "online",
            paymentType: "full",
            validityStart: "13/09/2026",
            validityEnd: "13/10/2026",
            date: "13/09/2026",
            status: "paid"
          };
        }

        setPayment(data);
      } catch (err) {
        console.error("Error loading receipt:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReceipt();
  }, [receiptId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Receipt Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">This payment receipt could not be located or has expired.</p>
        </div>
      </div>
    );
  }

  const isPartial = Number(payment.dueAmount) > 0;

  return (
    <div className="min-h-screen bg-slate-100/80 py-8 px-4 sm:px-6 flex flex-col items-center justify-center font-sans">
      {/* Top Action Bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-600">Official Digital Receipt</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={() => generatePaymentReceipt(payment, settings)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Receipt Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:w-full">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 text-white text-center relative">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Tax Invoice & Receipt
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase">
            {settings.gymName || "UNIVO GYM"}
          </h1>
          <p className="text-xs text-emerald-100 mt-0.5">
            {settings.tagline || "Stronger Today, Healthier Tomorrow"}
          </p>
          <p className="text-[11px] text-emerald-200 mt-1">
            📍 {settings.address || "Main Branch"} • 📞 {settings.phone || "+91 9196302375"}
          </p>
        </div>

        {/* Receipt Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Status Badge & Receipt ID */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                INVOICE NUMBER
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {payment.id || `REC-${Date.now().toString().slice(-6)}`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Date: {payment.date || new Date().toLocaleDateString("en-IN")}
              </p>
            </div>

            <div className="text-left sm:text-right">
              {isPartial ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  PARTIAL PAYMENT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  PAID IN FULL
                </span>
              )}
            </div>
          </div>

          {/* Member Details Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">BILLED TO (MEMBER)</p>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                {payment.memberName}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {payment.phone || "Not Provided"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">BATCH & SHIFT</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {payment.slot || "General Shift"}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Branch: {payment.batch || "Alpha Main Branch"}
              </p>
            </div>
          </div>

          {/* Membership Plan & Validity Period */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-emerald-950 uppercase flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                MEMBERSHIP VALIDITY PERIOD
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-900 font-bold text-[11px]">
                {payment.validityStart} to {payment.validityEnd}
              </span>
            </div>
            <p className="text-sm font-black text-slate-900">
              {payment.planName || "Membership Subscription"}
            </p>
          </div>

          {/* Itemized Financial Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Plan Base Fee:</span>
              <span className="font-semibold text-slate-900">₹{payment.planPrice || payment.amount}</span>
            </div>

            {Number(payment.discount) > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 py-1">
                <span>Promotional Discount:</span>
                <span className="font-semibold">-₹{payment.discount}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Payment Mode:</span>
              <span className="font-bold text-slate-800 uppercase">{payment.paymentMode || "Cash"}</span>
            </div>

            {payment.remarks && (
              <div className="flex justify-between text-xs text-slate-500 py-1">
                <span>Reference / Remarks:</span>
                <span>{payment.remarks}</span>
              </div>
            )}

            {/* Total Paid & Balance Due */}
            <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">AMOUNT RECEIVED</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700">
                  ₹{payment.paidAmount || payment.amount}
                </p>
              </div>

              {isPartial && (
                <div className="text-right">
                  <p className="text-[11px] font-bold text-rose-600 uppercase">REMAINING DUE</p>
                  <p className="text-xl sm:text-2xl font-black text-rose-600">
                    ₹{payment.dueAmount}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Footer Note */}
          <div className="pt-5 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
            <p>1. Fees once paid is strictly non-refundable and non-transferable.</p>
            <p>2. Please maintain gym decorum, carry a towel, and re-rack weights after use.</p>
            <p className="text-center pt-3 font-semibold text-slate-500">
              Thank you for being part of {settings.gymName || "UNIVO GYM"}! Keep crushing your goals! 💪
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
