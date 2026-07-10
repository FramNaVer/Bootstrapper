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

// ข้อมูลย่อสำหรับแสดง chip บนการ์ดในบอร์ด (ไม่ต้องโหลดทั้ง entity)
export interface CardLabelSummary {
  id: string
  name: string
  color: string
}
export interface CardAssigneeSummary {
  userId: string
  displayName: string | null
  email: string
}

// การ์ด + ความสัมพันธ์ที่ต้องโชว์บนหน้าบอร์ด (label สี + avatar คนรับผิดชอบ)
export interface CardWithRelations extends CardEntity {
  labels: CardLabelSummary[]
  assignees: CardAssigneeSummary[]
}

// การ์ดพร้อมชื่อบอร์ดต้นทาง — ใช้บนปฏิทินระดับ org
// (รวมการ์ดจากหลายบอร์ด ต้องบอกได้ว่าใบไหนมาจากบอร์ดไหน)
export interface CardWithBoard extends CardEntity {
  boardName: string
}
