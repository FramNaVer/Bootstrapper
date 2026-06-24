import { NotFoundError } from "@shared/errors/app.error"
import { BoardRepository } from "../../domain/repositories/board.repository"
import { BoardEntity } from "../../domain/entities/board.entity"

// ดึง board พร้อมการันตีว่าอยู่ใน org ที่ผู้เรียกเป็นสมาชิก
//
// ทำไมต้องเช็คซ้ำ ทั้งที่ RBAC ตรวจ membership ของ :orgId มาแล้ว?
// เพราะ :boardId มาจาก URL — ผู้ใช้อาจส่ง boardId ของ "org อื่น" ที่ตัวเองไม่มีสิทธิ์
// (ช่องโหว่ IDOR) ถ้าไม่เช็ค board.organizationId === orgId จะอ่าน/แก้ข้าม tenant ได้
//
// คืน NotFound (ไม่ใช่ Forbidden) โดยตั้งใจ — ไม่บอกใบ้ว่า board นี้มีอยู่จริงใน org อื่น
export async function getBoardInOrg(
  boardRepo: BoardRepository,
  boardId: string,
  organizationId: string
): Promise<BoardEntity> {
  const board = await boardRepo.findById(boardId)
  if (!board || board.organizationId !== organizationId) {
    throw new NotFoundError("Board")
  }
  return board
}
