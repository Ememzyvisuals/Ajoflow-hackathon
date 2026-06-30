"use client";

import { useState } from "react";
import { UserPlus, Copy, Check, Loader2 } from "lucide-react";
import { generateInviteLink } from "@/features/groups/actions";

export default function GenerateInviteButton({ groupId }: { groupId: string }) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateInviteLink(groupId);
      if (result.success && result.data) {
        setInviteUrl(result.data.inviteUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (inviteUrl) {
    return (
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 bg-primary-light text-primary border border-primary/20 rounded-xl py-3 text-sm font-medium hover:bg-primary/20 transition-colors"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy Link"}
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="flex items-center justify-center gap-2 bg-primary-light text-primary border border-primary/20 rounded-xl py-3 text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
      Invite Member
    </button>
  );
}
