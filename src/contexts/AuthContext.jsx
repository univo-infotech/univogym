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
        // Check for custom trainer session
        const savedTrainer = localStorage.getItem("univo_trainer_session");
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
    localStorage.removeItem("univo_trainer_session");
    await signOut(auth).catch(() => {});
    setUser(null);
    setRole(null);
    setProfileId(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole, gymId, setGymId, profileId, setProfileId, permissions, loading, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

