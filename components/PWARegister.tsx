"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __deferredInstallPrompt?: any;
  }
}

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Capture install prompt early across the entire app
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa-prompt-available"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

          // Check for worker updates
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] Service worker updated.");
                }
              });
            }
          });
        } catch (error) {
          console.warn("[PWA] Service worker registration failed:", error);
        }
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  return null;
}
