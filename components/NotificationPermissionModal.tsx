"use client";

import React, { useEffect, useState, useCallback } from "react";
import { BellRing, ShieldCheck, Smartphone, X } from "lucide-react";

export default function NotificationPermissionModal() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("bf_notification_modal_dismissed", "true");
      } catch (e) {
        console.warn("Could not save dismissal state", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user already dismissed modal during this session
    try {
      const isDismissed = sessionStorage.getItem("bf_notification_modal_dismissed") === "true";
      if (isDismissed) {
        setIsOpen(false);
        return;
      }
    } catch (e) {}

    // Check if notification API is available and permission is already resolved
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted" || Notification.permission === "denied") {
        setIsOpen(false);
        return;
      }
      // If default (not yet requested), show modal
      setIsOpen(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Escape key listener to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal]);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      if (typeof Notification !== "undefined" && Notification.requestPermission) {
        const result = await Notification.requestPermission();
        if (result === "granted" || result === "denied") {
          closeModal();
        }
      } else {
        closeModal();
      }
    } catch (err) {
      console.warn("Notification request error:", err);
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  // If closed or already handled, do not show
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans text-zinc-900 dark:text-zinc-100 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-center space-y-4">
        {/* Close Button ('X' option) */}
        <button
          onClick={closeModal}
          type="button"
          aria-label="Close"
          className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Bell Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 mx-auto border border-amber-400/30">
          <BellRing className="h-7 w-7 animate-bounce" />
        </div>

        <div>
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
            Enable Notifications
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Stay updated with membership reminders, gym announcements, and fitness updates.
          </p>
        </div>

        {/* iOS Notice */}
        {isIOS && (
          <div className="flex items-start gap-2.5 text-left rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-amber-800 dark:text-amber-300">
            <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">iOS Safari Notice:</span>
              If prompt doesn&apos;t appear, tap Safari Share <span className="font-bold">📤</span> &rarr; <span className="font-bold">Add to Home Screen</span> to enable Web Push.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleRequestPermission}
            disabled={loading}
            type="button"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-black shadow-md hover:bg-amber-500 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{loading ? "Requesting..." : "Allow Notifications"}</span>
          </button>

          <button
            onClick={closeModal}
            type="button"
            className="flex h-9 w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
