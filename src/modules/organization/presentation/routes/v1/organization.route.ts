
// Organization Routes (v1) — Composition Root

// ประกอบ dependencies ของ organization module + ลงทะเบียน routes
// ทุก route ที่นี่ต้อง login ก่อน (ผ่าน authenticate middleware)


import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { validate } from "@shared/middlewares/validate.middleware"
import { authenticate } from "@modules/auth/presentation/middlewares/authenticate.middleware"
import { PrismaOrganizationRepository } from "../../../infrastructure/repositories/prisma-organization.repository"
import { CreateOrganizationUseCase } from "../../../application/use-cases/create-organization.use-case"
import { ListMyOrganizationsUseCase } from "../../../application/use-cases/list-my-organizations.use-case"
import { OrganizationController } from "../../controllers/organization.controller"
import { createOrganizationSchema } from "../../validators/organization.validator"

// --- Dependency Injection ---
const orgRepo = new PrismaOrganizationRepository(prisma)
const createOrganizationUseCase = new CreateOrganizationUseCase(orgRepo)
const listMyOrganizationsUseCase = new ListMyOrganizationsUseCase(orgRepo)
const organizationController = new OrganizationController(
  createOrganizationUseCase,
  listMyOrganizationsUseCase
)

// --- Routes ---
const router = Router()

// ป้องกันทุก route ใต้บรรทัดนี้ — ต้องมี access token ที่ถูกต้อง
router.use(authenticate)

router.post("/", validate(createOrganizationSchema), organizationController.createOrganization)
router.get("/", organizationController.listMyOrganizations)

export default router
