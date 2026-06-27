import { MembershipRole } from "./membership.entity"

export interface OrganizationEntity {
  id: string
  name: string
  slug: string
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

// organization พร้อม role ของ user ที่ query (ใช้ตอน list องค์กรของฉัน)
export interface OrganizationWithRole extends OrganizationEntity {
  role: MembershipRole
}
