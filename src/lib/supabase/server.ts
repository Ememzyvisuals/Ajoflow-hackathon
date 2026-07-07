import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component – cookie mutations are expected to fail
          }
        },
      },
    }
  );
}

// ── Service Role Client (server-side only, bypasses RLS) ──────
// Uses the plain @supabase/supabase-js client, not @supabase/ssr's
// cookie-aware createServerClient — this client never needs a user
// session or cookies at all, since the service role key bypasses RLS
// entirely. Previously used require("@supabase/ssr") dynamically, which
// is fragile under Next.js production bundling and could silently
// resolve to undefined, causing "X is not a function" (minified to a
// single letter) on every single feature that calls this — which is
// exactly the pattern of crashes reported across unrelated flows.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing on this deployment. " +
      "Check Vercel → Settings → Environment Variables → Production."
    );
  }
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
