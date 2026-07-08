import { PrismaClient } from "@generated/prisma"
import { TokenRepository } from "../../domain/repositories/token.repository"
import { RefreshTokenEntity } from "../../domain/entities/token.entity"
import { hashToken } from "@shared/utils/crypto-token.util"

// Concrete implementation ของ TokenRepository โดยใช้ Prisma
// Domain layer รู้จักแค่ interface TokenRepository
// ถ้าวันหนึ่งอยากเปลี่ยนไปเก็บใน Redis ก็แค่สร้าง RedisTokenRepository ใหม่
// โดยไม่ต้องแตะ use case เลย
//
// ความปลอดภัย: คอลัมน์ token เก็บ "SHA-256 hash" ไม่ใช่ token ดิบ
// → ถ้า DB หลุด ได้แค่ hash ซึ่งย้อนกลับเป็น token ไม่ได้ (สวมรอย session ยาก)
// hash ที่ชั้น repository เพื่อให้ "เป็นไปไม่ได้ที่ผู้เรียกจะลืม hash" —
// ทุก use case ส่ง token ดิบมาตามสัญญาของ interface แล้วชั้นนี้แปลงให้เอง
// ใช้ SHA-256 เฉยๆ ไม่ใช้ bcrypt เพราะ token เป็น random 256-bit เดา/brute-force ไม่ได้อยู่แล้ว
// และ bcrypt มี salt สุ่ม → hash เดิมซ้ำไม่ได้ → lookup ด้วย unique index ไม่ได้
export class PrismaTokenRepository implements TokenRepository {
  constructor(private prisma: PrismaClient) {}

  async save(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { userId, token: hashToken(token), expiresAt },
    })
  }

  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token: hashToken(token) },
    })
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token: hashToken(token) },
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
