"use client";

import { useState } from "react";
import Link from "next/link";
import { Share2, Send, Loader2, Megaphone, Users2 } from "lucide-react";
import { formatNaira, getTrustScoreLabel, toPercent } from "@/lib/utils";
import { createGroupPost } from "@/features/posts/actions";
import GenerateInviteButton from "./GenerateInviteButton";

type Member = {
  id: string; role: string; user_id: string; position: number;
  profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
  trust_scores: { score: number }[] | { score: number } | null;
};
type Post = {
  id: string; type: string; content: string; pinned: boolean; created_at: string;
  profiles: { full_name: string | null } | null;
};

function oneOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function GroupTabs({
  groupId,
  group,
  members,
  wallet,
  recentContributions,
  posts,
  paidAmount,
  pendingAmount,
  isAdmin,
}: {
  groupId: string;
  group: { contribution_amount: number };
  members: Member[];
  wallet: { balance: number } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentContributions: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posts: any[];
  paidAmount: number;
  pendingAmount: number;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"overview" | "contributions" | "members" | "posts">("overview");
  const totalExpected = paidAmount + pendingAmount;
  const paidPct = toPercent(paidAmount, totalExpected);

  return (
    <div>
      <div className="flex gap-0 border-b border-border mb-5 overflow-x-auto scrollbar-hide">
        {([
          ["overview", "Overview"],
          ["contributions", "Contributions"],
          ["members", "Members"],
          ["posts", "Posts"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="stat-card text-center">
              <p className="text-xl font-bold text-text">{members.length}</p>
              <p className="text-xs text-text-secondary mt-0.5">Members</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xl font-bold text-text">{formatNaira(group.contribution_amount)}</p>
              <p className="text-xs text-text-secondary mt-0.5">Contribution</p>
            </div>
          </div>

          <div className="dashboard-card mb-4">
            <p className="text-xs text-text-secondary mb-1">Treasury Balance</p>
            <p className="text-3xl font-bold text-text">{formatNaira(wallet?.balance ?? 0)}</p>
          </div>

          <div className="dashboard-card mb-4">
            <p className="font-semibold text-text mb-4">Contribution Progress</p>
            <div className="flex items-center gap-6 mb-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D9F2E6" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0F6B4B" strokeWidth="3.5" strokeDasharray={`${paidPct} ${100 - paidPct}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm font-bold text-text">{paidPct}%</p>
                  <p className="text-[10px] text-text-secondary">Paid</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div>
                    <p className="text-xs text-text-secondary">Paid</p>
                    <p className="text-sm font-semibold text-text">{formatNaira(paidAmount)} ({paidPct}%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                  <div>
                    <p className="text-xs text-text-secondary">Pending</p>
                    <p className="text-sm font-semibold text-text">{formatNaira(pendingAmount)} ({100 - paidPct}%)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card mb-4">
            <p className="font-semibold text-text mb-3">Recent Activity</p>
            {recentContributions.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {recentContributions.map((c, i) => {
                  const profile = oneOf(c.group_memberships)?.profiles;
                  const name = oneOf(profile ?? null)?.full_name ?? (profile as { full_name: string | null } | null)?.full_name;
                  return (
                    <div key={i} className="flex justify-between py-1.5">
                      <p className="text-sm text-text">{name ?? "Member"} {c.status === "paid" ? "paid" : "owes"} {formatNaira(c.amount)}</p>
                      <p className="text-xs text-text-secondary">{c.paid_at ? "Paid" : "Pending"}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <Link href={`/contributions?group=${groupId}`} className="text-primary text-xs font-medium mt-2 block hover:underline">
              View all activity →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isAdmin && <GenerateInviteButton groupId={groupId} />}
            <button className="flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm font-medium text-text hover:bg-gray-50 transition-colors">
              <Share2 className="w-4 h-4" />
              Share Group
            </button>
          </div>
        </>
      )}

      {tab === "contributions" && (
        <div className="dashboard-card text-center py-10">
          <p className="text-sm text-text-secondary mb-3">See every contribution for this group.</p>
          <Link href={`/contributions?group=${groupId}`} className="text-primary text-sm font-semibold hover:underline">
            Open full contributions →
          </Link>
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="text-center py-16">
              <Users2 className="w-7 h-7 text-primary mx-auto mb-3" />
              <p className="text-sm text-text-secondary">No members yet.</p>
            </div>
          ) : (
            members.map((m) => {
              const profile = oneOf(m.profiles);
              const score = oneOf(m.trust_scores)?.score ?? 100;
              const info = getTrustScoreLabel(score);
              const name = profile?.full_name ?? "Member";
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text">{name}</p>
                      {["owner", "admin"].includes(m.role) && <span className="text-xs text-text-secondary">Admin</span>}
                    </div>
                    <p className={`text-xs font-semibold ${info.color}`}>Trust score: {score}%</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "posts" && (
        <PostsTab groupId={groupId} posts={posts} isAdmin={isAdmin} />
      )}
    </div>
  );
}

function PostsTab({ groupId, posts, isAdmin }: { groupId: string; posts: Post[]; isAdmin: boolean }) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"post" | "announcement">("post");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    const result = await createGroupPost({ groupId, content, type: postType });
    setLoading(false);
    if (result.success) {
      setContent("");
    } else {
      setError(result.error ?? "Failed to post.");
    }
  }

  return (
    <div>
      <div className="dashboard-card mb-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isAdmin ? "Post an update to the group..." : "Start a discussion..."}
          rows={3}
          className="form-input resize-none mb-3"
        />
        <div className="flex items-center justify-between">
          {isAdmin ? (
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(["post", "announcement"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPostType(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                    postType === t ? "bg-white text-text shadow-sm" : "text-text-secondary"
                  }`}
                >
                  {t === "post" ? "Discussion" : "Announcement"}
                </button>
              ))}
            </div>
          ) : <span />}
          <button onClick={submit} disabled={loading || !content.trim()} className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="w-7 h-7 text-primary mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No posts yet in this group.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="dashboard-card">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-text">{post.profiles?.full_name ?? "Member"}</p>
                {post.type === "announcement" && <span className="badge bg-primary-light text-primary text-xs">Announcement</span>}
              </div>
              <p className="text-sm text-text leading-relaxed">{post.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
