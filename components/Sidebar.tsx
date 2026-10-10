"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  QrCode,
  CalendarCheck,
  CreditCard,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

const navItems = [
  {
    name: "Scan",
    href: "/scan",
    icon: QrCode,
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
  },
  {
    name: "Plan",
    href: "/plan",
    icon: CreditCard,
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-52 flex-col border-r border-zinc-200 bg-[#ECECEE] dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
      {/* Navigation items */}
      <nav className="flex-1 space-y-1 p-2.5 overflow-y-auto">
        <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Member Menu
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
              className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all duration-150 ${
                isActive
                  ? "bg-white text-zinc-950 shadow-xs border border-zinc-300/80 dark:bg-zinc-800 dark:text-amber-400 dark:border-amber-400/20"
                  : "text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                    isActive
                      ? "bg-amber-400 text-black shadow-xs"
                      : "text-zinc-500 group-hover:text-amber-600 dark:text-zinc-400"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <span className="text-xs font-bold">{item.name}</span>
              </div>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}

        <div className="pt-4">
          <button
            onClick={logout}
            className="cursor-pointer group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Footer Info Box */}
      <div className="border-t border-zinc-200 p-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-2 rounded-xl bg-amber-400/10 p-2.5 border border-amber-400/20">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-black font-bold shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {user?.clientName || "Brother's Fitness"}
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate">
              {user?.outletName || "Active Member"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
