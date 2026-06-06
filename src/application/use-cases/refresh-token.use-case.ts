import { TokenRepository } from "../../domain/repositories/token.repository"
import { UnauthorizedError } from "../../domain/errors/app.error"
import { generateAccessToken, verifyRefreshToken } from "../utils/jwt.util"

export class RefreshTokenUseCase {
  constructor(private tokenRepo: TokenRepository) {}

  async execute(refreshToken: string) {
    // ขั้นตอนที่ 1: ตรวจสอบว่า JWT signature ถูกต้องและยังไม่หมดอายุ
    let payload: { userId: string }
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token")
    }

    // ขั้นตอนที่ 2: ตรวจสอบใน DB ว่า token ยังไม่ถูก revoke
    // (JWT valid แต่ถ้า user logout ไปแล้ว token จะถูก revoke ใน DB)
    const tokenRecord = await this.tokenRepo.findByToken(refreshToken)
    if (!tokenRecord || tokenRecord.isRevoked) {
      throw new UnauthorizedError("Refresh token has been revoked")
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token has expired")
    }

    // ออก access token ใหม่
    const accessToken = generateAccessToken(payload.userId)
    return { accessToken }
  }
}
