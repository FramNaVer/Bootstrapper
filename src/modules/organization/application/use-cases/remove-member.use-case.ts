import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { MembershipRole } from "../../domain/entities/membership.entity"
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@shared/errors/app.error"

export class RemoveMemberUseCase {
  constructor(private membershipRepo: MembershipRepository) {}

  async execute(params: {
    organizationId: string
    callerRole: MembershipRole
    targetUserId: string
  }) {
    const { organizationId, callerRole, targetUserId } = params

    const target = await this.membershipRepo.findByUserAndOrg(
      targetUserId,
      organizationId
    )
    if (!target) {
      throw new NotFoundError("Member")
    }

    // ADMIN ลบ OWNER ไม่ได้ — เฉพาะ OWNER เท่านั้น
    if (target.role === "OWNER" && callerRole !== "OWNER") {
      throw new ForbiddenError("Only an owner can remove an owner")
    }

    // ห้ามลบ OWNER คนสุดท้าย
    if (target.role === "OWNER") {
      const owners = await this.membershipRepo.countOwners(organizationId)
      if (owners <= 1) {
        throw new ConflictError("Cannot remove the last owner of the organization")
      }
    }

    await this.membershipRepo.remove(target.id)
  }
}
