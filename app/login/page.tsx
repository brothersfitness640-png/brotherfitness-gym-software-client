"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import {
  Phone,
  KeyRound,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  BellRing,
} from "lucide-react";

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

export default function LoginPage() {
  const { login } = useAuth();

  // Form step: 1 = Enter Phone, 2 = Enter OTP
  const [step, setStep] = useState<1 | 2>(1);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  // Check OneSignal permission status on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push((OneSignal: any) => {
        try {
          const isEnabled =
            OneSignal.Notifications?.permission === true ||
            Notification?.permission === "granted";
          setPermissionGranted(isEnabled);

          // Listen for permission change
          OneSignal.Notifications?.addEventListener("permissionChange", (granted: boolean) => {
            setPermissionGranted(granted);
          });
        } catch (e) {
          console.warn("OneSignal check error:", e);
        }
      });
    }
  }, []);

  // Helper to ensure push notification permission is granted
  const ensureNotificationPermission = async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;

    return new Promise((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          // Check current status
          const currentPermission = OneSignal.Notifications?.permission;
          const nativePermission = typeof Notification !== "undefined" ? Notification.permission : "default";

          if (currentPermission === true || nativePermission === "granted") {
            setPermissionGranted(true);
            const subId = OneSignal.User?.PushSubscription?.id || null;
            resolve(subId);
            return;
          }

          // Request permission prompt
          let granted = false;
          if (OneSignal.Notifications?.requestPermission) {
            granted = await OneSignal.Notifications.requestPermission();
          } else if (typeof Notification !== "undefined" && Notification.requestPermission) {
            const res = await Notification.requestPermission();
            granted = res === "granted";
          }

          setPermissionGranted(granted);

          if (granted) {
            const subId = OneSignal.User?.PushSubscription?.id || null;
            resolve(subId);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error("Error requesting OneSignal permission:", err);
          resolve(null);
        }
      });
    });
  };

  // Generate 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Step 1: Send OTP handler (Enforces push notification permission)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleaned = mobileNumber.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      // 1. Enforce notification permission before proceeding
      const subscriptionId = await ensureNotificationPermission();

      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        setError(
          "Push Notification Permission Required! Please click 'Allow' on the notification prompt to receive your OTP code."
        );
        setLoading(false);
        return;
      }

      const generatedOtp = generateOTP();

      // 2. Send to API route (Saves to Firestore 'otp' collection and triggers OneSignal Push)
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: cleaned,
          otp: generatedOtp,
          subscriptionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      if (data.requiresRestApiKey) {
        console.warn(
          "Notice: ONESIGNAL_REST_API_KEY missing in .env.local. Add REST API key to deliver live push notifications."
        );
      }

      setStep(2);
      setSuccessMsg(`OTP sent via OneSignal notification to +91 ${cleaned}`);
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP handler
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanedMobile = mobileNumber.replace(/\D/g, "");
    const cleanedOtp = otp.trim();

    if (!cleanedOtp || cleanedOtp.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch doc from Firestore: collection 'otp', doc ID = mobileNumber
      const otpDocRef = doc(db, "otp", cleanedMobile);
      const docSnap = await getDoc(otpDocRef);

      if (!docSnap.exists()) {
        setError("OTP expired or not found. Please click Resend OTP.");
        setLoading(false);
        return;
      }

      const docData = docSnap.data();

      // Check if OTP matches
      if (docData.otp === cleanedOtp) {
        // 2. Delete OTP document from Firestore upon successful verification
        try {
          await deleteDoc(otpDocRef);
        } catch (delErr) {
          console.warn("Could not delete OTP document:", delErr);
        }

        setSuccessMsg("Verification Successful! Redirecting...");

        // 3. Login user session
        setTimeout(() => {
          login(cleanedMobile);
        }, 400);
      } else {
        setError("Invalid OTP code. Please check your notification and try again.");
      }
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setOtp("");
    setError(null);
    setSuccessMsg(null);
    const cleaned = mobileNumber.replace(/\D/g, "");

    setLoading(true);
    try {
      const subscriptionId = await ensureNotificationPermission();
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        setError("Please allow notification permission to receive the new OTP code.");
        setLoading(false);
        return;
      }

      const generatedOtp = generateOTP();
      await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: cleaned,
          otp: generatedOtp,
          subscriptionId,
        }),
      });
      setSuccessMsg(`Resent new OTP notification to +91 ${cleaned}`);
    } catch (err: any) {
      setError("Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F6F8] dark:bg-zinc-950 font-sans flex flex-col items-center justify-center p-4 relative">
      {/* Top Banner Accent in Logo Gold */}
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
              BROTHER'S FITNESS
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-400/30">
                Client Portal
              </span>
            </div>
          </div>
        </div>

        {/* Login Card Shell */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-md shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none space-y-5">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {step === 1 ? "Member Login" : "Verify OTP Code"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {step === 1
                ? "Enter your registered mobile number to receive your OTP via push notification"
                : `Enter the 6-digit code sent via notification to +91 ${mobileNumber}`}
            </p>
          </div>

          {/* Permission Status Banner */}
          {!permissionGranted && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2 font-semibold">
                <BellRing className="h-4 w-4 text-amber-600 animate-bounce" />
                <span>Enable Push Notifications to receive OTP</span>
              </div>
              <button
                type="button"
                onClick={() => ensureNotificationPermission()}
                className="rounded bg-amber-400 px-2 py-1 text-[11px] font-bold text-black hover:bg-amber-500 transition-colors shadow-xs"
              >
                Allow
              </button>
            </div>
          )}

          {/* Notifications / Alerts */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Mobile Number */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
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
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit number"
                    className="h-9 w-full rounded-lg border border-zinc-300 bg-zinc-50 pl-16 pr-3 text-xs font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-amber-400 focus:bg-white focus:ring-1 focus:ring-amber-400/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-bold text-black shadow-xs hover:bg-amber-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking Permission & OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp("");
                      setError(null);
                    }}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Edit Number
                  </button>
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter code from notification"
                    className="h-9 w-full rounded-lg border border-zinc-300 bg-zinc-50 pl-9 pr-3 text-center font-mono text-sm font-bold tracking-widest text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-amber-400 focus:bg-white focus:ring-1 focus:ring-amber-400/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-bold text-black shadow-xs hover:bg-amber-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Resend Verification Code</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          Brother's Fitness Management System
        </p>
      </div>
    </div>
  );
}
