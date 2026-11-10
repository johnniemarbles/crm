import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** A 32-byte key encoded as 64 hex characters, stored only in the web server secret store. */
function key() {
  const hex = process.env.PLATFORM_CREDENTIAL_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("PLATFORM_CREDENTIAL_KEY must be 32 bytes in hex");
  return Buffer.from(hex, "hex");
}

export function encryptPlatformSecret(value: string) {
  if (!value || value.length > 16384) throw new Error("Invalid credential length");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    keyVersion: "v1",
    lastFour: value.slice(-4),
  };
}

/** Server-only capability: never return the decrypted secret to a UI or a tenant of a different scope. */
export function decryptPlatformSecret(record: { iv: string; ciphertext: string; authTag: string; keyVersion: string }) {
  if (record.keyVersion !== "v1") throw new Error("Unsupported secret key version");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(record.iv, "base64"));
  decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
