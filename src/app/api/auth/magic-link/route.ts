import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "AjoFlow <onboarding@resend.dev>";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[MagicLink] generateLink error:", error);
      return NextResponse.json({ error: "Could not generate link. Use email + password instead." }, { status: 500 });
    }

    const { error: emailError } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Your AjoFlow sign-in link",
      html: `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#0F6B4B;padding:24px 32px;border-radius:16px 16px 0 0;">
          <span style="color:white;font-size:20px;font-weight:700;">AjoFlow</span>
        </div>
        <div style="background:white;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px;">
          <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">Your sign-in link</h2>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Click below to sign in to AjoFlow. Expires in <strong>30 minutes</strong>, one-time use only.
          </p>
          <a href="${data.properties.action_link}"
             style="display:inline-block;background:#0F6B4B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
            Sign in to AjoFlow
          </a>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">
            If you didn&apos;t request this, ignore this email.
          </p>
        </div>
      </div>`,
    });

    if (emailError) {
      console.error("[MagicLink] Resend error:", emailError);
      return NextResponse.json({ error: "Could not send email. Use email + password instead." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[MagicLink] Error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
