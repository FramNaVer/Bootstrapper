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

const rateLimitResponse = (code: string) => ({
  success: false,
  error: {
    code,
    message: "Too many requests. Please try again in 15 minutes.",
  },
})

// 100 requests ต่อ 15 นาที ต่อ IP — สำหรับทุก route
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: rateLimitResponse("RATE_LIMIT_EXCEEDED"),
  standardHeaders: true, // ส่ง RateLimit-Limit, RateLimit-Remaining headers กลับไปด้วย
  legacyHeaders: false,
})

// 10 requests ต่อ 15 นาที ต่อ IP — เฉพาะ auth routes
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: rateLimitResponse("AUTH_RATE_LIMIT_EXCEEDED"),
  standardHeaders: true,
  legacyHeaders: false,
})
