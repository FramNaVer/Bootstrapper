import { RefreshTokenEntity } from "../entities/token.entity"

// Interface นี้คือ "สัญญา" ว่า token repository ต้องทำอะไรได้บ้าง
// Infrastructure layer (Prisma) จะ implement interface นี้
// ทำให้ use case ไม่ต้องรู้ว่าใต้ฝาใช้ Prisma หรือ Redis หรืออะไรก็ตาม
//
// ทุก method รับ "token ดิบ" — วิธีเก็บ (เช่น hash ก่อนเก็บ) เป็นเรื่องภายใน
// ของ implementation ที่ use case ไม่ต้องรับรู้
export interface TokenRepository {
  // บันทึก refresh token ลง DB
  save(userId: string, token: string, expiresAt: Date): Promise<void>

  // ค้นหา refresh token จาก token ดิบที่ client ส่งมา
  findByToken(token: string): Promise<RefreshTokenEntity | null>

  // ยกเลิก token ตัวเดียว (ใช้ตอน logout)
  revoke(token: string): Promise<void>

  // ยกเลิก token ทั้งหมดของ user คนนั้น (ใช้ตอน logout จากทุกอุปกรณ์)
  revokeAllForUser(userId: string): Promise<void>
}
