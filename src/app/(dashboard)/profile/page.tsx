import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronRight, LogOut, Edit2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";

const menuItems = [
  { label: "Personal Information", href: "/settings?tab=personal" },
  { label: "Payout Accounts", href: "/wallet" },
  { label: "Notification Settings", href: "/settings?tab=notifications" },
  { label: "Security", href: "/settings?tab=security" },
  { label: "Language", href: "/settings?tab=language", value: "English" },
  { label: "Help & Support", href: "/support" },
  { label: "About AjoFlow", href: "/about" },
];

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="px-4 pt-4 pb-6 max-w-md mx-auto">
      {/* Profile Card */}
      <div className="dashboard-card mb-5 text-center">
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center text-primary text-2xl font-bold mx-auto">
            {profile?.full_name ? getInitials(profile.full_name) : "U"}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50">
            <Edit2 className="w-3 h-3 text-text-secondary" />
          </button>
        </div>
        <h2 className="text-lg font-bold text-text">{profile?.full_name ?? "User"}</h2>
        <p className="text-sm text-text-secondary mt-0.5">{profile?.email}</p>
        {profile?.phone && (
          <p className="text-sm text-text-secondary">{profile.phone}</p>
        )}
      </div>

      {/* Menu Items */}
      <div className="dashboard-card mb-4">
        <div className="divide-y divide-border">
          {menuItems.map(({ label, href, value }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center justify-between py-3.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors first:-mt-1 last:-mb-1"
            >
              <span className="text-sm font-medium text-text">{label}</span>
              <div className="flex items-center gap-2">
                {value && <span className="text-xs text-text-secondary">{value}</span>}
                <ChevronRight className="w-4 h-4 text-text-secondary/50" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Log Out */}
      <div className="dashboard-card">
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-3 text-danger text-sm font-medium w-full py-1"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
