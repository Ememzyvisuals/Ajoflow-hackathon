// ============================================================
// AjoFlow – Trust Score Engine
// Calculates and updates member trust scores
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";
import type { TrustScore } from "@/types";

// ── Score Weights ─────────────────────────────────────────────
const WEIGHTS = {
  ON_TIME_BONUS: 3,          // +3 per on-time payment
  STREAK_BONUS: 1,           // +1 per consecutive payment
  LATE_PENALTY: -5,          // -5 per late payment
  MISSED_PENALTY: -10,       // -10 per missed payment
  LOAN_DEFAULT_PENALTY: -15, // -15 for loan default
  BASE_SCORE: 100,
  MAX_SCORE: 100,
  MIN_SCORE: 0,
};

// ── Calculate Trust Score ─────────────────────────────────────
export function calculateTrustScore(params: {
  onTimeCount: number;
  lateCount: number;
  missedCount: number;
  streak: number;
  loanDefaults?: number;
}): number {
  const { onTimeCount, lateCount, missedCount, streak, loanDefaults = 0 } = params;

  let score = WEIGHTS.BASE_SCORE;

  // Positive contributions
  score += onTimeCount * WEIGHTS.ON_TIME_BONUS;
  score += streak * WEIGHTS.STREAK_BONUS;

  // Penalties
  score += lateCount * WEIGHTS.LATE_PENALTY;
  score += missedCount * WEIGHTS.MISSED_PENALTY;
  score += loanDefaults * WEIGHTS.LOAN_DEFAULT_PENALTY;

  // Clamp to [0, 100]
  return Math.max(WEIGHTS.MIN_SCORE, Math.min(WEIGHTS.MAX_SCORE, Math.round(score)));
}

// ── Record On-Time Payment ────────────────────────────────────
export async function recordOnTimePayment(membershipId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("trust_scores")
    .select("*")
    .eq("membership_id", membershipId)
    .single();

  if (!existing) return;

  const newOnTimeCount = existing.on_time_count + 1;
  const newStreak = existing.streak + 1;
  const newScore = calculateTrustScore({
    onTimeCount: newOnTimeCount,
    lateCount: existing.late_count,
    missedCount: existing.missed_count,
    streak: newStreak,
  });

  await supabase
    .from("trust_scores")
    .update({
      score: newScore,
      on_time_count: newOnTimeCount,
      streak: newStreak,
      last_updated: new Date().toISOString(),
    })
    .eq("membership_id", membershipId);

  // Create notification if trust score changed significantly
  if (Math.abs(newScore - existing.score) >= 5) {
    await notifyTrustScoreChange(membershipId, existing.score, newScore);
  }
}

// ── Record Late Payment ────────────────────────────────────────
export async function recordLatePayment(membershipId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("trust_scores")
    .select("*")
    .eq("membership_id", membershipId)
    .single();

  if (!existing) return;

  const newLateCount = existing.late_count + 1;
  const newScore = calculateTrustScore({
    onTimeCount: existing.on_time_count,
    lateCount: newLateCount,
    missedCount: existing.missed_count,
    streak: existing.streak, // Reset streak on late
  });

  await supabase
    .from("trust_scores")
    .update({
      score: newScore,
      late_count: newLateCount,
      streak: 0, // Reset streak on late payment
      last_updated: new Date().toISOString(),
    })
    .eq("membership_id", membershipId);
}

// ── Record Missed Payment ─────────────────────────────────────
export async function recordMissedPayment(membershipId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("trust_scores")
    .select("*")
    .eq("membership_id", membershipId)
    .single();

  if (!existing) return;

  const newMissedCount = existing.missed_count + 1;
  const newScore = calculateTrustScore({
    onTimeCount: existing.on_time_count,
    lateCount: existing.late_count,
    missedCount: newMissedCount,
    streak: 0,
  });

  await supabase
    .from("trust_scores")
    .update({
      score: newScore,
      missed_count: newMissedCount,
      streak: 0,
      last_updated: new Date().toISOString(),
    })
    .eq("membership_id", membershipId);
}

// ── Notify Trust Score Change ─────────────────────────────────
async function notifyTrustScoreChange(
  membershipId: string,
  oldScore: number,
  newScore: number
): Promise<void> {
  const supabase = createServiceClient();

  const { data: membership } = await supabase
    .from("group_memberships")
    .select("user_id")
    .eq("id", membershipId)
    .single();

  if (!membership) return;

  const direction = newScore > oldScore ? "increased" : "decreased";

  await supabase.from("notifications").insert({
    user_id: membership.user_id,
    type: "trust_score_changed",
    title: `Trust Score ${direction === "increased" ? "📈" : "📉"} ${newScore}/100`,
    message: `Your trust score ${direction} from ${oldScore} to ${newScore}.`,
    data: { old_score: oldScore, new_score: newScore, membership_id: membershipId },
  });
}

// ── Get Loan Eligibility ──────────────────────────────────────
export function getLoanEligibility(score: number): {
  eligible: boolean;
  maxMultiplier: number;
  reason: string;
} {
  if (score >= 80) {
    return {
      eligible: true,
      maxMultiplier: 3,
      reason: "Excellent track record. You qualify for up to 3× your contribution amount.",
    };
  }
  if (score >= 60) {
    return {
      eligible: true,
      maxMultiplier: 2,
      reason: "Good track record. You qualify for up to 2× your contribution amount.",
    };
  }
  if (score >= 40) {
    return {
      eligible: true,
      maxMultiplier: 1,
      reason: "Fair record. You qualify for up to 1× your contribution amount.",
    };
  }
  return {
    eligible: false,
    maxMultiplier: 0,
    reason: "Trust score too low. Keep paying on time to improve your score and unlock loans.",
  };
}
