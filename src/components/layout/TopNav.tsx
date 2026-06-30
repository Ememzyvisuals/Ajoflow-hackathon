"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/types";

interface TopNavProps {
  profile: Profile | null;
  unreadCount: number;
}

export default function TopNav({ profile, unreadCount }: TopNavProps) {
  return (
    <header className="hidden lg:flex items-center justify-between h-16 px-6 bg-white border-b border-border sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5 text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          )}
        </Link>

        <Link href="/profile" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-primary font-semibold text-sm">
            {profile?.full_name ? getInitials(profile.full_name) : "U"}
          </div>
          <div className="hidden xl:block">
            <p className="text-sm font-semibold text-text leading-none">{profile?.full_name ?? "User"}</p>
            <p className="text-xs text-text-secondary mt-0.5">{profile?.email}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
