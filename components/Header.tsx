"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Search, Bell, Eye, Command, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-4 shadow-sm border-b border-amber-600/30 text-zinc-950">
      {/* Left: App Logo / Brand Tag (Shopify style top bar header) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-black/90 px-3 py-1 rounded-lg text-white shadow-sm border border-amber-300/30">
          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-amber-400 bg-black">
            <Image
              src="/logo.png"
              alt="Brother's Fitness Logo"
              width={24}
              height={24}
              className="object-contain p-0.5"
              priority
            />
          </div>
          <span className="text-xs font-bold tracking-tight text-amber-400">
            BROTHER'S FITNESS
          </span>
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-400/30">
            Client Portal
          </span>
        </div>
      </div>

      {/* Middle: Search bar matching Shopify design */}
      <div className="flex flex-1 justify-center px-4 max-w-lg">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-8.5 w-full rounded-lg border border-amber-600/20 bg-black/10 pl-9 pr-14 text-xs font-medium text-zinc-950 placeholder-zinc-700 outline-none transition-all focus:bg-white focus:text-zinc-900 focus:placeholder-zinc-400 focus:ring-2 focus:ring-amber-900/30 shadow-inner"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right: Actions & User Avatar */}
      <div className="flex items-center gap-2.5">
        <button className="hidden sm:flex h-8.5 items-center gap-1.5 rounded-lg bg-black/10 px-2.5 text-xs font-semibold text-zinc-900 hover:bg-black/20 transition-colors">
          <Eye className="h-4 w-4" />
          <span>View mode</span>
        </button>

        <button 
          className="relative flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-black/10 text-zinc-900 hover:bg-black/20 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-600 ring-2 ring-amber-400" />
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-amber-600/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-amber-400 text-xs font-bold shadow-xs border border-amber-300">
            BF
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold leading-tight text-zinc-950 truncate max-w-[100px]">
              {user?.mobileNumber ? `+91 ${user.mobileNumber}` : "Member Account"}
            </span>
            <span className="text-[10px] font-semibold text-zinc-800">
              Active Member
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="flex h-8.5 items-center gap-1.5 rounded-lg bg-black/10 px-2.5 text-xs font-bold text-zinc-950 hover:bg-black/20 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
