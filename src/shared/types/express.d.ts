import "express"

// ขยาย type ของ Express Request ให้มี userId
// (auth middleware จะใส่ค่านี้หลังตรวจ access token สำเร็จ)
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}
