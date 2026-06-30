import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { Pin, Plus, MessageSquare, Megaphone } from "lucide-react";

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
    .select("*, profiles(full_name), groups(name)")
    .in("group_id", groupIds.length > 0 ? groupIds : ["none"])
    .order("created_at", { ascending: false })
    .limit(30);

  const allPosts = posts ?? [];
  const announcements = allPosts.filter((p: { type: string }) => p.type === "announcement");
  const discussions = allPosts.filter((p: { type: string }) => p.type === "post");

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto lg:max-w-4xl">
      <h1 className="text-xl font-bold text-text mb-6">Announcements & Discussions</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {["Announcements", "Discussions"].map((tab) => (
          <button key={tab} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "Announcements" ? "bg-white text-text shadow-sm" : "text-text-secondary hover:text-text"
          }`}>{tab}</button>
        ))}
      </div>

      {allPosts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4"><Megaphone className="w-7 h-7 text-primary" /></div>
          <p className="font-semibold text-text mb-2">No posts yet</p>
          <p className="text-sm text-text-secondary">Group admins can post announcements here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allPosts.map((post: {
            id: string; type: string; content: string;
            pinned: boolean; created_at: string;
            profiles: { full_name: string | null } | null;
            groups: { name: string } | null;
          }) => (
            <div key={post.id} className="dashboard-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-xs">
                    {post.profiles?.full_name ? getInitials(post.profiles.full_name) : "A"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text">{post.profiles?.full_name ?? "Admin"}</p>
                      {post.type === "announcement" && (
                        <span className="badge bg-primary-light text-primary text-xs">Announcement</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{post.groups?.name} · {formatRelativeTime(post.created_at)}</p>
                  </div>
                </div>
                {post.pinned && <Pin className="w-4 h-4 text-text-secondary" />}
              </div>
              <p className="text-sm text-text leading-relaxed mb-3">{post.content}</p>
              <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                <button className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" /> Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors">
        <Plus className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
