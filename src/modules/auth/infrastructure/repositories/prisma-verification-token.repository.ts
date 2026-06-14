import { PrismaClient } from "@generated/prisma"
import { VerificationTokenRepository } from "../../domain/repositories/verification-token.repository"
import { TokenType, VerificationTokenEntity } from "../../domain/entities/verification-token.entity"

export class PrismaVerificationTokenRepository
  implements VerificationTokenRepository
{
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    userId: string
    tokenHash: string
    type: TokenType
    expiresAt: Date
  }): Promise<void> {
    await this.prisma.verificationToken.create({ data })
  }

  async findValidByHash(
    tokenHash: string,
    type: TokenType
  ): Promise<VerificationTokenEntity | null> {
    // valid = ยังไม่ถูก consume และยังไม่หมดอายุ
    return this.prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        type,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
  }

  async consume(id: string): Promise<void> {
    await this.prisma.verificationToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    })
  }

  async invalidateAllForUser(userId: string, type: TokenType): Promise<void> {
    await this.prisma.verificationToken.updateMany({
      where: { userId, type, consumedAt: null },
      data: { consumedAt: new Date() },
    })
  }
}
