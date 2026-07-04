"use client";

import { useState } from "react";
import { Plus, Loader2, HandCoins, Check, X } from "lucide-react";
import { requestLoan, decideLoan } from "@/features/loans/actions";

export function RequestLoanButton({ groups }: { groups: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  async function submit() {
    setError("");
    const parsedAmount = Number(amount);
    if (!groupId) { setError("Select a group."); return; }
    if (!parsedAmount || parsedAmount <= 0) { setError("Enter a valid amount."); return; }

    setLoading(true);
    const result = await requestLoan({ groupId, amount: parsedAmount, reason });
    setLoading(false);

    if (result.success) {
      setOpen(false);
      setAmount("");
      setReason("");
    } else {
      setError(result.error ?? "Failed to submit request.");
    }
  }

  if (groups.length === 0) {
    return (
      <button disabled className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 font-semibold py-3.5 rounded-xl cursor-not-allowed">
        <Plus className="w-4 h-4" /> Join a group to request a loan
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-colors">
        <Plus className="w-4 h-4" /> Request Loan
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center"><HandCoins className="w-5 h-5 text-primary" /></div>
              <h2 className="font-bold text-text text-lg">Request a Loan</h2>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Group</label>
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="form-input">
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Amount (₦)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Reason</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you need this loan?" rows={3} className="form-input resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setOpen(false)} className="flex-1 border border-border rounded-xl py-3 text-sm font-medium text-text hover:bg-gray-50">Cancel</button>
                <button onClick={submit} disabled={loading} className="flex-1 bg-primary text-white rounded-xl py-3 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DecideLoanButtons({ loanId }: { loanId: string }) {
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function decide(decision: "approved" | "rejected") {
    setLoading(decision);
    await decideLoan(loanId, decision);
    setLoading(null);
  }

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
      <button onClick={() => decide("rejected")} disabled={loading !== null} className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-600 rounded-lg py-2 text-xs font-medium hover:bg-red-50 disabled:opacity-60">
        {loading === "rejected" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Reject
      </button>
      <button onClick={() => decide("approved")} disabled={loading !== null} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white rounded-lg py-2 text-xs font-medium hover:bg-primary/90 disabled:opacity-60">
        {loading === "approved" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
      </button>
    </div>
  );
}
