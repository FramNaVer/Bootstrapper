import { Request, Response, NextFunction } from "express"
import { ListActivitiesUseCase } from "../../application/use-cases/list-activities.use-case"

export class ActivityController {
  constructor(private listActivitiesUseCase: ListActivitiesUseCase) {}

  listActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activities = await this.listActivitiesUseCase.execute(
        req.params.orgId as string,
        req.params.boardId as string
      )
      res.status(200).json({
        success: true,
        message: "Activities retrieved successfully",
        data: { activities },
      })
    } catch (error) {
      next(error)
    }
  }
}
