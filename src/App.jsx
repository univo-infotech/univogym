import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Loader from "./components/ui/Loader";
import Login from "./pages/auth/Login";
import MemberSelfRegister from "./pages/auth/MemberSelfRegister";
import TrainerSelfRegister from "./pages/auth/TrainerSelfRegister";
import PublicReceipt from "./pages/receipt/PublicReceipt";

// Owner Pages
import OwnerLayout from "./routes/OwnerRoutes";
import TrainerLayout from "./routes/TrainerRoutes";
import MemberLayout from "./routes/MemberRoutes";

import { useNavigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  const rawRole = role || localStorage.getItem("univo_active_role") || "";
  const activeRole = String(rawRole).toLowerCase().trim();
  const hasSession =
    Boolean(user) ||
    Boolean(localStorage.getItem("univo_trainer_session")) ||
    Boolean(localStorage.getItem("univo_member_session")) ||
    Boolean(localStorage.getItem("univo_staff_session")) ||
    Boolean(localStorage.getItem("univo_owner_session")) ||
    Boolean(localStorage.getItem("univo_active_role"));

  if (loading && !activeRole) return <Loader />;
  if (!hasSession && !user && !activeRole) return <Navigate to="/login" replace />;
  if (loading) return <Loader />;

  // OWNER and CO-OWNER have master access across the entire gym portal - never deny owner
  if (activeRole === "owner" || activeRole === "co-owner") {
    return children;
  }

  const normalizedAllowedRoles = (allowedRoles || []).map((r) => String(r).toLowerCase().trim());
  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(activeRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

function UnauthorizedPage() {
  const navigate = useNavigate();
  const { role, logoutUser, user } = useAuth();
  const rawRole = role || localStorage.getItem("univo_active_role") || (localStorage.getItem("univo_owner_session") ? "owner" : "guest");
  const activeRole = String(rawRole).toLowerCase().trim();

  // If owner, co-owner, or master owner ever hits /unauthorized, auto-redirect directly to owner dashboard
  if (activeRole === "owner" || activeRole === "co-owner" || user?.email === "univo@gmail.com" || Boolean(localStorage.getItem("univo_owner_session"))) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  const getDashboardPath = () => {
    if (activeRole === "trainer") return "/trainer/dashboard";
    if (activeRole === "member") return "/member/dashboard";
    if (activeRole === "owner" || activeRole === "staff" || activeRole === "co-owner") return "/owner/dashboard";
    return "/login";
  };

  const handleLogout = async () => {
    try {
      if (logoutUser) await logoutUser();
    } catch (e) {}
    localStorage.removeItem("univo_active_role");
    localStorage.removeItem("univo_trainer_session");
    localStorage.removeItem("univo_member_session");
    localStorage.removeItem("univo_staff_session");
    localStorage.removeItem("univo_owner_session");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          You don't have permission to access this page. Your account role ({activeRole.toUpperCase()}) does not have access to this section.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(getDashboardPath(), { replace: true })}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all"
          >
            Go to My Dashboard ({activeRole.toUpperCase()})
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all border border-slate-700"
          >
            Sign In with Another Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, role, loading } = useAuth();
  const rawRole = role || localStorage.getItem("univo_active_role") || "";
  const activeRole = String(rawRole).toLowerCase().trim();
  const hasSession =
    Boolean(user) ||
    Boolean(localStorage.getItem("univo_trainer_session")) ||
    Boolean(localStorage.getItem("univo_member_session")) ||
    Boolean(localStorage.getItem("univo_staff_session")) ||
    Boolean(localStorage.getItem("univo_owner_session")) ||
    Boolean(localStorage.getItem("univo_active_role"));

  return (
    <Routes>
      {/* Root route: If not logged in, show Login page directly (No redirect!) */}
      <Route
        path="/"
        element={
          loading && !hasSession ? (
            <Loader />
          ) : hasSession ? (
            (activeRole === "owner" || activeRole === "staff" || activeRole === "co-owner") ? (
              <Navigate to="/owner/dashboard" replace />
            ) : activeRole === "trainer" ? (
              <Navigate to="/trainer/dashboard" replace />
            ) : (
              <Navigate to="/member/dashboard" replace />
            )
          ) : (
            <Login />
          )
        }
      />

      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register/:gymId/:token" element={<MemberSelfRegister />} />
      <Route path="/register-trainer" element={<TrainerSelfRegister />} />
      <Route path="/register-trainer/:gymId" element={<TrainerSelfRegister />} />
      <Route path="/register-trainer/:gymId/:token" element={<TrainerSelfRegister />} />
      <Route path="/receipt/:receiptId" element={<PublicReceipt />} />

      {/* Owner & Staff Routes */}
      <Route
        path="/owner/*"
        element={
          <ProtectedRoute allowedRoles={["owner", "staff"]}>
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
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 404 Fallback: Any other URL goes to Home/Login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
