"use client";

import { useState } from "react";
import { formatNaira, formatDate } from "@/lib/utils";
import { Loader2, Check, ShieldCheck } from "lucide-react";
import { approvePayout } from "@/features/payments/actions";
import { useRouter } from "next/navigation";

type Approval = {
  id: string; amount: number; created_at: string;
  groups: { name: string } | { name: string }[] | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

export default function PendingApprovals({ approvals }: { approvals: Approval[] }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-text">Awaiting Your Approval</p>
      </div>
      <div className="space-y-2">
        {approvals.map((a) => (
          <ApprovalRow key={a.id} approval={a} />
        ))}
      </div>
    </div>
  );
}

function ApprovalRow({ approval }: { approval: Approval }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recipient = Array.isArray(approval.profiles) ? approval.profiles[0] : approval.profiles;
  const group = Array.isArray(approval.groups) ? approval.groups[0] : approval.groups;

  async function handleApprove() {
    setLoading(true);
    setError("");
    const result = await approvePayout(approval.id);
    setLoading(false);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Failed to approve payout.");
    }
  }

  return (
    <div className="dashboard-card border-2 border-primary/20">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-bold text-text">{formatNaira(approval.amount)}</p>
          <p className="text-xs text-text-secondary">
            To {recipient?.full_name ?? "member"} · {group?.name} · Requested {formatDate(approval.created_at)}
          </p>
        </div>
        <button onClick={handleApprove} disabled={loading} className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60 flex-shrink-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}
