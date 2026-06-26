// ชนิดของ action ที่บันทึกลงฟีด — ตรงกับ enum ActionType ใน schema.prisma
// ประกาศเป็น string union ใน domain เพื่อไม่ให้ domain ผูกกับ Prisma
export type ActionType =
  | "CARD_CREATED"
  | "CARD_MOVED"
  | "CARD_UPDATED"
  | "CARD_DELETED"
  | "COMMENT_ADDED"
  | "MEMBER_ASSIGNED"
  | "LIST_CREATED"
  | "LIST_RENAMED"
  | "LIST_DELETED"

export interface ActivityLogEntity {
  id: string
  organizationId: string
  boardId: string
  actorId: string
  action: ActionType
  payload: unknown | null
  createdAt: Date
}

// สำหรับแสดงฟีด — แนบชื่อ/อีเมลคนทำ action มาด้วย (ไม่ต้องโชว์ actorId ดิบ)
export interface ActivityLogWithActor extends ActivityLogEntity {
  actorName: string | null
  actorEmail: string
}
