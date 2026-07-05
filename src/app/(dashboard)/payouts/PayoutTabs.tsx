"use client";

import { useState } from "react";
import { formatNaira, formatDate, getStatusColor } from "@/lib/utils";
import { PartyPopper } from "lucide-react";

type Payout = {
  id: string; amount: number; status: string; created_at: string; paid_at: string | null;
  groups: { name: string } | null;
};

export default function PayoutTabs({ upcoming, history }: { upcoming: Payout[]; history: Payout[] }) {
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const list = tab === "upcoming" ? upcoming : history;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(["upcoming", "history"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium border capitalize transition-colors ${
              tab === key ? "bg-primary text-white border-primary" : "border-border text-text-secondary hover:text-text"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="dashboard-card text-center py-10">
          <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
            <PartyPopper className="w-7 h-7 text-primary" />
          </div>
          <p className="font-semibold text-text mb-1">
            {tab === "upcoming" ? "No upcoming payouts" : "No payout history yet"}
          </p>
          <p className="text-sm text-text-secondary">
            {tab === "upcoming" ? "You'll see your next payout here once it's your turn in the rotation." : "Completed payouts will show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => {
            const colors = getStatusColor(p.status);
            return (
              <div key={p.id} className="dashboard-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-text text-lg">{formatNaira(p.amount)}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{p.groups?.name ?? "Group"}</p>
                  </div>
                  <span className={`badge ${colors.bg} ${colors.text} capitalize`}>{p.status}</span>
                </div>
                <p className="text-xs text-text-secondary">
                  {p.paid_at ? `Paid on ${formatDate(p.paid_at)}` : `Requested ${formatDate(p.created_at)}`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
