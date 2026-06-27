// =============================================================
// Rate Limit Middlewares
// =============================================================
// Rate limiting = จำกัดจำนวน request ต่อ IP ต่อช่วงเวลา
// ป้องกัน: brute-force attack, DDoS, API abuse
//
// ใช้ 2 ระดับ:
//   generalRateLimit — ทุก route (หละหลวมกว่า)
//   authRateLimit    — เฉพาะ login/register (เข้มงวดกว่า เพราะ sensitive)
// =============================================================

import rateLimit from "express-rate-limit"
import { env } from "@shared/config/env"

// dev = เรายิงเองรัวๆ ตอนเทส → แทบไม่จำกัด
// prod = ป้องกันจริง แต่ต้องเผื่อให้พอ: หน้าเดียวของ SPA ยิงได้หลาย request
//        (เปิด card modal = 4 req พร้อมกัน) → 100/15นาที น้อยไป เลยตั้ง 600
const isProd = env.NODE_ENV === "production"

const rateLimitResponse = (code: string) => ({
  success: false,
  error: {
    code,
    message: "Too many requests. Please try again in 15 minutes.",
  },
})

// ทุก route — เผื่อการใช้งานจริงของ SPA (หลาย request ต่อการกระทำ)
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 600 : 100_000,
  message: rateLimitResponse("RATE_LIMIT_EXCEEDED"),
  standardHeaders: true, // ส่ง RateLimit-Limit, RateLimit-Remaining headers กลับไปด้วย
  legacyHeaders: false,
})

// เฉพาะ auth routes (login/register/reset) — เข้มกว่าเพราะ sensitive (กัน brute-force)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 100_000,
  message: rateLimitResponse("AUTH_RATE_LIMIT_EXCEEDED"),
  standardHeaders: true,
  legacyHeaders: false,
})
