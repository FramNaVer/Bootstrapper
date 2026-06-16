
// Organization Routes (v1) — Composition Root

// ประกอบ dependencies ของ organization module + ลงทะเบียน routes
// ทุก route ที่นี่ต้อง login ก่อน (ผ่าน authenticate middleware)


import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { validate } from "@shared/middlewares/validate.middleware"
import { authenticate } from "@modules/auth/presentation/middlewares/authenticate.middleware"
import { PrismaOrganizationRepository } from "../../../infrastructure/repositories/prisma-organization.repository"
import { PrismaMembershipRepository } from "../../../infrastructure/repositories/prisma-membership.repository"
import { CreateOrganizationUseCase } from "../../../application/use-cases/create-organization.use-case"
import { ListMyOrganizationsUseCase } from "../../../application/use-cases/list-my-organizations.use-case"
import { ListMembersUseCase } from "../../../application/use-cases/list-members.use-case"
import { ChangeMemberRoleUseCase } from "../../../application/use-cases/change-member-role.use-case"
import { RemoveMemberUseCase } from "../../../application/use-cases/remove-member.use-case"
import { OrganizationController } from "../../controllers/organization.controller"
import { MemberController } from "../../controllers/member.controller"
import { requireRole } from "../../middlewares/rbac.middleware"
import { createOrganizationSchema } from "../../validators/organization.validator"
import { changeMemberRoleSchema } from "../../validators/member.validator"

// --- Dependency Injection ---
const orgRepo = new PrismaOrganizationRepository(prisma)
const membershipRepo = new PrismaMembershipRepository(prisma)

const createOrganizationUseCase = new CreateOrganizationUseCase(orgRepo)
const listMyOrganizationsUseCase = new ListMyOrganizationsUseCase(orgRepo)
const organizationController = new OrganizationController(
  createOrganizationUseCase,
  listMyOrganizationsUseCase
)

const memberController = new MemberController(
  new ListMembersUseCase(membershipRepo),
  new ChangeMemberRoleUseCase(membershipRepo),
  new RemoveMemberUseCase(membershipRepo)
)

// --- Routes ---
const router = Router()

// ป้องกันทุก route ใต้บรรทัดนี้ — ต้องมี access token ที่ถูกต้อง
router.use(authenticate)

router.post("/", validate(createOrganizationSchema), organizationController.createOrganization)
router.get("/", organizationController.listMyOrganizations)

// --- Member management (org-scoped, RBAC) ---
// ดูสมาชิก: เป็นสมาชิก role ใดก็ได้ (requireRole ไม่ระบุ role = แค่ต้องเป็นสมาชิก)
router.get(
  "/:orgId/members",
  requireRole(membershipRepo),
  memberController.listMembers
)

// เปลี่ยน role: เฉพาะ OWNER/ADMIN (กฎละเอียดเพิ่มเติมอยู่ใน use case)
router.patch(
  "/:orgId/members/:userId",
  requireRole(membershipRepo, "OWNER", "ADMIN"),
  validate(changeMemberRoleSchema),
  memberController.changeMemberRole
)

// ลบสมาชิก: เฉพาะ OWNER/ADMIN
router.delete(
  "/:orgId/members/:userId",
  requireRole(membershipRepo, "OWNER", "ADMIN"),
  memberController.removeMember
)

export default router
