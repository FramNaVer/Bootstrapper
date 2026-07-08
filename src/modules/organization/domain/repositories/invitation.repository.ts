import { InvitationEntity, InvitationStatus } from "../entities/invitation.entity"
import { MembershipRole } from "../entities/membership.entity"

export interface InvitationRepository {
  // คืน invitation ที่สร้าง — ผู้เรียกใช้ id ไปอ้างอิงต่อ (เช่นใส่ใน notification)
  create(data: {
    organizationId: string
    email: string
    role: MembershipRole
    tokenHash: string
    expiresAt: Date
  }): Promise<InvitationEntity>

  // หาคำเชิญที่ยังใช้ได้ (PENDING + ยังไม่หมดอายุ) จาก hash ของ token
  findValidByHash(tokenHash: string): Promise<InvitationEntity | null>

  findById(id: string): Promise<InvitationEntity | null>

  // คำเชิญที่ยังค้าง (PENDING) ของ org
  listPendingByOrg(organizationId: string): Promise<InvitationEntity[]>

  updateStatus(id: string, status: InvitationStatus): Promise<void>

  // ยกเลิกคำเชิญ PENDING เดิมของ email นี้ใน org (กันเชิญซ้ำซ้อน)
  invalidatePendingForEmail(organizationId: string, email: string): Promise<void>
}
