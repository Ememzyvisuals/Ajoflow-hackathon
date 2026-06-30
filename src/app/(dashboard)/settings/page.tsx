import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

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
          <div className="space-y-3">
            {["Email notifications", "Push notifications", "Contribution reminders"].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-sm text-text">{item}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Security</h2>
          <div className="divide-y divide-border">
            {["Change Password", "Two-Factor Authentication", "Active Sessions"].map((item) => (
              <button key={item} className="flex items-center justify-between py-3 w-full hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <span className="text-sm text-text">{item}</span>
                <ChevronRight className="w-4 h-4 text-text-secondary/40" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
