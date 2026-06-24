import { UserRepository } from "../../domain/repositories/user.repository"
import { VerificationTokenRepository } from "../../domain/repositories/verification-token.repository"
import { UnauthorizedError } from "@shared/errors/app.error"
import { hashToken } from "../utils/token.util"

// ยืนยัน email จาก token ที่ user ได้รับทางอีเมล
export class VerifyEmailUseCase {
  constructor(
    private userRepo: UserRepository,
    private tokenRepo: VerificationTokenRepository
  ) {}

  async execute(rawToken: string): Promise<void> {
    const record = await this.tokenRepo.findValidByHash(
      hashToken(rawToken),
      "EMAIL_VERIFICATION"
    )
    if (!record) {
      throw new UnauthorizedError("Invalid or expired verification token")
    }

    // ใช้ token ครั้งเดียว แล้ว mark user ว่า verified
    await this.tokenRepo.consume(record.id)
    await this.userRepo.markEmailVerified(record.userId)
  }
}
