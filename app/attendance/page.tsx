import React from "react";
import { CalendarCheck, Download, Filter } from "lucide-react";

export default function AttendancePage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header matching Shopify header styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-black shadow-xs font-bold">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Attendance
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Check-in logs and attendance history
            </p>
          </div>
        </div>

        {/* Action Header controls (Shopify reference style) */}
        <div className="flex items-center gap-2">
          <button className="flex h-8.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
            <Download className="h-3.5 w-3.5" />
            <span>Export Logs</span>
          </button>
          <button className="flex h-8.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Main Empty State / Content Canvas */}
      <div className="min-h-[420px] rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-600 dark:text-amber-400 mb-4">
          <CalendarCheck className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
          Attendance Page Container
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
          This page is currently empty as requested. Daily check-in records and attendance calendar will be added here later.
        </p>
      </div>
    </div>
  );
}
