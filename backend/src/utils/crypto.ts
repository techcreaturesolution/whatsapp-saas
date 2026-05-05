import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

let _cachedKey: Buffer | null = null;
function getEncryptionKey(): Buffer {
  if (!_cachedKey) {
    const secret = env.encryptionKey || env.jwtSecret;
    _cachedKey = crypto.scryptSync(secret, "whatsapp-saas-salt", 32);
  }
  return _cachedKey;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function getDecryptedToken(account: { accessToken: string; accessTokenEncrypted?: boolean }): string {
  if (account.accessTokenEncrypted) {
    return decrypt(account.accessToken);
  }
  return account.accessToken;
}

export function generateInvoiceNumber(tenantId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const shortId = tenantId.slice(-6).toUpperCase();
  const seq = Date.now().toString(36).toUpperCase();
  return `INV-${year}${month}-${shortId}-${seq}`;
}
