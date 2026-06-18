import { Request, Response, NextFunction } from "express"
import { AcceptInvitationUseCase } from "../../application/use-cases/accept-invitation.use-case"

// คำสั่งฝั่งผู้ใช้: รับคำเชิญ (ต้อง login)
export class AcceptInvitationController {
  constructor(private acceptInvitationUseCase: AcceptInvitationUseCase) {}

  // POST /invitations/accept  { token }
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
}
