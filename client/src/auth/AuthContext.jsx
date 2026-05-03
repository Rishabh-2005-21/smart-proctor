import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  getAuthSnapshot,
  persistAuthSession
} from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => getAuthSnapshot());

  useEffect(() => {
    const syncSession = () => setSession(getAuthSnapshot());

    window.addEventListener("storage", syncSession);
    window.addEventListener("auth:updated", syncSession);
    window.addEventListener("auth:expired", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("auth:updated", syncSession);
      window.removeEventListener("auth:expired", syncSession);
    };
  }, []);

  const login = ({ token, role, user }) => {
    persistAuthSession({ token, role, user });
    setSession(getAuthSnapshot());
  };

  const logout = () => {
    clearAuthSession();
    setSession(getAuthSnapshot());
  };

  const updateUser = (user) => {
    persistAuthSession({
      token: session.token,
      role: user?.role || session.role,
      user
    });
    setSession(getAuthSnapshot());
  };

  const value = useMemo(
    () => ({
      token: session.token,
      role: session.role,
      user: session.user,
      isAuthenticated: session.isAuthenticated,
      login,
      logout,
      updateUser
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
