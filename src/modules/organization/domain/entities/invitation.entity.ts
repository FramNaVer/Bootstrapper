import { MembershipRole } from "./membership.entity"

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"

export interface InvitationEntity {
  id: string
  organizationId: string
  email: string
  role: MembershipRole
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
}
