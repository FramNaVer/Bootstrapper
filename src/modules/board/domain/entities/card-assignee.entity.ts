// มุมมองของ assignee พร้อมข้อมูล user (ใช้ตอน list ผู้รับผิดชอบการ์ด)
// membershipId คือ key จริงในตาราง — userId/email/displayName ดึงมาแสดงให้อ่านง่าย
export interface CardAssigneeEntity {
  cardId: string
  membershipId: string
  userId: string
  email: string
  displayName: string | null
  assignedAt: Date
}
