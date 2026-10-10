"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";
import { encryptSession, decryptSession } from "@/lib/crypto";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export interface LinkedClientProfile {
  id: string;
  name: string;
  mobile: string;
  outletId: string;
  outletName: string;
  photoUrl?: string;
  planName?: string;
  planEndDate?: string;
}

export interface ClientUser {
  clientId: string;
  clientName: string;
  mobileNumber: string;
  outletId: string;
  outletName: string;
  photoUrl?: string;
  planName?: string;
  planStartDate?: string;
  planEndDate?: string;
  email?: string;
  address?: string;
  loginTime: number;
  linkedClients?: LinkedClientProfile[];
}

interface AuthContextType {
  user: ClientUser | null;
  loading: boolean;
  login: (userData: ClientUser) => Promise<void>;
  switchProfile: (targetClientId: string) => Promise<void>;
  logout: () => void;
  updateUserLocally: (data: Partial<ClientUser>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  switchProfile: async () => {},
  logout: () => {},
  updateUserLocally: () => {},
});

export const useAuth = () => useContext(AuthContext);

const VAULT_SESSION_KEY = "bf_client_vault";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Restore encrypted session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = localStorage.getItem(VAULT_SESSION_KEY);
        if (storedToken) {
          const decrypted = await decryptSession(storedToken);
          if (decrypted && decrypted.clientId && decrypted.mobileNumber) {
            setUser(decrypted);
          } else {
            // Tampered or invalid session
            localStorage.removeItem(VAULT_SESSION_KEY);
          }
        }
      } catch (err) {
        console.error("Failed to restore encrypted session:", err);
        localStorage.removeItem(VAULT_SESSION_KEY);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Realtime synchronization with client's Firestore document
  useEffect(() => {
    if (!user?.clientId) return;

    const unsub = onSnapshot(
      doc(db, "clients", user.clientId),
      (snapshot) => {
        if (snapshot.exists()) {
          const docData = snapshot.data();
          setUser((prev) => {
            if (!prev) return null;
            const updated: ClientUser = {
              ...prev,
              clientName: docData.name || prev.clientName,
              photoUrl: docData.photoUrl || prev.photoUrl,
              outletName: docData.outletName || prev.outletName,
              outletId: docData.outletId || prev.outletId,
              planName: docData.planName || prev.planName,
              planStartDate: docData.planStartDate || prev.planStartDate,
              planEndDate: docData.planEndDate || prev.planEndDate,
              address: docData.address || prev.address,
              email: docData.email || prev.email,
            };

            // Update encrypted session storage
            encryptSession(updated).then((enc) => {
              try {
                localStorage.setItem(VAULT_SESSION_KEY, enc);
              } catch {}
            });

            return updated;
          });
        }
      },
      (err) => {
        console.warn("Client doc listener sync:", err);
      }
    );

    return () => unsub();
  }, [user?.clientId]);

  // Strict Security Route Guard
  useEffect(() => {
    if (!loading) {
      const isLoginPage = pathname === "/login";
      if (!user && !isLoginPage) {
        router.replace("/login");
      } else if (user && isLoginPage) {
        router.replace("/scan");
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (userData: ClientUser) => {
    const encrypted = await encryptSession(userData);
    localStorage.setItem(VAULT_SESSION_KEY, encrypted);
    setUser(userData);
    router.replace("/scan");
  };

  const switchProfile = async (targetClientId: string) => {
    if (!user || !user.linkedClients) return;
    const target = user.linkedClients.find((c) => c.id === targetClientId);
    if (!target) return;

    const newSession: ClientUser = {
      ...user,
      clientId: target.id,
      clientName: target.name,
      outletId: target.outletId,
      outletName: target.outletName,
      photoUrl: target.photoUrl,
      planName: target.planName,
      planEndDate: target.planEndDate,
      loginTime: Date.now(),
    };

    const encrypted = await encryptSession(newSession);
    localStorage.setItem(VAULT_SESSION_KEY, encrypted);
    setUser(newSession);
    router.replace("/scan");
  };

  const updateUserLocally = (data: Partial<ClientUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      encryptSession(updated).then((enc) => {
        try {
          localStorage.setItem(VAULT_SESSION_KEY, enc);
        } catch {}
      });
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem(VAULT_SESSION_KEY);
    setUser(null);
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-400 text-black font-medium shadow-lg shadow-amber-400/20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <span className="text-xs font-medium text-amber-400 tracking-wide mt-2">
            Verifying Encrypted Session...
          </span>
        </div>
      </div>
    );
  }

  if (!user && pathname !== "/login") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white p-4 font-sans text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white mb-1">
              Secure Access Required
            </h2>
            <p className="text-xs text-zinc-400">
              Please login with your Mobile Number and MPIN.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium mt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirecting to Login...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        switchProfile,
        logout,
        updateUserLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
