import type { Env } from "@repo/config";

function encryptionKey(env: Env): Uint8Array | null {
  const raw = process.env.SECRETS_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const bytes = new TextEncoder().encode(raw);
  if (bytes.length < 32) return null;
  return bytes.slice(0, 32);
}

export function secretsEncryptionReady(env: Env): boolean {
  return encryptionKey(env) !== null;
}

export async function encryptSecret(plaintext: string, env: Env): Promise<string> {
  const key = encryptionKey(env);
  if (!key) {
    throw new Error("SECRETS_ENCRYPTION_KEY must be at least 32 characters");
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(plaintext),
  );
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return Buffer.from(packed).toString("base64");
}

export async function decryptSecret(ciphertextB64: string, env: Env): Promise<string> {
  const key = encryptionKey(env);
  if (!key) {
    throw new Error("SECRETS_ENCRYPTION_KEY must be at least 32 characters");
  }
  const packed = Buffer.from(ciphertextB64, "base64");
  const iv = packed.subarray(0, 12);
  const data = packed.subarray(12);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data);
  return new TextDecoder().decode(plain);
}
