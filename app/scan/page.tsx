"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  Clock,
  Building2,
  Calendar,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  History,
  ShieldCheck,
  ChevronRight,
  Flame,
} from "lucide-react";
import Link from "next/link";

function getTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function getFormattedTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  const hoursStr = hours < 10 ? `0${hours}` : hours;
  return `${hoursStr}:${minutesStr} ${ampm}`;
}

// Celebration Audio Chime using Web Audio API
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 784.0, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const startTime = ctx.currentTime + idx * 0.1;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch {}
}

interface ScanEntry {
  time: string;
  timestamp: number;
  outletName: string;
  outletId?: string;
  scanNumber?: number;
}

interface TodayAttendanceDoc {
  status: string;
  date: string;
  inTime: string;
  outTime?: string;
  lastScanTime?: string;
  scanCount: number;
  scans?: ScanEntry[];
  outletName?: string;
}

export default function ScanPage() {
  const { user } = useAuth();
  const [scannerActive, setScannerActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scan Processing & Modal State
  const [scanProcessing, setScanProcessing] = useState(false);
  const [successData, setSuccessData] = useState<{
    outletName: string;
    time: string;
    scanCount: number;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Today's attendance record in real-time
  const [todayRecord, setTodayRecord] = useState<TodayAttendanceDoc | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isCooldownRef = useRef(false);
  const todayStr = getTodayIso();

  // Listen to today's attendance document for active client
  useEffect(() => {
    if (!user?.clientId) return;

    const docRef = doc(db, "clients", user.clientId, "attendance", todayStr);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setTodayRecord(snap.data() as TodayAttendanceDoc);
        } else {
          setTodayRecord(null);
        }
        setLoadingToday(false);
      },
      (err) => {
        console.warn("Attendance listener fallback:", err);
        setLoadingToday(false);
      }
    );

    return () => unsub();
  }, [user?.clientId, todayStr]);

  // Start QR Code Scanner
  const startScanner = async (mode: "environment" | "user" = facingMode) => {
    setScanError(null);
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
        html5QrCodeRef.current = null;
      }

      const qrScanner = new Html5Qrcode("reader");
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: mode },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        () => {} // silent on frame without QR
      );

      setScannerActive(true);
    } catch (err: any) {
      console.error("Camera scanner start error:", err);
      setScanError(
        "Camera access permission is required to scan QR codes. Please check browser settings."
      );
      setScannerActive(false);
    }
  };

  // Stop QR Code Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  // Toggle Camera Facing Mode (Front vs Back)
  const toggleFacingMode = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (scannerActive) {
      await stopScanner();
      setTimeout(() => {
        startScanner(nextMode);
      }, 200);
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Handler on successful QR code detection
  const onScanSuccess = async (decodedText: string) => {
    if (isCooldownRef.current || scanProcessing) return;
    isCooldownRef.current = true;

    try {
      let outletId = "";
      let outletName = "Brother's Fitness Outlet";

      // 1. Parse QR payload
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed.app === "BROTHERS_FITNESS" || parsed.outletName || parsed.outletId) {
          outletName = parsed.outletName || outletName;
          outletId = parsed.outletId || "";
        }
      } catch {
        // Plain string fallback
        if (decodedText.toLowerCase().includes("brother") || decodedText.toLowerCase().includes("fitness") || decodedText.length > 5) {
          outletName = decodedText.substring(0, 30);
        } else {
          throw new Error("Invalid QR Code. Please scan official Brother's Fitness outlet QR.");
        }
      }

      setScanProcessing(true);
      if (soundEnabled) playChime();

      // 2. Record attendance in Firestore for active client
      const timeStr = getFormattedTime();
      const clientDocRef = doc(db, "clients", user!.clientId, "attendance", todayStr);
      const existingSnap = await getDoc(clientDocRef);

      let newScanCount = 1;
      let existingScans: ScanEntry[] = [];

      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as TodayAttendanceDoc;
        existingScans = existingData.scans || [];

        // If legacy doc had inTime without scans array
        if (existingScans.length === 0 && existingData.inTime) {
          existingScans.push({
            time: existingData.inTime,
            timestamp: Date.now() - 60000,
            outletName: existingData.outletName || outletName,
            scanNumber: 1,
          });
        }

        newScanCount = (existingData.scanCount || existingScans.length || 1) + 1;

        const updatedScans: ScanEntry[] = [
          ...existingScans,
          {
            time: timeStr,
            timestamp: Date.now(),
            outletName: outletName,
            outletId: outletId,
            scanNumber: newScanCount,
          },
        ];

        await setDoc(
          clientDocRef,
          {
            clientId: user!.clientId,
            clientName: user!.clientName,
            clientMobile: user!.mobileNumber,
            clientPhotoUrl: user!.photoUrl || "",
            outletName: outletName,
            date: todayStr,
            inTime: existingData.inTime || timeStr,
            outTime: timeStr,
            lastScanTime: timeStr,
            status: "Present",
            scanCount: newScanCount,
            scans: updatedScans,
            verified: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // First scan of the day!
        const initialScans: ScanEntry[] = [
          {
            time: timeStr,
            timestamp: Date.now(),
            outletName: outletName,
            outletId: outletId,
            scanNumber: 1,
          },
        ];

        await setDoc(clientDocRef, {
          clientId: user!.clientId,
          clientName: user!.clientName,
          clientMobile: user!.mobileNumber,
          clientPhotoUrl: user!.photoUrl || "",
          outletName: outletName,
          date: todayStr,
          inTime: timeStr,
          outTime: timeStr,
          lastScanTime: timeStr,
          status: "Present",
          scanCount: 1,
          scans: initialScans,
          verified: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Show success modal
      setSuccessData({
        outletName,
        time: timeStr,
        scanCount: newScanCount,
      });

      // Pause scanner while popup is open
      await stopScanner();
    } catch (err: any) {
      console.error("Scan processing error:", err);
      setScanError(err?.message || "Failed to record scan. Please scan the official gym QR code.");
    } finally {
      setScanProcessing(false);
      // Cooldown timer to prevent accidental double-tap scans
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-black shadow-md shadow-amber-400/20 font-medium">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>QR Code Scanner</span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 border border-amber-400/30">
                Attendance
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Scan the gym station QR to mark your presence instantly
            </p>
          </div>
        </div>

        {/* Member Profile Pill */}
        <div className="flex items-center gap-2 rounded-lg bg-white border border-zinc-200/80 px-3 py-1.5 shadow-xs dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black font-medium text-[10px]">
            {user?.clientName?.charAt(0).toUpperCase() || "M"}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
              {user?.clientName}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">
              {todayStr}
            </span>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Camera Viewfinder</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Point your camera at the Brother&apos;s Fitness outlet QR code
            </p>
          </div>

          {/* Sound & Camera Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 transition-colors cursor-pointer"
              title={soundEnabled ? "Mute audio" : "Enable chime"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-500" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleFacingMode}
              disabled={!scannerActive}
              className="flex h-8.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 disabled:opacity-40 transition-colors cursor-pointer"
              title="Switch Front / Back Camera"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{facingMode === "environment" ? "Back" : "Front"}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {scanError && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Camera Viewport Canvas */}
        <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-800 shadow-inner flex flex-col items-center justify-center min-h-[320px]">
          {/* HTML5 QR Code Container */}
          <div id="reader" className="w-full h-full" />

          {/* Golden Scanning Reticle Overlay (Active when camera is running) */}
          {scannerActive && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="relative h-60 w-60 rounded-lg border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex flex-col justify-between p-2">
                {/* 4 Corner Accents */}
                <span className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                {/* Animated Golden Laser Scan Line */}
                <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_#F59E0B] animate-[bounce_2s_infinite]" />
              </div>
            </div>
          )}

          {/* Idle State when Camera is OFF */}
          {!scannerActive && (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-500 shadow-inner">
                <Camera className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-0.5">
                  Camera is Paused
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Tap the button below to turn on your camera and scan the gym QR code.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Toggle Button */}
        <div className="flex items-center justify-center pt-2">
          {!scannerActive ? (
            <button
              onClick={() => startScanner()}
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 text-xs font-medium text-black shadow-md shadow-amber-400/20 hover:bg-amber-500 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" />
              <span>Turn On Camera & Scan</span>
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <span>Stop Camera</span>
            </button>
          )}
        </div>
      </div>

      {/* TODAY'S ATTENDANCE SUMMARY & SCAN ACTIVITY */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-amber-500" />
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Today&apos;s Attendance Activity
            </h2>
          </div>

          <Link
            href="/attendance"
            className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
          >
            <span>Full History</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {todayRecord ? (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      ATTENDANCE MARKED: PRESENT
                    </span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                      {todayRecord.scanCount || 1} Scan{todayRecord.scanCount > 1 ? "s" : ""} Today
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    First Check-in: <strong className="text-zinc-800 dark:text-zinc-200">{todayRecord.inTime}</strong>
                    {todayRecord.outTime && todayRecord.outTime !== todayRecord.inTime && (
                      <> • Latest Scan: <strong className="text-zinc-800 dark:text-zinc-200">{todayRecord.outTime}</strong></>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:text-right">
                <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                <span>{todayRecord.outletName || "Main Branch"}</span>
              </div>
            </div>

            {/* List of Individual Scans for Today */}
            {todayRecord.scans && todayRecord.scans.length > 0 && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Scan Timeline ({todayRecord.scans.length})
                </h3>
                <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200/80 dark:divide-zinc-800 dark:border-zinc-800 overflow-hidden">
                  {todayRecord.scans.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-zinc-50/50 hover:bg-zinc-50 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-700 font-medium text-xs dark:text-amber-400">
                          #{s.scanNumber || idx + 1}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            Check-in Scan
                          </span>
                          <span className="block text-[11px] text-zinc-500">
                            {s.outletName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span>{s.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Unmarked State */
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-800">
            <Clock className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Not Checked In Today
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Scan the gym station QR code to log today&apos;s check-in.
            </p>
          </div>
        )}
      </div>

      {/* POPUP MODAL: SCAN SUCCESS CELEBRATION */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-lg border border-amber-400/40 bg-white p-6 shadow-2xl dark:border-amber-400/30 dark:bg-zinc-900 text-center space-y-4 animate-in zoom-in-95">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-amber-400 text-black shadow-lg shadow-amber-400/30">
              <Sparkles className="h-8 w-8 animate-spin" />
            </div>

            <div>
              <span className="rounded-lg bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                ✓ Verified Presence
              </span>
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mt-2">
                Attendance Recorded!
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Successfully logged at <strong className="text-zinc-800 dark:text-zinc-200">{successData.outletName}</strong>
              </p>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200/80 dark:bg-zinc-800/60 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Scan Time:</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{successData.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Today&apos;s Scans:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">Scan #{successData.scanCount}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="flex h-9 w-full items-center justify-center rounded-lg bg-amber-400 px-4 text-xs font-medium text-black shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessData(null);
                  startScanner();
                }}
                className="flex h-9 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Scan Another Station
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
