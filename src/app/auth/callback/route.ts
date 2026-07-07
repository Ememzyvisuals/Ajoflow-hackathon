import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const invite = searchParams.get("invite");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has completed onboarding (phone set)
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("id", user.id)
          .single();

        // No phone = onboarding not done → always go to onboarding, but
        // carry the invite token along so it isn't lost — onboarding
        // itself is responsible for redirecting back to /invite/{token}
        // once it's done.
        if (!profile?.phone) {
          const onboardingUrl = invite ? `${origin}/onboarding?invite=${encodeURIComponent(invite)}` : `${origin}/onboarding`;
          return NextResponse.redirect(onboardingUrl);
        }
      }

      // Onboarding done → go to intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
