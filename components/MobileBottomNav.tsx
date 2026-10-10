"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, CalendarCheck, CreditCard, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Scan", href: "/scan", icon: QrCode },
    { name: "Attendance", href: "/attendance", icon: CalendarCheck },
    { name: "Plan", href: "/plan", icon: CreditCard },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-zinc-200 bg-white/95 backdrop-blur-md px-2 lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 transition-colors ${
              isActive
                ? "text-amber-600 font-bold dark:text-amber-400"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? "bg-amber-400 text-black shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-semibold">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
