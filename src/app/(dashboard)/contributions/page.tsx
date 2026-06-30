import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import { Download, Filter, Banknote } from "lucide-react";

export default async function ContributionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_memberships")
    .select("id")
    .eq("user_id", user!.id);

  const membershipIds = (memberships ?? []).map((m: { id: string }) => m.id);

  const { data: contributions } = await supabase
    .from("contributions")
    .select("*, group_memberships(user_id, profiles(full_name)), groups(name)")
    .in("membership_id", membershipIds.length > 0 ? membershipIds : ["none"])
    .order("created_at", { ascending: false })
    .limit(50);

  const all = contributions ?? [];
  const paid = all.filter((c: { status: string }) => c.status === "paid");
  const pending = all.filter((c: { status: string }) => c.status !== "paid");

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto lg:max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Contributions</h1>
        <button className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-gray-50">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {["All", "Paid", "Pending"].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              i === 0
                ? "bg-primary text-white border-primary"
                : "border-border text-text-secondary hover:text-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {all.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4"><Banknote className="w-7 h-7 text-primary" /></div>
          <h3 className="font-semibold text-text mb-2">No contributions yet</h3>
          <p className="text-sm text-text-secondary">Join a group to start making contributions.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-5">
            {all.map((c: {
              id: string;
              amount: number;
              status: string;
              paid_at: string | null;
              created_at: string;
              groups: { name: string } | null;
              group_memberships: {
                profiles: { full_name: string | null } | null;
              } | null;
            }) => {
              const colors = getStatusColor(c.status);
              const name = c.group_memberships?.profiles?.full_name ?? "Member";
              const groupName = c.groups?.name ?? "";
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-light rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{name}</p>
                    <p className="text-xs text-text-secondary">{groupName} · {c.paid_at ? formatDate(c.paid_at) : formatDate(c.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-text">{formatNaira(c.amount)}</p>
                    <span className={`badge ${colors.bg} ${colors.text} mt-0.5`}>{c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </>
      )}
    </div>
  );
}
