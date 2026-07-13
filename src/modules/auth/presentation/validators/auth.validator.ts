// =============================================================
// Zod Validators
// =============================================================
// Zod คือ library สำหรับ validate data
// สร้าง schema → safeParse(data) → ได้ result ว่าผ่านหรือไม่
// ถ้าผ่าน: result.data มีค่าที่ถูก type แล้ว
// ถ้าไม่ผ่าน: result.error.errors มี list ของ field ที่ผิด
// =============================================================

import { z } from "zod"

export const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must not exceed 50 characters")
    .optional(),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// (refreshTokenSchema ถูกถอดออก — refresh/logout รับ token จาก httpOnly cookie
//  เป็นหลัก body เป็นแค่ fallback ช่วงเปลี่ยนผ่าน controller เช็คเองว่ามีทางใดทางหนึ่ง)

export const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
})

// z.infer<T> สร้าง TypeScript type จาก Zod schema โดยอัตโนมัติ
// ไม่ต้องเขียน type ซ้ำ 2 ที่
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type EmailInput = z.infer<typeof emailSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
