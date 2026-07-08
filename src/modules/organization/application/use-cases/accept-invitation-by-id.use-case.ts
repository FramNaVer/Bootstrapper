import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import { UnauthorizedError } from "@shared/errors/app.error"
import { joinOrganizationFromInvitation } from "../utils/accept-invitation.util"

// รับคำเชิญด้วย invitationId จาก "กระดิ่งแจ้งเตือน"
//
// ทำไมเส้นทางนี้ไม่ต้องใช้ token?
// - ผู้ใช้ login แล้วเสมอ → JWT คือตัวพิสูจน์ตัวตน ไม่ใช่ token
// - id ไม่ใช่ความลับก็ไม่เป็นไร กฎ "email ผู้รับต้องตรงกับคำเชิญ"
//   (ใน joinOrganizationFromInvitation) บล็อกคนอื่นที่รู้ id อยู่
// ผลที่ได้: notification payload ไม่ต้องเก็บ raw token ลง DB อีกต่อไป
// (เดิมเก็บ → ทำลายเจตนาของการ hash token ในตาราง Invitation)
export class AcceptInvitationByIdUseCase {
  constructor(
    private invitationRepo: InvitationRepository,
    private membershipRepo: MembershipRepository,
    private userRepo: UserRepository
  ) {}

  async execute(userId: string, invitationId: string) {
    const invitation = await this.invitationRepo.findById(invitationId)

    // findById ไม่ได้กรองสถานะเหมือน findValidByHash → ต้องเช็คเองให้ครบ
    // ใช้ข้อความเดียวกันทุกเคส ไม่บอกใบ้ว่า id นี้มีจริง/หมดอายุ/ถูกยกเลิก
    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      invitation.expiresAt < new Date()
    ) {
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
