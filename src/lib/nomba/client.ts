// ============================================================
// AjoFlow – Nomba API Client
// CONFIRMED from hackathon channel (July 3 2026):
// - Token valid 30 min → cache 25 min
// - accountId header ALWAYS = parent account id
// - Sub-account id goes in PATH/BODY not header
// - Sandbox: sandbox.nomba.com/v1
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

let tokenCache: NombaTokenCache | null = null;

// Token valid 30 min → cache 25 min to be safe
export async function getNombaToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expires_at > now + 2 * 60 * 1000) {
    return tokenCache.access_token;
  }

  const res = await fetch(`${NOMBA_BASE_URL}/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accountId: PARENT_ACCOUNT_ID, // ALWAYS parent
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

  // Cache for 25 min (token valid 30 min per hackathon channel)
  tokenCache = {
    access_token: data.data.access_token,
    expires_at: now + 25 * 60 * 1000,
  };

  return tokenCache.access_token;
}

export interface NombaRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
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
      accountId, // ALWAYS parent account id
    },
    cache: "no-store",
  };

  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(`${NOMBA_BASE_URL}${path}`, init);
  const text = await res.text();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new NombaAPIError(`Non-JSON: ${text}`, res.status, "PARSE_ERROR");
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
  constructor(message: string, public readonly statusCode: number, public readonly code: string) {
    super(message);
    this.name = "NombaAPIError";
  }
}

export function getNombaEnv() {
  return { env: NOMBA_ENV, baseUrl: NOMBA_BASE_URL, parentAccountId: PARENT_ACCOUNT_ID, subAccountId: SUB_ACCOUNT_ID };
}
