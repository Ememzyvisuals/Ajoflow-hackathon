import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, ArrowRight, Users2 } from "lucide-react";
import { formatNaira, getGroupTypeLabel } from "@/lib/utils";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_memberships")
    .select(`id, role, status, groups(id, name, type, status, contribution_amount, contribution_frequency)`)
    .eq("user_id", user!.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const allGroups = memberships ?? [];

  return (
    <div className="px-4 pt-4 pb-6 lg:px-6 lg:pt-6 max-w-2xl mx-auto lg:max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">My Groups</h1>
        <Link href="/groups/create" className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Create Group</span>
        </Link>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {["All", "Owned", "Member"].map((tab) => (
          <button key={tab} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "All" ? "bg-white text-text shadow-sm" : "text-text-secondary hover:text-text"}`}>{tab}</button>
        ))}
      </div>

      {allGroups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Users2 className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold text-text mb-2">No groups yet</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-xs mx-auto">Create your first Ajo group or ask someone to invite you.</p>
          <Link href="/groups/create" className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors"><Plus className="w-4 h-4" /> Create a Group</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allGroups.map((m: { id: string; role: string; groups: { id: string; name: string; type: string; status: string; contribution_amount: number; contribution_frequency: string } }) => (
            <GroupCard key={m.id} membership={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({ membership }: { membership: { role: string; groups: { id: string; name: string; type: string; status: string; contribution_amount: number; contribution_frequency: string } } }) {
  const g = membership.groups;
  const isRotational = g.type === "rotational";
  const isSavings = g.type === "target_savings";

  return (
    <Link href={`/groups/${g.id}`} className="group-card block">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-primary font-bold">{g.name[0]}</span></div>
          <div><p className="font-semibold text-text">{g.name}</p><p className="text-xs text-text-secondary">{getGroupTypeLabel(g.type)}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-green-50 text-green-700 border border-green-100">Active</span>
          {["owner", "admin"].includes(membership.role) && <span className="badge bg-primary-light text-primary text-xs">Admin</span>}
        </div>
      </div>

      {isRotational && (
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs text-text-secondary mb-0.5">Treasury Balance</p><p className="font-semibold text-text">₦120,000</p></div>
          <div><p className="text-xs text-text-secondary mb-0.5">Next Payout</p><p className="font-semibold text-text text-sm">May 30, 2024</p></div>
        </div>
      )}

      {isSavings && (
        <div>
          <div className="flex items-center justify-between mb-1.5"><p className="text-xs text-text-secondary">Goal Progress</p><p className="text-xs font-medium text-text">60%</p></div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: "60%" }} /></div>
          <div className="flex justify-between mt-1.5"><p className="text-xs text-text-secondary">{formatNaira(g.contribution_amount)}</p><p className="text-xs text-text-secondary">{formatNaira(100000)}</p></div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <p className="text-xs text-text-secondary">{formatNaira(g.contribution_amount)} / {g.contribution_frequency}</p>
        <ArrowRight className="w-4 h-4 text-text-secondary/40" />
      </div>
    </Link>
  );
}
