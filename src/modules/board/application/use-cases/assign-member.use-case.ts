import { ConflictError, NotFoundError } from "@shared/errors/app.error"
import { MembershipRepository } from "@modules/organization/domain/repositories/membership.repository"
import { CardRepository } from "../../domain/repositories/card.repository"
import { CardAssigneeRepository } from "../../domain/repositories/card-assignee.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getCardInBoard } from "../utils/card-access.util"

// มอบหมายการ์ดให้สมาชิกคนหนึ่ง (รับเป็น userId แล้ว resolve เป็น membership)
export class AssignMemberUseCase {
  constructor(
    private cardRepo: CardRepository,
    private membershipRepo: MembershipRepository,
    private assigneeRepo: CardAssigneeRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    actorId: string
    targetUserId: string
  }) {
    const { organizationId, boardId, cardId, actorId, targetUserId } = params

    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)

    // ผู้ที่จะถูกมอบหมายต้องเป็น "สมาชิกของ org นี้" จริง — กันมอบงานให้คนนอก
    const membership = await this.membershipRepo.findByUserAndOrg(
      targetUserId,
      organizationId
    )
    if (!membership) {
      throw new NotFoundError("Member")
    }

    // กันมอบหมายซ้ำ (มี unique key ที่ DB อยู่แล้ว แต่เช็คก่อนเพื่อคืน error ที่อ่านง่าย)
    const already = await this.assigneeRepo.exists(cardId, membership.id)
    if (already) {
      throw new ConflictError("Member is already assigned to this card")
    }

    await this.assigneeRepo.assign(cardId, membership.id)

    await this.activityRepo.create({
      organizationId,
      boardId,
      actorId,
      action: "MEMBER_ASSIGNED",
      payload: { cardId, assignedUserId: targetUserId },
    })
  }
}
