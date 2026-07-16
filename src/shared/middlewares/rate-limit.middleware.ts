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
import { RedisStore, RedisReply } from "rate-limit-redis"
import { env } from "@shared/config/env"
import {
  createRedisConnection,
  isRedisEnabled,
} from "@shared/queue/redis.connection"

// dev = เรายิงเองรัวๆ ตอนเทส → แทบไม่จำกัด
// prod = ป้องกันจริง แต่ต้องเผื่อให้พอ: หน้าเดียวของ SPA ยิงได้หลาย request
//        (เปิด card modal = 4 req พร้อมกัน) → 100/15นาที น้อยไป เลยตั้ง 600
const isProd = env.NODE_ENV === "production"

// เก็บตัวนับใน Redis เมื่อมี — ทุก instance เห็นเลขเดียวกัน
// (in-memory แบบเดิม: สเกล 2 instances = เพดานหลวมขึ้นเท่าตัวเงียบๆ
//  และ restart ทีเดียวตัวนับหายหมด) ไม่มี Redis = ตกกลับ in-memory เหมือนเดิม
// client เดียวแชร์ได้ทุก limiter — แยกกันด้วย prefix ของ key
const redis = isRedisEnabled() ? createRedisConnection() : null

function redisStore(prefix: string) {
  if (!redis) return undefined // undefined = ใช้ MemoryStore default
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]) =>
      redis.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
  })
}

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
  store: redisStore("rl:general:"),
})

// เฉพาะ auth routes (login/register/reset) — เข้มกว่าเพราะ sensitive (กัน brute-force)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 100_000,
  message: rateLimitResponse("AUTH_RATE_LIMIT_EXCEEDED"),
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:auth:"),
})

// เฉพาะ /auth/refresh — แยกจาก authRateLimit เพราะธรรมชาติต่างกัน:
// refresh เกิดเป็นประจำ (~ทุก 15 นาทีต่อ user) และหลายคนหลัง NAT เดียวกัน
// (ห้องเรียน/ออฟฟิศ) แชร์ IP กัน → 20/15นาที จะทำให้ผู้ใช้จริงเตะกันเองตกระบบ
// 120/15นาที รองรับ ~หลายสิบคนต่อ IP แต่ยังตัดการยิงรัวได้ (เข้มกว่า general 600)
export const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 120 : 100_000,
  message: rateLimitResponse("AUTH_RATE_LIMIT_EXCEEDED"),
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:refresh:"),
})
