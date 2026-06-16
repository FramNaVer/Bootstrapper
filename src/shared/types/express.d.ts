import "express"

// ขยาย type ของ Express Request ให้มี userId
// (auth middleware จะใส่ค่านี้หลังตรวจ access token สำเร็จ)
declare global {
  namespace Express {
    interface Request {
      userId?: string
      // role ของผู้เรียกใน org ที่กำลังเข้าถึง (ใส่โดย RBAC middleware)
      membershipRole?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
    }
  }
}
