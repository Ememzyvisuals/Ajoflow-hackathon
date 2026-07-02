import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | AjoFlow",
  description: "AjoFlow Terms of Service — read our terms before using the platform.",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-text mb-2">Terms of Service</h1>
        <p className="text-text-secondary text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
          <Section title="1. Acceptance of Terms">
            By accessing or using AjoFlow ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. AjoFlow is operated by Axiveri and is designed to facilitate cooperative savings groups (Ajo, Esusu, Thrift) in Africa.
          </Section>

          <Section title="2. Description of Service">
            AjoFlow provides digital infrastructure for cooperative savings groups, including group management, contribution tracking, virtual account issuance, payment processing via Nomba, AI-powered insights, and community communication tools. AjoFlow is not a bank or financial institution. Payment services are provided by Nomba, a licensed fintech.
          </Section>

          <Section title="3. Eligibility">
            You must be at least 18 years old and capable of entering into a binding contract to use AjoFlow. By registering, you confirm that the information you provide is accurate and complete.
          </Section>

          <Section title="4. User Accounts">
            You are responsible for maintaining the confidentiality of your account credentials. You are liable for all activities that occur under your account. Notify us immediately at support@ajoflow.com if you suspect unauthorized access.
          </Section>

          <Section title="5. Payments and Virtual Accounts">
            Virtual account numbers are issued by Nomba MFB and used solely for receiving contributions within your cooperative groups. AjoFlow does not hold, store, or manage your funds directly. All payment processing is handled by Nomba in accordance with CBN regulations. Group treasury balances are tracked within AjoFlow's ledger system. AjoFlow is not liable for payment delays caused by banking infrastructure, third-party failures, or network issues.
          </Section>

          <Section title="6. Cooperative Group Rules">
            Group administrators are responsible for the conduct of their groups, contribution schedules, and payout decisions. AjoFlow provides the infrastructure — it does not mediate group disputes, guarantee payouts, or intervene in group financial decisions. Members join groups voluntarily and are responsible for understanding the contribution terms before joining.
          </Section>

          <Section title="7. Trust Scores">
            Trust scores are calculated algorithmically based on payment behaviour and are provided as informational indicators only. They do not constitute a credit assessment or financial recommendation. AjoFlow makes no guarantees about the accuracy of AI-generated reports or insights.
          </Section>

          <Section title="8. Prohibited Uses">
            You may not use AjoFlow to: (a) engage in fraudulent activity or impersonate others; (b) launder money or conduct illegal financial activity; (c) harass, threaten, or harm other members; (d) reverse engineer or attempt to extract the platform's source code; (e) violate any applicable Nigerian or international law.
          </Section>

          <Section title="9. Data and Privacy">
            Your use of the Platform is also governed by our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>. By using AjoFlow, you consent to the collection and use of your data as described therein.
          </Section>

          <Section title="10. Limitation of Liability">
            To the maximum extent permitted by law, AjoFlow and Axiveri shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to missed contributions, failed transfers, or group disputes.
          </Section>

          <Section title="11. Changes to Terms">
            We may update these Terms at any time. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms. Material changes will be communicated via email or in-app notification.
          </Section>

          <Section title="12. Contact">
            For questions about these Terms, contact us at{" "}
            <a href="mailto:support@ajoflow.com" className="text-primary underline">support@ajoflow.com</a>.
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
      <p>{children}</p>
    </div>
  );
}
