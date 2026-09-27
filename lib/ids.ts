import { randomBytes } from "crypto";

export function generateMsaId(): string {
  const year = new Date().getFullYear();
  const sequence = (randomBytes(2).readUInt16BE(0) % 9000) + 1000;
  return `MSA-${year}-${sequence}`;
}

export function generateTempPassword(): string {
  return randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 10);
}
