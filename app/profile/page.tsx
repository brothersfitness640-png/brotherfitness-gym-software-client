"use client";

import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { hashMpin, verifyMpin } from "@/lib/crypto";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  Users,
  LogOut,
  Sparkles,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ProfilePage() {
  const { user, logout, switchProfile } = useAuth();
  const [copiedId, setCopiedId] = useState(false);

  // Change MPIN Modal State
  const [isChangeMpinOpen, setIsChangeMpinOpen] = useState(false);
  const [currentMpin, setCurrentMpin] = useState("");
  const [newMpin, setNewMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [mpinSaving, setMpinSaving] = useState(false);
  const [mpinError, setMpinError] = useState<string | null>(null);
  const [mpinSuccess, setMpinSuccess] = useState<string | null>(null);

  const handleCopyClientId = () => {
    if (user?.clientId) {
      navigator.clipboard.writeText(user.clientId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleUpdateMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpinError(null);
    setMpinSuccess(null);

    if (!user?.clientId) return;

    if (!newMpin || !/^\d{4,6}$/.test(newMpin)) {
      setMpinError("New MPIN must be between 4 and 6 numerical digits.");
      return;
    }

    if (newMpin !== confirmMpin) {
      setMpinError("New MPIN and Confirm MPIN do not match.");
      return;
    }

    setMpinSaving(true);
    try {
      const computedHash = await hashMpin(newMpin.trim());
      await updateDoc(doc(db, "clients", user.clientId), {
        mpin: newMpin.trim(),
        mpinHash: computedHash,
        updatedAt: serverTimestamp(),
      });

      setMpinSuccess("MPIN updated successfully!");
      setCurrentMpin("");
      setNewMpin("");
      setConfirmMpin("");
      setTimeout(() => {
        setIsChangeMpinOpen(false);
        setMpinSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error("MPIN update error:", err);
      setMpinError(err?.message || "Failed to update MPIN. Please try again.");
    } finally {
      setMpinSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-md shadow-amber-400/20 font-bold">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Member Profile</span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-400/30">
                Account Details
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Personal credentials, membership assignment, and MPIN security
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 transition-colors cursor-pointer w-fit"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* MEMBER PROFILE HERO BANNER */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Member Avatar */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl overflow-hidden border-2 border-amber-400 bg-black text-amber-400 text-3xl font-black shadow-md shadow-amber-400/20">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.clientName}
                className="h-full w-full object-cover"
              />
            ) : (
              user?.clientName?.charAt(0).toUpperCase() || "M"
            )}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {user?.clientName}
              </h2>
              <span className="w-fit mx-auto sm:mx-0 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                ✓ Verified Member
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
              {/* Copyable Client ID */}
              <button
                type="button"
                onClick={handleCopyClientId}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 text-xs font-mono font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Click to copy Client ID"
              >
                <span>ID: {user?.clientId}</span>
                {copiedId ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3 text-zinc-400" />
                )}
              </button>

              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-400/30">
                <Building2 className="h-3 w-3" />
                {user?.outletName || "Main Branch"}
              </span>

              {user?.planName && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <CreditCard className="h-3 w-3 text-zinc-400" />
                  {user.planName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE DETAILS GRID */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          Personal & Contact Information
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3.5 border border-zinc-200/60 dark:bg-zinc-800/40 dark:border-zinc-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Mobile Number
              </span>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                +91 {user?.mobileNumber}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3.5 border border-zinc-200/60 dark:bg-zinc-800/40 dark:border-zinc-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Email Address
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                {user?.email || "No Email Registered"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3.5 border border-zinc-200/60 dark:bg-zinc-800/40 dark:border-zinc-800 sm:col-span-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400 shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Residential Address
              </span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                {user?.address || "Address not recorded"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY & MPIN MANAGEMENT CARD */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Security & MPIN Access
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsChangeMpinOpen(!isChangeMpinOpen);
              setMpinError(null);
              setMpinSuccess(null);
            }}
            className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>{isChangeMpinOpen ? "Close Form" : "Change MPIN"}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-zinc-50 p-4 border border-zinc-200/60 dark:bg-zinc-800/40 dark:border-zinc-800">
          <div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
              Login PIN Protection Active
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Your 4 to 6 digit MPIN secures access to this client portal on any device.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Lock className="h-3 w-3" />
            Encrypted
          </span>
        </div>

        {/* Change MPIN Inline Form */}
        {isChangeMpinOpen && (
          <form
            onSubmit={handleUpdateMpin}
            className="rounded-xl border border-amber-400/40 bg-amber-50/20 p-4 dark:border-amber-400/30 dark:bg-amber-950/10 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Update Login MPIN
              </span>
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1 cursor-pointer"
              >
                {showPins ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showPins ? "Hide" : "Show"} PINs</span>
              </button>
            </div>

            {mpinError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{mpinError}</span>
              </div>
            )}

            {mpinSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{mpinSuccess}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  New 4-6 Digit MPIN
                </label>
                <input
                  type={showPins ? "text" : "password"}
                  maxLength={6}
                  required
                  placeholder="e.g. 5678"
                  value={newMpin}
                  onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ""))}
                  className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 font-mono text-xs font-bold tracking-widest text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Confirm New MPIN
                </label>
                <input
                  type={showPins ? "text" : "password"}
                  maxLength={6}
                  required
                  placeholder="Repeat new MPIN"
                  value={confirmMpin}
                  onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ""))}
                  className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 font-mono text-xs font-bold tracking-widest text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsChangeMpinOpen(false)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mpinSaving}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-500 disabled:opacity-50 cursor-pointer"
              >
                {mpinSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Save New MPIN</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MULTI-CLIENT PROFILE SWITCHER (IF SAME NUMBER HAS MULTIPLE CLIENTS) */}
      {user?.linkedClients && user.linkedClients.length > 1 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Linked Accounts on +91 {user.mobileNumber}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Switch between member profiles sharing this mobile number
                </p>
              </div>
            </div>
            <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
              {user.linkedClients.length} Profiles
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {user.linkedClients.map((c) => {
              const isCurrent = c.id === user.clientId;
              return (
                <div
                  key={c.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "border-amber-400 bg-amber-400/10 shadow-xs dark:bg-amber-950/20"
                      : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full overflow-hidden border border-amber-400 bg-black text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        c.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        {c.outletName}
                      </span>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchProfile(c.id)}
                      className="rounded-lg bg-zinc-200 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-zinc-800 hover:text-black dark:bg-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
