export interface CommentEntity {
  id: string
  organizationId: string
  cardId: string
  authorId: string
  body: string
  createdAt: Date
  updatedAt: Date
}
