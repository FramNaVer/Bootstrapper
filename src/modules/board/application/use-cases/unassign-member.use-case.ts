import { NotFoundError } from "@shared/errors/app.error"
import { MembershipRepository } from "@modules/organization/domain/repositories/membership.repository"
import { CardRepository } from "../../domain/repositories/card.repository"
import { CardAssigneeRepository } from "../../domain/repositories/card-assignee.repository"
import { getCardInBoard } from "../utils/card-access.util"

export class UnassignMemberUseCase {
  constructor(
    private cardRepo: CardRepository,
    private membershipRepo: MembershipRepository,
    private assigneeRepo: CardAssigneeRepository
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    targetUserId: string
  }) {
    const { organizationId, boardId, cardId, targetUserId } = params

    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)

    const membership = await this.membershipRepo.findByUserAndOrg(
      targetUserId,
      organizationId
    )
    if (!membership) {
      throw new NotFoundError("Member")
    }

    if (!(await this.assigneeRepo.exists(cardId, membership.id))) {
      throw new NotFoundError("Assignment")
    }

    await this.assigneeRepo.unassign(cardId, membership.id)
  }
}
