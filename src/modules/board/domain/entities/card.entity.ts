export interface CardEntity {
  id: string
  organizationId: string
  boardId: string
  listId: string
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}
