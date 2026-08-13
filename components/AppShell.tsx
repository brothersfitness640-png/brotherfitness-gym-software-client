"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  // Hide header and sidebars on login page or when unauthenticated
  if (!user || isLoginPage) {
    return (
      <main className="min-h-screen w-full bg-zinc-950 font-sans">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F8] dark:bg-zinc-950 flex flex-col font-sans text-zinc-900 dark:text-zinc-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 lg:pl-52 pb-16 lg:pb-6 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
