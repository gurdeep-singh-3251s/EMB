/** Client IP for rate limiting (trust first X-Forwarded-For hop behind reverse proxy). */
export function resolveClientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  return "unknown";
}

export function hashRateLimitKey(part: string): string {
  let h = 2166136261;
  for (let i = 0; i < part.length; i++) {
    h ^= part.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
