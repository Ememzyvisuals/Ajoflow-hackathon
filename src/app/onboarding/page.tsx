"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Camera, CheckCircle } from "lucide-react";
import { updateProfile } from "@/features/auth/actions";

const schema = z.object({
  fullName: z.string().min(2, "At least 2 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  language: z.enum(["en", "pidgin"]),
});
type FormData = z.infer<typeof schema>;

const STEPS = ["Profile", "Language", "Done"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { language: "en" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError("");
    const result = await updateProfile(data);
    setLoading(false);
    if (result.success) {
      setStep(2);
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setError(result.error ?? "Failed to save profile");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="font-bold text-lg text-text">AjoFlow</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i <= step ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 transition-colors ${i < step ? "bg-primary" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm">
        {step === 2 ? (
          /* Done */
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">You&apos;re all set!</h2>
            <p className="text-text-secondary text-sm">Taking you to your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
              {step === 0 && (
                <>
                  <h2 className="text-xl font-bold text-text mb-1">Set up your profile</h2>
                  <p className="text-text-secondary text-sm mb-6">This helps your group members identify you.</p>

                  {/* Avatar placeholder */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center text-primary text-3xl font-bold">
                        {watch("fullName")?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <button type="button" className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow">
                        <Camera className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1.5">Full name *</label>
                      <input {...register("fullName")} placeholder="John Emmanuel" className="form-input" autoFocus />
                      {errors.fullName && <p className="text-danger text-xs mt-1">{errors.fullName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1.5">Phone number *</label>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1 border border-border rounded-lg px-3 text-sm text-text-secondary bg-gray-50 whitespace-nowrap">🇳🇬 +234</span>
                        <input {...register("phone")} type="tel" placeholder="801 234 5678" className="form-input flex-1" />
                      </div>
                      {errors.phone && <p className="text-danger text-xs mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors mt-6"
                  >
                    Continue
                  </button>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="text-xl font-bold text-text mb-1">Choose your language</h2>
                  <p className="text-text-secondary text-sm mb-6">How should AjoFlow&apos;s AI talk to you?</p>

                  <div className="space-y-3 mb-6">
                    {[
                      { value: "en", label: "English", desc: "Standard English responses" },
                      { value: "pidgin", label: "Nigerian Pidgin", desc: "E go dey sweet for ear 🇳🇬" },
                    ].map(({ value, label, desc }) => (
                      <label key={value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        watch("language") === value ? "border-primary bg-primary-light" : "border-border hover:border-primary/30"
                      }`}>
                        <input {...register("language")} type="radio" value={value} className="sr-only" />
                        <div className="flex-1">
                          <p className="font-semibold text-text">{label}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          watch("language") === value ? "border-primary" : "border-border"
                        }`}>
                          {watch("language") === value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(0)} className="flex-1 border border-border rounded-xl py-3 text-sm font-medium text-text hover:bg-gray-50">
                      Back
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Finish Setup
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
