export interface MessageEntity {
  id: string
  organizationId: string
  authorId: string
  body: string
  createdAt: Date
}

// ข้อความ + ข้อมูลผู้เขียนสำหรับแสดงผล (DB join มาให้แล้ว —
// client ไม่ต้อง lookup ชื่อเอง และปลอมชื่อคนอื่นไม่ได้)
export interface MessageWithAuthor extends MessageEntity {
  authorName: string | null
  authorEmail: string
}
