// แจ้งเตือนระดับผู้ใช้ — payload เป็น Json ยืดหยุ่นตาม type
// type แรกคือ "ORG_INVITE": payload = { organizationId, organizationName, invitationId, token }
export interface NotificationEntity {
  id: string
  userId: string
  type: string
  // unknown ครอบ null อยู่แล้ว (ไม่ต้อง | null) — ผู้ใช้ต้อง narrow เองก่อนใช้
  payload: unknown
  readAt: Date | null
  createdAt: Date
}
