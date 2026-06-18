// Board Routes (v1) — Composition Root
//
// ทุก route เป็น org-scoped: /api/v1/organizations/:orgId/boards...
// router ใช้ mergeParams: true เพราะ :orgId อยู่ที่ "mount path" (ดู main.ts)
// ไม่ได้นิยามในไฟล์นี้ — ต้อง merge param จาก parent เข้ามาให้ req.params.orgId ใช้ได้

import { Router } from "express"
import { prisma } from "@shared/database/prisma.client"
import { validate } from "@shared/middlewares/validate.middleware"
import { authenticate } from "@modules/auth/presentation/middlewares/authenticate.middleware"
import { PrismaMembershipRepository } from "@modules/organization/infrastructure/repositories/prisma-membership.repository"
import { requireRole } from "@modules/organization/presentation/middlewares/rbac.middleware"
import { PrismaBoardRepository } from "../../../infrastructure/repositories/prisma-board.repository"
import { PrismaListRepository } from "../../../infrastructure/repositories/prisma-list.repository"
import { CreateBoardUseCase } from "../../../application/use-cases/create-board.use-case"
import { ListBoardsUseCase } from "../../../application/use-cases/list-boards.use-case"
import { GetBoardUseCase } from "../../../application/use-cases/get-board.use-case"
import { UpdateBoardUseCase } from "../../../application/use-cases/update-board.use-case"
import { DeleteBoardUseCase } from "../../../application/use-cases/delete-board.use-case"
import { CreateListUseCase } from "../../../application/use-cases/create-list.use-case"
import { ListListsUseCase } from "../../../application/use-cases/list-lists.use-case"
import { UpdateListUseCase } from "../../../application/use-cases/update-list.use-case"
import { DeleteListUseCase } from "../../../application/use-cases/delete-list.use-case"
import { BoardController } from "../../controllers/board.controller"
import { ListController } from "../../controllers/list.controller"
import { createBoardSchema, updateBoardSchema } from "../../validators/board.validator"
import { createListSchema, updateListSchema } from "../../validators/list.validator"

// --- Dependency Injection ---
const boardRepo = new PrismaBoardRepository(prisma)
const listRepo = new PrismaListRepository(prisma)
const membershipRepo = new PrismaMembershipRepository(prisma)

const boardController = new BoardController(
  new CreateBoardUseCase(boardRepo),
  new ListBoardsUseCase(boardRepo),
  new GetBoardUseCase(boardRepo),
  new UpdateBoardUseCase(boardRepo),
  new DeleteBoardUseCase(boardRepo)
)

const listController = new ListController(
  new CreateListUseCase(boardRepo, listRepo),
  new ListListsUseCase(boardRepo, listRepo),
  new UpdateListUseCase(listRepo),
  new DeleteListUseCase(listRepo)
)

// mergeParams: true → ดึง :orgId จาก mount path มาใช้ใน requireRole/controller ได้
const router = Router({ mergeParams: true })

// ทุก route ใต้บรรทัดนี้ต้อง login ก่อน
router.use(authenticate)

// --- Boards ---
// สร้าง/แก้: ต้องเป็นสมาชิกที่ "แก้ไขได้" (ไม่รวม VIEWER ที่ดูได้อย่างเดียว)
router.post(
  "/",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(createBoardSchema),
  boardController.createBoard
)
// ดู: สมาชิก role ใดก็ได้ (requireRole ไม่ระบุ role = แค่ต้องเป็นสมาชิก)
router.get("/", requireRole(membershipRepo), boardController.listBoards)
router.get("/:boardId", requireRole(membershipRepo), boardController.getBoard)
router.patch(
  "/:boardId",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(updateBoardSchema),
  boardController.updateBoard
)
// ลบทั้งกระดาน: เฉพาะ OWNER/ADMIN
router.delete(
  "/:boardId",
  requireRole(membershipRepo, "OWNER", "ADMIN"),
  boardController.deleteBoard
)

// --- Lists (sub-resource ของ board) ---
router.post(
  "/:boardId/lists",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(createListSchema),
  listController.createList
)
router.get(
  "/:boardId/lists",
  requireRole(membershipRepo),
  listController.listLists
)
router.patch(
  "/:boardId/lists/:listId",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(updateListSchema),
  listController.updateList
)
router.delete(
  "/:boardId/lists/:listId",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  listController.deleteList
)

export default router
