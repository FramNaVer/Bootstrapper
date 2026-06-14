import bcrypt from "bcrypt"
import { UserRepository } from "../../domain/repositories/user.repository"
import { VerificationTokenRepository } from "../../domain/repositories/verification-token.repository"
import { TokenRepository } from "../../domain/repositories/token.repository"
import { UnauthorizedError } from "../../domain/errors/app.error"
import { hashToken } from "../utils/token.util"

const BCRYPT_ROUNDS = 12

// รีเซ็ตรหัสผ่านจาก token + ปิดทุก session เก่า
export class ResetPasswordUseCase {
  constructor(
    private userRepo: UserRepository,
    private verificationTokenRepo: VerificationTokenRepository,
    private tokenRepo: TokenRepository
  ) {}

  async execute(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.verificationTokenRepo.findValidByHash(
      hashToken(rawToken),
      "PASSWORD_RESET"
    )
    if (!record) {
      throw new UnauthorizedError("Invalid or expired reset token")
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await this.userRepo.updatePassword(record.userId, passwordHash)
    await this.verificationTokenRepo.consume(record.id)

    // ปิดทุก refresh token เก่า — บังคับ login ใหม่ด้วยรหัสใหม่ทุกอุปกรณ์
    // (กันกรณีรหัสหลุดแล้วโจรยังถือ session ค้างอยู่)
    await this.tokenRepo.revokeAllForUser(record.userId)
  }
}
