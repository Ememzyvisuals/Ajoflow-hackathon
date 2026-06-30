import { createClient } from "@/lib/supabase/server";
import { getTrustScoreLabel, getInitials } from "@/lib/utils";
import { Search, UserPlus, Users2 } from "lucide-react";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase.from("group_memberships").select("id, group_id, groups(id, name, admin_id)").eq("user_id", user!.id).eq("status", "active");
  const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);

  const { data: allMembers } = await supabase
    .from("group_memberships")
    .select("id, role, user_id, group_id, groups(name), profiles(full_name, email), trust_scores(score)")
    .in("group_id", groupIds.length > 0 ? groupIds : ["none"])
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const members = allMembers ?? [];

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto lg:max-w-4xl">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl font-bold text-text">Members</h1></div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input type="text" placeholder="Search members..." className="form-input pl-9" />
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4"><Users2 className="w-7 h-7 text-primary" /></div>
          <p className="font-semibold text-text mb-2">No members found</p>
          <p className="text-sm text-text-secondary">Join a group to see members.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m: { id: string; role: string; user_id: string; groups: { name: string } | null; profiles: { full_name: string | null; email: string | null } | null; trust_scores: { score: number }[] | { score: number } | null }) => {
            const score = Array.isArray(m.trust_scores) ? m.trust_scores[0]?.score ?? 100 : (m.trust_scores as { score: number } | null)?.score ?? 100;
            const info = getTrustScoreLabel(score);
            const name = m.profiles?.full_name ?? m.profiles?.email ?? "Member";
            const groupName = m.groups?.name ?? "";
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{getInitials(name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text">{name}</p>
                    {["owner", "admin"].includes(m.role) && <span className="text-xs text-text-secondary">Admin</span>}
                  </div>
                  <p className="text-xs text-text-secondary truncate">{groupName}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold ${info.color}`}>{score}%</span>
                  <span className="badge bg-green-50 text-green-700 text-xs">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <button className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-4 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary transition-colors">
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>
    </div>
  );
}
