import { createClient } from "@/lib/supabase/server";
import { RequestLoanButton } from "./LoanActions";
import LoansTabs from "./LoansTabs";

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Groups I belong to (needed for the request form + to scope "group requests")
  const { data: memberships } = await supabase
    .from("group_memberships")
    .select("group_id, role, groups(id, name)")
    .eq("user_id", user!.id)
    .eq("status", "active");

  const myGroups = (memberships ?? [])
    .map((m: { groups: { id: string; name: string } | { id: string; name: string }[] | null }) =>
      Array.isArray(m.groups) ? m.groups[0] : m.groups
    )
    .filter(Boolean) as { id: string; name: string }[];

  const adminGroupIds = (memberships ?? [])
    .filter((m: { role: string }) => ["owner", "admin"].includes(m.role))
    .map((m: { group_id: string }) => m.group_id);

  // My own loan requests, across every group I'm in
  const { data: myLoans } = await supabase
    .from("loan_requests")
    .select("*, groups(name)")
    .eq("member_id", user!.id)
    .order("created_at", { ascending: false });

  // Requests I can act on — pending requests in groups I administer
  const { data: groupLoans } = await supabase
    .from("loan_requests")
    .select("*, groups(name), profiles(full_name)")
    .in("group_id", adminGroupIds.length > 0 ? adminGroupIds : ["none"])
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Loan Requests</h1>
      </div>

      <LoansTabs
        myLoans={myLoans ?? []}
        groupLoans={groupLoans ?? []}
        isAdminOfAnyGroup={adminGroupIds.length > 0}
      />

      <div className="mt-6">
        <RequestLoanButton groups={myGroups} />
      </div>
    </div>
  );
}
