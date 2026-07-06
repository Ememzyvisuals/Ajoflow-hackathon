import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import TopNav from "@/components/layout/TopNav";
import MobileTopBar from "@/components/layout/MobileTopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <Sidebar profile={profile} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Desktop TopNav */}
        <TopNav profile={profile} unreadCount={unreadCount ?? 0} />

        {/* Mobile Top Bar */}
        <MobileTopBar unreadCount={unreadCount ?? 0} />

        {/* Page Content */}
        <main className="flex-1 pb-24 lg:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Nav (self-hides when inside a specific group) */}
        <MobileNav />
      </div>
    </div>
  );
}
