import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ArrowRight, Link as LinkIcon } from "lucide-react";
import AcceptInviteButton from "./AcceptInviteButton";
import { formatNaira, getGroupTypeLabel } from "@/lib/utils";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: invite } = await supabase
    .from("group_invites")
    .select("*, groups(id,name,type,contribution_amount,contribution_frequency,status)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  const expired = !invite || new Date(invite.expires_at) < new Date();
  const group = invite?.groups as {
    id: string; name: string; type: string;
    contribution_amount: number; contribution_frequency: string; status: string;
  } | null;

  if (expired) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><LinkIcon className="w-7 h-7 text-text-secondary" /></div>
          <h2 className="text-xl font-bold text-text mb-2">Invite link expired</h2>
          <p className="text-text-secondary text-sm mb-5">This invite link has expired or is invalid. Ask your group admin for a new link.</p>
          <Link href="/" className="text-primary font-medium hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-bold text-lg text-text">AjoFlow</span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm text-center">
          {/* Group icon */}
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>

          <p className="text-sm text-text-secondary mb-1">You&apos;ve been invited to join</p>
          <h2 className="text-2xl font-bold text-text mb-1">{group?.name}</h2>
          <p className="text-sm text-text-secondary mb-5">{getGroupTypeLabel(group?.type ?? "")}</p>

          {/* Group details */}
          <div className="bg-background rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Contribution</span>
              <span className="text-sm font-semibold text-text">
                {formatNaira(group?.contribution_amount ?? 0)} / {group?.contribution_frequency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Status</span>
              <span className="text-sm font-semibold text-success capitalize">{group?.status}</span>
            </div>
          </div>

          {user ? (
            /* Already logged in → accept directly */
            <AcceptInviteButton token={token} groupId={group?.id ?? ""} />
          ) : (
            /* Not logged in → go to signup/login */
            <div className="space-y-3">
              <Link
                href={`/signup?invite=${token}`}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors"
              >
                Create account & Join <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/login?redirectTo=/invite/${token}`}
                className="w-full flex items-center justify-center border border-border rounded-xl py-3 text-sm font-medium text-text hover:bg-gray-50 transition-colors"
              >
                Log in to accept
              </Link>
            </div>
          )}

          <p className="text-xs text-text-secondary mt-4">
            Invite expires {new Date(invite.expires_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
