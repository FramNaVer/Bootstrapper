import { UserRepository } from "../../domain/repositories/user.repository"
import { UnauthorizedError } from "@shared/errors/app.error"

// คืนข้อมูล user ปัจจุบันจาก userId ที่ได้จาก access token
// ใช้โดย frontend เพื่อ "rehydrate" สถานะ login ตอนรีเฟรชหน้า / หลัง OAuth callback
export class GetMeUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepo.findById(userId)
    // token ยัง valid แต่ user ถูกลบ/ปิดใช้งาน → ถือว่าไม่มีสิทธิ์
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User not found or inactive")
    }
    return user
  }
}
