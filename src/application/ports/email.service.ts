// Port (interface) ของ email — application layer รู้จักแค่ตัวนี้
// ไม่รู้ว่าใต้ฝาใช้ nodemailer, SendGrid, SES หรือส่งผ่าน queue
// → เปลี่ยน implementation ได้โดยไม่ต้องแตะ use case
export interface EmailService {
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
}
