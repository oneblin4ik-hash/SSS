import crypto from "crypto";

function key(): Buffer {
  const hex = process.env.SESSION_ENCRYPTION_KEY;
  if (!hex) throw new Error("SESSION_ENCRYPTION_KEY не задан");
  return Buffer.from(hex, "hex");
}

/** AES-256-GCM encrypt: base64(iv[12] + ciphertext + tag[16]). */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

export async function decrypt(encoded: string): Promise<string> {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(12, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
