import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/utils";
import { Settings, PartyPopper } from "lucide-react";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: payouts } = await supabase
    .from("payouts").select("*, groups(name)").eq("recipient_id", user!.id).order("created_at", { ascending: false });

  const upcoming = (payouts ?? []).filter((p: { status: string }) => ["pending", "approved"].includes(p.status));

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl font-bold text-text">Payouts</h1></div>

      <div className="flex gap-2 mb-5">
        {["Upcoming", "History"].map((tab, i) => (
          <button key={tab} className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${i === 0 ? "bg-primary text-white border-primary" : "border-border text-text-secondary"}`}>{tab}</button>
        ))}
      </div>

      {upcoming.length > 0 ? (
        <div className="dashboard-card mb-5">
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">Next Payout</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold">{user?.email?.[0]?.toUpperCase()}</div>
            <div className="flex-1"><p className="font-semibold text-text">You</p><p className="text-xs text-text-secondary">In 5 days · May 30, 2024</p></div>
            <button className="text-primary text-xs font-semibold border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary-light transition-colors">View Rotation</button>
          </div>
          <p className="text-2xl font-bold text-text">{formatNaira(120000)}</p>
        </div>
      ) : (
        <div className="dashboard-card text-center py-10 mb-5">
          <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3"><PartyPopper className="w-7 h-7 text-primary" /></div>
          <p className="font-semibold text-text mb-1">No upcoming payouts</p>
          <p className="text-sm text-text-secondary">Join a rotational Ajo group to receive payouts.</p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {[
          { name: "Emmanuel Okoro", date: "Jun 30, 2024", amount: 120000 },
          { name: "Chinedu James", date: "Jul 30, 2024", amount: 120000 },
          { name: "Tunde Adeniyi", date: "Aug 30, 2024", amount: 120000 },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between bg-white rounded-xl border border-border p-4">
            <div><p className="text-xs text-text-secondary mb-1">{item.date}</p><p className="text-sm font-medium text-text">{item.name}</p></div>
            <p className="font-bold text-text">{formatNaira(item.amount)}</p>
          </div>
        ))}
      </div>

      <button className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
        <Settings className="w-4 h-4" /> Manage Payout Settings
      </button>
    </div>
  );
}
