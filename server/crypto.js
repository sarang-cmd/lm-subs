/**
 * Server-side Cryptography for LM Subs Neon Sync (`server/crypto.js`).
 *
 * - `encryptApiKeyForUser` / `decryptApiKeyForUser`: Per-user HKDF-SHA256 + AES-256-GCM
 *   authenticated encryption so raw BYOK provider API keys never sit in plaintext
 *   Postgres columns or database backups.
 * - `hashPassword` / `verifyPassword`: Salted `crypto.scrypt` with `timingSafeEqual`.
 * - `sha256Hex`: Deterministic session token hashing so raw bearer tokens are never stored.
 */

import crypto from "node:crypto";

const DEFAULT_DEV_SECRET =
  "lmsubs-local-dev-only-secret-override-with-LM_SUBS_ENCRYPTION_SECRET";

function resolveMasterSecret(overrideSecret = "") {
  const fromEnv =
    overrideSecret ||
    process.env.LM_SUBS_ENCRYPTION_SECRET ||
    process.env.NEON_AUTH_COOKIE_SECRET ||
    process.env.DATABASE_URL ||
    DEFAULT_DEV_SECRET;
  return String(fromEnv);
}

function deriveUserAesKey(userId, overrideSecret = "") {
  const master = resolveMasterSecret(overrideSecret);
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(master, "utf8"),
      Buffer.from(`lmsubs-user:${userId}`, "utf8"),
      Buffer.from("lmsubs-aes-256-gcm-v1", "utf8"),
      32
    )
  );
}

export function buildKeyHint(rawKey) {
  const trimmed = String(rawKey || "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••${suffix}`;
}

export function encryptApiKeyForUser(userId, plainKey, overrideSecret = "") {
  const key = deriveUserAesKey(userId, overrideSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(String(userId), "utf8"));

  const encrypted = Buffer.concat([
    cipher.update(String(plainKey), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextB64: encrypted.toString("base64"),
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
    keyHint: buildKeyHint(plainKey),
  };
}

export function decryptApiKeyForUser(
  userId,
  { ciphertextB64, ivB64, tagB64 },
  overrideSecret = ""
) {
  const key = deriveUserAesKey(userId, overrideSecret);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(String(userId), "utf8"));
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, (err, buf) =>
      err ? reject(err) : resolve(buf)
    );
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.startsWith("scrypt$")) {
    return false;
  }
  const [, salt, hex] = storedHash.split("$");
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = await new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, expected.length, (err, buf) =>
      err ? reject(err) : resolve(buf)
    );
  });
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function generateSessionToken() {
  return `lms_${crypto.randomBytes(32).toString("base64url")}`;
}
