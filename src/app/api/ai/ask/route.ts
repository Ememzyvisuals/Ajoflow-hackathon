import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { answerFinancialQuestion } from "@/lib/groq/client";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question } = await request.json();
  if (!question) return NextResponse.json({ error: "Question required" }, { status: 400 });

  const serviceClient = createServiceClient();

  const { data: profile } = await serviceClient.from("profiles").select("language").eq("id", user.id).single();

  const { data: memberships } = await serviceClient
    .from("group_memberships")
    .select("id, group_id, groups(name), trust_scores(score)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  const membership = memberships?.[0];
  let walletBalance = 0;
  let groupName = "your group";

  if (membership) {
    const { data: wallet } = await serviceClient
      .from("group_wallets")
      .select("balance")
      .eq("group_id", membership.group_id)
      .single();
    walletBalance = wallet?.balance ?? 0;
    groupName = (membership.groups as { name: string } | null)?.name ?? "your group";
  }

  const trustScore = Array.isArray(membership?.trust_scores)
    ? membership.trust_scores[0]?.score ?? 100
    : (membership?.trust_scores as { score: number } | null)?.score ?? 100;

  try {
    const answer = await answerFinancialQuestion({
      question,
      context: {
        groupName,
        userRole: "member",
        walletBalance,
        unpaidMembers: [],
        userTrustScore: trustScore,
      },
      language: (profile?.language as "en" | "pidgin") ?? "en",
    });

    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json(
      { answer: "I'm having trouble connecting right now. Please try again shortly." },
      { status: 200 }
    );
  }
}
