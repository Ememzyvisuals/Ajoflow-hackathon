import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Bell, ArrowRight, TrendingUp, Inbox, Users2, Banknote } from "lucide-react";
import { formatNaira, formatRelativeTime, getTrustScoreLabel } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileRes, membershipsRes, notificationsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("group_memberships")
      .select(`*, groups(id, name, type, contribution_amount, contribution_frequency, status), trust_scores(score)`)
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profile = profileRes.data;
  const memberships = membershipsRes.data ?? [];
  const notifications = notificationsRes.data ?? [];

  const membershipIds = memberships.map((m: { id: string }) => m.id);
  const { data: allContributions } = await supabase
    .from("contributions")
    .select("amount, status")
    .in("membership_id", membershipIds.length > 0 ? membershipIds : ["none"]);

  const contributions = allContributions ?? [];
  const totalAmount = contributions.reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
  const paidCount = contributions.filter((c: { status: string }) => c.status === "paid").length;
  const pendingCount = contributions.filter((c: { status: string }) => c.status !== "paid").length;
  const paidPercent = contributions.length > 0 ? Math.round((paidCount / contributions.length) * 100) : 0;
  const paidAmount = contributions.filter((c: { status: string }) => c.status === "paid").reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
  const pendingAmount = totalAmount - paidAmount;

  const avgTrustScore = memberships.length > 0
    ? Math.round(memberships.reduce((s: number, m: { trust_scores?: { score: number }[] | { score: number } | null }) => {
        const score = Array.isArray(m.trust_scores) ? m.trust_scores[0]?.score : (m.trust_scores as { score: number } | null)?.score;
        return s + (score ?? 100);
      }, 0) / memberships.length)
    : 100;

  const groupIdsForReminders = memberships.map((m: { groups: { id: string } }) => m.groups.id);
  const { data: activeCycles } = await supabase
    .from("payment_cycles")
    .select("group_id, end_date")
    .in("group_id", groupIdsForReminders.length > 0 ? groupIdsForReminders : ["none"])
    .eq("status", "active");

  const cycleByGroup = new Map((activeCycles ?? []).map((c: { group_id: string; end_date: string }) => [c.group_id, c.end_date]));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const trustInfo = getTrustScoreLabel(avgTrustScore);

  return (
    <div className="px-4 pt-4 pb-6 lg:px-6 lg:pt-6 max-w-2xl mx-auto lg:max-w-4xl">
      <div className="flex items-center justify-between mb-6 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold">
            {firstName[0]}
          </div>
          <div>
            <p className="text-xs text-text-secondary">{greeting},</p>
            <p className="font-bold text-text">{profile?.full_name ?? "there"}</p>
          </div>
        </div>
        <Link href="/notifications" className="relative">
          <Bell className="w-5 h-5 text-text-secondary" />
          {notifications.filter((n: { read: boolean }) => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full" />
          )}
        </Link>
      </div>

      <div className="hidden lg:block mb-6">
        <h1 className="text-2xl font-bold text-text">{greeting}, {firstName}</h1>
        <p className="text-text-secondary text-sm mt-1">Here&apos;s what&apos;s happening in your Ajo communities today.</p>
      </div>

      <div className="flex items-center justify-between mb-5">
        <p className="font-semibold text-text">Overview</p>
        <select className="text-xs border border-border rounded-lg px-3 py-1.5 bg-white text-text-secondary focus:ring-1 focus:ring-primary">
          <option>This month</option>
          <option>Last month</option>
          <option>All time</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 lg:grid-cols-4">
        <div className="stat-card">
          <p className="text-xs text-text-secondary mb-1">Total Contributions</p>
          <p className="text-xl font-bold text-text">{formatNaira(totalAmount)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-text-secondary mb-1">Groups</p>
          <p className="text-xl font-bold text-text">{memberships.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-text-secondary mb-1">Paid</p>
          <p className="text-xl font-bold text-text">{paidCount} <span className="text-sm font-normal text-text-secondary">({paidPercent}%)</span></p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-text-secondary mb-1">Pending</p>
          <p className="text-xl font-bold text-text">{pendingCount} <span className="text-sm font-normal text-text-secondary">({100 - paidPercent}%)</span></p>
        </div>
      </div>

      <div className="grid gap-3 mb-5 lg:grid-cols-2">
        <div className="dashboard-card">
          <p className="font-semibold text-text mb-4">Contribution Progress</p>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D9F2E6" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0F6B4B" strokeWidth="3"
                  strokeDasharray={`${paidPercent} ${100 - paidPercent}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-text">{paidPercent}%</p>
                <p className="text-xs text-text-secondary">Paid</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <div><p className="text-xs text-text-secondary">Paid</p><p className="text-sm font-semibold text-text">{formatNaira(paidAmount)}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                <div><p className="text-xs text-text-secondary">Pending</p><p className="text-sm font-semibold text-text">{formatNaira(pendingAmount)}</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-text">Trust Score (Avg)</p>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-4xl font-bold text-text mb-1">{avgTrustScore}%</div>
          <span className={`badge ${trustInfo.bg} ${trustInfo.color}`}>{trustInfo.label}</span>
          <div className="mt-3"><div className="progress-bar"><div className="progress-fill" style={{ width: `${avgTrustScore}%` }} /></div></div>
        </div>
      </div>

      {memberships.length > 0 && (
        <div className="dashboard-card mb-5">
          <div className="section-header"><p className="font-semibold text-text">Upcoming Reminders</p></div>
          <div className="space-y-3">
            {memberships.slice(0, 3).map((m: { id: string; groups: { id: string; name: string; contribution_amount: number } }) => {
              const endDate = cycleByGroup.get(m.groups.id);
              const daysLeft = endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000) : null;
              const dueLabel =
                daysLeft === null ? "No active cycle" :
                daysLeft > 0 ? `Payment due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` :
                "Payment overdue";
              return (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text">{m.groups.name}</p>
                    <p className="text-xs text-text-secondary">{dueLabel} · {formatNaira(m.groups.contribution_amount)}</p>
                  </div>
                  <Link href={`/groups/${m.groups.id}`} className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">Pay Now</Link>
                </div>
              );
            })}
          </div>
          <Link href="/contributions" className="flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:underline">View all reminders <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      )}

      <div className="dashboard-card mb-5">
        <div className="section-header"><p className="font-semibold text-text">Recent Activity</p></div>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 4).map((n: { id: string; title: string; message: string; read: boolean; created_at: string }) => (
              <div key={n.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Banknote className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{n.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{n.message}</p>
                </div>
                <p className="text-xs text-text-secondary flex-shrink-0">{formatRelativeTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        )}
        <Link href="/notifications" className="flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:underline">View all activity <ArrowRight className="w-3.5 h-3.5" /></Link>
      </div>

      {memberships.length === 0 ? (
        <div className="dashboard-card text-center py-10">
          <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Users2 className="w-7 h-7 text-primary" />
          </div>
          <p className="font-semibold text-text mb-2">You&apos;re not in any groups yet</p>
          <p className="text-sm text-text-secondary mb-5">Create your first Ajo group or accept an invite.</p>
          <Link href="/groups/create" className="bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors">Create a Group</Link>
        </div>
      ) : (
        <div className="dashboard-card">
          <div className="section-header"><p className="font-semibold text-text">My Groups</p><Link href="/groups" className="text-primary text-sm hover:underline">See all</Link></div>
          <div className="space-y-3">
            {memberships.slice(0, 3).map((m: { id: string; groups: { id: string; name: string; type: string; status: string } }) => (
              <Link key={m.id} href={`/groups/${m.groups.id}`} className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center"><span className="text-primary font-bold text-sm">{m.groups.name[0]}</span></div>
                  <div><p className="text-sm font-semibold text-text">{m.groups.name}</p><p className="text-xs text-text-secondary capitalize">{m.groups.type.replace("_", " ")}</p></div>
                </div>
                <span className={`badge ${m.groups.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{m.groups.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
