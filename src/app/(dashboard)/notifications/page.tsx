import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";
import MarkAllReadButton from "./MarkAllReadButton";
import {
  Banknote, Clock, AlertTriangle, Wallet, CheckCircle2,
  XCircle, Megaphone, TrendingUp, UserPlus, Users, Send, Bell
} from "lucide-react";

const typeConfig: Record<string, { icon: typeof Bell; bg: string; color: string }> = {
  contribution_paid: { icon: Banknote, bg: "bg-green-100", color: "text-green-700" },
  contribution_due: { icon: Clock, bg: "bg-yellow-100", color: "text-yellow-700" },
  contribution_missed: { icon: AlertTriangle, bg: "bg-red-100", color: "text-red-700" },
  payout_received: { icon: Wallet, bg: "bg-primary-light", color: "text-primary" },
  loan_approved: { icon: CheckCircle2, bg: "bg-green-100", color: "text-green-700" },
  loan_rejected: { icon: XCircle, bg: "bg-red-100", color: "text-red-700" },
  announcement_posted: { icon: Megaphone, bg: "bg-blue-100", color: "text-blue-700" },
  trust_score_changed: { icon: TrendingUp, bg: "bg-purple-100", color: "text-purple-700" },
  invitation_received: { icon: UserPlus, bg: "bg-primary-light", color: "text-primary" },
  member_joined: { icon: Users, bg: "bg-primary-light", color: "text-primary" },
  payout_approved: { icon: Send, bg: "bg-primary-light", color: "text-primary" },
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = (notifications ?? []).filter((n: { read: boolean }) => !n.read).length;

  return (
    <div className="px-4 pt-4 pb-6 max-w-2xl mx-auto lg:max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Notifications</h1>
          {unread > 0 && <p className="text-xs text-text-secondary mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && <MarkAllReadButton userId={user!.id} />}
      </div>

      {(!notifications || notifications.length === 0) ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-text-secondary/50" />
          </div>
          <h3 className="font-semibold text-text mb-2">All caught up!</h3>
          <p className="text-sm text-text-secondary">No notifications yet. We&apos;ll let you know when something happens.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {(notifications ?? []).map((n: {
            id: string; type: string; title: string; message: string; read: boolean; created_at: string;
          }) => {
            const config = typeConfig[n.type] ?? { icon: Bell, bg: "bg-gray-100", color: "text-gray-600" };
            const Icon = config.icon;
            return (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
                !n.read ? "bg-primary-light/30 border-primary/10" : "bg-white border-border"
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-text leading-snug">{n.title}</p>
                    <p className="text-xs text-text-secondary flex-shrink-0">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
