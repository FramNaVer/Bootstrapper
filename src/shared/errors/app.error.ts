// =============================================================
// Custom Error Classes
// =============================================================
// ทำไมต้องมี custom errors?
// - throw new Error("message") ธรรมดาไม่มี statusCode
// - error handler middleware จะไม่รู้ว่าต้องตอบกลับ 400 หรือ 500
// - ด้วย custom errors เราแค่ instanceof check ก็รู้ทุกอย่างเลย
// =============================================================

// Base class ที่ error ทุกตัวต้อง extends
// ไม่ใช้โดยตรง — ใช้ subclass ด้านล่างแทน
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

// 400 — ข้อมูลที่ส่งมาไม่ผ่าน validation (เช่น email format ผิด)
export class ValidationError extends AppError {
  constructor(
    public readonly details: { field: string; message: string }[],
    message = "Validation failed"
  ) {
    super(message, 400, "VALIDATION_ERROR")
  }
}

// 401 — ยังไม่ได้ login หรือ token หมดอายุ / ผิด
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED")
  }
}

// 403 — login แล้ว แต่ไม่มีสิทธิ์ทำ action นั้น
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN")
  }
}

// 404 — หา resource ไม่เจอ
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND")
  }
}

// 409 — ข้อมูลซ้ำกับที่มีอยู่แล้ว เช่น email ซ้ำ
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT")
  }
}
