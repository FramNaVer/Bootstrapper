// =============================================================
// Validation Middleware
// =============================================================
// รับ Zod schema แล้วคืน middleware function
// ใช้แบบนี้: router.post('/login', validate(loginSchema), controller.login)
//
// Flow: request body → Zod safeParse → ผ่าน: ส่งต่อ | ไม่ผ่าน: throw ValidationError
// =============================================================

import { Request, Response, NextFunction } from "express"
import { ZodTypeAny } from "zod"
import { ValidationError } from "@shared/errors/app.error"

export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      // แปลง Zod issues ให้อ่านง่าย: [{ field: "email", message: "Invalid email" }]
      // Zod v4 ใช้ .issues แทน .errors
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }))
      return next(new ValidationError(details))
    }

    // ใส่ข้อมูลที่ผ่าน validation กลับเข้า req.body (ตัดข้อมูลแปลกปลอมทิ้งด้วย)
    req.body = result.data
    next()
  }
}

// เวอร์ชันสำหรับ query string (?dueFrom=...&dueTo=...)
//
// ต่างจาก body สองจุด:
// 1. query ทุกตัวเป็น string เสมอ → schema ต้องใช้ z.coerce.* แปลงชนิดเอง
// 2. Express 5 ทำ req.query เป็น getter (เขียนทับแบบ req.body ไม่ได้)
//    → เก็บผลที่ validate แล้วไว้ที่ res.locals.query ให้ controller หยิบใช้แทน
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }))
      return next(new ValidationError(details))
    }

    res.locals.query = result.data
    next()
  }
}
