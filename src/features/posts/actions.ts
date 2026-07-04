"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

const CreatePostSchema = z.object({
  groupId: z.string().uuid(),
  content: z.string().min(1, "Write something first.").max(2000),
  type: z.enum(["post", "announcement"]),
});

export async function createGroupPost(input: {
  groupId: string;
  content: string;
  type: "post" | "announcement";
}): Promise<ActionResult> {
  const parsed = CreatePostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  // Announcements are admin/owner-only. RLS doesn't restrict by type, so we
  // gate it here in addition to the membership check RLS already enforces.
  if (parsed.data.type === "announcement") {
    const { data: membership } = await supabase
      .from("group_memberships")
      .select("role")
      .eq("group_id", parsed.data.groupId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Only group admins can post announcements." };
    }
  }

  const { error } = await supabase.from("group_posts").insert({
    group_id: parsed.data.groupId,
    author_id: user.id,
    content: parsed.data.content,
    type: parsed.data.type,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/announcements");
  return { success: true };
}
