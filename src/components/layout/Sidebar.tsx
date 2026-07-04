"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, Send,
  BarChart2, Bell, Settings, LogOut
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";
import type { Profile } from "@/types";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/groups", icon: Users, label: "Groups" },
  { href: "/contributions", icon: CreditCard, label: "Contributions" },
  { href: "/payouts", icon: Send, label: "Payouts" },
  { href: "/loans", icon: BarChart2, label: "Loans" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-bold text-lg text-text">AjoFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "sidebar-item",
                isActive && "active"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
            {profile?.full_name ? getInitials(profile.full_name) : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">{profile?.full_name ?? "User"}</p>
            <p className="text-xs text-text-secondary truncate">{profile?.email}</p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="sidebar-item w-full mt-1 text-danger hover:bg-red-50 hover:text-danger"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
