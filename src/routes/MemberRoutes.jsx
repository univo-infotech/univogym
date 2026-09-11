import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import MemberDashboard from "../pages/member/Dashboard";
import MemberProfile from "../pages/member/Profile";
import MyPlan from "../pages/member/MyPlan";
import MyTrainer from "../pages/member/MyTrainer";
import MemberPayments from "../pages/member/Payments";

export default function MemberRoutes() {
  return (
    <Layout role="member">
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<MemberDashboard />} />
        <Route path="profile" element={<MemberProfile />} />
        <Route path="plan" element={<MyPlan />} />
        <Route path="trainer" element={<MyTrainer />} />
        <Route path="payments" element={<MemberPayments />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
