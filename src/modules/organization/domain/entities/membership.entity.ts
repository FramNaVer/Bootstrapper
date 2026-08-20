// บทบาทของสมาชิกใน organization (RBAC)
// เรียงจากสิทธิ์มากไปน้อย: OWNER > ADMIN > MEMBER > VIEWER
export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

export interface MembershipEntity {
  id: string
  userId: string
  organizationId: string
  role: MembershipRole
  createdAt: Date
  updatedAt: Date
}

// membership พร้อมข้อมูล user (ใช้ตอน list รายชื่อสมาชิกของ org)
export interface MembershipMember {
  userId: string
  email: string
  displayName: string | null
  role: MembershipRole
  joinedAt: Date
  // เวลา active ล่าสุดของ user — client เอาไปคำนวณ "ออนไลน์"/"เห็นล่าสุดเมื่อ"
  // null = ยังไม่เคยเชื่อม socket เลย
  lastSeenAt: Date | null
}
