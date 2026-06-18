import { TokenType, VerificationTokenEntity } from "../entities/verification-token.entity"

// สัญญาของ verification token store — use case รู้จักแค่ interface นี้
export interface VerificationTokenRepository {
  // สร้าง token ใหม่ (เก็บ hash)
  create(data: {
    userId: string
    tokenHash: string
    type: TokenType
    expiresAt: Date
  }): Promise<void>

  // หา token ที่ยัง valid (ยังไม่ consume + ยังไม่หมดอายุ) จาก hash + type
  findValidByHash(
    tokenHash: string,
    type: TokenType
  ): Promise<VerificationTokenEntity | null>

  // ทำเครื่องหมายว่า token ถูกใช้ไปแล้ว (ใช้ครั้งเดียว)
  consume(id: string): Promise<void>

  // ยกเลิก token เก่าทั้งหมดของ user สำหรับ type นั้น
  // (กันมีหลาย token active พร้อมกัน — ออกใหม่ก็ฆ่าของเก่า)
  invalidateAllForUser(userId: string, type: TokenType): Promise<void>
}
