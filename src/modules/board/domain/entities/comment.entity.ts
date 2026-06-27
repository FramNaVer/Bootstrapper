export interface CommentEntity {
  id: string
  organizationId: string
  cardId: string
  authorId: string
  body: string
  createdAt: Date
  updatedAt: Date
}

// มุมมองสำหรับ "แสดงผล" — แนบชื่อ/อีเมลคนเขียนมาด้วย เพื่อไม่ต้องโชว์ authorId ดิบๆ บนหน้าจอ
export interface CommentWithAuthor extends CommentEntity {
  authorName: string | null
  authorEmail: string
}
