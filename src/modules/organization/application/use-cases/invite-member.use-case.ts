import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { MembershipRole } from "../../domain/entities/membership.entity"
import { InvitationEmailService } from "../ports/invitation-email.service"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import { ForbiddenError, ConflictError } from "@shared/errors/app.error"
import { generateRawToken, hashToken } from "@shared/utils/crypto-token.util"
import { env } from "@shared/config/env"

const INVITATION_TTL_DAYS = 7

export class InviteMemberUseCase {
  constructor(
    private invitationRepo: InvitationRepository,
    private membershipRepo: MembershipRepository,
    private userRepo: UserRepository,
    private invitationEmail: InvitationEmailService
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

    // ฆ่าคำเชิญ PENDING เดิมของ email นี้ก่อน (ให้มีคำเชิญที่ใช้ได้ทีละใบ)
    await this.invitationRepo.invalidatePendingForEmail(organizationId, email)

    const rawToken = generateRawToken()
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
    )
    await this.invitationRepo.create({
      organizationId,
      email,
      role,
      tokenHash: hashToken(rawToken),
      expiresAt,
    })

    const acceptUrl = `${env.APP_URL}/accept-invitation?token=${rawToken}`
    await this.invitationEmail.sendInvite(email, acceptUrl)
  }
}
