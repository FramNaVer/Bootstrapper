// =============================================================
// Verification Token Utilities
// =============================================================
// ใช้สร้าง token แบบใช้ครั้งเดียว สำหรับ email verification / password reset
//
// หลักการความปลอดภัย:
//   - ส่ง "raw token" (สุ่มยาว) ไปทาง email ให้ user
//   - เก็บแค่ "hash" ของ token ลง DB
//   - ตอน verify เอา raw มา hash แล้วเทียบ
//   → ถ้า DB หลุด ผู้โจมตีเห็นแค่ hash เอาไปใช้ไม่ได้ (เหมือนเก็บ password)
// =============================================================

import { randomBytes, createHash } from "crypto"

const TOKEN_BYTES = 32
const EMAIL_VERIFICATION_TTL_HOURS = 24
const PASSWORD_RESET_TTL_HOURS = 1

// สร้าง raw token สุ่ม (ตัวที่ส่งไปใน email — ไม่เก็บลง DB)
export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex")
}

// hash token ด้วย SHA-256 (ตัวที่เก็บลง DB)
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}

export function getEmailVerificationExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + EMAIL_VERIFICATION_TTL_HOURS)
  return expiry
}

export function getPasswordResetExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + PASSWORD_RESET_TTL_HOURS)
  return expiry
}
