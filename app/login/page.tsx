"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth, ClientUser, LinkedClientProfile } from "@/components/AuthProvider";
import {
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock,
  User,
  Building2,
  Sparkles,
  CheckCircle2,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import {
  verifyMpin,
  checkRateLimit,
  recordFailedLogin,
  clearRateLimit,
} from "@/lib/crypto";

export default function LoginPage() {
  const { login } = useAuth();

  const [mobileNumber, setMobileNumber] = useState("");
  const [mpin, setMpin] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSec, setLockoutSec] = useState<number | null>(null);

  // Multi-Client Onboarding Screen State
  const [multiClients, setMultiClients] = useState<any[] | null>(null);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutSec || lockoutSec <= 0) return;
    const interval = setInterval(() => {
      setLockoutSec((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSec]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanedMobile = mobileNumber.replace(/\D/g, "");
    const cleanedMpin = mpin.trim();

    if (!cleanedMobile || cleanedMobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!cleanedMpin || cleanedMpin.length < 4) {
      setError("Please enter your 4 to 6 digit login MPIN.");
      return;
    }

    // 1. Check Anti-Brute-Force Rate Limiting
    const rateCheck = checkRateLimit(cleanedMobile);
    if (!rateCheck.allowed) {
      setLockoutSec(rateCheck.retryAfterSeconds || 60);
      setError(`Too many failed attempts. Security lockout active for ${rateCheck.retryAfterSeconds || 60}s.`);
      return;
    }

    setLoading(true);

    try {
      // 2. Query Firestore 'clients' collection by mobile number
      const clientsRef = collection(db, "clients");
      const q = query(clientsRef, where("mobile", "==", cleanedMobile));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        const fail = recordFailedLogin(cleanedMobile);
        if (fail.locked) {
          setLockoutSec(fail.retryAfterSeconds || 60);
          setError("Too many invalid attempts. Account locked for 60 seconds.");
        } else {
          setError(`No member account found with +91 ${cleanedMobile}. Please register at gym counter.`);
        }
        setLoading(false);
        return;
      }

      const allFoundClients = querySnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      // 3. Verify MPIN for each found client
      const matchedClients: any[] = [];
      for (const client of allFoundClients) {
        const isMatch = await verifyMpin(cleanedMpin, client.mpin, client.mpinHash);
        if (isMatch) {
          matchedClients.push(client);
        }
      }

      if (matchedClients.length === 0) {
        const fail = recordFailedLogin(cleanedMobile);
        if (fail.locked) {
          setLockoutSec(fail.retryAfterSeconds || 60);
          setError("Incorrect MPIN. Maximum attempts exceeded. Locked for 60s.");
        } else {
          setError(`Incorrect MPIN entered. Please check and try again. (${fail.remainingAttempts} attempts remaining)`);
        }
        setLoading(false);
        return;
      }

      // 4. Successful MPIN verification - Clear rate limits!
      clearRateLimit(cleanedMobile);

      // Build linked client list if multiple clients share this mobile
      const linkedList: LinkedClientProfile[] = allFoundClients.map((c) => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        outletId: c.outletId || "",
        outletName: c.outletName || "Main Branch",
        photoUrl: c.photoUrl || "",
        planName: c.planName || "Membership",
        planEndDate: c.planEndDate || "",
      }));

      // Case A: Exactly ONE client matching
      if (matchedClients.length === 1) {
        const chosen = matchedClients[0];
        const sessionData: ClientUser = {
          clientId: chosen.id,
          clientName: chosen.name,
          mobileNumber: cleanedMobile,
          outletId: chosen.outletId || "",
          outletName: chosen.outletName || "Main Branch",
          photoUrl: chosen.photoUrl || "",
          planName: chosen.planName || "General Membership",
          planStartDate: chosen.planStartDate || "",
          planEndDate: chosen.planEndDate || "",
          email: chosen.email || "",
          address: chosen.address || "",
          loginTime: Date.now(),
          linkedClients: linkedList.length > 1 ? linkedList : undefined,
        };

        await login(sessionData);
      } else {
        // Case B: MULTIPLE clients match this mobile & MPIN
        // Show Onboarding Screen for client to select which profile to log into!
        setMultiClients(matchedClients);
      }
    } catch (err: any) {
      console.error("Login verification error:", err);
      setError(err?.message || "Authentication service unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handler when user selects a profile from multi-client onboarding screen
  const handleSelectClientProfile = async (chosen: any) => {
    setLoading(true);
    try {
      const linkedList: LinkedClientProfile[] = (multiClients || []).map((c) => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        outletId: c.outletId || "",
        outletName: c.outletName || "Main Branch",
        photoUrl: c.photoUrl || "",
        planName: c.planName || "Membership",
        planEndDate: c.planEndDate || "",
      }));

      const sessionData: ClientUser = {
        clientId: chosen.id,
        clientName: chosen.name,
        mobileNumber: chosen.mobile || mobileNumber.replace(/\D/g, ""),
        outletId: chosen.outletId || "",
        outletName: chosen.outletName || "Main Branch",
        photoUrl: chosen.photoUrl || "",
        planName: chosen.planName || "General Membership",
        planStartDate: chosen.planStartDate || "",
        planEndDate: chosen.planEndDate || "",
        email: chosen.email || "",
        address: chosen.address || "",
        loginTime: Date.now(),
        linkedClients: linkedList,
      };

      await login(sessionData);
    } catch (err) {
      console.error("Profile selection error:", err);
      setError("Failed to open selected profile.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F6F8] dark:bg-zinc-950 font-sans flex flex-col items-center justify-center p-4 relative">
      {/* Top Banner Accent in Brothers Fitness Gold */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500" />

      <div className="w-full max-w-md space-y-5 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400 bg-black p-1.5 shadow-md shadow-amber-400/20">
            <Image
              src="/logo.png"
              alt="Brother's Fitness Logo"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              BROTHER&apos;S FITNESS
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-400/30">
                Member Portal
              </span>
              <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Lock className="h-2.5 w-2.5" />
                256-Bit Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* ONBOARDING: MULTI-CLIENT SELECTION VIEW */}
        {multiClients && multiClients.length > 1 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-md shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-500" />
                  Select Member Account
                </h2>
                <button
                  type="button"
                  onClick={() => setMultiClients(null)}
                  className="text-[11px] font-semibold text-amber-600 hover:underline cursor-pointer"
                >
                  Back
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Multiple gym accounts are linked to +91 {mobileNumber}. Choose who is logging in:
              </p>
            </div>

            <div className="space-y-3">
              {multiClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectClientProfile(c)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-amber-500/5 hover:border-amber-400 dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:border-amber-400/50 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-amber-400 bg-amber-400/20 text-amber-800 font-bold text-sm shadow-xs">
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        c.name?.charAt(0).toUpperCase() || "M"
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 transition-colors">
                        {c.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          <Building2 className="h-3 w-3 text-zinc-400" />
                          {c.outletName || "Main Branch"}
                        </span>
                        {c.planName && (
                          <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            {c.planName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform shrink-0">
                    <span>Continue</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-[11px] text-zinc-400">
              You can also switch member accounts anytime from the menu.
            </p>
          </div>
        ) : (
          /* STANDARD LOGIN CARD */
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-md shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none space-y-5">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Member Sign In
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Enter your registered mobile number and security MPIN
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Lockout Active Alert */}
            {lockoutSec && lockoutSec > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 animate-pulse">
                <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Security Lockout: Retry in {lockoutSec}s</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <Phone className="h-3.5 w-3.5 text-amber-500" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    disabled={loading || Boolean(lockoutSec)}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit number"
                    className="h-9.5 w-full rounded-lg border border-zinc-300 bg-zinc-50 pl-16 pr-3 text-xs font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-amber-400 focus:bg-white focus:ring-1 focus:ring-amber-400/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* MPIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Security MPIN (4-6 digits)
                  </label>
                  <span className="text-[10px] font-medium text-zinc-400">
                    Set during registration
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                  <input
                    type={showMpin ? "text" : "password"}
                    maxLength={6}
                    value={mpin}
                    disabled={loading || Boolean(lockoutSec)}
                    onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter MPIN"
                    className="h-9.5 w-full rounded-lg border border-zinc-300 bg-zinc-50 pl-9 pr-10 font-mono text-sm font-bold tracking-widest text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-amber-400 focus:bg-white focus:ring-1 focus:ring-amber-400/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowMpin(!showMpin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    title={showMpin ? "Hide MPIN" : "Show MPIN"}
                  >
                    {showMpin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || Boolean(lockoutSec)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-bold text-black shadow-xs hover:bg-amber-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Login</span>
                    <ShieldCheck className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Forgot your MPIN? Contact the gym counter desk to reset it.
              </p>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          Brother&apos;s Fitness Member Access Portal
        </p>
      </div>
    </div>
  );
}
