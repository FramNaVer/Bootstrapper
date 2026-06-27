import {
  OrganizationEntity,
  OrganizationWithRole,
} from "../entities/organization.entity"

export interface OrganizationRepository {
  findById(id: string): Promise<OrganizationEntity | null>

  findBySlug(slug: string): Promise<OrganizationEntity | null>

  // สร้าง organization พร้อมตั้งผู้สร้างเป็น OWNER ในคราวเดียว (atomic)
  createWithOwner(data: {
    name: string
    slug: string
    ownerUserId: string
  }): Promise<OrganizationEntity>

  // คืน organization ทั้งหมดที่ user เป็นสมาชิก พร้อม role ของเขาในแต่ละที่
  listByUserId(userId: string): Promise<OrganizationWithRole[]>
}
