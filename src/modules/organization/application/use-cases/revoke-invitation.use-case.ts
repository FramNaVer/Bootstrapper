import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import { NotFoundError, ConflictError } from "@shared/errors/app.error"

// ยกเลิกคำเชิญที่ยังค้าง
export class RevokeInvitationUseCase {
  constructor(private invitationRepo: InvitationRepository) {}

  async execute(organizationId: string, invitationId: string) {
    const invitation = await this.invitationRepo.findById(invitationId)

    // ต้องมีจริง และต้องเป็นของ org นี้ (กันยกเลิกข้าม org)
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundError("Invitation")
    }
    if (invitation.status !== "PENDING") {
      throw new ConflictError("Only pending invitations can be revoked")
    }

    await this.invitationRepo.updateStatus(invitationId, "REVOKED")
  }
}
