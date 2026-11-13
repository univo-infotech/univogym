import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import TrainerDashboard from "../pages/trainer/Dashboard";
import MyMembers from "../pages/trainer/MyMembers";
import TrainerProfile from "../pages/trainer/Profile";
import TrainerAttendance from "../pages/trainer/Attendance";
import TrainerReports from "../pages/trainer/Reports";
import { toast } from "react-hot-toast";

import { useAuth } from "../contexts/AuthContext";

export default function TrainerRoutes() {
  const { role, logoutUser, profileId, user } = useAuth();
  const navigate = useNavigate();
  const hasTrainerSession = Boolean(localStorage.getItem("univo_trainer_session"));

  // Real-time security guard: Instantly force-logout if trainer is deactivated or deleted
  useEffect(() => {
    // If viewing as gym owner or co-owner, bypass trainer security guard
    const rawRole = role || localStorage.getItem("univo_active_role") || "";
    const activeRole = String(rawRole).toLowerCase().trim();
    if (activeRole === "owner" || activeRole === "co-owner" || role === "owner") {
      return;
    }

    let isSubscribed = true;

    const triggerForcedLogout = (msg) => {
      try {
        localStorage.removeItem("univo_trainer_session");
        if (localStorage.getItem("univo_active_role") === "trainer") {
          localStorage.removeItem("univo_active_role");
        }
      } catch (e) {}

      if (logoutUser) logoutUser();
      toast.error(msg, { id: "trainer-ended-logout-msg", duration: 5000 });
      navigate("/login", { replace: true });
    };

    async function checkTrainerStatus() {
      const sessStr = localStorage.getItem("univo_trainer_session");
      if (!sessStr) return;

      try {
        const sessObj = JSON.parse(sessStr);
        const targetId = sessObj?.id || sessObj?.uid || profileId || user?.uid;
        if (!targetId) return;

        // 1. Immediate check against local session
        if (
          sessObj.isActive === false ||
          sessObj.status === "inactive" ||
          sessObj.status === "left" ||
          sessObj.active === false
        ) {
          triggerForcedLogout("Aapka coach account inactive ho chuka hai. Session logout ho gaya.");
          return;
        }

        // 2. Fetch fresh document from Firestore
        const { getTrainer } = await import("../firebase/trainers");
        const fresh = await getTrainer("univo_main", targetId);
        if (!isSubscribed) return;

        if (!fresh) {
          triggerForcedLogout("Account not found: Aapka coach profile gym database se delete ho chuka hai.");
          return;
        }

        if (
          fresh.isActive === false ||
          fresh.status === "inactive" ||
          fresh.status === "left" ||
          fresh.active === false
        ) {
          triggerForcedLogout("Aapka coach account inactive kar diya gaya hai. Portal access band ho gaya hai.");
          return;
        }
      } catch (err) {
        console.warn("Trainer session check notice:", err);
      }
    }

    checkTrainerStatus();

    // Listen to real-time BroadcastChannel & storage events
    let channel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("univo_session_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "FORCE_LOGOUT") {
            const sessStr = localStorage.getItem("univo_trainer_session");
            const sessObj = sessStr ? JSON.parse(sessStr) : null;
            const targetId = sessObj?.id || sessObj?.uid || profileId || user?.uid;
            if (!event.data.trainerId || (targetId && String(targetId) === String(event.data.trainerId))) {
              triggerForcedLogout("Coach account inactive: Trainer session logged out.");
            }
          }
        };
      }
    } catch (e) {}

    const handleStorage = (e) => {
      if (e.key === "univo_force_logout" || e.key === "univo_trainer_session") {
        checkTrainerStatus();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      isSubscribed = false;
      if (channel) {
        try { channel.close(); } catch (e) {}
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [role, profileId, user?.uid, logoutUser, navigate]);

  const rawRole = role || localStorage.getItem("univo_active_role") || "";
  const activeRole = String(rawRole).toLowerCase().trim();
  if (!hasTrainerSession && activeRole !== "owner" && activeRole !== "co-owner" && activeRole !== "trainer") {
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
