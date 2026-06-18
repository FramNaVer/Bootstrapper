// =============================================================
// Invitation Routes (v1) — Composition Root
// =============================================================
// endpoint ฝั่งผู้ใช้สำหรับ "รับคำเชิญ" (ไม่ผูกกับ org ใด org หนึ่งทาง URL
// เพราะ token เป็นตัวบอกว่าเป็นคำเชิญของ org ไหน)
// =============================================================

import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { validate } from "@shared/middlewares/validate.middleware"
import { authenticate } from "@modules/auth/presentation/middlewares/authenticate.middleware"
import { PrismaUserRepository } from "@modules/auth/infrastructure/repositories/prisma-user.repository"
import { PrismaMembershipRepository } from "../../../infrastructure/repositories/prisma-membership.repository"
import { PrismaInvitationRepository } from "../../../infrastructure/repositories/prisma-invitation.repository"
import { AcceptInvitationUseCase } from "../../../application/use-cases/accept-invitation.use-case"
import { AcceptInvitationController } from "../../controllers/accept-invitation.controller"
import { acceptInvitationSchema } from "../../validators/invitation.validator"

// --- Dependency Injection ---
const invitationRepo = new PrismaInvitationRepository(prisma)
const membershipRepo = new PrismaMembershipRepository(prisma)
const userRepo = new PrismaUserRepository(prisma)
const acceptInvitationController = new AcceptInvitationController(
  new AcceptInvitationUseCase(invitationRepo, membershipRepo, userRepo)
)

// --- Routes ---
const router = Router()
router.use(authenticate)

router.post(
  "/accept",
  validate(acceptInvitationSchema),
  acceptInvitationController.accept
)

export default router
