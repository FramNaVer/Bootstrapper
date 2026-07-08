import { PrismaClient } from "@generated/prisma"
import { InvitationRepository } from "../../domain/repositories/invitation.repository"
import {
  InvitationEntity,
  InvitationStatus,
} from "../../domain/entities/invitation.entity"
import { MembershipRole } from "../../domain/entities/membership.entity"

// คืนเฉพาะ field ที่ปลอดภัย — ไม่รวม tokenHash (กันหลุดออก API)
const invitationSelect = {
  id: true,
  organizationId: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
} as const

export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string
    email: string
    role: MembershipRole
    tokenHash: string
    expiresAt: Date
  }): Promise<InvitationEntity> {
    return this.prisma.invitation.create({ data, select: invitationSelect })
  }

  async findValidByHash(tokenHash: string): Promise<InvitationEntity | null> {
    return this.prisma.invitation.findFirst({
      where: {
        tokenHash,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      select: invitationSelect,
    })
  }

  async findById(id: string): Promise<InvitationEntity | null> {
    return this.prisma.invitation.findUnique({
      where: { id },
      select: invitationSelect,
    })
  }

  async listPendingByOrg(organizationId: string): Promise<InvitationEntity[]> {
    return this.prisma.invitation.findMany({
      where: { organizationId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: invitationSelect,
    })
  }

  async updateStatus(id: string, status: InvitationStatus): Promise<void> {
    await this.prisma.invitation.update({ where: { id }, data: { status } })
  }

  async invalidatePendingForEmail(
    organizationId: string,
    email: string
  ): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { organizationId, email, status: "PENDING" },
      data: { status: "REVOKED" },
    })
  }
}
