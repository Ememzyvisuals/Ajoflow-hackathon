"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createVirtualAccount, buildAccountRef } from "@/lib/nomba/virtual-accounts";

// ── Schemas ────────────────────────────────────────────────────
const CreateGroupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(80),
  description: z.string().max(500).optional(),
  rules: z.string().max(1000).optional(),
  type: z.enum(["rotational", "target_savings", "cooperative", "investment"]),
  contribution_amount: z.number().positive("Amount must be positive"),
  contribution_frequency: z.enum(["daily", "weekly", "monthly"]),
  payout_mode: z.enum(["auto", "manual_approval"]).default("manual_approval"),
  start_date: z.string().optional(),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

// ── Create Group ───────────────────────────────────────────────
export async function createGroup(input: CreateGroupInput): Promise<ActionResult<{ groupId: string }>> {
  const parsed = CreateGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  // 1. Create group
  const { data: group, error: groupError } = await serviceClient
    .from("groups")
    .insert({
      ...parsed.data,
      admin_id: user.id,
    })
    .select()
    .single();

  if (groupError) return { success: false, error: groupError.message };

  // 2. Add creator as owner membership
  const { data: membership, error: memberError } = await serviceClient
    .from("group_memberships")
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: "owner",
      position: 1,
      status: "active",
    })
    .select()
    .single();

  if (memberError) return { success: false, error: memberError.message };

  // 3. Create static virtual account for owner
  try {
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const accountRef = buildAccountRef(membership.id);
    const accountName = profile?.full_name ?? profile?.email ?? "AjoFlow Member";

    const va = await createVirtualAccount({ accountRef, accountName });

    await serviceClient.from("member_virtual_accounts").insert({
      membership_id: membership.id,
      account_number: va.bankAccountNumber,
      bank_name: va.bankName,
      account_reference: accountRef,
      account_name: va.bankAccountName,
      status: "active",
    });
  } catch (vaErr) {
    console.error("[createGroup] VA creation failed (non-fatal):", vaErr);
    // Non-fatal: group created, VA can be retried
  }

  // 4. Audit log
  await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: "GROUP_CREATED",
    entity_type: "group",
    entity_id: group.id,
    metadata: { name: group.name, type: group.type },
  });

  revalidatePath("/groups");
  return { success: true, data: { groupId: group.id } };
}

// ── Update Group ───────────────────────────────────────────────
export async function updateGroup(
  groupId: string,
  input: Partial<CreateGroupInput>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  // Verify admin role
  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only group admins can update settings." };
  }

  const { error } = await serviceClient
    .from("groups")
    .update(input)
    .eq("id", groupId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

// ── Generate Invite Link ───────────────────────────────────────
export async function generateInviteLink(
  groupId: string,
  email?: string
): Promise<ActionResult<{ inviteUrl: string; token: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  const { data: membership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, error: "Only admins can generate invite links." };
  }

  const { data: invite, error } = await serviceClient
    .from("group_invites")
    .insert({
      group_id: groupId,
      invited_by: user.id,
      email: email ?? null,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${invite.token}`;

  return { success: true, data: { inviteUrl, token: invite.token } };
}

// ── Accept Invite ──────────────────────────────────────────────
export async function acceptGroupInvite(token: string): Promise<ActionResult<{ groupId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  // Fetch invite
  const { data: invite, error: inviteError } = await serviceClient
    .from("group_invites")
    .select("*, groups(*)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (inviteError || !invite) return { success: false, error: "Invalid or expired invite link." };

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) {
    await serviceClient.from("group_invites").update({ status: "expired" }).eq("id", invite.id);
    return { success: false, error: "This invite link has expired." };
  }

  // Check if already a member
  const { data: existingMembership } = await serviceClient
    .from("group_memberships")
    .select("id")
    .eq("group_id", invite.group_id)
    .eq("user_id", user.id)
    .single();

  if (existingMembership) {
    await serviceClient.from("group_invites").update({ status: "accepted" }).eq("id", invite.id);
    return { success: true, data: { groupId: invite.group_id } };
  }

  // Get current member count for position
  const { count } = await serviceClient
    .from("group_memberships")
    .select("*", { count: "exact", head: true })
    .eq("group_id", invite.group_id);

  // Create membership
  const { data: membership, error: memberError } = await serviceClient
    .from("group_memberships")
    .insert({
      group_id: invite.group_id,
      user_id: user.id,
      role: "member",
      position: (count ?? 0) + 1,
      status: "active",
    })
    .select()
    .single();

  if (memberError) return { success: false, error: memberError.message };

  // Create virtual account
  try {
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const accountRef = buildAccountRef(membership.id);
    const accountName = profile?.full_name ?? "AjoFlow Member";
    const va = await createVirtualAccount({ accountRef, accountName });

    await serviceClient.from("member_virtual_accounts").insert({
      membership_id: membership.id,
      account_number: va.bankAccountNumber,
      bank_name: va.bankName,
      account_reference: accountRef,
      account_name: va.bankAccountName,
      status: "active",
    });
  } catch (err) {
    console.error("[acceptInvite] VA creation failed:", err);
  }

  // Mark invite accepted
  await serviceClient.from("group_invites").update({ status: "accepted" }).eq("id", invite.id);

  // Notify group admins
  const { data: admins } = await serviceClient
    .from("group_memberships")
    .select("user_id")
    .eq("group_id", invite.group_id)
    .in("role", ["owner", "admin"]);

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (admins?.length) {
    const notifications = admins.map((a: { user_id: string }) => ({
      user_id: a.user_id,
      type: "member_joined",
      title: "New Member Joined",
      message: `${profile?.full_name ?? "A new member"} joined ${(invite as { groups: { name: string } }).groups.name}.`,
      data: { group_id: invite.group_id, user_id: user.id },
    }));
    await serviceClient.from("notifications").insert(notifications);
  }

  // Audit log
  await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: "GROUP_JOINED",
    entity_type: "group_membership",
    entity_id: membership.id,
    metadata: { group_id: invite.group_id },
  });

  revalidatePath("/groups");
  return { success: true, data: { groupId: invite.group_id } };
}

// ── Remove Member ──────────────────────────────────────────────
export async function removeMember(groupId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const serviceClient = createServiceClient();

  const { data: adminMembership } = await serviceClient
    .from("group_memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!adminMembership || !["owner", "admin"].includes(adminMembership.role)) {
    return { success: false, error: "Only admins can remove members." };
  }

  if (userId === user.id) {
    return { success: false, error: "You cannot remove yourself." };
  }

  const { error } = await serviceClient
    .from("group_memberships")
    .update({ status: "inactive" })
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/groups/${groupId}/members`);
  return { success: true };
}
