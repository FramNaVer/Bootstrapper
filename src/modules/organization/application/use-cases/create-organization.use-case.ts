import { OrganizationRepository } from "../../domain/repositories/organization.repository"
import { slugify, randomSlugSuffix } from "../utils/slug.util"

export class CreateOrganizationUseCase {
  constructor(private orgRepo: OrganizationRepository) {}

  async execute(ownerUserId: string, name: string) {
    const slug = await this.generateUniqueSlug(name)
    // ผู้สร้างกลายเป็น OWNER อัตโนมัติ (จัดการใน repository ด้วย transaction)
    return this.orgRepo.createWithOwner({ name, slug, ownerUserId })
  }

  // หา slug ที่ไม่ซ้ำ: ลองชื่อสะอาดก่อน ถ้าชนก็ต่อท้ายด้วยสุ่ม
  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "org"
    let candidate = base

    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await this.orgRepo.findBySlug(candidate)
      if (!existing) return candidate
      candidate = `${base}-${randomSlugSuffix()}`
    }

    // โอกาสชน 5 ครั้งติดแทบเป็นไปไม่ได้ — ต่อ suffix ยาวขึ้นกันเหนียว
    return `${base}-${randomSlugSuffix()}${randomSlugSuffix()}`
  }
}
