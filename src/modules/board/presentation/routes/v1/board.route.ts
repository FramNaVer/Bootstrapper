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
import { PrismaCardRepository } from "../../../infrastructure/repositories/prisma-card.repository"
import { PrismaActivityLogRepository } from "../../../infrastructure/repositories/prisma-activity-log.repository"
import { PrismaCommentRepository } from "../../../infrastructure/repositories/prisma-comment.repository"
import { PrismaLabelRepository } from "../../../infrastructure/repositories/prisma-label.repository"
import { PrismaCardAssigneeRepository } from "../../../infrastructure/repositories/prisma-card-assignee.repository"
import { CreateBoardUseCase } from "../../../application/use-cases/create-board.use-case"
import { ListBoardsUseCase } from "../../../application/use-cases/list-boards.use-case"
import { GetBoardUseCase } from "../../../application/use-cases/get-board.use-case"
import { UpdateBoardUseCase } from "../../../application/use-cases/update-board.use-case"
import { DeleteBoardUseCase } from "../../../application/use-cases/delete-board.use-case"
import { CreateListUseCase } from "../../../application/use-cases/create-list.use-case"
import { ListListsUseCase } from "../../../application/use-cases/list-lists.use-case"
import { UpdateListUseCase } from "../../../application/use-cases/update-list.use-case"
import { DeleteListUseCase } from "../../../application/use-cases/delete-list.use-case"
import { CreateCardUseCase } from "../../../application/use-cases/create-card.use-case"
import { ListCardsUseCase } from "../../../application/use-cases/list-cards.use-case"
import { GetCardUseCase } from "../../../application/use-cases/get-card.use-case"
import { UpdateCardUseCase } from "../../../application/use-cases/update-card.use-case"
import { MoveCardUseCase } from "../../../application/use-cases/move-card.use-case"
import { DeleteCardUseCase } from "../../../application/use-cases/delete-card.use-case"
import { ListActivitiesUseCase } from "../../../application/use-cases/list-activities.use-case"
import { AddCommentUseCase } from "../../../application/use-cases/add-comment.use-case"
import { ListCommentsUseCase } from "../../../application/use-cases/list-comments.use-case"
import { DeleteCommentUseCase } from "../../../application/use-cases/delete-comment.use-case"
import { AssignMemberUseCase } from "../../../application/use-cases/assign-member.use-case"
import { UnassignMemberUseCase } from "../../../application/use-cases/unassign-member.use-case"
import { ListAssigneesUseCase } from "../../../application/use-cases/list-assignees.use-case"
import { CreateLabelUseCase } from "../../../application/use-cases/create-label.use-case"
import { ListLabelsUseCase } from "../../../application/use-cases/list-labels.use-case"
import { DeleteLabelUseCase } from "../../../application/use-cases/delete-label.use-case"
import { AttachLabelUseCase } from "../../../application/use-cases/attach-label.use-case"
import { DetachLabelUseCase } from "../../../application/use-cases/detach-label.use-case"
import { ListCardLabelsUseCase } from "../../../application/use-cases/list-card-labels.use-case"
import { BoardController } from "../../controllers/board.controller"
import { ListController } from "../../controllers/list.controller"
import { CardController } from "../../controllers/card.controller"
import { ActivityController } from "../../controllers/activity.controller"
import { CommentController } from "../../controllers/comment.controller"
import { AssigneeController } from "../../controllers/assignee.controller"
import { LabelController } from "../../controllers/label.controller"
import { createBoardSchema, updateBoardSchema } from "../../validators/board.validator"
import { createListSchema, updateListSchema } from "../../validators/list.validator"
import {
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
} from "../../validators/card.validator"
import { createCommentSchema } from "../../validators/comment.validator"
import { assignMemberSchema } from "../../validators/assignee.validator"
import {
  createLabelSchema,
  attachLabelSchema,
} from "../../validators/label.validator"

// --- Dependency Injection ---
const boardRepo = new PrismaBoardRepository(prisma)
const listRepo = new PrismaListRepository(prisma)
const cardRepo = new PrismaCardRepository(prisma)
const activityRepo = new PrismaActivityLogRepository(prisma)
const commentRepo = new PrismaCommentRepository(prisma)
const labelRepo = new PrismaLabelRepository(prisma)
const assigneeRepo = new PrismaCardAssigneeRepository(prisma)
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

const cardController = new CardController(
  new CreateCardUseCase(cardRepo, listRepo, activityRepo),
  new ListCardsUseCase(boardRepo, cardRepo),
  new GetCardUseCase(cardRepo),
  new UpdateCardUseCase(cardRepo, activityRepo),
  new MoveCardUseCase(cardRepo, listRepo, activityRepo),
  new DeleteCardUseCase(cardRepo, activityRepo)
)

const activityController = new ActivityController(
  new ListActivitiesUseCase(boardRepo, activityRepo)
)

const commentController = new CommentController(
  new AddCommentUseCase(cardRepo, commentRepo, activityRepo),
  new ListCommentsUseCase(cardRepo, commentRepo),
  new DeleteCommentUseCase(commentRepo)
)

const assigneeController = new AssigneeController(
  new AssignMemberUseCase(cardRepo, membershipRepo, assigneeRepo, activityRepo),
  new UnassignMemberUseCase(cardRepo, membershipRepo, assigneeRepo),
  new ListAssigneesUseCase(cardRepo, assigneeRepo)
)

const labelController = new LabelController(
  new CreateLabelUseCase(boardRepo, labelRepo),
  new ListLabelsUseCase(boardRepo, labelRepo),
  new DeleteLabelUseCase(boardRepo, labelRepo),
  new AttachLabelUseCase(cardRepo, labelRepo),
  new DetachLabelUseCase(cardRepo, labelRepo),
  new ListCardLabelsUseCase(cardRepo, labelRepo)
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

// --- Cards (sub-resource ของ board) ---
// listId ของการ์ดอยู่ใน body (validate ด้วย createCardSchema)
router.post(
  "/:boardId/cards",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(createCardSchema),
  cardController.createCard
)
router.get("/:boardId/cards", requireRole(membershipRepo), cardController.listCards)
router.get(
  "/:boardId/cards/:cardId",
  requireRole(membershipRepo),
  cardController.getCard
)
router.patch(
  "/:boardId/cards/:cardId",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(updateCardSchema),
  cardController.updateCard
)
// ลากย้ายการ์ด — VIEWER ทำไม่ได้ (ดูได้อย่างเดียว)
router.patch(
  "/:boardId/cards/:cardId/move",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(moveCardSchema),
  cardController.moveCard
)
router.delete(
  "/:boardId/cards/:cardId",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  cardController.deleteCard
)

// --- Comments (sub-resource ของ card) ---
router.post(
  "/:boardId/cards/:cardId/comments",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(createCommentSchema),
  commentController.addComment
)
router.get(
  "/:boardId/cards/:cardId/comments",
  requireRole(membershipRepo),
  commentController.listComments
)
// ลบความเห็น: ผ่าน RBAC แค่ต้องเป็นสมาชิก — กฎ "เจ้าของหรือแอดมินเท่านั้น" อยู่ใน use case
router.delete(
  "/:boardId/cards/:cardId/comments/:commentId",
  requireRole(membershipRepo),
  commentController.deleteComment
)

// --- Assignees (มอบหมายการ์ดให้สมาชิก) ---
router.post(
  "/:boardId/cards/:cardId/assignees",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(assignMemberSchema),
  assigneeController.assign
)
router.get(
  "/:boardId/cards/:cardId/assignees",
  requireRole(membershipRepo),
  assigneeController.list
)
router.delete(
  "/:boardId/cards/:cardId/assignees/:userId",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  assigneeController.unassign
)

// --- Labels (board-level CRUD + ติด/ถอดจากการ์ด) ---
router.post(
  "/:boardId/labels",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(createLabelSchema),
  labelController.createLabel
)
router.get("/:boardId/labels", requireRole(membershipRepo), labelController.listLabels)
// label ที่ติดอยู่บนการ์ดใบหนึ่ง (อ่านอย่างเดียว สมาชิกทุก role)
router.get(
  "/:boardId/cards/:cardId/labels",
  requireRole(membershipRepo),
  labelController.listCardLabels
)
router.delete(
  "/:boardId/labels/:labelId",
  requireRole(membershipRepo, "OWNER", "ADMIN"),
  labelController.deleteLabel
)
router.post(
  "/:boardId/cards/:cardId/labels",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  validate(attachLabelSchema),
  labelController.attachLabel
)
router.delete(
  "/:boardId/cards/:cardId/labels/:labelId",
  requireRole(membershipRepo, "OWNER", "ADMIN", "MEMBER"),
  labelController.detachLabel
)

// --- Activity feed (อ่านอย่างเดียว สมาชิกทุก role) ---
router.get(
  "/:boardId/activities",
  requireRole(membershipRepo),
  activityController.listActivities
)

export default router
