import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Loader from "./components/ui/Loader";
import Login from "./pages/auth/Login";
import MemberSelfRegister from "./pages/auth/MemberSelfRegister";

// Owner Pages
import OwnerLayout from "./routes/OwnerRoutes";
import TrainerLayout from "./routes/TrainerRoutes";
import MemberLayout from "./routes/MemberRoutes";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

function RoleRedirect() {
  const { role, loading } = useAuth();
  if (loading) return <Loader />;
  if (role === "owner") return <Navigate to="/owner/dashboard" replace />;
  if (role === "trainer") return <Navigate to="/trainer/dashboard" replace />;
  if (role === "member") return <Navigate to="/member/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register/:gymId/:token" element={<MemberSelfRegister />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Owner Routes */}
      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <OwnerLayout />
          </ProtectedRoute>
        }
      />

      {/* Trainer Routes */}
      <Route
        path="/trainer/*"
        element={
          <ProtectedRoute allowedRoles={["trainer", "owner"]}>
            <TrainerLayout />
          </ProtectedRoute>
        }
      />

      {/* Member Routes */}
      <Route
        path="/member/*"
        element={
          <ProtectedRoute allowedRoles={["member", "owner"]}>
            <MemberLayout />
          </ProtectedRoute>
        }
      />

      {/* Unauthorized */}
      <Route
        path="/unauthorized"
        element={
          <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="text-center">
              <div className="text-6xl mb-4">🚫</div>
              <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
              <p className="text-slate-400">You dont have permission to access this page.</p>
            </div>
          </div>
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="text-center">
              <div className="text-6xl mb-4">🏋️</div>
              <h1 className="text-4xl font-bold text-white mb-2">404</h1>
              <p className="text-slate-400">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
