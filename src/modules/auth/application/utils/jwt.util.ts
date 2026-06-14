// =============================================================
// JWT Utilities
// =============================================================
// Access Token  — อายุสั้น (15 นาที) ใช้ยืนยัน identity ตอนเรียก API
// Refresh Token — อายุยาว (7 วัน) ใช้ขอ access token ใหม่เมื่อหมดอายุ
//
// ทำไมต้องแยก 2 token?
// ถ้าใช้ token เดียวอายุยาว และถูกขโมย → โจรใช้ได้นาน
// ถ้าแยก access token อายุสั้น → โจรใช้ได้แค่ 15 นาที
// =============================================================

import jwt from "jsonwebtoken"
import { randomUUID } from "crypto"
import { env } from "@shared/config/env"

const ACCESS_TOKEN_EXPIRES = "15m"
const REFRESH_TOKEN_EXPIRES = "7d"
const REFRESH_TOKEN_DAYS = 7

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  })
}

export function generateRefreshToken(userId: string): string {
  // ใส่ jti (token id สุ่ม) เพื่อให้ refresh token ไม่ซ้ำกัน
  // กันกรณี rotation ออก token ใหม่ในวินาทีเดียวกัน → string ซ้ำ → ชน unique constraint
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
    jwtid: randomUUID(),
  })
}

export function verifyAccessToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string }
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string }
}

// คำนวณวันหมดอายุของ refresh token เพื่อบันทึกลง DB
export function getRefreshTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_DAYS)
  return expiry
}
