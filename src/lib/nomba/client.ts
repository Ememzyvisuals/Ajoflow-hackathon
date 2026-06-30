// ============================================================
// AjoFlow – Nomba API Client
// CONFIRMED CORRECT URLs (from hackathon channel):
//   Sandbox:    https://sandbox.nomba.com/v1
//   Production: https://api.nomba.com/v1
// Checkout sandbox: https://sandbox.nomba.com/v1/checkout/order
// Sub-accounts: Dashboard-only creation (NOT via API)
// Architecture: Parent → ONE pre-created Sub Account → VAs
// ============================================================

import type { NombaTokenCache } from "@/types";

const NOMBA_ENV = process.env.NOMBA_ENV ?? "sandbox";

export const NOMBA_BASE_URL =
  NOMBA_ENV === "production"
    ? "https://api.nomba.com/v1"
    : "https://sandbox.nomba.com/v1";

const CLIENT_ID = process.env.NOMBA_CLIENT_ID!;
const CLIENT_SECRET = process.env.NOMBA_CLIENT_SECRET!;
export const PARENT_ACCOUNT_ID = process.env.NOMBA_PARENT_ACCOUNT_ID!;
export const SUB_ACCOUNT_ID = process.env.NOMBA_SUB_ACCOUNT_ID!;

// In-memory token cache (single server instance)
let tokenCache: NombaTokenCache | null = null;

// ── Get / Refresh Token ──────────────────────────────────────
export async function getNombaToken(): Promise<string> {
  const now = Date.now();

  // Cache for 55 minutes (token valid 60 minutes)
  if (tokenCache && tokenCache.expires_at > now + 5 * 60 * 1000) {
    return tokenCache.access_token;
  }

  const res = await fetch(`${NOMBA_BASE_URL}/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accountId: PARENT_ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nomba auth HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (data.code !== "00") {
    throw new Error(`Nomba auth failed: ${data.description ?? JSON.stringify(data)}`);
  }

  tokenCache = {
    access_token: data.data.access_token,
    expires_at: now + 55 * 60 * 1000,
  };

  return tokenCache.access_token;
}

// ── Base Request ─────────────────────────────────────────────
export interface NombaRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  /** Override accountId header — defaults to PARENT_ACCOUNT_ID */
  accountId?: string;
}

export async function nombaRequest<T = unknown>(
  path: string,
  options: NombaRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, accountId = PARENT_ACCOUNT_ID } = options;
  const token = await getNombaToken();

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      accountId,
    },
    cache: "no-store",
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${NOMBA_BASE_URL}${path}`, init);
  const text = await res.text();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new NombaAPIError(`Non-JSON response: ${text}`, res.status, "PARSE_ERROR");
  }

  if (!res.ok || (data.code && data.code !== "00")) {
    throw new NombaAPIError(
      (data.description as string) ?? `HTTP ${res.status}`,
      res.status,
      (data.code as string) ?? String(res.status)
    );
  }

  return data as T;
}

export class NombaAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "NombaAPIError";
  }
}

export function getNombaEnv() {
  return {
    env: NOMBA_ENV,
    baseUrl: NOMBA_BASE_URL,
    parentAccountId: PARENT_ACCOUNT_ID,
    subAccountId: SUB_ACCOUNT_ID,
  };
}
