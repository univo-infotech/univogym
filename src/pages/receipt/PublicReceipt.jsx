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
  const [settings, setSettings] = useState(getGymSettings());

  useEffect(() => {
    // Refresh settings from local storage
    setSettings(getGymSettings());

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
          const memberName = searchParams.get("name") || "Athlete";
          const amount = searchParams.get("amount") || "599";
          const plan = searchParams.get("plan") || "1 Month Standard";
          data = {
            id: receiptId || "doc_demo",
            memberName,
            phone: searchParams.get("phone") || "9196302375",
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

        if (data) {
          // Extract PT name if embedded in planName
          const ptMatch = data.planName ? data.planName.match(/\+\s*PT\s*\((.*?)\)/i) : null;
          if (ptMatch && ptMatch[1] && !data.ptPlanName) {
            data.ptPlanName = ptMatch[1].trim();
          }

          // Extract Services if embedded in planName
          const servicesMatch = data.planName ? data.planName.match(/\+\s*Services\s*\((.*?)\)/i) : null;

          const paidTotal = Number(data.amount || data.paidAmount || 0);
          const baseFee = Number(data.planPrice || 0);
          const ptFee = Number(data.ptPlanPrice || data.ptFee || 0);
          const diff = Math.max(0, paidTotal - (baseFee + ptFee));

          if (!data.servicesPrice && !data.servicesTotalPrice) {
            if (diff > 0 && (servicesMatch || (data.planName && data.planName.toLowerCase().includes("service")) || (data.selectedServices && data.selectedServices.length > 0))) {
              data.servicesPrice = diff;
            }
          }

          // If selectedServices is empty/not an array, parse from servicesMatch
          if ((!Array.isArray(data.selectedServices) || data.selectedServices.length === 0) && servicesMatch && servicesMatch[1]) {
            const names = servicesMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
            const totalSPrice = Number(data.servicesPrice || data.servicesTotalPrice || diff || 0);
            data.selectedServices = names.map((name, i) => ({
              id: `parsed_service_${i}`,
              name,
              price: i === 0 ? totalSPrice : 0
            }));
            if (!data.servicesPrice) data.servicesPrice = totalSPrice;
          }

          // Infer base planPrice if missing
          if (!data.planPrice) {
            const extra = Number(data.ptPlanPrice || data.ptFee || 0) + Number(data.servicesPrice || data.servicesTotalPrice || 0);
            data.planPrice = Math.max(0, paidTotal - extra);
          }
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
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 sm:p-7 text-white text-center relative">
          {/* Gym Logo */}
          {settings.logoUrl && (
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md p-1.5 border border-white/30 shadow-lg flex items-center justify-center overflow-hidden">
                <img
                  src={settings.logoUrl}
                  alt={settings.gymName || "Gym Logo"}
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.style.display = "none";
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Tax Invoice & Receipt
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
            {settings.gymName || "UNIVO GYM"}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-0.5 font-medium">
            {settings.tagline || "Stronger Today, Healthier Tomorrow"}
          </p>
          <p className="text-[11px] sm:text-xs text-emerald-200 mt-1 font-medium">
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
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            {/* 1. Base Plan Fee */}
            <div className="flex justify-between items-center text-xs text-slate-600 py-1">
              <span className="font-medium">🏋️ Plan Base Fee:</span>
              <span className="font-bold text-slate-900">₹{Number(payment.planPrice || payment.amount || 0).toLocaleString('en-IN')}</span>
            </div>

            {/* 2. Personal Training (PT) Fee */}
            {(Number(payment.ptPlanPrice) > 0 || payment.ptFee > 0) && (
              <div className="flex justify-between items-center text-xs text-indigo-700 bg-indigo-50/60 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                <span className="font-bold flex items-center gap-1.5">
                  ✨ Personal Training (PT):
                  {payment.ptPlanName && <span className="text-[11px] font-semibold text-indigo-900">({payment.ptPlanName})</span>}
                </span>
                <span className="font-black text-indigo-800">+₹{Number(payment.ptPlanPrice || payment.ptFee || 0).toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* 3. Add-on Services Breakdown */}
            {((Array.isArray(payment.selectedServices) && payment.selectedServices.length > 0) || 
              (Array.isArray(payment.services) && payment.services.length > 0) || 
              Number(payment.servicesPrice) > 0 || 
              Number(payment.servicesTotalPrice) > 0) && (
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-2.5 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                  <span className="flex items-center gap-1">⭐ Add-on Services:</span>
                  <span className="font-black text-amber-900">
                    +₹{Number(payment.servicesPrice || payment.servicesTotalPrice || 
                      (Array.isArray(payment.selectedServices) ? payment.selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0) : 0) ||
                      (Array.isArray(payment.services) ? payment.services.reduce((sum, s) => sum + Number(s.price || 0), 0) : 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
                
                {/* List individual services if available */}
                {Array.isArray(payment.selectedServices) && payment.selectedServices.length > 0 ? (
                  <div className="space-y-1 pl-2 pt-1 border-t border-amber-200/50">
                    {payment.selectedServices.map((srv, idx) => (
                      <div key={srv.id || idx} className="flex justify-between items-center text-[11px] text-amber-900">
                        <span>• {srv.name}</span>
                        <span className="font-semibold">+₹{Number(srv.price || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(payment.services) && payment.services.length > 0 ? (
                  <div className="space-y-1 pl-2 pt-1 border-t border-amber-200/50">
                    {payment.services.map((srv, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] text-amber-900">
                        <span>• {srv.name}</span>
                        <span className="font-semibold">+₹{Number(srv.price || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  payment.planName && payment.planName.includes("Services (") && (
                    <p className="text-[11px] text-amber-800 italic pl-2">
                      {payment.planName.split("Services (")[1]?.replace(")", "") || "Service Included"}
                    </p>
                  )
                )}
              </div>
            )}

            {/* 4. Promotional Discount */}
            {Number(payment.discount) > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="font-semibold">🏷️ Promotional Discount:</span>
                <span className="font-bold">-₹{Number(payment.discount).toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* 5. Total Payable Calculation Check if higher than base */}
            {Number(payment.amount || 0) > Number(payment.planPrice || 0) && (
              <div className="flex justify-between items-center text-xs text-slate-700 font-bold py-1 border-t border-dashed border-slate-200">
                <span>Total Package Bill:</span>
                <span className="text-slate-900 font-black">₹{Number(payment.amount).toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* 6. Payment Mode & Split Details */}
            <div className="flex justify-between items-center text-xs text-slate-600 py-1">
              <span>Payment Mode:</span>
              <span className="font-bold text-slate-800 uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                {payment.paymentMode === "split" ? "⚡ SPLIT (CASH + UPI)" : (payment.paymentMode || "Cash")}
              </span>
            </div>

            {/* If Split payment used, display specific amounts */}
            {payment.paymentMode === "split" && (payment.cashAmount || payment.onlineAmount || (payment.remarks && payment.remarks.includes("Cash:"))) && (
              <div className="flex justify-between items-center text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                <span>Payment Mode Breakdown:</span>
                <span className="font-semibold text-slate-900">
                  {payment.cashAmount && payment.onlineAmount 
                    ? `💵 Cash: ₹${payment.cashAmount} | 📱 UPI: ₹${payment.onlineAmount}`
                    : payment.remarks}
                </span>
              </div>
            )}

            {payment.remarks && payment.paymentMode !== "split" && (
              <div className="flex justify-between text-xs text-slate-500 py-1">
                <span>Reference / Remarks:</span>
                <span className="font-medium text-slate-800">{payment.remarks}</span>
              </div>
            )}

            {/* Total Paid & Balance Due */}
            <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">AMOUNT RECEIVED</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700">
                  ₹{Number(payment.paidAmount || payment.amount || 0).toLocaleString('en-IN')}
                </p>
              </div>

              {isPartial && (
                <div className="text-right">
                  <p className="text-[11px] font-bold text-rose-600 uppercase">REMAINING DUE</p>
                  <p className="text-xl sm:text-2xl font-black text-rose-600">
                    ₹{Number(payment.dueAmount).toLocaleString('en-IN')}
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
