import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { OrganizationRepository } from "../../domain/repositories/organization.repository"
import { MembershipRole } from "../../domain/entities/membership.entity"
import { InvitationEmailService } from "../ports/invitation-email.service"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import { NotificationRepository } from "@modules/notification/domain/repositories/notification.repository"
import { ForbiddenError, ConflictError } from "@shared/errors/app.error"
import { generateRawToken, hashToken } from "@shared/utils/crypto-token.util"
import { env } from "@shared/config/env"

const INVITATION_TTL_DAYS = 7

export class InviteMemberUseCase {
  constructor(
    private invitationRepo: InvitationRepository,
    private membershipRepo: MembershipRepository,
    private userRepo: UserRepository,
    private invitationEmail: InvitationEmailService,
    private orgRepo: OrganizationRepository,
    private notificationRepo: NotificationRepository
  ) {}

  async execute(params: {
    organizationId: string
    inviterRole: MembershipRole
    email: string
    role: MembershipRole
  }) {
    const { organizationId, inviterRole, email, role } = params

    // เฉพาะ OWNER เท่านั้นที่เชิญคนเป็น OWNER ได้
    if (role === "OWNER" && inviterRole !== "OWNER") {
      throw new ForbiddenError("Only an owner can invite owners")
    }

    // ถ้า email นี้มี user อยู่แล้วและเป็นสมาชิก org อยู่แล้ว → เชิญซ้ำไม่ได้
    const existingUser = await this.userRepo.findByEmail(email)
    if (existingUser) {
      const membership = await this.membershipRepo.findByUserAndOrg(
        existingUser.id,
        organizationId
      )
      if (membership) {
        throw new ConflictError("This user is already a member of the organization")
      }
    }

    // ลบคำเชิญ PENDING เดิมของ email นี้ก่อน (ให้มีคำเชิญที่ใช้ได้ทีละใบ)
    await this.invitationRepo.invalidatePendingForEmail(organizationId, email)

    const rawToken = generateRawToken()
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
    )
    const invitation = await this.invitationRepo.create({
      organizationId,
      email,
      role,
      tokenHash: hashToken(rawToken),
      expiresAt,
    })

    // ลิงก์ชี้ไป "หน้าเว็บ (SPA)" ไม่ใช่ backend — หน้านั้นจะอ่าน token แล้วเรียก /accept
    const acceptUrl = `${env.FRONTEND_URL}/accept-invitation?token=${rawToken}`
    await this.invitationEmail.sendInvite(email, acceptUrl)

    // ถ้าผู้ถูกเชิญ "มีบัญชีอยู่แล้ว" → สร้าง in-app notification + คืน userId ให้ controller push real-time
    // (คนยังไม่มีบัญชีใช้ copy-link แทน)
    let notifyUserId: string | null = null
    if (existingUser) {
      const org = await this.orgRepo.findById(organizationId)
      await this.notificationRepo.create({
        userId: existingUser.id,
        type: "ORG_INVITE",
        payload: {
          organizationId,
          organizationName: org?.name ?? "องค์กร",
          // อ้างอิงด้วย id ไม่ใช่ raw token — DB ต้องไม่เก็บความลับแบบดิบ
          // (กระดิ่งใช้ endpoint accept-by-id ที่พิสูจน์ตัวตนด้วย JWT + เช็ค email ตรง)
          invitationId: invitation.id,
        },
      })
      notifyUserId = existingUser.id
    }

    // คืนลิงก์กลับไปด้วย → ฝั่งหน้าเว็บเอาไปให้ผู้เชิญ "คัดลอกลิงก์" แชร์เองได้
    return { acceptUrl, email, notifyUserId }
  }
}
