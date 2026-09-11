import React, { useState } from "react";
import { BarChart2, TrendingUp, Calendar, Download, DollarSign, Users, ShoppingBag } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Button from "../../components/ui/Button";

export default function Reports() {
  const [reportType, setReportType] = useState("monthly");

  const monthlyData = [
    { month: "Apr", revenue: 142000, expenses: 45000 },
    { month: "May", revenue: 165000, expenses: 50000 },
    { month: "Jun", revenue: 178000, expenses: 52000 },
    { month: "Jul", revenue: 195000, expenses: 55000 },
    { month: "Aug", revenue: 215000, expenses: 58000 },
    { month: "Sep", revenue: 184500, expenses: 48000 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Financial Statements</h1>
          <p className="text-slate-500 text-xs mt-1">
            Revenue growth, expense breakdown & net profit analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-sm"
          >
            Download P&L Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Net Profit (Last 6 Months)</p>
            <h3 className="text-xl font-extrabold text-slate-900">₹771,500</h3>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">New Enrolled Members</p>
            <h3 className="text-xl font-extrabold text-slate-900">+148 Athletes</h3>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Average Monthly Growth</p>
            <h3 className="text-xl font-extrabold text-purple-600">+18.4%</h3>
          </div>
        </div>
      </div>

      {/* Graphical Bar Chart */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue vs Operational Expenses
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Green = Gross Revenue | Red = Gym Overhead Costs</p>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mt-3 sm:mt-0">
            {["monthly", "quarterly"].map((t) => (
              <button
                key={t}
                onClick={() => setReportType(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                  reportType === t ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(val) => [`₹${val.toLocaleString()}`]}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="Gross Revenue" />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}