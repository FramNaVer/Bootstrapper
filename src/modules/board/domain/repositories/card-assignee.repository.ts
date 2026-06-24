import { CardAssigneeEntity } from "../entities/card-assignee.entity"

export interface CardAssigneeRepository {
  assign(cardId: string, membershipId: string): Promise<void>
  unassign(cardId: string, membershipId: string): Promise<void>
  exists(cardId: string, membershipId: string): Promise<boolean>
  listByCard(cardId: string): Promise<CardAssigneeEntity[]>
}
