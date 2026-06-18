// =============================================================
// Correlation ID Middleware
// =============================================================
// Correlation ID คือ unique ID ที่ผูกกับ 1 request ตลอด lifecycle
//
// ประโยชน์:
// - กด filter logs ด้วย ID เดียวกัน → เห็นทุก log ของ request นั้น
// - ถ้ามีหลาย service (microservices) ส่ง ID นี้ต่อ → trace ข้าม service ได้
//
// Flow:
//   client ส่ง X-Correlation-ID header มา → ใช้ต่อ (เพื่อ trace จาก frontend)
//   ไม่มี → generate UUID ใหม่
// =============================================================

import { Request, Response, NextFunction } from "express"
import { randomUUID } from "crypto" // built-in Node.js ไม่ต้องติดตั้งเพิ่ม

// บอก TypeScript ว่า req.correlationId มีอยู่จริง
// ถ้าไม่ declare TypeScript จะ error ว่า property ไม่มีใน Request type
declare global {
  namespace Express {
    interface Request {
      correlationId: string
    }
  }
}

export function correlationId(req: Request, res: Response, next: NextFunction) {
  const id =
    (req.headers["x-correlation-id"] as string | undefined) || randomUUID()

  req.correlationId = id

  // ส่ง ID กลับใน response header ด้วย
  // → client/developer เอาไปใช้ debug หรือ trace ได้
  res.setHeader("x-correlation-id", id)

  next()
}
