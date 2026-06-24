// ชนิดของ action ที่บันทึกลงฟีด — ตรงกับ enum ActionType ใน schema.prisma
// ประกาศเป็น string union ใน domain เพื่อไม่ให้ domain ผูกกับ Prisma
export type ActionType =
  | "CARD_CREATED"
  | "CARD_MOVED"
  | "CARD_UPDATED"
  | "CARD_DELETED"
  | "COMMENT_ADDED"
  | "MEMBER_ASSIGNED"

export interface ActivityLogEntity {
  id: string
  organizationId: string
  boardId: string
  actorId: string
  action: ActionType
  payload: unknown | null
  createdAt: Date
}
