"use client";

import React, { useState } from "react";
import Image from "next/image";
import { LogOut, Users, Check, ChevronDown } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const { user, logout, switchProfile } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-4 shadow-sm border-b border-amber-600/30 text-zinc-950">
      {/* Left: App Logo & Brand Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-black/95 px-3 py-1 rounded-lg text-white shadow-sm border border-amber-300/30">
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
            BROTHER&apos;S FITNESS
          </span>
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-400/30">
            Member
          </span>
        </div>
      </div>

      {/* Right: User Profile Badge, Multi-Client Switcher & Logout */}
      <div className="flex items-center gap-2 relative">
        {/* Profile / Multi-Account Switcher */}
        {user?.linkedClients && user.linkedClients.length > 1 ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 rounded-lg bg-black/15 hover:bg-black/25 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border border-black/10"
              title="Switch Member Profile"
            >
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden border border-amber-400 bg-black text-amber-400 font-bold text-xs">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.clientName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.clientName?.charAt(0).toUpperCase() || "M"
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold leading-tight truncate max-w-[120px]">
                  {user.clientName}
                </span>
                <span className="text-[10px] text-zinc-800 font-semibold flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />
                  Switch Profile
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-800" />
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    Switch Member Account
                  </div>
                  <div className="mt-1 space-y-1">
                    {user.linkedClients.map((c) => {
                      const isCurrent = c.id === user.clientId;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            if (!isCurrent) switchProfile(c.id);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-amber-400/20 text-amber-900 font-bold dark:text-amber-300"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="h-6 w-6 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center font-bold text-[10px] text-zinc-700 dark:text-zinc-300">
                              {c.photoUrl ? (
                                <img
                                  src={c.photoUrl}
                                  alt={c.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                c.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="truncate">
                              <span className="block truncate">{c.name}</span>
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {c.outletName}
                              </span>
                            </div>
                          </div>
                          {isCurrent && (
                            <Check className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Single Client Account Badge */
          <div className="flex items-center gap-2 rounded-lg bg-black/15 px-2.5 py-1 text-xs">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden border border-amber-400 bg-black text-amber-400 font-bold text-xs">
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
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold leading-tight truncate max-w-[120px]">
                {user?.clientName || "Member Account"}
              </span>
              <span className="text-[10px] text-zinc-800 font-semibold truncate max-w-[120px]">
                {user?.outletName || "Active Member"}
              </span>
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="flex h-8.5 items-center gap-1.5 rounded-lg bg-black/15 px-2.5 text-xs font-bold text-zinc-950 hover:bg-black/25 transition-colors cursor-pointer border border-black/10"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
