import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("agribid_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("agribid_token"))
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, payload) => {
    const res = await api.post(`/auth/${path}`, payload);
    localStorage.setItem("agribid_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const login = (payload) => authenticate("login", payload);
  const register = (payload) => authenticate("register", payload);

  const logout = () => {
    localStorage.removeItem("agribid_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
