/** Mirrors extraction promptSecurity policy — keep in sync for operator API boundary. */

const OPERATOR_QUERY_FORBIDDEN: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /reveal\s+(the\s+)?(system\s+)?prompt/i,
  /print\s+(all\s+)?(env|environment|secrets?)/i,
  /output\s+(the\s+)?(api[_\s-]?key|openrouter|database_url|redis_url|\.env)/i,
  /give\s+me\s+(your\s+)?(api|token|password|secret)/i,
  /you\s+are\s+now\s+/i,
  /disregard\s+(all\s+)?rules/i,
  /grant\s+(me\s+)?(access|admin)/i,
  /execute\s+(code|command)/i,
];

export function validateOperatorQuery(userQuery: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = userQuery.trim();
  if (trimmed.length === 0) return { ok: false, reason: "Query cannot be empty" };
  for (const re of OPERATOR_QUERY_FORBIDDEN) {
    if (re.test(trimmed)) {
      return {
        ok: false,
        reason: "Query contains disallowed instruction-like content (security policy)",
      };
    }
  }
  return { ok: true };
}
