import { PrismaClient } from "@generated/prisma"
import { OrganizationRepository } from "../../domain/repositories/organization.repository"
import {
  OrganizationEntity,
  OrganizationWithRole,
} from "../../domain/entities/organization.entity"

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<OrganizationEntity | null> {
    return this.prisma.organization.findUnique({ where: { id } })
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    return this.prisma.organization.findUnique({ where: { slug } })
  }

  async createWithOwner(data: {
    name: string
    slug: string
    ownerUserId: string
  }): Promise<OrganizationEntity> {
    // ใช้ transaction: สร้าง org + membership (OWNER) ต้องสำเร็จทั้งคู่หรือไม่สำเร็จเลย
    // กันสภาพ "มี org แต่ไม่มีเจ้าของ" ถ้าพังกลางคัน
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        // บันทึกผู้สร้างไว้ → ใช้ปกป้องไม่ให้ owner อื่นลด/ลบผู้ก่อตั้ง
        data: { name: data.name, slug: data.slug, createdById: data.ownerUserId },
      })
      await tx.membership.create({
        data: {
          userId: data.ownerUserId,
          organizationId: org.id,
          role: "OWNER",
        },
      })
      return org
    })
  }

  async listByUserId(userId: string): Promise<OrganizationWithRole[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    })
    // รวมข้อมูล org กับ role ของ user ในแต่ละ org
    return memberships.map((m) => ({ ...m.organization, role: m.role }))
  }
}
