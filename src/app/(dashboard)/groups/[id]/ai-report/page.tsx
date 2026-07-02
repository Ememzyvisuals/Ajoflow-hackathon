import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, Flame } from "lucide-react";
import Link from "next/link";
import { getTrustScoreLabel } from "@/lib/utils";
import GenerateReportButton from "./GenerateReportButton";

export default async function AITrustReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: group } = await supabase.from("groups").select("*").eq("id", id).single();
  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_memberships").select("id").eq("group_id", id).eq("user_id", user!.id).single();
  if (!membership) notFound();

  const { data: report } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("group_id", id)
    .eq("type", "trust_report")
    .gt("cached_until", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  const { data: members } = await supabase
    .from("group_memberships")
    .select("id, profiles(full_name), trust_scores(score, on_time_count, streak)")
    .eq("group_id", id)
    .eq("status", "active");

  const memberScores = (members ?? []).map((m: {
    id: string;
    profiles: { full_name: string | null }[] | { full_name: string | null } | null;
    trust_scores: { score: number; on_time_count: number; streak: number }[] | { score: number; on_time_count: number; streak: number } | null;
  }) => {
    const ts = Array.isArray(m.trust_scores) ? m.trust_scores[0] : m.trust_scores;
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      name: prof?.full_name ?? "Member",
      score: ts?.score ?? 100,
      streak: ts?.streak ?? 0,
    };
  }).sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  const avgScore = memberScores.length > 0
    ? Math.round(memberScores.reduce((s: number, m: { score: number }) => s + m.score, 0) / memberScores.length)
    : 100;

  const scoreInfo = getTrustScoreLabel(avgScore);

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/groups/${id}`} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-bold text-text">AI Trust Report</h1>
          <p className="text-xs text-text-secondary">{group.name}</p>
        </div>
        <div className="ml-auto">
          <select className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white text-text-secondary">
            <option>This month</option>
            <option>Last month</option>
          </select>
        </div>
      </div>

      <div className="dashboard-card mb-4">
        <p className="text-xs text-text-secondary mb-3">Overall Trust Score</p>
        <div className="flex items-end gap-3 mb-3">
          <p className="text-5xl font-bold text-text">{avgScore}%</p>
          <span className={`badge ${scoreInfo.bg} ${scoreInfo.color} mb-2`}>{scoreInfo.label}</span>
        </div>
        <div className="h-16 relative overflow-hidden rounded-lg bg-primary-light/30">
          <svg viewBox="0 0 300 60" className="w-full h-full">
            <polyline points="0,45 50,40 100,35 150,30 200,20 250,15 300,10" fill="none" stroke="#0F6B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F6B4B" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0F6B4B" stopOpacity="0" />
            </linearGradient>
            <polygon points="0,60 0,45 50,40 100,35 150,30 200,20 250,15 300,10 300,60" fill="url(#grad)" />
          </svg>
        </div>
      </div>

      <div className="dashboard-card mb-4">
        <p className="font-semibold text-text mb-3">Member Trust Scores</p>
        <div className="space-y-3">
          {memberScores.slice(0, 6).map((m: { name: string; score: number; streak: number }) => {
            const info = getTrustScoreLabel(m.score);
            return (
              <div key={m.name} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">{m.name[0]}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-text">{m.name}</p>
                    <span className={`text-xs font-semibold ${info.color}`}>{m.score}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${m.score}%` }} />
                  </div>
                </div>
                {m.streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-text-secondary">
                    <Flame className="w-3 h-3 text-orange-500" />{m.streak}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="dashboard-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-text">AI Analysis</p>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        {report ? (
          <p className="text-sm text-text-secondary leading-relaxed">{report.content}</p>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-text-secondary mb-4">No report generated yet for this period.</p>
          </div>
        )}
        {report && (
          <p className="text-xs text-text-secondary mt-3">Generated {new Date(report.generated_at).toLocaleDateString()}</p>
        )}
      </div>

      <GenerateReportButton groupId={id} memberScores={memberScores} groupName={group.name} />
    </div>
  );
}
