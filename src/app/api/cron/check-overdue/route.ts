import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { recordLatePayment, recordMissedPayment } from "@/features/trust/engine";

// Vercel Cron hits this once a day (see vercel.json). Protected by CRON_SECRET
// so it can't be triggered by an outside request.
//
// Logic: for each active payment cycle whose end_date has passed, any member
// who still has no "paid" contribution for that cycle gets marked:
//   - "late"    if the cycle ended 1–6 days ago (grace window)
//   - "failed"  if the cycle ended 7+ days ago (missed entirely)
// recordLatePayment / recordMissedPayment update trust_scores accordingly —
// both existed in the codebase with zero caller before this route.
const GRACE_DAYS = 7;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (err) {
    console.error("[Cron] Service client init failed —", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const now = new Date();

  const { data: endedCycles, error: cycleError } = await supabase
    .from("payment_cycles")
    .select("id, group_id, end_date")
    .eq("status", "active")
    .lt("end_date", now.toISOString().slice(0, 10));

  if (cycleError) {
    return NextResponse.json({ error: cycleError.message }, { status: 500 });
  }

  let lateMarked = 0;
  let missedMarked = 0;
  const errors: string[] = [];

  for (const cycle of endedCycles ?? []) {
    const daysSinceEnd = Math.floor((now.getTime() - new Date(cycle.end_date).getTime()) / 86400000);
    const isMissed = daysSinceEnd >= GRACE_DAYS;

    // Every active member of this group
    const { data: members } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("group_id", cycle.group_id)
      .eq("status", "active");

    for (const member of members ?? []) {
      // Already-paid or already-processed contribution for this cycle? Skip.
      const { data: existing } = await supabase
        .from("contributions")
        .select("id, status")
        .eq("membership_id", member.id)
        .eq("cycle_id", cycle.id)
        .maybeSingle();

      if (existing && ["paid", "late", "failed"].includes(existing.status)) continue;

      const newStatus = isMissed ? "failed" : "late";

      if (existing) {
        await supabase.from("contributions").update({ status: newStatus }).eq("id", existing.id);
      } else {
        await supabase.from("contributions").insert({
          membership_id: member.id,
          group_id: cycle.group_id,
          cycle_id: cycle.id,
          amount: 0, // placeholder — no payment was ever made
          status: newStatus,
          due_date: cycle.end_date,
        });
      }

      try {
        if (isMissed) {
          await recordMissedPayment(member.id);
          missedMarked++;
        } else {
          await recordLatePayment(member.id);
          lateMarked++;
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    // Cycle fully processed past grace window — close it out
    if (isMissed) {
      await supabase.from("payment_cycles").update({ status: "completed" }).eq("id", cycle.id);
    }
  }

  return NextResponse.json({
    ran_at: now.toISOString(),
    cycles_checked: endedCycles?.length ?? 0,
    late_marked: lateMarked,
    missed_marked: missedMarked,
    errors,
  });
}
