"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createGroup } from "@/features/groups/actions";

const schema = z.object({
  name: z.string().min(3, "At least 3 characters"),
  description: z.string().max(500).optional(),
  type: z.enum(["rotational", "target_savings", "cooperative", "investment"]),
  contribution_amount: z.coerce.number().positive("Must be positive"),
  contribution_frequency: z.enum(["daily", "weekly", "monthly"]),
  payout_mode: z.enum(["auto", "manual_approval"]),
  rules: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "rotational", contribution_frequency: "monthly", payout_mode: "manual_approval" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError("");
    try {
      const result = await createGroup(data);
      if (result.success && result.data) {
        router.push(`/groups/${result.data.groupId}`);
      } else {
        setError(result.error ?? "Failed to create group");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/groups" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-text">Create New Group</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="dashboard-card space-y-4">
          <h2 className="font-semibold text-text">Group Details</h2>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Group Name *</label>
            <input {...register("name")} placeholder="e.g. Market Women Cooperative" className="form-input" />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Description</label>
            <textarea {...register("description")} placeholder="What is this group for?" rows={3} className="form-input resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Group Type *</label>
            <select {...register("type")} className="form-input">
              <option value="rotational">Rotational Ajo</option>
              <option value="target_savings">Target Savings</option>
              <option value="cooperative">Cooperative</option>
              <option value="investment">Investment</option>
            </select>
          </div>
        </div>

        <div className="dashboard-card space-y-4">
          <h2 className="font-semibold text-text">Contribution Settings</h2>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Amount per Contribution (₦) *</label>
            <input {...register("contribution_amount")} type="number" placeholder="10000" className="form-input" />
            {errors.contribution_amount && <p className="text-danger text-xs mt-1">{errors.contribution_amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Frequency *</label>
            <select {...register("contribution_frequency")} className="form-input">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Payout Mode *</label>
            <select {...register("payout_mode")} className="form-input">
              <option value="manual_approval">Manual Approval</option>
              <option value="auto">Automatic</option>
            </select>
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="font-semibold text-text mb-3">Group Rules (Optional)</h2>
          <textarea {...register("rules")} placeholder="e.g. Late payments incur a ₦500 penalty..." rows={4} className="form-input resize-none" />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Group
        </button>
      </form>
    </div>
  );
}
