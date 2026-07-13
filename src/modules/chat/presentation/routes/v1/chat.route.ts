// Chat Routes (v1) — /api/v1/organizations/:orgId/messages
//
// ห้องแชทระดับ org (หนึ่ง org = หนึ่งห้อง)
// ทุก role ที่เป็นสมาชิกใช้ได้รวม VIEWER — แชทคือการสื่อสาร
// ไม่ใช่การแก้เนื้อหาบอร์ด (คนละเรื่องกับสิทธิ์ editor)
import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { validate, validateQuery } from "@shared/middlewares/validate.middleware"
import { authenticate } from "@modules/auth/presentation/middlewares/authenticate.middleware"
import { PrismaMembershipRepository } from "@modules/organization/infrastructure/repositories/prisma-membership.repository"
import { requireRole } from "@modules/organization/presentation/middlewares/rbac.middleware"
import { PrismaMessageRepository } from "../../../infrastructure/repositories/prisma-message.repository"
import { SendMessageUseCase } from "../../../application/use-cases/send-message.use-case"
import { ListMessagesUseCase } from "../../../application/use-cases/list-messages.use-case"
import { MessageController } from "../../controllers/message.controller"
import {
  sendMessageSchema,
  listMessagesQuerySchema,
} from "../../validators/message.validator"

const messageRepo = new PrismaMessageRepository(prisma)
const membershipRepo = new PrismaMembershipRepository(prisma)
const messageController = new MessageController(
  new SendMessageUseCase(messageRepo),
  new ListMessagesUseCase(messageRepo)
)

// mergeParams: true → ดึง :orgId จาก mount path มาใช้ใน requireRole/controller ได้
const router = Router({ mergeParams: true })

router.use(authenticate)

router.get(
  "/",
  requireRole(membershipRepo),
  validateQuery(listMessagesQuerySchema),
  messageController.list
)
router.post(
  "/",
  requireRole(membershipRepo),
  validate(sendMessageSchema),
  messageController.send
)

export default router
