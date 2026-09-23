import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import MemberDashboard from "../pages/member/Dashboard";
import MemberProfile from "../pages/member/Profile";
import MyPlan from "../pages/member/MyPlan";
import MyTrainer from "../pages/member/MyTrainer";
import MemberPayments from "../pages/member/Payments";
import MemberStore from "../pages/member/Store";
import TrainerComplain from "../pages/member/TrainerComplain";
import { toast } from "react-hot-toast";

import { useAuth } from "../contexts/AuthContext";

export default function MemberRoutes() {
  const { role, logoutUser, profileId, user } = useAuth();
  const navigate = useNavigate();
  const hasMemberSession = Boolean(localStorage.getItem("univo_member_session"));

  // Real-time security guard: Instantly force-logout if PT is ended or member leaves
  useEffect(() => {
    let isSubscribed = true;

    const triggerForcedLogout = (msg) => {
      try {
        localStorage.removeItem("univo_member_session");
        if (localStorage.getItem("univo_active_role") === "member") {
          localStorage.removeItem("univo_active_role");
        }
      } catch (e) {}

      if (logoutUser) logoutUser();
      toast.error(msg, { id: "pt-ended-logout-msg", duration: 5000 });
      navigate("/login", { replace: true });
    };

    async function checkMemberStatus() {
      const sessStr = localStorage.getItem("univo_member_session");
      if (!sessStr) return;

      try {
        const sessObj = JSON.parse(sessStr);
        const targetId = sessObj?.id || profileId || user?.uid;
        if (!targetId) return;

        // 1. Immediate check against local session
        if (
          sessObj.ptStatus === "ended" ||
          sessObj.status === "left" ||
          sessObj.status === "ended" ||
          sessObj.memberPortalAccess === false ||
          sessObj.active === false
        ) {
          triggerForcedLogout("Aapka PT package end ho chuka hai. Session logout ho gaya.");
          return;
        }

        // 2. Fetch fresh document from Firestore
        const { getMember } = await import("../firebase/members");
        const fresh = await getMember("univo_main", targetId);
        if (!isSubscribed) return;

        if (fresh) {
          if (
            fresh.ptStatus === "ended" ||
            fresh.status === "left" ||
            fresh.status === "ended" ||
            fresh.memberPortalAccess === false ||
            fresh.active === false
          ) {
            triggerForcedLogout("Aapka PT package end ho chuka hai. Member portal access band kar diya gaya hai.");
          }
        }
      } catch (err) {
        console.warn("Member session check notice:", err);
      }
    }

    checkMemberStatus();

    // Listen to real-time BroadcastChannel & storage events
    let channel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("univo_session_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "FORCE_LOGOUT") {
            const sessStr = localStorage.getItem("univo_member_session");
            const sessObj = sessStr ? JSON.parse(sessStr) : null;
            if (!event.data.memberId || (sessObj && sessObj.id === event.data.memberId)) {
              triggerForcedLogout("PT Package ended: Member portal session logged out.");
            }
          }
        };
      }
    } catch (e) {}

    const handleStorage = (e) => {
      if (e.key === "univo_force_logout" || e.key === "univo_member_session") {
        checkMemberStatus();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isSubscribed = false;
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [profileId, user, role, logoutUser, navigate]);

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
