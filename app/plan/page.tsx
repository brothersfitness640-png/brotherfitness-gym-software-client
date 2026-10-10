"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import {
  CreditCard,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Dumbbell,
  AlertCircle,
  History,
} from "lucide-react";
import Link from "next/link";

interface AssignedPlanDoc {
  id: string;
  planName: string;
  startDate: string;
  endDate?: string;
  totalAmount?: number;
  basePrice?: number;
  discount?: number;
  durationMonths?: number;
  notes?: string;
  createdAt?: any;
}

export default function PlanPage() {
  const { user } = useAuth();
  const [historyPlans, setHistoryPlans] = useState<AssignedPlanDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const todayIso = new Date().toISOString().split("T")[0];

  // Listen to assigned plans subcollection for this client
  useEffect(() => {
    if (!user?.clientId) return;

    const plansRef = collection(db, "clients", user.clientId, "assigned_plans");
    const q = query(plansRef, orderBy("startDate", "desc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AssignedPlanDoc[];

        // Ensure recent one is sorted at top by startDate desc
        fetched.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
        setHistoryPlans(fetched);
        setLoading(false);
      },
      (err) => {
        console.warn("Assigned plans listener fallback:", err);
        // Fallback without orderBy index
        onSnapshot(plansRef, (snapshot) => {
          const fetched = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as AssignedPlanDoc[];
          fetched.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
          setHistoryPlans(fetched);
          setLoading(false);
        });
      }
    );

    return () => unsub();
  }, [user?.clientId]);

  // Determine current active plan from subcollection or client profile
  const currentPlan = historyPlans.find((p) => (p.endDate ? p.endDate >= todayIso : true)) || historyPlans[0] || null;

  // Compute days remaining
  const planEnd = currentPlan?.endDate || user?.planEndDate || "";
  const planStart = currentPlan?.startDate || user?.planStartDate || "";

  let daysRemaining = 0;
  let totalDurationDays = 30;
  let progressPercent = 100;
  let isExpired = false;

  if (planEnd) {
    const endMs = new Date(planEnd).getTime();
    const todayMs = new Date(todayIso).getTime();
    const diffDays = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(0, diffDays);
    isExpired = diffDays < 0;

    if (planStart) {
      const startMs = new Date(planStart).getTime();
      totalDurationDays = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
      const elapsedDays = Math.max(0, Math.ceil((todayMs - startMs) / (1000 * 60 * 60 * 24)));
      progressPercent = Math.min(100, Math.round((elapsedDays / totalDurationDays) * 100));
    }
  }

  const activePlanTitle = currentPlan?.planName || user?.planName || "General Gym Membership";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-black shadow-md shadow-amber-400/20 font-medium">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Membership Plan</span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 border border-amber-400/30">
                Active Tier
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your ongoing membership package and complete chronological renewal history
            </p>
          </div>
        </div>

        <Link
          href="/scan"
          className="flex h-9 items-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-medium text-black shadow-xs hover:bg-amber-500 transition-colors w-fit"
        >
          <Zap className="h-4 w-4" />
          <span>Quick Scan Check-in</span>
        </Link>
      </div>

      {/* CURRENT ACTIVE PLAN HERO CARD */}
      <div className="relative overflow-hidden rounded-lg border border-amber-400/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white p-6 sm:p-8 shadow-xl space-y-6">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        {/* Top Header Tag */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-black font-medium">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-widest text-amber-400 block">
                CURRENT ACTIVE PLAN
              </span>
              <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-white">
                {activePlanTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isExpired ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Membership
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Plan Expired
              </span>
            )}
          </div>
        </div>

        {/* Plan Validity & Days Remaining */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
              Start Date
            </span>
            <span className="text-sm font-medium text-white flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              {planStart || "Registration Date"}
            </span>
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
              Valid Till
            </span>
            <span className="text-sm font-medium text-white flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              {planEnd || "Ongoing"}
            </span>
          </div>

          <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 p-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400 block mb-1">
              Days Remaining
            </span>
            <span className="text-xl font-medium text-amber-400">
              {!isExpired ? `${daysRemaining} Days` : "Renew Needed"}
            </span>
          </div>
        </div>

        {/* Progress Bar of Plan Validity */}
        {planEnd && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
              <span>Membership Period Progress</span>
              <span className="font-medium text-amber-400">{progressPercent}% elapsed</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Plan Access Perks & Branch */}
        <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            <span>Assigned Outlet: <strong className="text-white">{user?.outletName || "Main Branch"}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Full Gym Access Included</span>
          </div>
        </div>
      </div>

      {/* PLAN HISTORY SECTION (RECENT AT TOP) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-amber-500" />
            <div>
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Plan History & Renewals
              </h2>
              <p className="text-[11px] text-zinc-500">
                Most recent plans are displayed at the top
              </p>
            </div>
          </div>

          <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {historyPlans.length} Records
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            Loading plan history...
          </div>
        ) : historyPlans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-800">
            <Layers className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              No Previous Plans Recorded
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Your registered plan details are active as shown above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyPlans.map((plan, idx) => {
              const isRecent = idx === 0;
              const isPlanPast = plan.endDate && plan.endDate < todayIso;

              return (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-4 transition-all ${
                    isRecent
                      ? "border-amber-400/50 bg-amber-50/20 dark:border-amber-400/30 dark:bg-amber-950/10 shadow-xs"
                      : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-medium text-xs ${
                          isRecent
                            ? "bg-amber-400 text-black shadow-xs"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {isRecent ? <Sparkles className="h-5 w-5" /> : `#${idx + 1}`}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {plan.planName}
                          </h3>
                          {isRecent && (
                            <span className="rounded bg-amber-400/30 px-2 py-0.5 text-[9px] font-medium uppercase text-amber-900 dark:text-amber-300 border border-amber-400/40">
                              Latest Plan
                            </span>
                          )}
                          {!isPlanPast ? (
                            <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-lg bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Completed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="h-3 w-3 text-zinc-400" />
                            {plan.startDate} {plan.endDate ? `to ${plan.endDate}` : ""}
                          </span>
                          {plan.durationMonths && (
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              • {plan.durationMonths} Month{plan.durationMonths > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {plan.totalAmount !== undefined && plan.totalAmount > 0 && (
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">
                          Amount
                        </span>
                        <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                          ₹{plan.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
