// =============================================================
// Sentry (Error Tracking) — wrapper แบบ "ไม่มี DSN ก็ไม่พัง"
// =============================================================
// ทำไมต้อง wrap ไม่เรียก Sentry ตรงๆ?
// - dev/test ไม่ได้ตั้ง SENTRY_DSN → ทุกที่ที่เรียกต้องไม่ error
// - รวม logic "เปิด/ปิด" ไว้ที่เดียว ที่อื่นเรียก captureException ได้เลยโดยไม่ต้องเช็ค
//
// หมายเหตุ: เราเลือก "capture เอง" ที่ error middleware (manual)
// ไม่เปิด auto request/tracing instrumentation → เบาและคุมได้ว่าจะส่งอะไรเข้า Sentry
// =============================================================

import * as Sentry from "@sentry/node"
import { env } from "@shared/config/env"
import { logger } from "@shared/logging/logger"

let enabled = false

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    logger.info("Sentry disabled (no SENTRY_DSN set)")
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // ปิด performance tracing ไว้ก่อน (โฟกัสที่ error tracking) — เปิดทีหลังได้
    tracesSampleRate: 0,
  })

  enabled = true
  logger.info("Sentry initialized")
}

// ส่ง exception ขึ้น Sentry พร้อม context เสริม (เช่น correlationId)
// ถ้า Sentry ปิดอยู่ → no-op เงียบๆ
export function captureException(
  err: unknown,
  context?: Record<string, unknown>
): void {
  if (!enabled) return
  Sentry.captureException(err, context ? { extra: context } : undefined)
}
