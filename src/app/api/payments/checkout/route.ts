import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initiateContributionPayment } from "@/features/payments/actions";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { groupId, membershipId } = body;

  if (!groupId || !membershipId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await initiateContributionPayment(groupId, membershipId);
  return NextResponse.json(result);
}
