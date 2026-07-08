import { Request, Response, NextFunction } from "express"
import { AcceptInvitationUseCase } from "../../application/use-cases/accept-invitation.use-case"
import { AcceptInvitationByIdUseCase } from "../../application/use-cases/accept-invitation-by-id.use-case"

// คำสั่งฝั่งผู้ใช้: รับคำเชิญ (ต้อง login)
export class AcceptInvitationController {
  constructor(
    private acceptInvitationUseCase: AcceptInvitationUseCase,
    private acceptInvitationByIdUseCase: AcceptInvitationByIdUseCase
  ) {}

  // POST /invitations/accept  { token } — เส้นทางลิงก์เชิญ
  accept = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.acceptInvitationUseCase.execute(
        req.userId!,
        req.body.token
      )
      res.status(200).json({
        success: true,
        message: "Invitation accepted — you are now a member",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  // POST /invitations/:invitationId/accept — เส้นทางกระดิ่งแจ้งเตือน
  acceptById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.acceptInvitationByIdUseCase.execute(
        req.userId!,
        String(req.params.invitationId)
      )
      res.status(200).json({
        success: true,
        message: "Invitation accepted — you are now a member",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}
