import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
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
      } else {
        setUser(null);
        setRole(null);
        setGymId("univo_main");
        setProfileId(null);
        setPermissions([]);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, setRole, gymId, profileId, permissions, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
