import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";

// Owner Pages - lazy imported for performance
import OwnerDashboard from "../pages/owner/Dashboard";
import Members from "../pages/owner/Members";
import MemberDetail from "../pages/owner/MemberDetail";
import Trainers from "../pages/owner/Trainers";
import TrainerDetail from "../pages/owner/TrainerDetail";
import Staff from "../pages/owner/Staff";
import Memberships from "../pages/owner/Memberships";
import Services from "../pages/owner/Services";
import Stock from "../pages/owner/Stock";
import Payments from "../pages/owner/Payments";
import Expenses from "../pages/owner/Expenses";
import Reports from "../pages/owner/Reports";
import Visits from "../pages/owner/Visits";
import Offers from "../pages/owner/Offers";
import Settings from "../pages/owner/Settings";
import RolesPermissions from "../pages/owner/RolesPermissions";

export default function OwnerRoutes() {
  return (
    <Layout role="owner">
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:memberId" element={<MemberDetail />} />
        <Route path="trainers" element={<Trainers />} />
        <Route path="trainers/:trainerId" element={<TrainerDetail />} />
        <Route path="staff" element={<Staff />} />
        <Route path="memberships" element={<Memberships />} />
        <Route path="services" element={<Services />} />
        <Route path="stock" element={<Stock />} />
        <Route path="payments" element={<Payments />} />
        <Route path="fees" element={<Payments />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="visits" element={<Visits />} />
        <Route path="offers" element={<Offers />} />
        <Route path="settings" element={<Settings />} />
        <Route path="roles" element={<RolesPermissions />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
