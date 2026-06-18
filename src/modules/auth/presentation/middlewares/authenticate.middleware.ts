import { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "../../application/utils/jwt.util"
import { UnauthorizedError } from "@shared/errors/app.error"

// Middleware ตรวจ access token จาก header "Authorization: Bearer <token>"
// ถ้าผ่าน → ใส่ req.userId แล้วไปต่อ
// ถ้าไม่ผ่าน → โยน 401 (errorHandler จัดการ response)
//
// module อื่น (organization ฯลฯ) import ตัวนี้ไปป้องกัน route ที่ต้อง login
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid Authorization header"))
  }

  const token = header.slice("Bearer ".length)

  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.userId
    next()
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"))
  }
}
