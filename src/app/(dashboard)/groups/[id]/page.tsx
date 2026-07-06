import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { getGroupTypeLabel } from "@/lib/utils";
import GroupTabs from "./GroupTabs";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single();

  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_memberships")
    .select("id, role, position")
    .eq("group_id", id)
    .eq("user_id", user!.id)
    .single();

  if (!membership) notFound();

  const [membersRes, walletRes, contributionsRes, postsRes, myVaRes, cycleRes] = await Promise.all([
    supabase
      .from("group_memberships")
      .select("id, role, user_id, position, profiles(full_name, avatar_url), trust_scores(score)")
      .eq("group_id", id)
      .eq("status", "active")
      .order("position", { ascending: true }),
    supabase.from("group_wallets").select("balance, total_received, total_paid_out").eq("group_id", id).single(),
    supabase
      .from("contributions")
      .select("amount, status, paid_at, membership_id, group_memberships(profiles(full_name))")
      .eq("group_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("group_posts")
      .select("id, type, content, pinned, created_at, profiles(full_name), post_comments(id, content, created_at, profiles(full_name))")
      .eq("group_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("member_virtual_accounts")
      .select("account_number, bank_name, account_name, status")
      .eq("membership_id", membership.id)
      .single(),
    supabase
      .from("payment_cycles")
      .select("id, name, end_date, status")
      .eq("group_id", id)
      .eq("status", "active")
      .order("end_date", { ascending: true })
      .limit(1)
      .single(),
  ]);

  const members = membersRes.data ?? [];
  const wallet = walletRes.data;
  const recentContributions = contributionsRes.data ?? [];
  const posts = postsRes.data ?? [];
  const myVirtualAccount = myVaRes.data ?? null;
  const activeCycle = cycleRes.data ?? null;

  let nextPayout: { amount: number; profiles: { full_name: string | null } | null } | null = null;
  if (activeCycle) {
    const { data: payout } = await supabase
      .from("payouts")
      .select("amount, profiles:recipient_id(full_name)")
      .eq("cycle_id", activeCycle.id)
      .in("status", ["pending", "approved", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    nextPayout = payout
      ? { amount: payout.amount, profiles: Array.isArray(payout.profiles) ? payout.profiles[0] ?? null : payout.profiles }
      : null;
  }

  const { data: allContributions } = await supabase
    .from("contributions")
    .select("amount, status")
    .eq("group_id", id);

  const contributions = allContributions ?? [];
  const paidAmount = contributions.filter((c: { status: string }) => c.status === "paid").reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
  const pendingAmount = contributions.filter((c: { status: string }) => c.status !== "paid").reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);

  const isAdmin = ["owner", "admin"].includes(membership.role);

  return (
    <div className="px-4 pt-4 pb-6 lg:px-6 lg:pt-6 max-w-2xl mx-auto lg:max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/groups" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-text">{group.name}</h1>
              <span className="badge bg-green-50 text-green-700 text-xs">Active</span>
            </div>
            <p className="text-xs text-text-secondary">{getGroupTypeLabel(group.type)}</p>
          </div>
        </div>
        {isAdmin && (
          <Link href={`/groups/${id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <MoreHorizontal className="w-4 h-4 text-text-secondary" />
          </Link>
        )}
      </div>

      <GroupTabs
        groupId={id}
        group={group}
        members={members}
        wallet={wallet}
        recentContributions={recentContributions}
        posts={posts}
        paidAmount={paidAmount}
        pendingAmount={pendingAmount}
        isAdmin={isAdmin}
        myVirtualAccount={myVirtualAccount}
        membershipId={membership.id}
        activeCycle={activeCycle}
        nextPayout={nextPayout}
        currentUserId={user!.id}
      />
    </div>
  );
}
