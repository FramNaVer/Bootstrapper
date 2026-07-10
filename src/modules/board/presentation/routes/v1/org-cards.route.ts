// Org-level Card Routes (v1) — /api/v1/organizations/:orgId/cards
//
// แยกจาก board.route เพราะ mount path ต่างกัน: ที่นี่คือการ์ด "ข้ามบอร์ด"
// ของทั้ง org (ใช้กับปฏิทินหน้า org) ไม่ผูกกับ :boardId ใดๆ
// โค้ดยังอยู่ใน board module — การ์ดเป็น domain ของ board ไม่ใช่ organization
import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { validateQuery } from "@shared/middlewares/validate.middleware"
import { authenticate } from "@modules/auth/presentation/middlewares/authenticate.middleware"
import { PrismaMembershipRepository } from "@modules/organization/infrastructure/repositories/prisma-membership.repository"
import { requireRole } from "@modules/organization/presentation/middlewares/rbac.middleware"
import { PrismaCardRepository } from "../../../infrastructure/repositories/prisma-card.repository"
import { ListDueCardsUseCase } from "../../../application/use-cases/list-due-cards.use-case"
import { OrgCardsController } from "../../controllers/org-cards.controller"
import { listDueCardsQuerySchema } from "../../validators/org-cards.validator"

const cardRepo = new PrismaCardRepository(prisma)
const membershipRepo = new PrismaMembershipRepository(prisma)
const orgCardsController = new OrgCardsController(
  new ListDueCardsUseCase(cardRepo)
)

// mergeParams: true → ดึง :orgId จาก mount path มาใช้ใน requireRole/controller ได้
const router = Router({ mergeParams: true })

router.use(authenticate)

// ดูปฏิทิน: สมาชิก role ใดก็ได้ (อ่านอย่างเดียว เหมือน list boards)
router.get(
  "/",
  requireRole(membershipRepo),
  validateQuery(listDueCardsQuerySchema),
  orgCardsController.listDueCards
)

export default router
