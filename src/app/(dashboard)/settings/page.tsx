import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ChangePasswordButton } from "./ChangePasswordButton";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-text mb-6">Settings</h1>

      <div className="space-y-4">
        <div className="dashboard-card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Account</h2>
          <div className="divide-y divide-border">
            {[
              { label: "Full Name", value: profile?.full_name ?? "–" },
              { label: "Email", value: profile?.email ?? "–" },
              { label: "Phone", value: profile?.phone ?? "Not set" },
              { label: "Language", value: profile?.language === "pidgin" ? "Nigerian Pidgin" : "English" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-sm text-text">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">{value}</span>
                  <ChevronRight className="w-4 h-4 text-text-secondary/40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Notifications</h2>
          <p className="text-xs text-text-secondary mb-3">Notification preferences are on by default for now — per-channel controls are coming soon.</p>
        </div>

        <div className="dashboard-card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Security</h2>
          <div className="divide-y divide-border">
            <ChangePasswordButton />
            {["Two-Factor Authentication", "Active Sessions"].map((item) => (
              <div key={item} className="flex items-center justify-between py-3 opacity-50 cursor-not-allowed">
                <span className="text-sm text-text">{item}</span>
                <span className="text-xs text-text-secondary border border-border rounded-full px-2 py-0.5">Coming soon</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
