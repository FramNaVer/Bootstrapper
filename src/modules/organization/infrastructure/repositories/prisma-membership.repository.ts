import { PrismaClient } from "@generated/prisma"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import {
  MembershipEntity,
  MembershipMember,
  MembershipRole,
} from "../../domain/entities/membership.entity"

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    userId: string
    organizationId: string
    role: MembershipRole
  }): Promise<void> {
    await this.prisma.membership.create({ data })
  }

  async findByUserAndOrg(
    userId: string,
    organizationId: string
  ): Promise<MembershipEntity | null> {
    return this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    })
  }

  async listByOrg(organizationId: string): Promise<MembershipMember[]> {
    const rows = await this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: { select: { email: true, displayName: true, lastSeenAt: true } },
      },
      orderBy: { createdAt: "asc" },
    })
    return rows.map((r) => ({
      userId: r.userId,
      email: r.user.email,
      displayName: r.user.displayName,
      role: r.role,
      joinedAt: r.createdAt,
      lastSeenAt: r.user.lastSeenAt,
    }))
  }

  async updateRole(membershipId: string, role: MembershipRole): Promise<void> {
    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role },
    })
  }

  async remove(membershipId: string): Promise<void> {
    await this.prisma.membership.delete({ where: { id: membershipId } })
  }

  async countOwners(organizationId: string): Promise<number> {
    return this.prisma.membership.count({
      where: { organizationId, role: "OWNER" },
    })
  }
}
