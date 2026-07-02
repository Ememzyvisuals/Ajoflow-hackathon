import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AjoFlow",
  description: "AjoFlow Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 bg-white border-b border-border z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/signup" className="flex items-center gap-1.5 text-text-secondary hover:text-text transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-text">AjoFlow</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-text mb-2">Privacy Policy</h1>
        <p className="text-text-secondary text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
          <Section title="1. Introduction">
            AjoFlow ("we", "us", "our"), operated by Axiveri, is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our Platform.
          </Section>

          <Section title="2. Data We Collect">
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li><strong className="text-text">Account data:</strong> name, email address, phone number, profile picture</li>
              <li><strong className="text-text">Financial data:</strong> contribution amounts, payout account details (bank name, account number — used solely to process payouts)</li>
              <li><strong className="text-text">Usage data:</strong> pages visited, features used, session timestamps</li>
              <li><strong className="text-text">Communication data:</strong> group posts, announcements, and comments you create within the platform</li>
              <li><strong className="text-text">Device data:</strong> browser type, IP address, device identifiers (for security and fraud prevention)</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>To provide, operate, and improve the Platform</li>
              <li>To process contributions and payouts via Nomba</li>
              <li>To calculate trust scores and AI-powered group insights</li>
              <li>To send transactional emails (contribution reminders, payout notifications, invites) via Resend</li>
              <li>To detect and prevent fraud and unauthorized access</li>
              <li>To comply with applicable legal obligations</li>
            </ul>
          </Section>

          <Section title="4. Data Sharing">
            We do not sell your personal data. We share data only with: (a) <strong className="text-text">Nomba</strong> — for payment processing, virtual account issuance, and bank transfers; (b) <strong className="text-text">Supabase</strong> — our database and authentication provider; (c) <strong className="text-text">Groq</strong> — anonymised group statistics for AI analysis (no personally identifiable information is sent); (d) <strong className="text-text">Resend</strong> — your email address for transactional emails only. All third-party providers are bound by data processing agreements.
          </Section>

          <Section title="5. Data Retention">
            We retain your account data for as long as your account is active. Financial transaction records are retained for 7 years in compliance with Nigerian financial regulations. You may request deletion of your account data by contacting us — note that transaction audit logs required for regulatory compliance cannot be deleted.
          </Section>

          <Section title="6. Security">
            We implement industry-standard security measures including encrypted connections (TLS), row-level database security, HMAC webhook verification, and regular security reviews. However, no system is completely secure — please use a strong, unique password and enable account verification features.
          </Section>

          <Section title="7. Your Rights">
            You have the right to: access the personal data we hold about you; correct inaccurate data; request deletion of your data (subject to legal retention requirements); withdraw consent for non-essential processing. To exercise these rights, email{" "}
            <a href="mailto:privacy@ajoflow.com" className="text-primary underline">privacy@ajoflow.com</a>.
          </Section>

          <Section title="8. Cookies">
            AjoFlow uses strictly necessary cookies for authentication session management only. We do not use advertising or tracking cookies.
          </Section>

          <Section title="9. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect.
          </Section>

          <Section title="10. Contact">
            For privacy-related questions, contact our Data Protection Officer at{" "}
            <a href="mailto:privacy@ajoflow.com" className="text-primary underline">privacy@ajoflow.com</a>.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-text mb-2">{title}</h2>
      <div>{children}</div>
    </div>
  );
}
