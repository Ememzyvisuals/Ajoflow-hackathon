"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Plus, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/groups", icon: Users, label: "Groups" },
  { href: "/groups/create", icon: null, label: "New", isFab: true },
  { href: "/notifications", icon: Bell, label: "Activity" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function MobileNav() {
  const pathname = usePathname();

  // Individual group pages get their own bottom nav (GroupBottomNav,
  // rendered inside the group page itself) instead of this general one —
  // /groups and /groups/create still use this one.
  const isInsideAGroup = /^\/groups\/[^/]+$/.test(pathname) && pathname !== "/groups/create";
  if (isInsideAGroup) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border pb-safe">
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </Link>
            );
          }

          const Icon = item.icon!;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2",
                isActive ? "text-primary" : "text-text-secondary"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
