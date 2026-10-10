"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Building2,
  TrendingUp,
  Flame,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface ScanEntry {
  time: string;
  timestamp: number;
  outletName: string;
  scanNumber?: number;
}

interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  status: string;
  inTime?: string;
  outTime?: string;
  lastScanTime?: string;
  scanCount?: number;
  scans?: ScanEntry[];
  outletName?: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Month & Year Filter
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Real-time listener to attendance records for this client
  useEffect(() => {
    if (!user?.clientId) return;

    const attRef = collection(db, "clients", user.clientId, "attendance");
    const unsub = onSnapshot(
      attRef,
      (snapshot) => {
        const records = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AttendanceRecord[];
        setAttendances(records);
        setLoading(false);
      },
      (err) => {
        console.warn("Attendance subcollection query fallback:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.clientId]);

  // Map of present records by date string (YYYY-MM-DD)
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendances.forEach((att) => {
      map.set(att.date, att);
    });
    return map;
  }, [attendances]);

  // Calculate days of the selected month
  const monthDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const todayIso = new Date().toISOString().split("T")[0];
    const clientStartIso = user?.planStartDate || "";

    const daysList = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
      const dateIso = `${selectedYear}-${monthStr}-${dayStr}`;

      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const isSunday = dateObj.getDay() === 0;
      const isFuture = dateIso > todayIso;
      const isBeforeJoin = clientStartIso && dateIso < clientStartIso;

      const record = attendanceMap.get(dateIso);
      const isPresent = Boolean(record && (record.status === "Present" || (record.scanCount && record.scanCount > 0)));

      let computedStatus: "present" | "absent" | "rest_day" | "future" = "future";
      if (isPresent) {
        computedStatus = "present";
      } else if (isFuture) {
        computedStatus = "future";
      } else if (isSunday) {
        computedStatus = "rest_day";
      } else {
        computedStatus = "absent";
      }

      daysList.push({
        day,
        dateIso,
        dateObj,
        isSunday,
        isFuture,
        isBeforeJoin,
        isPresent,
        status: computedStatus,
        record,
      });
    }

    return daysList;
  }, [selectedYear, selectedMonth, attendanceMap, user?.planStartDate]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const presentCount = monthDays.filter((d) => d.status === "present").length;
    const absentCount = monthDays.filter((d) => d.status === "absent").length;
    const totalElapsedWorkingDays = presentCount + absentCount;
    const attendanceRate = totalElapsedWorkingDays > 0 ? Math.round((presentCount / totalElapsedWorkingDays) * 100) : 0;

    let totalScansMonth = 0;
    monthDays.forEach((d) => {
      if (d.record) {
        totalScansMonth += d.record.scanCount || 1;
      }
    });

    return {
      presentCount,
      absentCount,
      attendanceRate,
      totalScansMonth,
    };
  }, [monthDays]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString("default", {
    month: "long",
  });

  // Filtered days list for daily log table
  const filteredDays = useMemo(() => {
    return monthDays.filter((d) => {
      if (d.status === "future") return false;
      if (statusFilter === "present") return d.status === "present";
      if (statusFilter === "absent") return d.status === "absent";
      return true;
    });
  }, [monthDays, statusFilter]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-black shadow-md shadow-amber-400/20 font-medium">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Attendance Tracker</span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 border border-amber-400/30">
                Monthly Logs
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Check present days, absent days, consistency rate, and scan timestamps
            </p>
          </div>
        </div>

        {/* Quick Action Link to Scan */}
        <Link
          href="/scan"
          className="flex h-9 items-center gap-2 rounded-lg bg-amber-400 px-4 text-xs font-medium text-black shadow-xs hover:bg-amber-500 transition-colors w-fit"
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Mark Today&apos;s Attendance</span>
        </Link>
      </div>

      {/* Month Selector Bar */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={handlePrevMonth}
          className="flex h-8.5 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2 font-medium text-sm text-zinc-900 dark:text-zinc-100">
          <Calendar className="h-4 w-4 text-amber-500" />
          <span>
            {monthName} {selectedYear}
          </span>
        </div>

        <button
          onClick={handleNextMonth}
          className="flex h-8.5 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 4 ATTENDANCE METRIC CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Days Present */}
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Days Present
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-medium text-emerald-700 dark:text-emerald-400">
              {metrics.presentCount}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Days Attended
            </span>
          </div>
        </div>

        {/* Card 2: Days Absent */}
        <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-800 dark:text-rose-300">
              Days Absent
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white shadow-xs">
              <XCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-medium text-rose-700 dark:text-rose-400">
              {metrics.absentCount}
            </span>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Missed Sessions
            </span>
          </div>
        </div>

        {/* Card 3: Consistency Rate */}
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Consistency Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-black shadow-xs font-medium">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-medium text-amber-800 dark:text-amber-400">
              {metrics.attendanceRate}%
            </span>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Gym Discipline
            </span>
          </div>
        </div>

        {/* Card 4: Total Scans Logged */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total Scans
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shadow-xs">
              <Flame className="h-4.5 w-4.5 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
              {metrics.totalScansMonth}
            </span>
            <span className="text-xs font-medium text-zinc-500">
              Check-ins Logged
            </span>
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR GRID VIEW */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Attendance Calendar Matrix
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Visual overview of every day in {monthName} {selectedYear}
            </p>
          </div>

          {/* Legend Badges */}
          <div className="flex items-center gap-3 text-[11px] font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Present</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>Absent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span>Sunday / Rest</span>
            </span>
          </div>
        </div>

        {/* Days Grid (7 columns: Mon to Sun) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div
              key={dayName}
              className="py-1 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-400"
            >
              {dayName}
            </div>
          ))}

          {/* Empty spacer blocks for first day alignment */}
          {Array.from({ length: new Date(selectedYear, selectedMonth - 1, 1).getDay() }).map((_, idx) => (
            <div key={`spacer-${idx}`} className="h-14 sm:h-16 rounded-lg bg-transparent" />
          ))}

          {/* Month Day Tiles */}
          {monthDays.map((item) => {
            const isSelected = expandedDate === item.dateIso;
            return (
              <div
                key={item.dateIso}
                onClick={() => {
                  if (item.status === "present") {
                    setExpandedDate(isSelected ? null : item.dateIso);
                  }
                }}
                className={`relative flex flex-col justify-between h-14 sm:h-16 rounded-lg p-1.5 sm:p-2 border transition-all ${
                  item.status === "present"
                    ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 cursor-pointer hover:shadow-md"
                    : item.status === "absent"
                    ? "bg-rose-50/80 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 text-rose-900 dark:text-rose-300"
                    : item.status === "rest_day"
                    ? "bg-zinc-100/70 border-zinc-200/80 dark:bg-zinc-800/40 dark:border-zinc-800 text-zinc-500"
                    : "bg-zinc-50/50 border-zinc-100 dark:bg-zinc-900/20 dark:border-zinc-800/50 text-zinc-400"
                } ${isSelected ? "ring-2 ring-amber-400" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{item.day}</span>
                  {item.status === "present" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>

                {item.status === "present" && (
                  <div className="flex flex-col">
                    <span className="text-[9px] sm:text-[10px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
                      {item.record?.inTime?.split(" ")[0]}
                    </span>
                    {item.record?.scanCount && item.record.scanCount > 1 && (
                      <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[8px] font-medium w-fit">
                        {item.record.scanCount}x
                      </span>
                    )}
                  </div>
                )}

                {item.status === "absent" && (
                  <span className="text-[9px] font-medium text-rose-600 dark:text-rose-400">
                    Absent
                  </span>
                )}

                {item.status === "rest_day" && (
                  <span className="text-[9px] font-medium text-zinc-400">
                    Sunday
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DAILY LOG TIMELINE TABLE */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Detailed Daily Attendance Logs
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Click any present record to view multiple scan timestamps
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              All Days ({filteredDays.length})
            </button>
            <button
              onClick={() => setStatusFilter("present")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === "present"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              Present ({metrics.presentCount})
            </button>
            <button
              onClick={() => setStatusFilter("absent")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === "absent"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-700 dark:text-rose-400"
              }`}
            >
              Absent ({metrics.absentCount})
            </button>
          </div>
        </div>

        {/* Log Entries */}
        {filteredDays.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No records matching this filter for {monthName} {selectedYear}.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDays.map((item) => {
              const isExpanded = expandedDate === item.dateIso;
              const hasMultipleScans = item.record?.scans && item.record.scans.length > 1;

              return (
                <div
                  key={item.dateIso}
                  className={`rounded-lg border transition-all overflow-hidden ${
                    item.status === "present"
                      ? "border-emerald-200 bg-white dark:border-emerald-950 dark:bg-zinc-900"
                      : "border-zinc-200/70 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/30"
                  }`}
                >
                  <div
                    onClick={() => {
                      if (item.status === "present") {
                        setExpandedDate(isExpanded ? null : item.dateIso);
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 ${
                      item.status === "present" ? "cursor-pointer hover:bg-emerald-50/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg font-medium text-xs ${
                          item.status === "present"
                            ? "bg-emerald-500 text-white"
                            : item.status === "absent"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-200"
                            : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {item.day}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            {item.dateObj.toLocaleDateString("en-IN", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                              item.status === "present"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : item.status === "absent"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {item.status === "present"
                              ? "PRESENT"
                              : item.status === "absent"
                              ? "ABSENT"
                              : "SUNDAY"}
                          </span>
                        </div>

                        {item.status === "present" && (
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                            <span>In: <strong className="text-zinc-800 dark:text-zinc-200">{item.record?.inTime}</strong></span>
                            {item.record?.outTime && item.record.outTime !== item.record.inTime && (
                              <span>• Out: <strong className="text-zinc-800 dark:text-zinc-200">{item.record?.outTime}</strong></span>
                            )}
                            <span className="text-zinc-400">• {item.record?.outletName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "present" && (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                            {item.record?.scanCount || 1} Scan{item.record?.scanCount && item.record.scanCount > 1 ? "s" : ""}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 text-zinc-400 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Scan Details */}
                  {isExpanded && item.record?.scans && item.record.scans.length > 0 && (
                    <div className="border-t border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">
                        Detailed Scan Timestamps for {item.dateIso}
                      </span>
                      <div className="space-y-1.5">
                        {item.record.scans.map((s, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between rounded-lg bg-white p-2 border border-zinc-200/60 dark:bg-zinc-900 dark:border-zinc-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-amber-400/20 px-1.5 py-0.2 font-mono text-[10px] font-medium text-amber-800">
                                #{s.scanNumber || sIdx + 1}
                              </span>
                              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                {s.outletName}
                              </span>
                            </div>
                            <span className="font-mono font-medium text-zinc-600 dark:text-zinc-300">
                              {s.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
