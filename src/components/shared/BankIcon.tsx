// ============================================================
// AjoFlow – Bank Icon Component
// Renders real, high-quality bank logos (self-hosted, NIBSS-coded)
// Falls back to a branded initials badge only for banks not in
// the logo dataset (verified absent — e.g. Moniepoint)
// ============================================================

"use client";

import { useState } from "react";
import Image from "next/image";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBankByName } from "@/lib/banks";

interface FallbackBrand {
  bg: string;
  initials: string;
}

const FALLBACK_BRANDS: Record<string, FallbackBrand> = {
  "Moniepoint MFB": { bg: "bg-blue-600", initials: "MP" },
  "Moniepoint": { bg: "bg-blue-600", initials: "MP" },
  "Nomba MFB": { bg: "bg-primary", initials: "NB" },
};

const sizeClasses = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" };
const sizePx = { sm: 32, md: 40, lg: 48 };

export default function BankIcon({
  bankName,
  size = "md",
  className,
}: {
  bankName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const bank = getBankByName(bankName);
  const px = sizePx[size];

  if (bank && !imgError) {
    return (
      <div className={cn(
        "rounded-xl bg-white border border-border flex items-center justify-center flex-shrink-0 overflow-hidden p-1.5",
        sizeClasses[size], className
      )}>
        <Image
          src={bank.logoUrl}
          alt={`${bankName} logo`}
          width={px}
          height={px}
          className="object-contain w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const fallback = FALLBACK_BRANDS[bankName];
  if (fallback) {
    return (
      <div className={cn(
        "rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm",
        fallback.bg, sizeClasses[size],
        size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs",
        className
      )}>
        {fallback.initials}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0", sizeClasses[size], className)}>
      <Landmark className="w-4 h-4 text-gray-500" />
    </div>
  );
}
