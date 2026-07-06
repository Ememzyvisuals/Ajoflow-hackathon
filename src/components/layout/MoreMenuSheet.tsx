"use client";

import Link from "next/link";
import { X, HandCoins, Send, CreditCard, Settings, Megaphone } from "lucide-react";

const moreItems = [
  { href: "/contributions", icon: CreditCard, label: "Contributions" },
  { href: "/payouts", icon: Send, label: "Payouts" },
  { href: "/loans", icon: HandCoins, label: "Loans" },
  { href: "/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function MoreMenuSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pb-safe animate-slide-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="font-bold text-text">More</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 px-5 pb-8">
          {moreItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-background hover:bg-gray-100 transition-colors"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-text">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
