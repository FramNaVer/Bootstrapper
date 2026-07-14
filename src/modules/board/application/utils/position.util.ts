// =============================================================
// Position helpers — ระบบลำดับแบบ float (client แทรกกลางด้วย midpoint)
// =============================================================
// จุดอ่อนโดยธรรมชาติของวิธีนี้: การแทรกที่จุดเดิมซ้ำๆ ทำให้ช่องว่าง
// ถูกหารครึ่งไปเรื่อยๆ (~50 ครั้งจาก gap 1000 ก็ถึงขีดจำกัดของ float)
// → ตำแหน่งสองใบเท่ากัน ลำดับเด้งไปมาไม่นิ่ง
// ทางแก้: หลังทุกการย้าย เช็ค gap ทั้งชุด ถ้าแคบกว่าขั้นต่ำ → จัดระยะใหม่
// เป็นช่วงห่าง POSITION_GAP เท่าๆ กัน (rebalance)

// ช่วงห่างมาตรฐานระหว่างรายการ (การ์ดใหม่ต่อท้าย = max + GAP)
export const POSITION_GAP = 1000

// gap แคบสุดที่ยอมรับ — 1e-6 คือหารครึ่งจาก 1000 ราวๆ 30 รอบ
// ยังห่างจากขีดจำกัดจริงของ float (~1e-13 ที่ scale นี้) หลายเท่าตัว
// → rebalance ก่อนพังจริงนานมาก และเช็คถูกๆ แค่ลบเลขเทียบกัน
export const MIN_POSITION_GAP = 1e-6

// รับ position ที่ "เรียงจากน้อยไปมากแล้ว" — คืน true ถ้ามีคู่ไหนชิดเกินไป
export function needsRebalance(sortedPositions: number[]): boolean {
  for (let i = 1; i < sortedPositions.length; i++) {
    if (sortedPositions[i] - sortedPositions[i - 1] < MIN_POSITION_GAP) {
      return true
    }
  }
  return false
}

// คืนตำแหน่งใหม่ระยะห่างเท่ากัน (1000, 2000, ...) ตามลำดับ item ที่ส่งเข้ามา
export function rebalancedPositions(
  items: { id: string }[]
): { id: string; position: number }[] {
  return items.map((item, i) => ({
    id: item.id,
    position: (i + 1) * POSITION_GAP,
  }))
}
