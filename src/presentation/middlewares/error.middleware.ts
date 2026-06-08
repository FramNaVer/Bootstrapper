// Global Error Handler Middleware

// Express จะส่ง error มาที่นี่เมื่อ:
//   1. มี middleware หรือ route handler เรียก next(error)
//   2. throw error ใน async handler (Express v5 จับให้อัตโนมัติ)
//
// ต้องมี 4 parameters (err, req, res, next)
// Express ใช้จำนวน parameter เพื่อแยกว่านี่คือ error handler

import { Request, Response, NextFunction } from "express"
import { AppError, ValidationError } from "../../domain/errors/app.error"
import { logger } from "../../infrastructure/logging/logger"

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // ValidationError มี details เพิ่มเติม → response format ต่างกันนิดหน่อย
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    })
  }

  // AppError อื่นๆ (UnauthorizedError, ConflictError, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    })
  }

  // Error ที่ไม่รู้จัก → log พร้อม correlationId เพื่อ trace ได้
  // ไม่ส่ง detail ให้ client เพื่อป้องกัน internal info รั่ว
  logger.error(
    { err, correlationId: req.correlationId },
    "Unhandled error"
  )

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    },
  })
}
