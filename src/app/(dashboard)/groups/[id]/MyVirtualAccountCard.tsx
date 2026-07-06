"use client";

import { useState } from "react";
import { Copy, Check, Loader2, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { reportPaymentIssue } from "@/features/payments/reconciliation";

type VA = { account_number: string; bank_name: string; account_name: string; status: string } | null;

export default function MyVirtualAccountCard({ membershipId, groupId, initial }: { membershipId: string; groupId: string; initial: VA }) {
  const router = useRouter();
  const [va, setVa] = useState<VA>(initial);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportAmount, setReportAmount] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  async function submitReport() {
    const amt = Number(reportAmount);
    if (!amt || amt <= 0) return;
    setReportLoading(true);
    const result = await reportPaymentIssue({ groupId, membershipId, amount: amt });
    setReportLoading(false);
    if (result.success) {
      setReportSent(true);
      setTimeout(() => { setReportOpen(false); setReportSent(false); setReportAmount(""); }, 1500);
    }
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/virtual-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not generate your virtual account. Please try again.");
      } else {
        setVa(json.data);
        router.refresh();
      }
    } catch {
      setError("Could not generate your virtual account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!va) return;
    navigator.clipboard.writeText(va.account_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!va) {
    return (
      <div className="dashboard-card mb-4 text-center py-6">
        <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-text-secondary mb-3">
          You don't have a contribution account for this group yet.
        </p>
        {error && <p className="text-danger text-xs mb-3">{error}</p>}
        <button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate My Account
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-card mb-4 bg-primary text-white">
      <p className="text-xs text-white/70 mb-1">Your Contribution Account</p>
      <div className="flex items-center justify-between mb-2">
        <p className="text-2xl font-bold tracking-wide">{va.account_number}</p>
        <button onClick={copy} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-sm text-white/90">{va.bank_name}</p>
      <p className="text-xs text-white/70 mt-1">{va.account_name}</p>
      <p className="text-xs text-white/60 mt-3">Send your contribution here — it's tracked automatically.</p>

      {!reportOpen ? (
        <button onClick={() => setReportOpen(true)} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white mt-3 underline">
          <AlertTriangle className="w-3 h-3" /> Sent money but it's not showing?
        </button>
      ) : (
        <div className="mt-3 bg-white/10 rounded-xl p-3">
          {reportSent ? (
            <p className="text-xs text-white">Reported to your group admin. They'll verify and record it.</p>
          ) : (
            <>
              <p className="text-xs text-white/80 mb-2">How much did you send?</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={reportAmount}
                  onChange={(e) => setReportAmount(e.target.value)}
                  placeholder="5000"
                  className="flex-1 bg-white/20 placeholder-white/50 text-white text-sm rounded-lg px-3 py-1.5 outline-none"
                />
                <button onClick={submitReport} disabled={reportLoading || !reportAmount} className="bg-white text-primary text-xs font-semibold px-3 rounded-lg disabled:opacity-60">
                  {reportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Report"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
