import {
  MembershipEntity,
  MembershipMember,
  MembershipRole,
} from "../entities/membership.entity"

export interface MembershipRepository {
  // เพิ่มสมาชิกใหม่ (ใช้ตอนรับคำเชิญ)
  create(data: {
    userId: string
    organizationId: string
    role: MembershipRole
  }): Promise<void>

  // หา membership ของ user คนหนึ่งใน org หนึ่ง (ใช้ใน RBAC guard)
  findByUserAndOrg(
    userId: string,
    organizationId: string
  ): Promise<MembershipEntity | null>

  // รายชื่อสมาชิกทั้งหมดของ org พร้อมข้อมูล user
  listByOrg(organizationId: string): Promise<MembershipMember[]>

  // เปลี่ยน role ของสมาชิก
  updateRole(membershipId: string, role: MembershipRole): Promise<void>

  // ลบสมาชิกออกจาก org
  remove(membershipId: string): Promise<void>

  // นับจำนวน OWNER ใน org (ใช้กันการลบ/ลดขั้น owner คนสุดท้าย)
  countOwners(organizationId: string): Promise<number>
}
