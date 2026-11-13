/** Distinguish signed JWT sessions from integrator API keys in Authorization header. */
export function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0 && p.length < 4096);
}
