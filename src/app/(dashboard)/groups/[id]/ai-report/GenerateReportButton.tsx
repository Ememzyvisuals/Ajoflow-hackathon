"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { generateTrustReport } from "@/lib/groq/client";
import { createClient } from "@/lib/supabase/client";

interface Props {
  groupId: string;
  groupName: string;
  memberScores: Array<{ name: string; score: number; streak: number }>;
}

export default function GenerateReportButton({ groupId, groupName, memberScores }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const report = await generateTrustReport({
        groupName,
        members: memberScores.map(m => ({
          name: m.name, score: m.score,
          onTimeCount: Math.floor(m.streak * 1.2),
          lateCount: Math.max(0, Math.floor((100 - m.score) / 20)),
          missedCount: Math.max(0, Math.floor((100 - m.score) / 30)),
          streak: m.streak,
        })),
        paidCount: memberScores.filter(m => m.score >= 70).length,
        totalCount: memberScores.length,
        language: "en",
      });

      const supabase = createClient();
      await supabase.from("ai_reports").insert({
        group_id: groupId, type: "trust_report", content: report,
        language: "en", cached_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-3">{error}</div>}
      <button onClick={handleGenerate} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {loading ? "Generating…" : "Generate AI Report"}
      </button>
      <p className="text-xs text-text-secondary text-center mt-2">Reports are cached for 24 hours</p>
    </>
  );
}
