// ============================================================
// AjoFlow – Resend Email Client
// Deployed at ajoflow.vercel.app — uses Resend's default
// onboarding domain but with AjoFlow branding in sender name
// so emails read "AjoFlow <onboarding@resend.dev>" with AjoFlow
// subject lines and templates (e.g. "AjoFlow Group Invite")
// ============================================================

import { Resend } from "resend";
import { Landmark, Bell, Send } from "lucide-react";

const resend = new Resend(process.env.RESEND_API_KEY);

// On Vercel free deployment without custom domain verified,
// Resend requires the onboarding@resend.dev address — but we
// brand the display name as "AjoFlow" so recipients see "AjoFlow <onboarding@resend.dev>"
const FROM = process.env.RESEND_FROM_EMAIL ?? "AjoFlow <onboarding@resend.dev>";

const EMAIL_WRAPPER_START = (title: string) => `
  <div style="font-family: -apple-system, 'Cabinet Grotesk', sans-serif; max-width: 600px; margin: 0 auto; background: #FAFAF8;">
    <div style="background: #0F6B4B; padding: 28px 32px; border-radius: 16px 16px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.15); border-radius: 8px; display: inline-block; text-align: center; line-height: 32px; color: white; font-weight: 700; font-size: 14px;">A</div>
          </td>
          <td style="padding-left: 10px; vertical-align: middle;">
            <span style="color: white; font-size: 20px; font-weight: 700;">AjoFlow</span>
          </td>
        </tr>
      </table>
    </div>
    <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 16px 16px;">
`;

const EMAIL_WRAPPER_END = `
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0 16px;" />
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">AjoFlow — Modern Cooperative Finance for Africa</p>
      <p style="color: #9CA3AF; font-size: 11px; margin: 4px 0 0;">Payments powered by Nomba</p>
    </div>
  </div>
`;

// ── Contribution Reminder ─────────────────────────────────────
export async function sendContributionReminder(params: {
  to: string; name: string; groupName: string;
  amount: number; dueDate: string; paymentLink?: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `AjoFlow Reminder: ₦${params.amount.toLocaleString()} due for ${params.groupName}`,
    html: `${EMAIL_WRAPPER_START("Reminder")}
      <p style="color: #111827; font-size: 16px; margin: 0 0 12px;">Hi <strong>${params.name}</strong>,</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Your contribution of <strong>₦${params.amount.toLocaleString()}</strong> for <strong>${params.groupName}</strong> is due on <strong>${params.dueDate}</strong>.</p>
      ${params.paymentLink ? `<a href="${params.paymentLink}" style="display: inline-block; background: #0F6B4B; color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-top: 16px; font-size: 14px;">Pay Now</a>` : ""}
      <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">Paying on time keeps your trust score high and the group healthy.</p>
    ${EMAIL_WRAPPER_END}`,
  });
}

// ── Group Invite ────────────────────────────────────────────
export async function sendGroupInvite(params: {
  to: string; groupName: string; inviterName: string;
  inviteLink: string; contributionAmount: number; frequency: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `AjoFlow Group Invite: Join ${params.groupName}`,
    html: `${EMAIL_WRAPPER_START("Invite")}
      <p style="color: #111827; font-size: 18px; font-weight: 700; margin: 0 0 12px;">You've been invited 🎉</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;"><strong>${params.inviterName}</strong> has invited you to join <strong>${params.groupName}</strong> on AjoFlow.</p>
      <div style="background: #F0FDF4; border: 1px solid #D9F2E6; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #111827; font-size: 14px;"><strong>Contribution:</strong> ₦${params.contributionAmount.toLocaleString()} / ${params.frequency}</p>
      </div>
      <a href="${params.inviteLink}" style="display: inline-block; background: #0F6B4B; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-top: 8px; font-size: 15px;">Accept Invitation</a>
      <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">This invitation expires in 7 days.</p>
    ${EMAIL_WRAPPER_END}`,
  });
}

// ── Payout Notification ───────────────────────────────────────
export async function sendPayoutNotification(params: {
  to: string; name: string; groupName: string;
  amount: number; bankName: string; accountNumber: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `AjoFlow Payout Sent: ₦${params.amount.toLocaleString()} from ${params.groupName}`,
    html: `${EMAIL_WRAPPER_START("Payout")}
      <p style="color: #16A34A; font-size: 28px; font-weight: 700; margin: 0 0 8px;">₦${params.amount.toLocaleString()}</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Hi <strong>${params.name}</strong>, your payout from <strong>${params.groupName}</strong> has been sent to:</p>
      <p style="color: #111827; font-size: 14px;"><strong>${params.bankName}</strong> · ${params.accountNumber}</p>
      <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">Allow 1-2 business days for settlement. Contact your group admin if not received after 48 hours.</p>
    ${EMAIL_WRAPPER_END}`,
  });
}

// ── Welcome Email ────────────────────────────────────────────
export async function sendWelcomeEmail(params: { to: string; name: string }) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Welcome to AjoFlow, ${params.name.split(" ")[0]}!`,
    html: `${EMAIL_WRAPPER_START("Welcome")}
      <p style="color: #111827; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Welcome to AjoFlow 🎉</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Hi <strong>${params.name}</strong>, your account is ready. Create or join a cooperative savings group to get started.</p>
    ${EMAIL_WRAPPER_END}`,
  });
}

// ── Missed Contribution Alert ──────────────────────────────────
export async function sendMissedContributionAlert(params: {
  to: string; name: string; groupName: string; amount: number;
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `AjoFlow Alert: Missed contribution for ${params.groupName}`,
    html: `${EMAIL_WRAPPER_START("Alert")}
      <p style="color: #DC2626; font-size: 16px; font-weight: 700; margin: 0 0 12px;">Missed Contribution</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Hi <strong>${params.name}</strong>, you missed your ₦${params.amount.toLocaleString()} contribution for <strong>${params.groupName}</strong>. This may affect your trust score.</p>
    ${EMAIL_WRAPPER_END}`,
  });
}

// ── Loan Decision ───────────────────────────────────────────
export async function sendLoanDecisionEmail(params: {
  to: string; name: string; groupName: string; amount: number; approved: boolean;
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `AjoFlow Loan ${params.approved ? "Approved" : "Update"}: ${params.groupName}`,
    html: `${EMAIL_WRAPPER_START("Loan")}
      <p style="color: ${params.approved ? "#16A34A" : "#DC2626"}; font-size: 18px; font-weight: 700; margin: 0 0 12px;">
        Loan ${params.approved ? "Approved ✓" : "Not Approved"}
      </p>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Hi <strong>${params.name}</strong>, your loan request of ₦${params.amount.toLocaleString()} for <strong>${params.groupName}</strong> ${params.approved ? "has been approved." : "was not approved this time."}</p>
    ${EMAIL_WRAPPER_END}`,
  });
}
