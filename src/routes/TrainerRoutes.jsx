import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import TrainerDashboard from "../pages/trainer/Dashboard";
import MyMembers from "../pages/trainer/MyMembers";
import TrainerProfile from "../pages/trainer/Profile";
import TrainerAttendance from "../pages/trainer/Attendance";
import TrainerReports from "../pages/trainer/Reports";

import { useAuth } from "../contexts/AuthContext";

export default function TrainerRoutes() {
  const { role } = useAuth();
  const hasTrainerSession = Boolean(localStorage.getItem("univo_trainer_session"));

  if (!hasTrainerSession && role !== "owner") {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout role="trainer">
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TrainerDashboard />} />
        <Route path="members" element={<MyMembers />} />
        <Route path="reports" element={<TrainerReports />} />
        <Route path="profile" element={<TrainerProfile />} />
        <Route path="attendance" element={<TrainerAttendance />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
