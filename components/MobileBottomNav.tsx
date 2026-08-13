"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarCheck } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Attendance", href: "/attendance", icon: CalendarCheck },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-zinc-200 bg-white px-2 lg:hidden dark:border-zinc-800 dark:bg-zinc-900 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg px-4 py-1.5 transition-colors ${
              isActive
                ? "text-amber-600 font-bold dark:text-amber-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? "text-amber-500" : ""}`} />
            <span className="text-[11px]">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
