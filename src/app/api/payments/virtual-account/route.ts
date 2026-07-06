import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createVirtualAccount, buildAccountRef } from "@/lib/nomba/virtual-accounts";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { membershipId } = await request.json();
  if (!membershipId) return NextResponse.json({ error: "membershipId required" }, { status: 400 });

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Server configuration error." }, { status: 500 });
  }

  // Check ownership
  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("id, user_id")
    .eq("id", membershipId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

  // Check if VA already exists
  const { data: existing } = await serviceClient
    .from("member_virtual_accounts")
    .select("*")
    .eq("membership_id", membershipId)
    .single();

  if (existing) return NextResponse.json({ success: true, data: existing });

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const accountRef = buildAccountRef(membershipId);
  const va = await createVirtualAccount({
    accountRef,
    accountName: profile?.full_name ?? "AjoFlow Member",
  });

  const { data: newVA, error } = await serviceClient
    .from("member_virtual_accounts")
    .insert({
      membership_id: membershipId,
      account_number: va.bankAccountNumber,
      bank_name: va.bankName,
      account_reference: accountRef,
      account_name: va.bankAccountName,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data: newVA });
}
