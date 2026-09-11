import React, { useState } from "react";
import { BarChart2, TrendingUp, Calendar, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Button from "../../components/ui/Button";

export default function Reports() {
  const [reportType, setReportType] = useState("monthly");

  const monthlyData = [
    { month: "Jan", revenue: 95000, expenses: 40000 },
    { month: "Feb", revenue: 110000, expenses: 42000 },
    { month: "Mar", revenue: 135000, expenses: 48000 },
    { month: "Apr", revenue: 142000, expenses: 45000 },
    { month: "May", revenue: 165000, expenses: 50000 },
    { month: "Jun", revenue: 184500, expenses: 52000 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports & Financial Statements</h2>
          <p className="text-slate-400 text-xs mt-1">Daily, monthly & custom profit/loss statements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
            Download PDF Report
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {["daily", "monthly", "custom"].map((t) => (
          <button
            key={t}
            onClick={() => setReportType(t)}
            className={`text-xs px-4 py-1.5 rounded-xl font-medium capitalize transition ${
              reportType === t ? "bg-green-500/20 text-green-400 border border-green-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            {t} Statement
          </button>
        ))}
      </div>

      {/* Graphical Bar Chart */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" /> Revenue vs Expenses (Net Profit)
        </h3>
        <p className="text-xs text-slate-400 mb-6">Financial performance metrics</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "10px" }} />
              <Bar dataKey="revenue" fill="#22c55e" radius={[6, 6, 0, 0]} name="Total Revenue (₹)" />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Total Expenses (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
