import { TokenRepository } from "../../domain/repositories/token.repository"
import { verifyRefreshToken } from "../utils/jwt.util"

export class LogoutUseCase {
  constructor(private tokenRepo: TokenRepository) {}

  async execute(refreshToken: string) {
    // ถ้า token ไม่ valid หรือหมดอายุ → ถือว่า logout สำเร็จอยู่แล้ว ไม่ต้อง throw error
    try {
      verifyRefreshToken(refreshToken)
      await this.tokenRepo.revoke(refreshToken)
    } catch {
      // token expired หรือ invalid → user ออกจากระบบอยู่แล้ว
    }
  }
}
