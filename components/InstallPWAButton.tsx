"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidFallback, setShowAndroidFallback] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if already installed and running as standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice =
      /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isAppleDevice);

    // Check if prompt was already captured globally
    if (window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt);
    }

    // Listen for BeforeInstallPromptEvent (Chromium, Android, Edge, Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptAvailable = () => {
      if (window.__deferredInstallPrompt) {
        setDeferredPrompt(window.__deferredInstallPrompt);
      }
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredInstallPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-available", handlePromptAvailable);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // If already running in standalone mode or just installed, hide or show confirmation
  if (isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    const promptToUse =
      deferredPrompt || (typeof window !== "undefined" ? window.__deferredInstallPrompt : null);

    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice && choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          if (typeof window !== "undefined") window.__deferredInstallPrompt = null;
        }
      } catch (err) {
        console.warn("Install prompt error:", err);
      }
      return;
    }

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Fallback for browsers where beforeinstallprompt didn't trigger yet
    setShowAndroidFallback(true);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in">
        <CheckCircle2 className="h-4 w-4" />
        <span>Brother&apos;s Fitness App is installed!</span>
      </div>
    );
  }

  return (
    <>
      {/* Install Card / Button Banner */}
      <div className="rounded-lg border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent p-3.5 shadow-xs dark:border-amber-400/20 dark:from-amber-400/10 dark:via-zinc-900 dark:to-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-400/50 bg-black shadow-xs">
              <Image
                src="/logo.png"
                alt="Brother's Fitness App"
                width={36}
                height={36}
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Install Brother&apos;s Fitness
                </h3>
                <span className="flex items-center gap-0.5 rounded bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-medium text-amber-700 dark:text-amber-400 border border-amber-400/30">
                  <Sparkles className="h-2.5 w-2.5" />
                  App
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                1-tap home screen access & faster login
              </p>
            </div>
          </div>

          <button
            id="install-pwa-button"
            type="button"
            onClick={handleInstallClick}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-400 px-3 text-xs font-medium text-black shadow-xs hover:bg-amber-500 transition-colors cursor-pointer shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install</span>
          </button>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIOSModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-center space-y-4">
            <button
              onClick={() => setShowIOSModal(false)}
              type="button"
              aria-label="Close"
              className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-lg border-2 border-amber-400 bg-black p-1 shadow-md shadow-amber-400/20">
              <Image
                src="/logo.png"
                alt="Brother's Fitness App"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>

            <div>
              <h3 className="text-base font-medium text-zinc-950 dark:text-white">
                Install on iPhone / iPad
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Install Brother&apos;s Fitness on your home screen in 3 quick steps:
              </p>
            </div>

            <div className="space-y-2.5 text-left text-xs bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                  1
                </span>
                <p className="text-zinc-700 dark:text-zinc-300">
                  Tap the <strong className="font-semibold text-zinc-900 dark:text-white">Share</strong> button{" "}
                  <Share className="inline h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mx-0.5" /> in Safari&apos;s toolbar (bottom or top).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                  2
                </span>
                <p className="text-zinc-700 dark:text-zinc-300">
                  Scroll down and tap{" "}
                  <strong className="font-semibold text-zinc-900 dark:text-white">Add to Home Screen</strong>{" "}
                  <PlusSquare className="inline h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mx-0.5" />.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                  3
                </span>
                <p className="text-zinc-700 dark:text-zinc-300">
                  Tap <strong className="font-semibold text-zinc-900 dark:text-white">Add</strong> in the top right corner.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              type="button"
              className="flex h-9 w-full items-center justify-center rounded-lg bg-amber-400 px-4 text-xs font-medium text-black shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Android / Desktop Fallback Modal */}
      {showAndroidFallback && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAndroidFallback(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 text-center space-y-4">
            <button
              onClick={() => setShowAndroidFallback(false)}
              type="button"
              aria-label="Close"
              className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-lg border-2 border-amber-400 bg-black p-1 shadow-md shadow-amber-400/20">
              <Image
                src="/logo.png"
                alt="Brother's Fitness App"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>

            <div>
              <h3 className="text-base font-medium text-zinc-950 dark:text-white">
                How to Install
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Install Brother&apos;s Fitness through your browser:
              </p>
            </div>

            <div className="space-y-2 text-left text-xs bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
              <p>
                <strong>Chrome / Edge on Android:</strong> Tap the <strong>⋮ (three dots)</strong> menu in the top right &rarr; select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
              </p>
              <p className="mt-2">
                <strong>Desktop:</strong> Click the <strong>Install icon ⊕</strong> in your browser&apos;s address bar.
              </p>
            </div>

            <button
              onClick={() => setShowAndroidFallback(false)}
              type="button"
              className="flex h-9 w-full items-center justify-center rounded-lg bg-amber-400 px-4 text-xs font-medium text-black shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </>
  );
}
