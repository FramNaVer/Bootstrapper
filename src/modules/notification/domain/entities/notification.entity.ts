// แจ้งเตือนระดับผู้ใช้ — payload เป็น Json ยืดหยุ่นตาม type
// type แรกคือ "ORG_INVITE": payload = { organizationId, organizationName, invitationId, token }
export interface NotificationEntity {
  id: string
  userId: string
  type: string
  payload: unknown | null
  readAt: Date | null
  createdAt: Date
}
