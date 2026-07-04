"use client";

import { useState } from "react";
import { formatNaira, formatDate, getStatusColor } from "@/lib/utils";
import { HandCoins } from "lucide-react";
import { DecideLoanButtons } from "./LoanActions";

type MyLoan = {
  id: string; amount: number; reason: string | null; status: string; created_at: string;
  groups: { name: string } | null;
};
type GroupLoan = MyLoan & { profiles: { full_name: string | null } | null };

export default function LoansTabs({
  myLoans,
  groupLoans,
  isAdminOfAnyGroup,
}: {
  myLoans: MyLoan[];
  groupLoans: GroupLoan[];
  isAdminOfAnyGroup: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"my" | "group">("my");

  const list = activeTab === "my" ? myLoans : groupLoans;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            activeTab === "my" ? "bg-primary text-white border-primary" : "border-border text-text-secondary hover:text-text"
          }`}
        >
          My Requests
        </button>
        {isAdminOfAnyGroup && (
          <button
            onClick={() => setActiveTab("group")}
            className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeTab === "group" ? "bg-primary text-white border-primary" : "border-border text-text-secondary hover:text-text"
            }`}
          >
            Group Requests
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
            <HandCoins className="w-7 h-7 text-primary" />
          </div>
          <p className="font-semibold text-text mb-2">
            {activeTab === "my" ? "No loan requests yet" : "No group requests"}
          </p>
          <p className="text-sm text-text-secondary">
            {activeTab === "my" ? "Request a loan below when you need one." : "Requests from your group members will show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((loan) => {
            const colors = getStatusColor(loan.status);
            const requesterName = activeTab === "group" ? (loan as GroupLoan).profiles?.full_name : null;
            return (
              <div key={loan.id} className="dashboard-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-text text-lg">{formatNaira(loan.amount)}</p>
                    <p className="text-sm text-text-secondary mt-0.5">{loan.reason || "No reason given"}</p>
                    {requesterName && <p className="text-xs text-text-secondary mt-1">Requested by {requesterName}</p>}
                  </div>
                  <span className={`badge ${colors.bg} ${colors.text} capitalize`}>{loan.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{loan.groups?.name ?? "Group"}</span>
                  <span>Requested on {formatDate(loan.created_at)}</span>
                </div>
                {activeTab === "group" && loan.status === "pending" && (
                  <DecideLoanButtons loanId={loan.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
