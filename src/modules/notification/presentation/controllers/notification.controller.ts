import { Request, Response, NextFunction } from "express"
import { ListNotificationsUseCase } from "../../application/use-cases/list-notifications.use-case"
import { MarkNotificationReadUseCase } from "../../application/use-cases/mark-notification-read.use-case"
import { MarkAllNotificationsReadUseCase } from "../../application/use-cases/mark-all-notifications-read.use-case"

export class NotificationController {
  constructor(
    private listUseCase: ListNotificationsUseCase,
    private markReadUseCase: MarkNotificationReadUseCase,
    private markAllReadUseCase: MarkAllNotificationsReadUseCase
  ) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.listUseCase.execute(req.userId!)
      res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data,
      })
    } catch (error) {
      next(error)
    }
  }

  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.markReadUseCase.execute(req.userId!, req.params.id as string)
      res.status(200).json({ success: true, message: "Marked as read", data: null })
    } catch (error) {
      next(error)
    }
  }

  markAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.markAllReadUseCase.execute(req.userId!)
      res.status(200).json({ success: true, message: "All marked as read", data: null })
    } catch (error) {
      next(error)
    }
  }
}
