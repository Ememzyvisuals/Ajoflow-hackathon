"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { updateGroup } from "@/features/groups/actions";

type Group = {
  id: string; name: string; description: string | null; rules: string | null;
  payout_mode: "auto" | "manual_approval";
  contribution_amount: number; contribution_frequency: string; type: string;
};

export default function EditGroupForm({ groupId, group }: { groupId: string; group: Group }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [rules, setRules] = useState(group.rules ?? "");
  const [payoutMode, setPayoutMode] = useState(group.payout_mode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (name.trim().length < 3) { setError("Name must be at least 3 characters."); return; }
    setLoading(true);
    setError("");
    const result = await updateGroup(groupId, {
      name: name.trim(),
      description: description.trim() || undefined,
      rules: rules.trim() || undefined,
      payout_mode: payoutMode,
    });
    setLoading(false);
    if (result.success) {
      setSaved(true);
      router.refresh();
      setTimeout(() => router.push(`/groups/${groupId}`), 1000);
    } else {
      setError(result.error ?? "Failed to save changes.");
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/groups/${groupId}`} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text">Group Settings</h1>
      </div>

      <div className="dashboard-card space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {saved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">Saved.</div>}

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Group Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="form-input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="form-input resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Rules</label>
          <textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={4} className="form-input resize-none" placeholder="What members should know about how this group runs" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Payout Approval</label>
          <select value={payoutMode} onChange={(e) => setPayoutMode(e.target.value as "auto" | "manual_approval")} className="form-input">
            <option value="manual_approval">Manual approval — I approve each payout</option>
            <option value="auto">Automatic — payouts go out as soon as funds are ready</option>
          </select>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-text-secondary mb-4">
            Contribution amount, frequency, and group type can't be changed here to protect an active rotation — these are locked in once members have joined.
          </p>
          <button onClick={handleSave} disabled={loading} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
