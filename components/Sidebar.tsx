"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarCheck,
  Activity,
  CreditCard,
  Settings,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

const navItems = [
  {
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
  },
];

const futureItems = [
  { name: "My Workouts", icon: Activity },
  { name: "Membership Plan", icon: CreditCard },
  { name: "Profile & Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-52 flex-col border-r border-zinc-200 bg-[#ECECEE] dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
      {/* Navigation section - compact height & spacing */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all duration-150 ${
                isActive
                  ? "bg-white text-zinc-950 shadow-xs border border-zinc-300/60 dark:bg-zinc-800 dark:text-amber-400 dark:border-amber-400/20"
                  : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${
                    isActive
                      ? "bg-amber-400 text-black shadow-xs"
                      : "text-zinc-500 group-hover:text-amber-600 dark:text-zinc-400"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                </div>
                <span className="text-[12px]">{item.name}</span>
              </div>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}

        {/* Divider for future sections */}
        <div className="pt-3 pb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Coming Soon
        </div>

        {futureItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-600 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[12px]">{item.name}</span>
              </div>
              <span className="text-[9px] font-semibold bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                Soon
              </span>
            </div>
          );
        })}

        <button
          onClick={logout}
          className="cursor-pointer group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-zinc-800 transition-colors mt-2"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* Footer info box - compact styling */}
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 p-2 border border-amber-400/20">
          <div className="flex h-6.5 w-6.5 items-center justify-center rounded-md bg-amber-400 text-black font-bold shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Brother's Fitness
            </span>
            <span className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold truncate">
              Member Portal
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
