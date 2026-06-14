import { TokenRepository } from "../../domain/repositories/token.repository"
import { UnauthorizedError } from "../../domain/errors/app.error"
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from "../utils/jwt.util"

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

    // ขั้นตอนที่ 2: ต้องมี record ใน DB จริง
    const tokenRecord = await this.tokenRepo.findByToken(refreshToken)
    if (!tokenRecord) {
      throw new UnauthorizedError("Invalid or expired refresh token")
    }

    // ขั้นตอนที่ 3: Reuse detection
    // ถ้า token นี้ถูก revoke ไปแล้วแต่ยังถูกนำมาใช้ → เป็นสัญญาณว่าถูกขโมย
    // (เพราะ rotation จะ revoke token เก่าทันทีที่ออกตัวใหม่)
    // → revoke ทุก token ของ user คนนี้ บังคับให้ login ใหม่ทุกอุปกรณ์
    if (tokenRecord.isRevoked) {
      await this.tokenRepo.revokeAllForUser(tokenRecord.userId)
      throw new UnauthorizedError("Refresh token has been revoked")
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token has expired")
    }

    // ขั้นตอนที่ 4: Rotation — ฆ่า token เก่า แล้วออกคู่ token ใหม่
    await this.tokenRepo.revoke(refreshToken)

    const accessToken = generateAccessToken(payload.userId)
    const newRefreshToken = generateRefreshToken(payload.userId)
    await this.tokenRepo.save(
      payload.userId,
      newRefreshToken,
      getRefreshTokenExpiry()
    )

    // client ต้องเก็บ refreshToken ตัวใหม่นี้ทับของเก่า
    return { accessToken, refreshToken: newRefreshToken }
  }
}
