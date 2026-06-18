// =============================================================
// HTTP Logger Middleware (pino-http)
// =============================================================
// pino-http log ทุก request/response โดยอัตโนมัติ พร้อม:
//   - method, url, statusCode, responseTime
//   - correlationId (จาก middleware ก่อนหน้า)
//
// นอกจากนี้ยัง inject req.log เข้าทุก request
// → ใช้ req.log.info({ userId }) ใน controller เพื่อ log พร้อม context ได้เลย
// =============================================================

import pinoHttp from "pino-http"
import { logger } from "@shared/logging/logger"

export const httpLogger = pinoHttp({
  // ใช้ logger instance เดียวกับทั้งแอป
  logger,

  // ดึง correlationId ที่ถูก set โดย correlation-id middleware มาใช้เป็น request ID
  genReqId: (req) => (req as unknown as { correlationId: string }).correlationId,

  // ไม่ log request body เพราะอาจมี sensitive data เช่น password
  // log เฉพาะ method, url, statusCode, responseTime
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },

  // ปรับ log level ตาม status code
  // 4xx → warn, 5xx → error, อื่นๆ → info
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error"
    if (res.statusCode >= 400) return "warn"
    return "info"
  },

  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,

  customErrorMessage: (req, _res, err) =>
    `${req.method} ${req.url} → ${err.message}`,
})
