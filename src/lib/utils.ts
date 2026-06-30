import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency Formatting ───────────────────────────────────────
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNairaCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `₦${(amount / 1_000).toFixed(1)}K`;
  }
  return formatNaira(amount);
}

// ── Date Formatting ────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

// ── Trust Score ───────────────────────────────────────────────
export function getTrustScoreLabel(score: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (score >= 90) return { label: "Excellent", color: "text-green-700", bg: "bg-green-100" };
  if (score >= 75) return { label: "Good", color: "text-blue-700", bg: "bg-blue-100" };
  if (score >= 60) return { label: "Fair", color: "text-yellow-700", bg: "bg-yellow-100" };
  if (score >= 40) return { label: "Poor", color: "text-orange-700", bg: "bg-orange-100" };
  return { label: "Critical", color: "text-red-700", bg: "bg-red-100" };
}

// ── Group Type Labels ─────────────────────────────────────────
export function getGroupTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    rotational: "Rotational Ajo",
    target_savings: "Target Savings",
    cooperative: "Cooperative",
    investment: "Investment",
  };
  return labels[type] ?? type;
}

// ── Contribution Frequency ────────────────────────────────────
export function getFrequencyLabel(freq: string): string {
  const labels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };
  return labels[freq] ?? freq;
}

// ── Generate Order Reference ───────────────────────────────────
export function generateOrderRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AF-${timestamp}-${random}`;
}

// ── Truncate Text ─────────────────────────────────────────────
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

// ── Get Initials ──────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Slugify ───────────────────────────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

// ── Status Colors ─────────────────────────────────────────────
export function getStatusColor(status: string): {
  text: string;
  bg: string;
  border: string;
} {
  const colors: Record<string, { text: string; bg: string; border: string }> = {
    paid: { text: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    active: { text: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    approved: { text: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    pending: { text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
    processing: { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    late: { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    failed: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    rejected: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    suspended: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  };
  return colors[status] ?? { text: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" };
}

// ── Percentage ────────────────────────────────────────────────
export function toPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
