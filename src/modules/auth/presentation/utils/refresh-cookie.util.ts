import { Response } from "express"
import { env } from "@shared/config/env"

// =============================================================
// Refresh token ใน httpOnly cookie — หัวใจของการย้ายออกจาก localStorage
//
// - httpOnly  : JavaScript ฝั่งเว็บอ่านไม่ได้เลย → XSS ขโมย refresh token ไม่ได้
// - secure    : ส่งเฉพาะ https (ปิดใน dev เพราะ localhost เป็น http)
// - sameSite lax: เบราว์เซอร์ "ไม่แนบ" cookie ให้ POST ที่มาจากเว็บไซต์อื่น
//     → กัน CSRF ชั้นแรกโดยไม่ต้องมี csrf token
//     board.tanadon-i.com ↔ api.tanadon-i.com เป็น "same-site" กัน
//     (registrable domain เดียวกัน: tanadon-i.com) XHR ปกติของเราจึงแนบ cookie ครบ
// - path      : cookie วิ่งเฉพาะ /api/v1/auth — request อื่นทั้งแอปไม่พก
//     refresh token ติดไปด้วย (ลด surface ถ้ามีช่องโหว่ log/replay ที่ route อื่น)
//
// นี่เป็นเรื่องของ HTTP ล้วนๆ → อยู่ชั้น presentation, use case ไม่รู้จัก cookie
// =============================================================

export const REFRESH_COOKIE = "refresh_token"

// ให้ตรงกับ REFRESH_TOKEN_EXPIRES = "7d" ใน jwt.util.ts
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000

const COOKIE_PATH = "/api/v1/auth"

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: REFRESH_TTL_MS,
  })
}

export function clearRefreshCookie(res: Response): void {
  // ต้องระบุ path เดิม — เบราว์เซอร์มอง cookie คนละ path เป็นคนละใบ
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH })
}
