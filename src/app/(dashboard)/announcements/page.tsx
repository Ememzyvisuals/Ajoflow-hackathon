import { createClient } from "@/lib/supabase/server";
import AnnouncementsFeed from "./AnnouncementsFeed";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", user!.id)
    .eq("status", "active");

  const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);

  const { data: posts } = await supabase
    .from("group_posts")
    .select("*, profiles(full_name), groups(name), post_comments(id, content, created_at, profiles(full_name))")
    .in("group_id", groupIds.length > 0 ? groupIds : ["none"])
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto lg:max-w-4xl">
      <h1 className="text-xl font-bold text-text mb-6">Announcements & Discussions</h1>
      <AnnouncementsFeed posts={posts ?? []} />
    </div>
  );
}
