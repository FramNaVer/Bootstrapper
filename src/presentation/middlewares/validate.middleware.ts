// =============================================================
// Validation Middleware
// =============================================================
// รับ Zod schema แล้วคืน middleware function
// ใช้แบบนี้: router.post('/login', validate(loginSchema), controller.login)
//
// Flow: request body → Zod safeParse → ผ่าน: ส่งต่อ | ไม่ผ่าน: throw ValidationError
// =============================================================

import { Request, Response, NextFunction } from "express"
import { ZodSchema } from "zod"
import { ValidationError } from "../../domain/errors/app.error"

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      // แปลง Zod errors ให้อ่านง่าย: [{ field: "email", message: "Invalid email" }]
      const details = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }))
      return next(new ValidationError(details))
    }

    // ใส่ข้อมูลที่ผ่าน validation กลับเข้า req.body (ตัดข้อมูลแปลกปลอมทิ้งด้วย)
    req.body = result.data
    next()
  }
}
