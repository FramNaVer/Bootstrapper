import { Request, Response, NextFunction } from "express"
import { InviteMemberUseCase } from "../../application/use-cases/invite-member.use-case"
import { ListInvitationsUseCase } from "../../application/use-cases/list-invitations.use-case"
import { RevokeInvitationUseCase } from "../../application/use-cases/revoke-invitation.use-case"
import { MembershipRole } from "../../domain/entities/membership.entity"

// คำสั่งฝั่ง org (เฉพาะ OWNER/ADMIN): เชิญ / ดูคำเชิญค้าง / ยกเลิก
export class InvitationController {
  constructor(
    private inviteMemberUseCase: InviteMemberUseCase,
    private listInvitationsUseCase: ListInvitationsUseCase,
    private revokeInvitationUseCase: RevokeInvitationUseCase
  ) {}

  // POST /organizations/:orgId/invitations  (OWNER/ADMIN)
  invite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.inviteMemberUseCase.execute({
        organizationId: req.params.orgId as string,
        inviterRole: req.membershipRole as MembershipRole,
        email: req.body.email,
        role: req.body.role,
      })
      res.status(201).json({
        success: true,
        message: "Invitation sent successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  // GET /organizations/:orgId/invitations  (OWNER/ADMIN)
  listInvitations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitations = await this.listInvitationsUseCase.execute(
        req.params.orgId as string
      )
      res.status(200).json({
        success: true,
        message: "Invitations retrieved successfully",
        data: { invitations },
      })
    } catch (error) {
      next(error)
    }
  }

  // DELETE /organizations/:orgId/invitations/:invitationId  (OWNER/ADMIN)
  revoke = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.revokeInvitationUseCase.execute(
        req.params.orgId as string,
        req.params.invitationId as string
      )
      res.status(200).json({
        success: true,
        message: "Invitation revoked successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
