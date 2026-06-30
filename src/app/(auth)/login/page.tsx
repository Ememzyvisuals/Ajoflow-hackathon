"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, MailCheck, Sparkles } from "lucide-react";
import { signIn, sendMagicLink } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true); setServerError("");
    const result = await signIn(data);
    setLoading(false);
    if (result.success) { router.push(redirectTo); router.refresh(); }
    else setServerError(result.error ?? "Sign in failed");
  }

  async function handleMagicLink() {
    const email = getValues("email");
    if (!email) { setServerError("Enter your email first."); return; }
    setMagicLoading(true);
    const result = await sendMagicLink(email);
    setMagicLoading(false);
    if (result.success) { setMagicSent(true); setMagicEmail(email); }
    else setServerError(result.error ?? "Failed");
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl}/auth/callback?next=${redirectTo}` },
    });
  }

  if (magicSent) return (
    <div className="w-full max-w-md text-center">
      <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4"><MailCheck className="w-7 h-7 text-primary" /></div>
      <h2 className="text-xl font-bold text-text mb-2">Check your inbox</h2>
      <p className="text-text-secondary text-sm">Magic link sent to <strong>{magicEmail}</strong></p>
      <button onClick={() => setMagicSent(false)} className="text-primary text-sm font-medium mt-4 hover:underline">← Back</button>
    </div>
  );

  return (
    <div className="w-full max-w-sm">
      {/* Auth image section */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-bold text-lg text-text">AjoFlow</span>
        </div>
        <h1 className="text-2xl font-bold text-text mb-1">Welcome back</h1>
        <p className="text-text-secondary text-sm">Log in to your AjoFlow account</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            {serverError}
          </div>
        )}
        {searchParams.get("error") && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            Authentication error. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Email or phone number</label>
            <input {...register("email")} type="email" placeholder="john@email.com" className="form-input" autoComplete="email" />
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-text">Password</label>
              <button type="button" onClick={handleMagicLink} disabled={magicLoading} className="text-xs text-primary hover:underline disabled:opacity-50">
                {magicLoading ? "Sending…" : "Forgot password?"}
              </button>
            </div>
            <div className="relative">
              <input {...register("password")} type={showPw ? "text" : "password"} placeholder="••••••••" className="form-input pr-10" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-border text-primary w-4 h-4" />
            <span className="text-sm text-text-secondary">Remember me</span>
          </label>
          <button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Log in
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs text-text-secondary bg-white px-3"><span>or continue with</span></div>
        </div>

        <div className="space-y-3">
          <button onClick={handleGoogle} disabled={googleLoading} className="w-full flex items-center justify-center gap-3 border border-border rounded-xl py-2.5 text-sm font-medium text-text hover:bg-gray-50 transition-colors disabled:opacity-60">
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>
          <button onClick={handleMagicLink} disabled={magicLoading} className="w-full flex items-center justify-center gap-3 border border-border rounded-xl py-2.5 text-sm font-medium text-text hover:bg-gray-50 transition-colors disabled:opacity-60">
            {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Continue with Magic Link
          </button>
        </div>

        <p className="text-center text-sm text-text-secondary mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-96 bg-white rounded-2xl border border-border shimmer" />}>
      <LoginForm />
    </Suspense>
  );
}
