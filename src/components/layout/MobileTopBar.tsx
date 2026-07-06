import Link from "next/link";
import { Bell } from "lucide-react";

export default function MobileTopBar({ unreadCount }: { unreadCount: number }) {
  return (
    <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-border sticky top-0 z-30">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-bold text-text">AjoFlow</span>
      </Link>
      <Link href="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
        <Bell className="w-5 h-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        )}
      </Link>
    </header>
  );
}
