import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Share2 } from "lucide-react";
import { formatNaira, getGroupTypeLabel, getTrustScoreLabel, toPercent } from "@/lib/utils";
import GenerateInviteButton from "./GenerateInviteButton";

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

  const [membersRes, walletRes, contributionsRes] = await Promise.all([
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
  ]);

  const members = membersRes.data ?? [];
  const wallet = walletRes.data;
  const recentContributions = contributionsRes.data ?? [];

  const { data: allContributions } = await supabase
    .from("contributions")
    .select("amount, status")
    .eq("group_id", id);

  const contributions = allContributions ?? [];

  const paidAmount = contributions.filter((c: { status: string }) => c.status === "paid").reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
  const pendingAmount = contributions.filter((c: { status: string }) => c.status !== "paid").reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
  const totalExpected = paidAmount + pendingAmount;
  const paidPct = toPercent(paidAmount, totalExpected);

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
            <p className="text-xs text-text-secondary">{getGroupTypeLabel(group.type)} · Created Jan 15, 2024</p>
          </div>
        </div>
        {isAdmin && (
          <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <MoreHorizontal className="w-4 h-4 text-text-secondary" />
          </button>
        )}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-border mb-5 overflow-x-auto scrollbar-hide">
        {["Overview", "Contributions", "Members", "Posts"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === "Overview"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="stat-card text-center">
          <p className="text-xl font-bold text-text">{members.length}</p>
          <p className="text-xs text-text-secondary mt-0.5">Members</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xl font-bold text-text">{formatNaira(group.contribution_amount)}</p>
          <p className="text-xs text-text-secondary mt-0.5">Contribution</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-sm font-bold text-text">May 30</p>
          <p className="text-xs text-text-secondary mt-0.5">Next Payout</p>
        </div>
      </div>

      {/* Treasury Balance */}
      <div className="dashboard-card mb-4">
        <p className="text-xs text-text-secondary mb-1">Treasury Balance</p>
        <p className="text-3xl font-bold text-text">{formatNaira(wallet?.balance ?? 0)}</p>
      </div>

      {/* Contribution Progress */}
      <div className="dashboard-card mb-4">
        <p className="font-semibold text-text mb-4">Contribution Progress</p>
        <div className="flex items-center gap-6 mb-4">
          {/* Donut */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D9F2E6" strokeWidth="3.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#0F6B4B" strokeWidth="3.5"
                strokeDasharray={`${paidPct} ${100 - paidPct}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-sm font-bold text-text">{paidPct}%</p>
              <p className="text-[10px] text-text-secondary">Paid</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <div>
                <p className="text-xs text-text-secondary">Paid</p>
                <p className="text-sm font-semibold text-text">{formatNaira(paidAmount)} ({paidPct}%)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              <div>
                <p className="text-xs text-text-secondary">Pending</p>
                <p className="text-sm font-semibold text-text">{formatNaira(pendingAmount)} ({100 - paidPct}%)</p>
              </div>
            </div>
          </div>
        </div>
        <Link href={`/contributions?group=${id}`} className="text-primary text-xs font-medium hover:underline">
          View all contributions →
        </Link>
      </div>

      {/* Payout Order */}
      <div className="dashboard-card mb-4">
        <div className="section-header">
          <p className="font-semibold text-text">Payout Order (Recommended)</p>
        </div>
        <div className="space-y-2">
          {members.slice(0, 4).map((m: {
            id: string;
            position: number;
            profiles: { full_name: string | null } | { full_name: string | null }[] | null;
            trust_scores: { score: number }[] | { score: number } | null;
          }, i: number) => {
            const trustScore = Array.isArray(m.trust_scores)
              ? m.trust_scores[0]?.score ?? 100
              : (m.trust_scores as { score: number } | null)?.score ?? 100;
            const info = getTrustScoreLabel(trustScore);
            const name = Array.isArray(m.profiles)
              ? m.profiles[0]?.full_name
              : (m.profiles as { full_name: string | null } | null)?.full_name;
            return (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-text-secondary">{i + 1}</span>
                  <div className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center text-primary text-xs font-bold">
                    {name?.[0] ?? "?"}
                  </div>
                  <p className="text-sm font-medium text-text">{name ?? "Member"}</p>
                </div>
                <span className={`text-xs font-semibold ${info.color}`}>{trustScore}%</span>
              </div>
            );
          })}
        </div>
        <button className="text-primary text-xs font-medium mt-3 hover:underline">View full rotation →</button>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-card mb-4">
        <p className="font-semibold text-text mb-3">Recent Activity</p>
        {recentContributions.length === 0 ? (
          <p className="text-sm text-text-secondary py-4 text-center">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {recentContributions.map((c: {
              amount: number;
              status: string;
              paid_at: string | null;
              group_memberships: { profiles: { full_name: string | null } | { full_name: string | null }[] | null } | null;
            }, i: number) => {
              const profile = c.group_memberships?.profiles;
              const name = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
              return (
                <div key={i} className="flex justify-between py-1.5">
                  <p className="text-sm text-text">{name ?? "Member"} {c.status === "paid" ? "paid" : "owes"} {formatNaira(c.amount)}</p>
                  <p className="text-xs text-text-secondary">{c.paid_at ? "Paid" : "Pending"}</p>
                </div>
              );
            })}
          </div>
        )}
        <Link href={`/contributions?group=${id}`} className="text-primary text-xs font-medium mt-2 block hover:underline">
          View all activity →
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {isAdmin && (
          <GenerateInviteButton groupId={id} />
        )}
        <button className="flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm font-medium text-text hover:bg-gray-50 transition-colors">
          <Share2 className="w-4 h-4" />
          Share Group
        </button>
      </div>
    </div>
  );
}
