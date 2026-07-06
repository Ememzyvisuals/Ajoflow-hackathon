import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, Users, Zap, TrendingUp, Smartphone, Globe, CheckCircle, Star, ChevronDown, FileWarning, Banknote, LockKeyhole, MessageSquareOff, BellOff, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// This page reads the auth cookie to decide between "Get started"/"Log in"
// and "Dashboard", so it must render dynamically per-request rather than
// being statically generated at build time.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-xl text-text">AjoFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-text-secondary hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-text-secondary hover:text-primary transition-colors">How It Works</a>
            <a href="#trust" className="text-sm text-text-secondary hover:text-primary transition-colors">Trust Engine</a>
            <a href="#faq" className="text-sm text-text-secondary hover:text-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors hidden sm:block">
                  Log in
                </Link>
                <Link href="/signup" className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="pt-16 min-h-screen flex items-center bg-background overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20 lg:py-28">
            {/* Left: Text */}
            <div className="order-2 lg:order-1 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Zap className="w-3 h-3" />
                Powered by Nomba Payments
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text leading-[1.1] tracking-tight mb-6">
                Modern Ajo.<br />
                <span className="text-primary">Stronger Communities.</span>
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-lg">
                AjoFlow digitizes your Ajo, Esusu, and cooperative savings groups — 
                with automated payments, AI trust scores, and community tools built for Africa.
              </p>
              <ul className="space-y-3 mb-10">
                {[
                  "Track contributions with bank-level precision",
                  "Build trust & transparency across your group",
                  "Get paid on rotation — automatically",
                  "AI reports in English and Nigerian Pidgin",
                  "Secure payments powered by Nomba",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-text-secondary">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
                    >
                      Get started free
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 bg-white border border-border text-text font-semibold px-6 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-4">
                No credit card required. Set up your first group in 2 minutes.
              </p>
            </div>

            {/* Right: Hero Image */}
            <div className="order-1 lg:order-2 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/hero-market-women.png"
                  alt="Nigerian market women managing their Ajo cooperative savings together"
                  width={700}
                  height={560}
                  className="w-full h-auto object-cover"
                  priority
                />
                {/* Floating stats card */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Group Treasury</span>
                      <span className="text-xs text-success font-medium">+18.5% this month</span>
                    </div>
                    <div className="flex items-end gap-4">
                      <div>
                        <p className="text-2xl font-bold text-text">₦583,091</p>
                        <p className="text-xs text-text-secondary">Market Women Cooperative</p>
                      </div>
                      <div className="ml-auto flex gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-text">8</p>
                          <p className="text-xs text-text-secondary">Groups</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-primary">92%</p>
                          <p className="text-xs text-text-secondary">Trust Score</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted By ──────────────────────────────────────── */}
      <section className="py-12 border-y border-border bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-text-secondary mb-8">
            Trusted by communities across Nigeria
          </p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
            {["Market Women", "Traders Associations", "Family Groups", "Church Cooperatives", "School Unions", "Farmers Groups"].map((item) => (
              <span key={item} className="text-sm font-semibold text-text-secondary">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Ajo Needs Modern Tools ─────────────────────── */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">
              Why traditional Ajo needs a digital upgrade
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Millions of Nigerians trust Ajo and Esusu — but cash, notebooks, and WhatsApp groups create real problems.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FileWarning, problem: "Paper records get lost", solution: "Every naira tracked digitally with an immutable audit trail." },
              { icon: Banknote, problem: "Cash creates disputes", solution: "Automated bank transfers with Nomba — no cash, no arguments." },
              { icon: LockKeyhole, problem: "No trust system", solution: "AI Trust Engine scores every member based on payment behavior." },
              { icon: MessageSquareOff, problem: "WhatsApp isn't built for finance", solution: "Purpose-built community tools with announcements, discussions & polls." },
              { icon: BellOff, problem: "Reminders go ignored", solution: "Smart automated reminders via email and push notifications." },
              { icon: EyeOff, problem: "No transparency", solution: "Real-time group treasury dashboards visible to all members." },
            ].map(({ icon: Icon, problem, solution }) => (
              <div key={problem} className="bg-white rounded-2xl border border-border p-6 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-danger" />
                </div>
                <p className="text-sm font-semibold text-danger mb-2">{problem}</p>
                <p className="text-sm text-text-secondary leading-relaxed">{solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">How AjoFlow works</h2>
            <p className="text-lg text-text-secondary max-w-xl mx-auto">
              From group creation to automated payouts in just a few steps.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Create your group", desc: "Set up a Rotational Ajo, Target Savings, or Cooperative in under 2 minutes." },
              { step: "02", title: "Invite your members", desc: "Share a unique invite link — members join with one click. Just like Discord." },
              { step: "03", title: "Contribute automatically", desc: "Members pay via card or bank transfer. Each gets a dedicated virtual account." },
              { step: "04", title: "Payouts distributed", desc: "Admin approves payouts, Nomba transfers directly to bank accounts." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-5xl font-bold text-primary/10 mb-4">{step}</div>
                <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                {step !== "04" && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-3 w-5 h-5 text-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────── */}
      <section id="features" className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text mb-4">Everything your group needs</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              A complete cooperative finance operating system — not just an Ajo tracker.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Users className="w-5 h-5" />, title: "Group Management", desc: "Create and manage unlimited cooperative groups with roles, permissions, and member directories." },
              { icon: <Shield className="w-5 h-5" />, title: "Trust Engine", desc: "AI-powered trust scores based on payment history, consistency, and community participation." },
              { icon: <Zap className="w-5 h-5" />, title: "Nomba Payments", desc: "Card payments and bank transfers via Nomba. Virtual accounts for every member." },
              { icon: <TrendingUp className="w-5 h-5" />, title: "AI Financial Reports", desc: "Group health scores, payout recommendations, and risk alerts in English or Nigerian Pidgin." },
              { icon: <Smartphone className="w-5 h-5" />, title: "PWA Mobile App", desc: "Install on Android, iPhone, or desktop. Works offline. Feels native." },
              { icon: <Globe className="w-5 h-5" />, title: "Community Hub", desc: "Announcements, discussions, and posts — everything your group needs to stay connected." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-border p-6 hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  {icon}
                </div>
                <h3 className="font-semibold text-text mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Engine ────────────────────────────────────── */}
      <section id="trust" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-text mb-6">
                The AjoFlow Trust Engine
              </h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Every member earns a Trust Score (0–100) based on their contribution history.
                It&apos;s the financial reputation system that traditional Ajo has always needed.
              </p>
              <div className="space-y-4">
                {[
                  { label: "On-time payments", delta: "+3 pts each", color: "text-success" },
                  { label: "Consecutive streak", delta: "+1 pt each", color: "text-success" },
                  { label: "Late payments", delta: "-5 pts each", color: "text-warning" },
                  { label: "Missed payments", delta: "-10 pts each", color: "text-danger" },
                  { label: "Loan defaults", delta: "-15 pts each", color: "text-danger" },
                ].map(({ label, delta, color }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <span className="text-sm text-text">{label}</span>
                    <span className={`text-sm font-semibold ${color}`}>{delta}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-secondary mt-6">
                Trust scores determine loan eligibility, payout priority, and AI recommendations.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Amina Yusuf", score: 98, label: "Excellent", color: "bg-green-100 text-green-700", streak: 12 },
                { name: "Emmanuel Okoro", score: 92, label: "Excellent", color: "bg-green-100 text-green-700", streak: 8 },
                { name: "Chinedu James", score: 88, label: "Good", color: "bg-blue-100 text-blue-700", streak: 5 },
                { name: "Tunde Adeniyi", score: 70, label: "Fair", color: "bg-yellow-100 text-yellow-700", streak: 2 },
              ].map(({ name, score, label, color, streak }) => (
                <div key={name} className="bg-background rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-primary-light rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                      {name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text truncate">{name}</p>
                      <p className="text-xs text-text-secondary">{streak} streak</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-text mb-1">{score}%</div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-text text-center mb-16">What our communities say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Mama Ngozi", role: "Market Women Cooperative, Lagos", quote: "Before AjoFlow, we had arguments every month. Now everything is on the app — no disputes, no wahala." },
              { name: "Pastor David", role: "Church Cooperative, Abuja", quote: "Our 40-member cooperative used to be managed in a notebook. Now everyone can see the treasury balance in real time." },
              { name: "Chioma O.", role: "School Fees Savings Group", quote: "My children's school fees are sorted because AjoFlow keeps us all accountable. The AI reminders are a lifesaver." },
            ].map(({ name, role, quote }) => (
              <div key={name} className="bg-white rounded-2xl border border-border p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">&quot;{quote}&quot;</p>
                <div>
                  <p className="text-sm font-semibold text-text">{name}</p>
                  <p className="text-xs text-text-secondary">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-20 lg:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-text text-center mb-16">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {[
              { q: "Is AjoFlow free to use?", a: "AjoFlow is free to set up. Small payment processing fees may apply on transactions, subject to Nomba's standard rates." },
              { q: "How does the virtual account work?", a: "Each member gets a unique bank account number when they join a group. They can pay from any Nigerian bank directly to that account — no app login needed to contribute." },
              { q: "Is my money safe?", a: "All payments are processed by Nomba, a licensed Nigerian fintech. Funds flow through verified bank accounts. AjoFlow never holds your money." },
              { q: "Can I use AjoFlow on my phone?", a: "Yes! AjoFlow is a Progressive Web App (PWA) — install it on Android, iPhone, or desktop. It works like a native app." },
              { q: "What languages does the AI support?", a: "Currently English and Nigerian Pidgin. Yoruba, Hausa, and Igbo support are on the roadmap." },
              { q: "Can one person belong to multiple groups?", a: "Absolutely. You can join unlimited groups, each with separate contribution amounts, schedules, and virtual accounts." },
            ].map(({ q, a }) => (
              <details key={q} className="group border border-border rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-text text-sm">{q}</span>
                  <ChevronDown className="w-4 h-4 text-text-secondary group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-5 pb-5 text-sm text-text-secondary leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to modernize your Ajo?
          </h2>
          <p className="text-primary-light text-lg mb-10 leading-relaxed">
            Join communities across Nigeria managing their cooperative savings with AjoFlow.
            Set up your first group in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors shadow-lg">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors shadow-lg">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">
                  Log in to your account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-[#0a1a13] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="font-bold text-xl text-white">AjoFlow</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Modern Cooperative Finance Platform for Africa. 
                Digitizing Ajo, Esusu and Thrift for the digital age.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                {["Features", "How It Works", "Trust Engine", "Pricing"].map(item => (
                  <li key={item}><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-3">
                {["About", "Blog", "Security", "Terms of Service", "Privacy Policy"].map(item => (
                  <li key={item}><a href="#" className="text-gray-400 text-sm hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} AjoFlow. All rights reserved.</p>
            <p className="text-gray-500 text-sm">Payments powered by <span className="text-gray-300">Nomba</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
