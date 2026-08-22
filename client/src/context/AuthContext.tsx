import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, getCurrentUser, loginUser, registerUser } from "../lib/api";
import type { Role, User } from "../types/auth";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "fishfriendly_auth_token";
const USER_KEY = "fishfriendly_auth_user";

const readStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const persistSession = (token: string, user: User) => {
  localStorage.setItem(STORAGE_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_KEY);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await getCurrentUser(token);
          if (cancelled) return;
          setUser(response.user);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          setIsLoading(false);
          return;
        } catch (err) {
          lastError = err;
          const status = err instanceof ApiError ? err.status : 0;
          const unauthorized = status === 401 || status === 403;
          if (unauthorized) break;
          await sleep(400 * (attempt + 1));
        }
      }

      if (cancelled) return;

      const status = lastError instanceof ApiError ? lastError.status : 0;
      if (status === 401 || status === 403) {
        clearSession();
        setToken(null);
        setUser(null);
      }
      // Network / server errors: keep existing token + cached user
      setIsLoading(false);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await loginUser({ email, password });
    persistSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (payload: RegisterInput) => {
    const data = await registerUser(payload);
    persistSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    clearSession();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
