"use client";

import React, { useEffect, useState } from "react";
import { BellRing, ShieldCheck, Smartphone, CheckCircle } from "lucide-react";

export default function NotificationPermissionModal() {
  const [granted, setGranted] = useState<boolean>(true);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Detect iOS device
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIphoneOrIpad);

      // Function to check permission
      const checkPermission = () => {
        if (typeof Notification !== "undefined") {
          const isNativeGranted = Notification.permission === "granted";
          setGranted(isNativeGranted);
        }

        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push((OneSignal: any) => {
            const osPermission = OneSignal.Notifications?.permission === true;
            const nativePermission = typeof Notification !== "undefined" && Notification.permission === "granted";
            const isOk = osPermission || nativePermission;
            setGranted(isOk);

            // Auto prompt slidedown if not granted
            if (!isOk && OneSignal.Slidedown?.promptPush) {
              try {
                OneSignal.Slidedown.promptPush();
              } catch (e) {}
            }
          });
        }
      };

      checkPermission();
      const interval = setInterval(checkPermission, 1500);

      // Listen for OneSignal permission changes
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push((OneSignal: any) => {
          OneSignal.Notifications?.addEventListener("permissionChange", (isGranted: boolean) => {
            setGranted(isGranted);
          });
        });
      }

      return () => clearInterval(interval);
    }
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async (OneSignal: any) => {
            try {
              if (OneSignal.Notifications?.requestPermission) {
                await OneSignal.Notifications.requestPermission();
              } else if (typeof Notification !== "undefined" && Notification.requestPermission) {
                await Notification.requestPermission();
              }

              // Opt-in push subscription
              if (OneSignal.User?.PushSubscription?.optIn) {
                await OneSignal.User.PushSubscription.optIn();
              }
            } catch (err) {
              console.warn("Permission request error:", err);
            }
          });
        } else if (typeof Notification !== "undefined" && Notification.requestPermission) {
          await Notification.requestPermission();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        if (typeof Notification !== "undefined") {
          setGranted(Notification.permission === "granted");
        }
        setLoading(false);
      }, 800);
    }
  };

  // If already granted, do not show modal
  if (granted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans text-zinc-900 dark:text-zinc-100 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-center space-y-4">
        {/* Animated Bell Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 mx-auto border border-amber-400/30">
          <BellRing className="h-7 w-7 animate-bounce" />
        </div>

        <div>
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
            Notifications Required
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Brother's Fitness sends login verification codes directly to your device via push notifications.
          </p>
        </div>

        {/* Special iOS instructions if user is on iPhone/iPad */}
        {isIOS && (
          <div className="flex items-start gap-2.5 text-left rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-amber-800 dark:text-amber-300">
            <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">iOS Safari User Notice:</span>
              If notifications prompt doesn't show, tap Safari Share <span className="font-bold">📤</span> $\rightarrow$ <span className="font-bold">Add to Home Screen</span> to enable iOS Web Push.
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRequestPermission}
          disabled={loading}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-black shadow-md hover:bg-amber-500 transition-all cursor-pointer disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{loading ? "Requesting Permission..." : "Allow Push Notifications"}</span>
        </button>

        <p className="text-[10px] text-zinc-400">
          You must click "Allow" to receive your verification code.
        </p>
      </div>
    </div>
  );
}
