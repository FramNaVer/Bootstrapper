import { Request, Response, NextFunction } from "express"
import { ListMembersUseCase } from "../../application/use-cases/list-members.use-case"
import { ChangeMemberRoleUseCase } from "../../application/use-cases/change-member-role.use-case"
import { RemoveMemberUseCase } from "../../application/use-cases/remove-member.use-case"
import { MembershipRole } from "../../domain/entities/membership.entity"

export class MemberController {
  constructor(
    private listMembersUseCase: ListMembersUseCase,
    private changeMemberRoleUseCase: ChangeMemberRoleUseCase,
    private removeMemberUseCase: RemoveMemberUseCase
  ) {}

  listMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await this.listMembersUseCase.execute(
        req.params.orgId as string
      )
      res.status(200).json({
        success: true,
        message: "Members retrieved successfully",
        data: { members },
      })
    } catch (error) {
      next(error)
    }
  }

  changeMemberRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.changeMemberRoleUseCase.execute({
        organizationId: req.params.orgId as string,
        // req.membershipRole ถูกใส่โดย requireRole middleware แล้ว
        callerRole: req.membershipRole as MembershipRole,
        targetUserId: req.params.userId as string,
        newRole: req.body.role,
      })
      res.status(200).json({
        success: true,
        message: "Member role updated successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }

  removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.removeMemberUseCase.execute({
        organizationId: req.params.orgId as string,
        callerRole: req.membershipRole as MembershipRole,
        targetUserId: req.params.userId as string,
      })
      res.status(200).json({
        success: true,
        message: "Member removed successfully",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  }
}
