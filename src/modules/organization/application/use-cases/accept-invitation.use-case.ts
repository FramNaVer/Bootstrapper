import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import { UnauthorizedError } from "@shared/errors/app.error"
import { hashToken } from "@shared/utils/crypto-token.util"
import { joinOrganizationFromInvitation } from "../utils/accept-invitation.util"

// รับคำเชิญด้วย token จาก "ลิงก์เชิญ" (email / copy link)
// token คือความลับที่พิสูจน์ว่าผู้ถือได้รับคำเชิญจริง
export class AcceptInvitationUseCase {
  constructor(
    private invitationRepo: InvitationRepository,
    private membershipRepo: MembershipRepository,
    private userRepo: UserRepository
  ) {}

  // userId = คนที่ login อยู่และกดรับคำเชิญ
  async execute(userId: string, rawToken: string) {
    // findValidByHash กรอง PENDING + ยังไม่หมดอายุให้แล้ว
    const invitation = await this.invitationRepo.findValidByHash(
      hashToken(rawToken)
    )
    if (!invitation) {
      throw new UnauthorizedError("Invalid or expired invitation")
    }

    return joinOrganizationFromInvitation(
      {
        invitationRepo: this.invitationRepo,
        membershipRepo: this.membershipRepo,
        userRepo: this.userRepo,
      },
      userId,
      invitation
    )
  }
}
