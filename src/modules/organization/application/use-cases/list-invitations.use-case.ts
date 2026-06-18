import { InvitationRepository } from "../../domain/repositories/invitation.repository"

// รายการคำเชิญที่ยังค้าง (PENDING) ของ org
export class ListInvitationsUseCase {
  constructor(private invitationRepo: InvitationRepository) {}

  async execute(organizationId: string) {
    return this.invitationRepo.listPendingByOrg(organizationId)
  }
}
