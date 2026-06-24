export interface BoardEntity {
  id: string
  organizationId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}
