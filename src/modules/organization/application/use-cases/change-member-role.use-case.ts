import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { MembershipRole } from "../../domain/entities/membership.entity"
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@shared/errors/app.error"

export class ChangeMemberRoleUseCase {
  constructor(private membershipRepo: MembershipRepository) {}

  async execute(params: {
    organizationId: string
    callerRole: MembershipRole
    targetUserId: string
    newRole: MembershipRole
  }) {
    const { organizationId, callerRole, targetUserId, newRole } = params

    const target = await this.membershipRepo.findByUserAndOrg(
      targetUserId,
      organizationId
    )
    if (!target) {
      throw new NotFoundError("Member")
    }

    // กฎ: เฉพาะ OWNER เท่านั้นที่จัดการ OWNER หรือแต่งตั้ง OWNER ใหม่ได้
    // (ADMIN แตะ OWNER ไม่ได้ และ ADMIN ตั้งคนเป็น OWNER ไม่ได้)
    if ((target.role === "OWNER" || newRole === "OWNER") && callerRole !== "OWNER") {
      throw new ForbiddenError("Only an owner can manage owners")
    }

    // กฎ: ห้ามลดขั้น OWNER คนสุดท้าย — org ต้องมีเจ้าของอย่างน้อย 1 คน
    if (target.role === "OWNER" && newRole !== "OWNER") {
      const owners = await this.membershipRepo.countOwners(organizationId)
      if (owners <= 1) {
        throw new ConflictError("Organization must have at least one owner")
      }
    }

    await this.membershipRepo.updateRole(target.id, newRole)
  }
}
