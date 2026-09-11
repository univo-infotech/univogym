import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import TrainerDashboard from "../pages/trainer/Dashboard";
import MyMembers from "../pages/trainer/MyMembers";
import WorkoutPlans from "../pages/trainer/WorkoutPlans";
import BeforeAfter from "../pages/trainer/BeforeAfter";
import TrainerAttendance from "../pages/trainer/Attendance";

export default function TrainerRoutes() {
  return (
    <Layout role="trainer">
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TrainerDashboard />} />
        <Route path="members" element={<MyMembers />} />
        <Route path="plans" element={<WorkoutPlans />} />
        <Route path="before-after" element={<BeforeAfter />} />
        <Route path="attendance" element={<TrainerAttendance />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
