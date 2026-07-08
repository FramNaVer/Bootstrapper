// Notification Routes (v1) — Composition Root
// ทุก route ต้อง login ก่อน (แจ้งเตือนเป็นของรายบุคคล)

import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { authenticate } from "@modules/auth/presentation/middlewares/authenticate.middleware"
import { PrismaNotificationRepository } from "../../../infrastructure/repositories/prisma-notification.repository"
import { ListNotificationsUseCase } from "../../../application/use-cases/list-notifications.use-case"
import { MarkNotificationReadUseCase } from "../../../application/use-cases/mark-notification-read.use-case"
import { MarkAllNotificationsReadUseCase } from "../../../application/use-cases/mark-all-notifications-read.use-case"
import { NotificationController } from "../../controllers/notification.controller"

const notificationRepo = new PrismaNotificationRepository(prisma)

const controller = new NotificationController(
  new ListNotificationsUseCase(notificationRepo),
  new MarkNotificationReadUseCase(notificationRepo),
  new MarkAllNotificationsReadUseCase(notificationRepo)
)

const router = Router()
router.use(authenticate)

router.get("/", controller.list)
router.patch("/read-all", controller.markAllRead)
router.patch("/:id/read", controller.markRead)

export default router
