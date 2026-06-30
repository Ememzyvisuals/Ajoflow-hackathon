import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import BankIcon from "@/components/shared/BankIcon";

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payoutAccounts } = await supabase
    .from("payout_accounts")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_default", { ascending: false });

  const accounts = payoutAccounts ?? [];
  const defaultAccount = accounts.find((a: { is_default: boolean }) => a.is_default);
  const otherAccounts = accounts.filter((a: { is_default: boolean }) => !a.is_default);

  return (
    <div className="px-4 pt-4 pb-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-text mb-6">Payout Accounts</h1>

      <div className="mb-4">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Default Account</p>
        {defaultAccount ? (
          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BankIcon bankName={defaultAccount.bank_name} size="md" />
                <div>
                  <p className="font-semibold text-text">{defaultAccount.bank_name}</p>
                  <p className="text-xs text-text-secondary">{defaultAccount.account_number}</p>
                  <p className="text-xs text-text-secondary">{defaultAccount.account_name}</p>
                </div>
              </div>
              <span className="badge bg-primary-light text-primary">Default</span>
            </div>
          </div>
        ) : (
          <div className="dashboard-card text-center py-8">
            <p className="text-sm text-text-secondary mb-3">No default account set</p>
            <Link href="/wallet/add" className="text-primary text-sm font-medium hover:underline">Add one →</Link>
          </div>
        )}
      </div>

      {otherAccounts.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Other Accounts</p>
          <div className="space-y-2">
            {otherAccounts.map((acc: {
              id: string; bank_name: string; account_number: string; account_name: string;
            }) => (
              <div key={acc.id} className="dashboard-card flex items-center gap-3">
                <BankIcon bankName={acc.bank_name} size="md" />
                <div className="flex-1">
                  <p className="font-semibold text-text text-sm">{acc.bank_name}</p>
                  <p className="text-xs text-text-secondary">{acc.account_number}</p>
                  <p className="text-xs text-text-secondary">{acc.account_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/wallet/add"
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-4 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add New Account
      </Link>
    </div>
  );
}
