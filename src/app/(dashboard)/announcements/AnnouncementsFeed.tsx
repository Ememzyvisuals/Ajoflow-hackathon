"use client";

import { useState } from "react";
import { Pin, MessageSquare, Megaphone, Send, Loader2 } from "lucide-react";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { addComment } from "@/features/posts/comments";

type Comment = { id: string; content: string; created_at: string; profiles: { full_name: string | null } | null };
type Post = {
  id: string; group_id: string; type: string; content: string; pinned: boolean; created_at: string;
  profiles: { full_name: string | null } | null;
  groups: { name: string } | null;
  post_comments?: Comment[];
};

export default function AnnouncementsFeed({ posts }: { posts: Post[] }) {
  const [tab, setTab] = useState<"announcements" | "discussions">("announcements");

  const filtered = posts.filter((p) => (tab === "announcements" ? p.type === "announcement" : p.type === "post"));

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {(["announcements", "discussions"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === key ? "bg-white text-text shadow-sm" : "text-text-secondary hover:text-text"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-primary" />
          </div>
          <p className="font-semibold text-text mb-2">
            {tab === "announcements" ? "No announcements yet" : "No discussions yet"}
          </p>
          <p className="text-sm text-text-secondary">
            {tab === "announcements"
              ? "Group admins can post announcements from inside each group's page."
              : "Post from inside a group's page to start a discussion there."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const comments = [...(post.post_comments ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  async function submitReply() {
    if (!reply.trim()) return;
    setLoading(true);
    const result = await addComment({ postId: post.id, content: reply, groupId: post.group_id });
    setLoading(false);
    if (result.success) {
      setReply("");
      setShowReply(false);
    }
  }

  return (
    <div className="dashboard-card">
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

      {comments.length > 0 && (
        <div className="mb-3 pt-3 border-t border-border/50 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-text-secondary flex-shrink-0">
                {c.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-xs font-semibold text-text">{c.profiles?.full_name ?? "Member"}</p>
                <p className="text-sm text-text">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Announcements are read-only — only discussions get a reply box */}
      {post.type === "post" && (
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          {showReply ? (
            <div className="flex gap-2 w-full pt-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply..."
                className="form-input flex-1 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
              />
              <button onClick={submitReply} disabled={loading || !reply.trim()} className="bg-primary text-white rounded-lg px-3 disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowReply(true)} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Reply {comments.length > 0 && `(${comments.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
