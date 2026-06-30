"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { acceptGroupInvite } from "@/features/groups/actions";

export default function AcceptInviteButton({ token, groupId }: { token: string; groupId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setLoading(true);
    const result = await acceptGroupInvite(token);
    setLoading(false);
    if (result.success && result.data) {
      router.push(`/groups/${result.data.groupId}`);
    } else {
      setError(result.error ?? "Failed to join group");
    }
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Accept Invitation & Join
      </button>
    </>
  );
}
