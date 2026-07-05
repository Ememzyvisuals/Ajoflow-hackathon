import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text">About AjoFlow</h1>
      </div>

      <div className="dashboard-card space-y-4">
        <p className="text-sm text-text leading-relaxed">
          AjoFlow digitizes the traditional Nigerian rotating savings group (Ajo / Esusu) —
          contributions, treasury tracking, trust scoring, and payouts, all in one place.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">
          Built for Nigerian cooperative savings groups, powered by Supabase and Nomba.
        </p>
        <div className="pt-3 border-t border-border text-xs text-text-secondary space-y-1">
          <p>Version 1.0.0</p>
          <p>© {new Date().getFullYear()} AjoFlow</p>
        </div>
      </div>
    </div>
  );
}
