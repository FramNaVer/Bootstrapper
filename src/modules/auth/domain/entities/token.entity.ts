// Entity ของ RefreshToken ที่ใช้ใน domain layer
// ตรงกับ model RefreshToken ใน prisma/schema.prisma
export interface RefreshTokenEntity {
  id: string
  userId: string
  token: string
  expiresAt: Date
  isRevoked: boolean
  createdAt: Date
}
