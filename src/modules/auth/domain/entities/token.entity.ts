// Entity ของ RefreshToken ที่ใช้ใน domain layer
// ตรงกับ model RefreshToken ใน prisma/schema.prisma
export interface RefreshTokenEntity {
  id: string
  userId: string
  // ค่าที่เก็บจริงคือ SHA-256 hash ของ token (ดู PrismaTokenRepository)
  token: string
  expiresAt: Date
  isRevoked: boolean
  createdAt: Date
}
