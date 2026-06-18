import { PrismaClient } from "@generated/prisma"
import { TokenRepository } from "../../domain/repositories/token.repository"
import { RefreshTokenEntity } from "../../domain/entities/token.entity"

// Concrete implementation ของ TokenRepository โดยใช้ Prisma
// Domain layer รู้จักแค่ interface TokenRepository
// ถ้าวันหนึ่งอยากเปลี่ยนไปเก็บใน Redis ก็แค่สร้าง RedisTokenRepository ใหม่
// โดยไม่ต้องแตะ use case เลย
export class PrismaTokenRepository implements TokenRepository {
  constructor(private prisma: PrismaClient) {}

  async save(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    })
  }

  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    return this.prisma.refreshToken.findUnique({ where: { token } })
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    })
  }
}
