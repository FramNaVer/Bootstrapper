import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import { InvitationEntity } from "../../domain/entities/invitation.entity"
import {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "@shared/errors/app.error"
import { normalizeEmail } from "@shared/utils/email.util"

// =============================================================
// แกนกลางของการ "รับคำเชิญ" — ใช้ร่วม 2 เส้นทาง
//   1) token จากลิงก์ (คนยังไม่เคย login ก็เข้าถึงลิงก์ได้ → token คือความลับ)
//   2) invitationId จากกระดิ่งแจ้งเตือน (login แล้วเสมอ → JWT คือตัวพิสูจน์ตัวตน)
// แยกออกมาเพื่อไม่ให้กฎ (email ต้องตรง, กันสมาชิกซ้ำ) ถูก copy สองที่
// แล้ววันหนึ่งแก้ที่เดียวลืมอีกที่ — กฎความปลอดภัยต้องมีแหล่งเดียว
//
// ผู้เรียกต้อง validate ก่อนว่า invitation ใช้ได้ (PENDING + ยังไม่หมดอายุ)
// =============================================================
export async function joinOrganizationFromInvitation(
  deps: {
    invitationRepo: InvitationRepository
    membershipRepo: MembershipRepository
    userRepo: UserRepository
  },
  userId: string,
  invitation: InvitationEntity
) {
  const user = await deps.userRepo.findById(userId)
  if (!user) {
    throw new UnauthorizedError("User not found")
  }

  // คำเชิญผูกกับ email — คนรับต้องเป็นเจ้าของ email นั้น
  // (กันคนส่งต่อลิงก์/รู้ id คำเชิญ แล้วให้บัญชีอื่นมารับแทน)
  // เทียบแบบ normalize ทั้งสองฝั่ง: ทางเข้าใหม่ normalize หมดแล้วก็จริง
  // แต่คำเชิญ/บัญชีที่เกิดก่อนกฎนี้อาจยังมี case ปนอยู่ — เทียบตรงๆ จะปฏิเสธ
  // เจ้าของตัวจริง (กฎ "ใครคือเจ้าของ email" ไม่ขึ้นกับ case โดยความหมายอยู่แล้ว)
  if (normalizeEmail(user.email) !== normalizeEmail(invitation.email)) {
    throw new ForbiddenError(
      "This invitation was sent to a different email address"
    )
  }

  // เป็นสมาชิกอยู่แล้ว → ปิดคำเชิญ แล้วแจ้งว่าซ้ำ
  const existing = await deps.membershipRepo.findByUserAndOrg(
    userId,
    invitation.organizationId
  )
  if (existing) {
    await deps.invitationRepo.updateStatus(invitation.id, "ACCEPTED")
    throw new ConflictError("You are already a member of this organization")
  }

  // สร้าง membership ตาม role ที่ถูกเชิญ + ปิดคำเชิญ
  await deps.membershipRepo.create({
    userId,
    organizationId: invitation.organizationId,
    role: invitation.role,
  })
  await deps.invitationRepo.updateStatus(invitation.id, "ACCEPTED")

  return { organizationId: invitation.organizationId, role: invitation.role }
}
