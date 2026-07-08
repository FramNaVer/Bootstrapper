// =============================================================
// Password Utilities — ที่เดียวที่รู้จัก bcrypt
// ทำไมต้องมีไฟล์นี้
// เดิม register ใช้ rounds 10 แต่ reset-password ใช้ 12 (คนละไฟล์ ค่าคนละตัว)
// → รหัสของคนสมัครใหม่ crack ง่ายกว่ารหัสที่เพิ่ง reset 4 เท่า
// บทเรียน: ค่า config ด้านความปลอดภัยต้องมี "แหล่งความจริงเดียว"
//
// rounds = 12 หมายถึง 2^12 iterations — ช้าพอให้ brute-force แพง
// แต่ยังเร็วพอสำหรับ login ปกติ (~200-300ms ต่อครั้ง)
//
// หมายเหตุ: hash เก่าที่สร้างด้วย rounds 10 ยัง verify ผ่านได้ปกติ
// เพราะ bcrypt ฝัง cost ไว้ในตัว hash เอง ($2b$10$...) — ไม่ต้อง migrate
// =============================================================

import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}
