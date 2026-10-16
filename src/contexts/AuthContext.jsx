import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserRole } from "../firebase/auth";

const AuthContext = createContext(null);

function getInitialAuthState() {
  try {
    const activeRole = localStorage.getItem("univo_active_role");
    const savedMember = localStorage.getItem("univo_member_session");
    const savedTrainer = localStorage.getItem("univo_trainer_session");
    const savedStaff = localStorage.getItem("univo_staff_session");

    // 1. If active role is member, or member session exists and not explicitly owner/trainer
    if (activeRole === "member" || (savedMember && activeRole !== "owner" && activeRole !== "trainer" && activeRole !== "staff")) {
      if (savedMember) {
        const parsed = JSON.parse(savedMember);
        if (parsed && (parsed.id || parsed.uid)) {
          return {
            user: { uid: parsed.id || parsed.uid, displayName: parsed.name || parsed.fullName || "Athlete", email: parsed.email || parsed.loginEmail, ...parsed },
            role: "member",
            gymId: parsed.gymId || "univo_main",
            profileId: parsed.id || parsed.uid,
            permissions: [],
            loading: false,
          };
        }
      }
    }

    // 2. If active role is trainer
    if (activeRole === "trainer" || (savedTrainer && activeRole !== "owner" && activeRole !== "member" && activeRole !== "staff")) {
      if (savedTrainer) {
        try {
          const parsed = JSON.parse(savedTrainer);
          if (parsed && (parsed.id || parsed.uid)) {
            return {
              user: { uid: parsed.id || parsed.uid, displayName: parsed.name || "Coach", email: parsed.email || parsed.loginEmail, ...parsed },
              role: "trainer",
              gymId: parsed.gymId || "univo_main",
              profileId: parsed.id || parsed.uid,
              permissions: [],
              loading: false,
            };
          }
        } catch (e) {}
      }
      return {
        user: { uid: "trainer_user", displayName: "Coach", role: "trainer" },
        role: "trainer",
        gymId: "univo_main",
        profileId: "trainer_user",
        permissions: [],
        loading: false,
      };
    }

    // 3. If active role is staff
    if (activeRole === "staff" && savedStaff) {
      const parsed = JSON.parse(savedStaff);
      if (parsed && (parsed.uid || parsed.id)) {
        return {
          user: parsed,
          role: parsed.role || "staff",
          gymId: parsed.gymId || "univo_main",
          profileId: parsed.profileId || parsed.uid || parsed.id,
          permissions: parsed.permissions || [],
          loading: false,
        };
      }
    }
  } catch (e) {
    console.warn("Notice reading initial auth state:", e);
  }

  return {
    user: null,
    role: null,
    gymId: "univo_main",
    profileId: null,
    permissions: [],
    loading: true,
  };
}

export function AuthProvider({ children }) {
  const initial = getInitialAuthState();
  const [user, setUser] = useState(initial.user);
  const [role, setRole] = useState(initial.role);
  const [gymId, setGymId] = useState(initial.gymId);
  const [profileId, setProfileId] = useState(initial.profileId);
  const [permissions, setPermissions] = useState(initial.permissions);
  const [loading, setLoading] = useState(initial.loading);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const currentActiveRole = localStorage.getItem("univo_active_role");
        const savedMember = localStorage.getItem("univo_member_session");
        const savedTrainer = localStorage.getItem("univo_trainer_session");
        const savedStaff = localStorage.getItem("univo_staff_session");

        // 1. If currently active as Member, NEVER let Firebase Auth overwrite it!
        if (currentActiveRole === "member" || (savedMember && currentActiveRole !== "owner" && currentActiveRole !== "trainer" && currentActiveRole !== "staff")) {
          if (savedMember) {
            try {
              const parsed = JSON.parse(savedMember);
              setUser({ uid: parsed.id || parsed.uid, displayName: parsed.name || parsed.fullName || "Athlete", email: parsed.email || parsed.loginEmail, ...parsed });
              setRole("member");
              setGymId(parsed.gymId || "univo_main");
              setProfileId(parsed.id || parsed.uid);
              setPermissions([]);
              localStorage.setItem("univo_active_role", "member");
            } catch (e) {}
          }
          setLoading(false);
          return;
        }

        // 2. If currently active as Trainer, NEVER let Firebase Auth overwrite it!
        if (currentActiveRole === "trainer" || (savedTrainer && currentActiveRole !== "owner" && currentActiveRole !== "member" && currentActiveRole !== "staff")) {
          let trainerObj = { uid: "trainer_user", displayName: "Coach", role: "trainer" };
          if (savedTrainer) {
            try {
              const parsed = JSON.parse(savedTrainer);
              trainerObj = { uid: parsed.id || parsed.uid, displayName: parsed.name || "Coach", email: parsed.email || parsed.loginEmail, ...parsed };
            } catch (e) {}
          }
          setUser(trainerObj);
          setRole("trainer");
          setGymId(trainerObj.gymId || "univo_main");
          setProfileId(trainerObj.id || trainerObj.uid);
          setPermissions([]);
          localStorage.setItem("univo_active_role", "trainer");
          setLoading(false);
          return;
        }

        // 3. If currently active as Staff
        if (currentActiveRole === "staff" && savedStaff) {
          try {
            const parsed = JSON.parse(savedStaff);
            setUser(parsed);
            setRole(parsed.role || "staff");
            setGymId(parsed.gymId || "univo_main");
            setProfileId(parsed.profileId || parsed.uid || parsed.id);
            setPermissions(parsed.permissions || []);
            localStorage.setItem("univo_active_role", "staff");
          } catch (e) {}
          setLoading(false);
          return;
        }

        // 4. Firebase User (Owner, Trainer, or Member)
        if (firebaseUser) {
          const userData = await getUserRole(firebaseUser.uid);
          const targetRole = (userData.role || "owner").toLowerCase();

          if (targetRole.includes("trainer") || targetRole.includes("coach")) {
            const trainerObj = {
              id: userData.profileId || firebaseUser.uid,
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || "Coach",
              email: firebaseUser.email,
              role: "trainer",
              gymId: userData.gymId || "univo_main",
              ...userData,
            };
            setUser(trainerObj);
            setRole("trainer");
            setGymId(userData.gymId || "univo_main");
            setProfileId(userData.profileId || firebaseUser.uid);
            setPermissions([]);
            localStorage.setItem("univo_active_role", "trainer");
            localStorage.setItem("univo_trainer_session", JSON.stringify(trainerObj));
            localStorage.removeItem("univo_member_session");
            localStorage.removeItem("univo_staff_session");
            setLoading(false);
            return;
          }

          if (targetRole === "member") {
            const memberObj = {
              id: userData.profileId || firebaseUser.uid,
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || "Athlete",
              email: firebaseUser.email,
              role: "member",
              gymId: userData.gymId || "univo_main",
              ...userData,
            };
            setUser(memberObj);
            setRole("member");
            setGymId(userData.gymId || "univo_main");
            setProfileId(userData.profileId || firebaseUser.uid);
            setPermissions([]);
            localStorage.setItem("univo_active_role", "member");
            localStorage.setItem("univo_member_session", JSON.stringify(memberObj));
            localStorage.removeItem("univo_trainer_session");
            localStorage.removeItem("univo_staff_session");
            setLoading(false);
            return;
          }

          const ownerRole = targetRole === "owner" || targetRole === "co-owner" ? "owner" : "staff";
          setUser(firebaseUser);
          setRole(ownerRole);
          setGymId(userData.gymId || "univo_main");
          setProfileId(userData.profileId || null);
          setPermissions(userData.permissions || []);
          localStorage.setItem("univo_active_role", ownerRole);
          localStorage.removeItem("univo_trainer_session");
          localStorage.removeItem("univo_member_session");
          localStorage.removeItem("univo_staff_session");
        } else {
          // If no active session whatsoever
          if (!savedMember && !savedTrainer && !savedStaff) {
            setUser(null);
            setRole(null);
            setGymId("univo_main");
            setProfileId(null);
            setPermissions([]);
            localStorage.removeItem("univo_active_role");
          }
        }
      } catch (authErr) {
        console.warn("Auth state observer notice:", authErr);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  const logoutUser = async () => {
    try {
      localStorage.removeItem("univo_active_role");
      localStorage.removeItem("univo_trainer_session");
      localStorage.removeItem("univo_member_session");
      localStorage.removeItem("univo_staff_session");
      localStorage.removeItem("univo_user_role");
      sessionStorage.clear();
      await signOut(auth).catch(() => {});
    } catch (e) {
      console.warn("Logout error:", e);
    }
    setUser(null);
    setRole(null);
    setProfileId(null);
    setPermissions([]);
  };

  // Realtime multi-tab & cross-device forced logout listener (applies ONLY to members)
  useEffect(() => {
    let channel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("univo_session_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "FORCE_LOGOUT") {
            const currentRole = role || localStorage.getItem("univo_active_role");
            // Never log out owner, admin, trainer, or staff
            if (currentRole === "owner" || currentRole === "admin" || currentRole === "trainer" || currentRole === "staff") {
              return;
            }

            const targetMemberId = event.data?.memberId;
            const sessStr = localStorage.getItem("univo_member_session");
            const sessObj = sessStr ? JSON.parse(sessStr) : null;
            if (!targetMemberId || profileId === targetMemberId || sessObj?.id === targetMemberId) {
              logoutUser();
              if (window.location.hash !== "#/login") {
                window.location.hash = "#/login";
              }
            }
          }
        };
      }
    } catch (e) {}

    const handleStorageChange = (e) => {
      if (e.key === "univo_force_logout") {
        const currentRole = role || localStorage.getItem("univo_active_role");
        if (currentRole === "owner" || currentRole === "admin" || currentRole === "trainer" || currentRole === "staff") {
          return;
        }

        const val = e.newValue || localStorage.getItem("univo_force_logout") || "";
        const targetMemberId = val.split("_")[0];
        const sessStr = localStorage.getItem("univo_member_session");
        const sessObj = sessStr ? JSON.parse(sessStr) : null;
        if (!targetMemberId || profileId === targetMemberId || sessObj?.id === targetMemberId) {
          logoutUser();
          if (window.location.hash !== "#/login") {
            window.location.hash = "#/login";
          }
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [role, profileId]);

  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole, gymId, setGymId, profileId, setProfileId, permissions, loading, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

