import { createClient } from "@/lib/supabase/server";
import { Users2, Settings } from "lucide-react";
import Link from "next/link";
import PayoutTabs from "./PayoutTabs";
import PendingApprovals from "./PendingApprovals";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_memberships")
    .select("group_id, role")
    .eq("user_id", user!.id)
    .eq("status", "active");

  const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);
  const adminGroupIds = (memberships ?? [])
    .filter((m: { role: string }) => ["owner", "admin"].includes(m.role))
    .map((m: { group_id: string }) => m.group_id);

  // No groups at all — honest empty state, no fake data underneath it.
  if (groupIds.length === 0) {
    return (
      <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-text mb-6">Payouts</h1>
        <div className="dashboard-card text-center py-14">
          <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
            <Users2 className="w-7 h-7 text-primary" />
          </div>
          <p className="font-semibold text-text mb-1">No payouts yet</p>
          <p className="text-sm text-text-secondary max-w-xs mx-auto">
            Join or create a group to start receiving payouts.
          </p>
          <Link href="/groups" className="inline-block mt-4 text-primary text-sm font-semibold hover:underline">
            Go to Groups →
          </Link>
        </div>
      </div>
    );
  }

  const [payoutsRes, pendingApprovalsRes] = await Promise.all([
    supabase
      .from("payouts")
      .select("*, groups(name)")
      .in("group_id", groupIds)
      .eq("recipient_id", user!.id)
      .order("created_at", { ascending: false }),
    // Payouts an admin needs to act on — this is the piece that was
    // completely missing: approvePayout existed with zero UI calling it.
    adminGroupIds.length > 0
      ? supabase
          .from("payouts")
          .select("id, amount, created_at, groups(name), profiles:recipient_id(full_name)")
          .in("group_id", adminGroupIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const all = payoutsRes.data ?? [];
  const upcoming = all.filter((p: { status: string }) => ["pending", "approved", "processing"].includes(p.status));
  const history = all.filter((p: { status: string }) => ["paid", "failed"].includes(p.status));
  const pendingApprovals = pendingApprovalsRes.data ?? [];

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-6">Payouts</h1>

      {pendingApprovals.length > 0 && <PendingApprovals approvals={pendingApprovals} />}

      <PayoutTabs upcoming={upcoming} history={history} />
      <Link
        href="/wallet"
        className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm text-text-secondary hover:bg-gray-50 transition-colors mt-5"
      >
        <Settings className="w-4 h-4" /> Manage Payout Settings
      </Link>
    </div>
  );
}
