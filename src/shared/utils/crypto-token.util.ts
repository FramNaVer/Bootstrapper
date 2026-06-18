// =============================================================
// Generic single-use token helpers (ใช้ร่วมได้ทุก module)
// =============================================================
// ส่ง raw token ให้ผู้ใช้ทาง email, เก็บแค่ hash ลง DB
// (แนวคิดเดียวกับ verification token เฟส 1)
// =============================================================

import { randomBytes, createHash } from "crypto"

const TOKEN_BYTES = 32

export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex")
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}
