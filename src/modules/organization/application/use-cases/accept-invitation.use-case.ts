import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "@shared/errors/app.error"
import { hashToken } from "@shared/utils/crypto-token.util"

export class AcceptInvitationUseCase {
  constructor(
    private invitationRepo: InvitationRepository,
    private membershipRepo: MembershipRepository,
    private userRepo: UserRepository
  ) {}

  // userId = คนที่ login อยู่และกดรับคำเชิญ
  async execute(userId: string, rawToken: string) {
    const invitation = await this.invitationRepo.findValidByHash(
      hashToken(rawToken)
    )
    if (!invitation) {
      throw new UnauthorizedError("Invalid or expired invitation")
    }

    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new UnauthorizedError("User not found")
    }

    // คำเชิญผูกกับ email — คนรับต้องเป็นเจ้าของ email นั้น
    // (กันคนส่งต่อลิงก์ให้บัญชีอื่นมารับแทน)
    if (user.email !== invitation.email) {
      throw new ForbiddenError(
        "This invitation was sent to a different email address"
      )
    }

    // เป็นสมาชิกอยู่แล้ว → ปิดคำเชิญ แล้วแจ้งว่าซ้ำ
    const existing = await this.membershipRepo.findByUserAndOrg(
      userId,
      invitation.organizationId
    )
    if (existing) {
      await this.invitationRepo.updateStatus(invitation.id, "ACCEPTED")
      throw new ConflictError("You are already a member of this organization")
    }

    // สร้าง membership ตาม role ที่ถูกเชิญ + ปิดคำเชิญ
    await this.membershipRepo.create({
      userId,
      organizationId: invitation.organizationId,
      role: invitation.role,
    })
    await this.invitationRepo.updateStatus(invitation.id, "ACCEPTED")

    return { organizationId: invitation.organizationId, role: invitation.role }
  }
}
