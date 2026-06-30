"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { addPayoutAccount } from "@/features/payments/actions";
import { NIGERIAN_BANKS } from "@/lib/banks";
import BankIcon from "@/components/shared/BankIcon";

export default function AddPayoutAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [form, setForm] = useState({ bankName: "", bankCode: "", accountNumber: "", isDefault: false });

  const selectedBank = NIGERIAN_BANKS.find(b => b.name === form.bankName);

  function selectBank(name: string, code: string) {
    setForm(f => ({ ...f, bankName: name, bankCode: code }));
    setBankPickerOpen(false);
    setVerifiedName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bankCode || !form.accountNumber) { setError("Fill all fields"); return; }
    setLoading(true); setError("");
    const result = await addPayoutAccount({ ...form });
    setLoading(false);
    if (result.success && result.data) {
      setVerifiedName(result.data.accountName);
      setTimeout(() => router.push("/wallet"), 1500);
    } else {
      setError(result.error ?? "Failed to add account");
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text">Add Payout Account</h1>
      </div>

      {verifiedName && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div><p className="text-sm font-semibold text-green-800">Account verified</p><p className="text-xs text-green-700">{verifiedName}</p></div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="dashboard-card space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Bank</label>
            <button
              type="button"
              onClick={() => setBankPickerOpen(!bankPickerOpen)}
              className="form-input flex items-center justify-between text-left"
            >
              {selectedBank ? (
                <span className="flex items-center gap-2">
                  <BankIcon bankName={selectedBank.name} size="sm" />
                  <span className="text-sm">{selectedBank.name}</span>
                </span>
              ) : (
                <span className="text-text-secondary">Select your bank</span>
              )}
              <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${bankPickerOpen ? "rotate-180" : ""}`} />
            </button>

            {bankPickerOpen && (
              <div className="mt-2 border border-border rounded-xl max-h-72 overflow-y-auto bg-white shadow-lg">
                {NIGERIAN_BANKS.map((bank) => (
                  <button
                    key={bank.nibssCode}
                    type="button"
                    onClick={() => selectBank(bank.name, bank.nibssCode)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <BankIcon bankName={bank.name} size="sm" />
                    <span className="text-sm text-text">{bank.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Account Number</label>
            <input
              type="text" inputMode="numeric" maxLength={10} placeholder="0123456789"
              value={form.accountNumber}
              onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "") }))}
              className="form-input"
            />
            <p className="text-xs text-text-secondary mt-1">10-digit NUBAN account number</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 rounded border-border text-primary" />
            <span className="text-sm text-text">Set as default payout account</span>
          </label>
        </div>

        <p className="text-xs text-text-secondary text-center">Account name will be verified via Nomba before saving.</p>

        <button
          type="submit"
          disabled={loading || !form.bankCode || form.accountNumber.length < 10}
          className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Verifying…" : "Verify & Save Account"}
        </button>
      </form>
    </div>
  );
}
