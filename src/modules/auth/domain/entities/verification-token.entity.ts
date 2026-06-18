// Entity ของ VerificationToken — ตรงกับ model ใน prisma/schema.prisma
// ใช้ทั้ง email verification และ password reset (แยกด้วย field type)
export type TokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET"

export interface VerificationTokenEntity {
  id: string
  userId: string
  tokenHash: string
  type: TokenType
  expiresAt: Date
  consumedAt: Date | null
  createdAt: Date
}
