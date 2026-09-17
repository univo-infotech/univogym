import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import MemberDashboard from "../pages/member/Dashboard";
import MemberProfile from "../pages/member/Profile";
import MyPlan from "../pages/member/MyPlan";
import MyTrainer from "../pages/member/MyTrainer";
import MemberPayments from "../pages/member/Payments";
import MemberStore from "../pages/member/Store";
import TrainerComplain from "../pages/member/TrainerComplain";

import { useAuth } from "../contexts/AuthContext";

export default function MemberRoutes() {
  const { role } = useAuth();
  const hasMemberSession = Boolean(localStorage.getItem("univo_member_session"));

  if (!hasMemberSession && role !== "owner" && role !== "member") {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout role="member">
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<MemberDashboard />} />
        <Route path="profile" element={<MemberProfile />} />
        <Route path="plan" element={<MyPlan />} />
        <Route path="store" element={<MemberStore />} />
        <Route path="trainer" element={<MyTrainer />} />
        <Route path="complain" element={<TrainerComplain />} />
        <Route path="payments" element={<MemberPayments />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
