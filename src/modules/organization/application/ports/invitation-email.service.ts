// Port สำหรับส่งอีเมลคำเชิญเข้าร่วม organization
// (แยกจาก auth email service เพื่อให้ organization module ไม่ผูกกับ auth)
export interface InvitationEmailService {
  sendInvite(to: string, acceptUrl: string): Promise<void>
}
