"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function MarkAllReadButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleMarkAll() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleMarkAll}
      disabled={loading}
      className="text-primary text-sm font-medium hover:underline disabled:opacity-60"
    >
      Mark all as read
    </button>
  );
}
