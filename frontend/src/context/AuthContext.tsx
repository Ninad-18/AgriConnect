import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, login, register, type RegisterInput } from "@/services/auth";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = (token: string, u: User) => {
    localStorage.setItem("agriconnect_token", token);
    localStorage.setItem("agriconnect_user", JSON.stringify(u));
    setUser(u);
  };

  const refresh = async () => {
    try {
      const stored = localStorage.getItem("agriconnect_user");
      if (!stored) {
        setUser(null);
        return;
      }
      const token = localStorage.getItem("agriconnect_token");
      if (!token) {
        setUser(null);
        return;
      }
      const me = await fetchMe();
      storageSync(me);
      setUser(me);
    } catch {
      localStorage.removeItem("agriconnect_token");
      localStorage.removeItem("agriconnect_user");
      setUser(null);
    }
  };

  const storageSync = (u: User) => {
    localStorage.setItem("agriconnect_user", JSON.stringify(u));
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doLogin = async (email: string, password: string) => {
    const res = await login(email, password);
    applyAuth(res.token, res.user);
  };

  const doRegister = async (input: RegisterInput) => {
    const res = await register(input);
    applyAuth(res.token, res.user);
  };

  const logout = () => {
    localStorage.removeItem("agriconnect_token");
    localStorage.removeItem("agriconnect_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login: doLogin, register: doRegister, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}