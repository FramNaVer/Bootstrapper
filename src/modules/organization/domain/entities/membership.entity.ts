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
