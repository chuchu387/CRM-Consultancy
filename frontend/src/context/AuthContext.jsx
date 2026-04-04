import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api from "../api/axios";
import { unsubscribePushNotifications } from "../utils/pushNotifications";

const AuthContext = createContext(null);

const normalizeUser = (payload) => {
  if (!payload) {
    return null;
  }

  return {
    ...payload,
    id: payload.id || payload._id,
  };
};

const decodeToken = (token) => {
  const [, payload = ""] = token.split(".");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(window.atob(normalized));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("crm_token"));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await unsubscribePushNotifications();
    } catch (error) {
      // Ignore logout cleanup failures and continue clearing auth state.
    } finally {
      localStorage.removeItem("crm_token");
      setToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((payload) => {
    const normalizedUser = normalizeUser(payload);
    setUser(normalizedUser);
    return normalizedUser;
  }, []);

  const refreshUser = useCallback(
    async (providedToken = localStorage.getItem("crm_token")) => {
      if (!providedToken) {
        logout();
        return null;
      }

      const response = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${providedToken}`,
        },
      });

      const normalizedUser = normalizeUser(response.data.data);
      setToken(providedToken);
      setUser(normalizedUser);
      return normalizedUser;
    },
    [logout]
  );

  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem("crm_token");

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const decoded = decodeToken(storedToken);

      if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
        throw new Error("Token expired");
      }

      setToken(storedToken);
      await refreshUser(storedToken);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout, refreshUser]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const authToken = response.data.data.token;
    const authUser = normalizeUser(response.data.data.user);

    localStorage.setItem("crm_token", authToken);
    setToken(authToken);
    setUser(authUser);

    return authUser;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const response = await api.post("/auth/register", { name, email, password });
    const authToken = response.data.data.token;
    const authUser = normalizeUser(response.data.data.user);

    localStorage.setItem("crm_token", authToken);
    setToken(authToken);
    setUser(authUser);

    return authUser;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      updateUser,
      isConsultancy: user?.role === "consultancy",
      isStudent: user?.role === "student",
    }),
    [loading, login, logout, refreshUser, register, token, updateUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
