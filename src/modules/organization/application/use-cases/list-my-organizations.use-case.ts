import { OrganizationRepository } from "../../domain/repositories/organization.repository"

// คืน organization ทั้งหมดที่ user คนนี้เป็นสมาชิก พร้อม role ในแต่ละที่
export class ListMyOrganizationsUseCase {
  constructor(private orgRepo: OrganizationRepository) {}

  async execute(userId: string) {
    return this.orgRepo.listByUserId(userId)
  }
}
