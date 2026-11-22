import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, saveToken, clearToken, getToken } from "./api.js";

const AuthContext = createContext(null);

// نگاشت نقش‌های دیتابیس به نقش‌های سطح رابط کاربری
export function mapRole(dbRole) {
  if (dbRole === "super_admin" || dbRole === "branch_admin") return "admin";
  if (dbRole === "doctor") return "doctor";
  if (dbRole === "secretary") return "secretary";
  if (dbRole === "accountant") return "secretary"; // فعلاً در همان پنل ساده دیده می‌شود
  return "secretary";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function restore() {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      try {
        const { user } = await api.me();
        setUser(user);
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

    const login = useCallback(async (username, password, companyCode) => {
    setError(null);
    try {
      const { token, user } = await api.login(username, password, companyCode);
      saveToken(token);
      setUser(user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
  localStorage.removeItem("clinicyar_token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth باید داخل AuthProvider استفاده شود");
  return ctx;
}
