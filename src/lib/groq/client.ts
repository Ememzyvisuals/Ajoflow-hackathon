// ============================================================
// AjoFlow – Groq AI Multi-Endpoint Failover Router
// Architecture: Primary → Secondary → Tertiary
// Auto-failover on: rate limit / timeout / model unavailable
// Models: llama-3.3-70b-versatile (free tier, English + Pidgin)
// ============================================================

import Groq from "groq-sdk";

// Round-robin key pool for failover
const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
].filter(Boolean) as string[];

// Primary model — best for financial reasoning + Nigerian Pidgin
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
// Fallback model — faster, lower rate limits
const FALLBACK_MODEL = "llama-3.1-8b-instant";

let keyIndex = 0;

function getNextKey(): string {
  if (GROQ_KEYS.length === 0) throw new Error("No Groq API keys configured");
  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
  keyIndex++;
  return key;
}

// ── Multi-Key Failover Request ────────────────────────────────
async function groqRequest(
  messages: Groq.Chat.ChatCompletionMessageParam[],
  maxTokens = 400,
  model = PRIMARY_MODEL
): Promise<string> {
  const keysToTry = [...GROQ_KEYS];
  let lastError: Error | null = null;

  // Try each key in order (failover)
  for (let attempt = 0; attempt < keysToTry.length; attempt++) {
    const key = keysToTry[(keyIndex + attempt) % keysToTry.length];
    try {
      const client = new Groq({ apiKey: key });
      const completion = await client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
      });
      keyIndex = (keyIndex + attempt + 1) % keysToTry.length;
      return completion.choices[0]?.message?.content ?? "";
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errMsg = lastError.message.toLowerCase();
      // Rate limit or overload → try next key
      if (errMsg.includes("rate") || errMsg.includes("429") || errMsg.includes("overload")) {
        continue;
      }
      // Model unavailable → try fallback model with same key
      if (errMsg.includes("model") && model === PRIMARY_MODEL) {
        try {
          const client = new Groq({ apiKey: key });
          const completion = await client.chat.completions.create({
            model: FALLBACK_MODEL,
            messages,
            max_tokens: maxTokens,
            temperature: 0.4,
          });
          return completion.choices[0]?.message?.content ?? "";
        } catch {
          continue;
        }
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("All Groq endpoints failed");
}

// ── System Prompts ────────────────────────────────────────────
const SYSTEM_EN = `You are AjoFlow's AI financial assistant — an expert in Nigerian 
cooperative savings (Ajo, Esusu, Thrift). You provide clear, honest financial insights 
for savings groups. Be concise, data-driven, and actionable. Never make up numbers.`;

const SYSTEM_PIDGIN = `You be AjoFlow AI assistant wey sabi cooperative savings for Nigeria. 
You understand Ajo, Esusu and thrift contribution well well. Answer people question for 
Nigerian Pidgin English — short, clear and honest. No yarn too long.`;

// ── Trust Report ──────────────────────────────────────────────
export async function generateTrustReport(params: {
  groupName: string;
  members: Array<{
    name: string;
    score: number;
    onTimeCount: number;
    lateCount: number;
    missedCount: number;
    streak: number;
  }>;
  paidCount: number;
  totalCount: number;
  language: "en" | "pidgin";
}): Promise<string> {
  const paidPct = Math.round((params.paidCount / Math.max(params.totalCount, 1)) * 100);
  const topMember = params.members.sort((a, b) => b.score - a.score)[0];
  const atRisk = params.members.filter(m => m.score < 60);

  const prompt = `Generate a concise trust report for "${params.groupName}".

Stats: ${params.paidCount}/${params.totalCount} paid (${paidPct}%)
Members:
${params.members.map(m => `• ${m.name}: ${m.score}/100, ${m.onTimeCount} on-time, ${m.lateCount} late, ${m.streak} streak`).join("\n")}

Write 2-3 short paragraphs: group health, standout members, and one recommendation.`;

  return groqRequest(
    [
      { role: "system", content: params.language === "pidgin" ? SYSTEM_PIDGIN : SYSTEM_EN },
      { role: "user", content: prompt },
    ],
    350
  );
}

// ── Answer Financial Question ─────────────────────────────────
export async function answerFinancialQuestion(params: {
  question: string;
  context: {
    groupName: string;
    userRole: string;
    walletBalance: number;
    nextPayoutDate?: string;
    nextPayoutRecipient?: string;
    unpaidMembers: string[];
    userTrustScore: number;
  };
  language: "en" | "pidgin";
}): Promise<string> {
  const ctx = params.context;
  const contextStr = [
    `Group: ${ctx.groupName} | Role: ${ctx.userRole}`,
    `Treasury: ₦${ctx.walletBalance.toLocaleString()}`,
    ctx.nextPayoutDate ? `Next payout: ${ctx.nextPayoutDate} → ${ctx.nextPayoutRecipient}` : "",
    ctx.unpaidMembers.length > 0 ? `Unpaid: ${ctx.unpaidMembers.join(", ")}` : "All members paid",
    `Your trust score: ${ctx.userTrustScore}/100`,
  ].filter(Boolean).join(" | ");

  return groqRequest(
    [
      { role: "system", content: params.language === "pidgin" ? SYSTEM_PIDGIN : SYSTEM_EN },
      {
        role: "user",
        content: `Context: ${contextStr}\n\nQuestion: ${params.question}\n\nAnswer in 1-3 sentences.`,
      },
    ],
    200
  );
}

// ── Group Health Analysis ─────────────────────────────────────
export async function analyzeGroupHealth(params: {
  groupName: string;
  participationRate: number;
  paymentCompletionRate: number;
  avgTrustScore: number;
  atRiskCount: number;
  totalMembers: number;
  walletBalance: number;
}): Promise<{ score: number; risk: "Low" | "Medium" | "High"; summary: string }> {
  const score = Math.min(100, Math.round(
    params.participationRate * 0.3 +
    params.paymentCompletionRate * 0.4 +
    Math.min(params.avgTrustScore, 100) * 0.3
  ));

  const risk: "Low" | "Medium" | "High" =
    score >= 80 ? "Low" : score >= 55 ? "Medium" : "High";

  const summary = await groqRequest(
    [
      { role: "system", content: SYSTEM_EN },
      {
        role: "user",
        content: `One sentence health summary for "${params.groupName}": ${score}/100 health, ${risk} risk, ${params.paymentCompletionRate}% payments complete, ${params.atRiskCount}/${params.totalMembers} members at risk, treasury ₦${params.walletBalance.toLocaleString()}.`,
      },
    ],
    80
  );

  return { score, risk, summary };
}

// ── Contribution Reminder Message ─────────────────────────────
export async function generateReminder(params: {
  memberName: string;
  groupName: string;
  amountDue: number;
  dueDate: string;
  language: "en" | "pidgin";
}): Promise<string> {
  return groqRequest(
    [
      { role: "system", content: params.language === "pidgin" ? SYSTEM_PIDGIN : SYSTEM_EN },
      {
        role: "user",
        content: `Write a friendly 1-sentence contribution reminder for ${params.memberName}: ₦${params.amountDue.toLocaleString()} due for ${params.groupName} by ${params.dueDate}.`,
      },
    ],
    60
  );
}
