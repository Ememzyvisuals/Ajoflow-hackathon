// ============================================================
// AjoFlow – Nigerian Bank Directory
// Real bank logos self-hosted in /public/bank-logos (NIBSS 6-digit codes)
// Source: wovenfinance/cdn (MIT licensed) — see /public/bank-logos/LICENSE.txt
// NIBSS codes are what Nomba's transfer/bank-lookup APIs expect as bankCode
// ============================================================

export interface Bank {
  name: string;
  nibssCode: string;   // 6-digit NIBSS interbank code = Nomba bankCode
  logoUrl: string;     // local path, served from /public
}

function logo(code: string): string {
  return `/bank-logos/${code}.png`;
}

// ── Commercial Banks ──────────────────────────────────────────
export const NIGERIAN_BANKS: Bank[] = [
  { name: "Access Bank", nibssCode: "000014", logoUrl: logo("000014") },
  { name: "Citibank Nigeria", nibssCode: "000009", logoUrl: logo("000009") },
  { name: "Ecobank Nigeria", nibssCode: "100008", logoUrl: logo("100008") },
  { name: "Fidelity Bank", nibssCode: "000007", logoUrl: logo("000007") },
  { name: "First Bank of Nigeria", nibssCode: "000016", logoUrl: logo("000016") },
  { name: "First City Monument Bank", nibssCode: "000003", logoUrl: logo("000003") },
  { name: "Globus Bank", nibssCode: "000027", logoUrl: logo("000027") },
  { name: "Guaranty Trust Bank", nibssCode: "000013", logoUrl: logo("000013") },
  { name: "Heritage Bank", nibssCode: "000020", logoUrl: logo("000020") },
  { name: "Jaiz Bank", nibssCode: "000006", logoUrl: logo("000006") },
  { name: "Keystone Bank", nibssCode: "000002", logoUrl: logo("000002") },
  { name: "Polaris Bank", nibssCode: "000008", logoUrl: logo("000008") },
  { name: "Providus Bank", nibssCode: "000023", logoUrl: logo("000023") },
  { name: "Stanbic IBTC Bank", nibssCode: "000012", logoUrl: logo("000012") },
  { name: "Standard Chartered Bank", nibssCode: "000021", logoUrl: logo("000021") },
  { name: "Sterling Bank", nibssCode: "000001", logoUrl: logo("000001") },
  { name: "SunTrust Bank", nibssCode: "000022", logoUrl: logo("000022") },
  { name: "Taj Bank", nibssCode: "000026", logoUrl: logo("000026") },
  { name: "Union Bank of Nigeria", nibssCode: "000018", logoUrl: logo("000018") },
  { name: "United Bank for Africa", nibssCode: "000004", logoUrl: logo("000004") },
  { name: "Unity Bank", nibssCode: "000011", logoUrl: logo("000011") },
  { name: "Wema Bank", nibssCode: "000017", logoUrl: logo("000017") },
  { name: "Zenith Bank", nibssCode: "000015", logoUrl: logo("000015") },

  // ── Fintechs / Digital Banks ─────────────────────────────────
  { name: "Kuda Microfinance Bank", nibssCode: "090267", logoUrl: logo("090267") },
  { name: "Opay (Paycom)", nibssCode: "100004", logoUrl: logo("100004") },
  { name: "Paga", nibssCode: "100002", logoUrl: logo("100002") },
  { name: "Rubies Microfinance Bank", nibssCode: "090175", logoUrl: logo("090175") },
  { name: "Sparkle Microfinance Bank", nibssCode: "090380", logoUrl: logo("090380") },
  { name: "RenMoney Microfinance Bank", nibssCode: "090198", logoUrl: logo("090198") },
  { name: "VFD Microfinance Bank", nibssCode: "090110", logoUrl: logo("090110") },

  // ── Microfinance Banks ────────────────────────────────────────
  { name: "Lapo Microfinance Bank", nibssCode: "090177", logoUrl: logo("090177") },
  { name: "Accion Microfinance Bank", nibssCode: "090134", logoUrl: logo("090134") },
  { name: "FinaTrust Microfinance Bank", nibssCode: "090111", logoUrl: logo("090111") },
];

// Banks not present in the logo dataset — BankIcon.tsx falls back
// to a branded initials badge for these (verified absent from CDN)
export const BANKS_WITHOUT_CDN_LOGO = ["Moniepoint MFB", "Moniepoint"];

export function getBankByName(name: string): Bank | undefined {
  return NIGERIAN_BANKS.find((b) => b.name === name);
}

export function getBankByCode(code: string): Bank | undefined {
  return NIGERIAN_BANKS.find((b) => b.nibssCode === code);
}
