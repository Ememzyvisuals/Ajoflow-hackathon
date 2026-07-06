"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

const AddCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1, "Write something first.").max(1000),
  groupId: z.string().uuid(), // for revalidation only
});

export async function addComment(input: {
  postId: string;
  content: string;
  groupId: string;
}): Promise<ActionResult> {
  const parsed = AddCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await supabase.from("post_comments").insert({
    post_id: parsed.data.postId,
    author_id: user.id,
    content: parsed.data.content,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/announcements");
  return { success: true };
}
