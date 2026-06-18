import { randomBytes } from "crypto"

// แปลงชื่อ org เป็น slug: ตัวพิมพ์เล็ก, แทนที่อักขระที่ไม่ใช่ a-z0-9 ด้วย "-"
// เช่น "Acme Corp!" → "acme-corp"
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") // ตัด - หัวท้าย
}

// suffix สุ่มสั้นๆ ใช้ต่อท้าย slug เมื่อชนกัน เช่น "acme-3f9a"
export function randomSlugSuffix(): string {
  return randomBytes(2).toString("hex")
}
