import { MembershipRepository } from "../../domain/repositories/membership.repository"

// รายชื่อสมาชิกทั้งหมดของ org (ผู้เรียกต้องเป็นสมาชิก — เช็คโดย RBAC middleware)
export class ListMembersUseCase {
  constructor(private membershipRepo: MembershipRepository) {}

  async execute(organizationId: string) {
    return this.membershipRepo.listByOrg(organizationId)
  }
}
