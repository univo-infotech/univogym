import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserRole } from "../firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("owner");
  const [gymId, setGymId] = useState("univo_main");
  const [profileId, setProfileId] = useState(null);
  const [permissions, setPermissions] = useState([]); // Array of allowed modules for staff
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userData = await getUserRole(firebaseUser.uid);
        setRole(userData.role || "owner");
        setGymId(userData.gymId || "univo_main");
        setProfileId(userData.profileId || null);
        setPermissions(userData.permissions || []);
        localStorage.removeItem("univo_trainer_session");
      } else {
        // Check for custom trainer or member session
        const savedTrainer = localStorage.getItem("univo_trainer_session");
        const savedMember = localStorage.getItem("univo_member_session");

        if (savedTrainer) {
          try {
            const parsed = JSON.parse(savedTrainer);
            setUser({ uid: parsed.id, displayName: parsed.name, email: parsed.email || parsed.loginEmail, ...parsed });
            setRole("trainer");
            setGymId(parsed.gymId || "univo_main");
            setProfileId(parsed.id);
            setPermissions([]);
          } catch (e) {
            setUser(null);
            setRole(null);
            setGymId("univo_main");
            setProfileId(null);
            setPermissions([]);
          }
        } else if (savedMember) {
          try {
            const parsed = JSON.parse(savedMember);
            setUser({ uid: parsed.id, displayName: parsed.name || parsed.fullName || "Athlete", email: parsed.email || parsed.loginEmail, ...parsed });
            setRole("member");
            setGymId(parsed.gymId || "univo_main");
            setProfileId(parsed.id);
            setPermissions([]);
          } catch (e) {
            setUser(null);
            setRole(null);
            setGymId("univo_main");
            setProfileId(null);
            setPermissions([]);
          }
        } else {
          setUser(null);
          setRole(null);
          setGymId("univo_main");
          setProfileId(null);
          setPermissions([]);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logoutUser = async () => {
    try {
      localStorage.removeItem("univo_trainer_session");
      localStorage.removeItem("univo_member_session");
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

  // Realtime multi-tab & cross-device forced logout listener
  useEffect(() => {
    // 1. BroadcastChannel listener (instant across all open tabs of this browser)
    let channel = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("univo_session_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "FORCE_LOGOUT") {
            logoutUser();
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          }
        };
      }
    } catch (e) {}

    // 2. Storage event listener (when localStorage is cleared or wiped by another tab)
    const handleStorageChange = (e) => {
      if (
        e.key === "univo_force_logout" ||
        (e.key === null && !localStorage.getItem("univo_trainer_session") && !localStorage.getItem("univo_member_session"))
      ) {
        logoutUser();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole, gymId, setGymId, profileId, setProfileId, permissions, loading, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

