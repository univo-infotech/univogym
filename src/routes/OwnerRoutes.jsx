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
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../contexts/AuthContext";

function PermissionRoute({ moduleId, children }) {
  const { view } = usePermissions(moduleId);
  if (!view) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

export default function OwnerRoutes() {
  const { role } = useAuth();
  
  return (
    <Layout role={role}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PermissionRoute moduleId="dashboard"><OwnerDashboard /></PermissionRoute>} />
        <Route path="members" element={<PermissionRoute moduleId="members"><Members /></PermissionRoute>} />
        <Route path="members/:memberId" element={<PermissionRoute moduleId="members"><MemberDetail /></PermissionRoute>} />
        <Route path="trainers" element={<PermissionRoute moduleId="trainers"><Trainers /></PermissionRoute>} />
        <Route path="trainers/:trainerId" element={<PermissionRoute moduleId="trainers"><TrainerDetail /></PermissionRoute>} />
        <Route path="staff" element={<PermissionRoute moduleId="staff"><Staff /></PermissionRoute>} />
        <Route path="memberships" element={<PermissionRoute moduleId="memberships"><Memberships /></PermissionRoute>} />
        <Route path="services" element={<PermissionRoute moduleId="services"><Services /></PermissionRoute>} />
        <Route path="stock" element={<PermissionRoute moduleId="stock"><Stock /></PermissionRoute>} />
        <Route path="payments" element={<PermissionRoute moduleId="payments"><Payments /></PermissionRoute>} />
        <Route path="fees" element={<PermissionRoute moduleId="payments"><Payments /></PermissionRoute>} />
        <Route path="expenses" element={<PermissionRoute moduleId="expenses"><Expenses /></PermissionRoute>} />
        <Route path="reports" element={<PermissionRoute moduleId="reports"><Reports /></PermissionRoute>} />
        <Route path="visits" element={<PermissionRoute moduleId="visits"><Visits /></PermissionRoute>} />
        <Route path="offers" element={<PermissionRoute moduleId="offers"><Offers /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute moduleId="settings"><Settings /></PermissionRoute>} />
        
        {/* Roles config is strictly owner only */}
        <Route path="roles" element={role === 'owner' ? <RolesPermissions /> : <Navigate to="/unauthorized" replace />} />
        
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
