import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EditGroupForm from "./EditGroupForm";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: group } = await supabase.from("groups").select("*").eq("id", id).single();
  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_memberships")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", user!.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    redirect(`/groups/${id}`);
  }

  return <EditGroupForm groupId={id} group={group} />;
}
