"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";

export interface ClientUser {
  mobileNumber: string;
  loginTime: number;
}

interface AuthContextType {
  user: ClientUser | null;
  loading: boolean;
  login: (mobileNumber: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

const SESSION_KEY = "bf_client_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.mobileNumber) {
          setUser(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Strict Security Route Guard
  useEffect(() => {
    if (!loading) {
      const isLoginPage = pathname === "/login";
      if (!user && !isLoginPage) {
        router.replace("/login");
      } else if (user && isLoginPage) {
        router.replace("/");
      }
    }
  }, [user, loading, pathname, router]);

  const login = (mobileNumber: string) => {
    const sessionData: ClientUser = {
      mobileNumber,
      loginTime: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    setUser(sessionData);
    router.replace("/");
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    router.replace("/login");
  };

  // Loading spinner during auth initialization
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <span className="text-xs font-bold text-amber-400 tracking-wide mt-2">
            Verifying Authentication...
          </span>
        </div>
      </div>
    );
  }

  // Strict blocking: If unauthenticated and trying to access any route other than /login, DO NOT render children!
  if (!user && pathname !== "/login") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              Access Restricted
            </h2>
            <p className="text-xs text-zinc-400">
              Authentication required. Redirecting to login page...
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
