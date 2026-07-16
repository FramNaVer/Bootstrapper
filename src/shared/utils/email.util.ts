// =============================================================
// Email Normalization — แหล่งความจริงเดียวของรูปแบบ email มาตรฐาน
// =============================================================
// email ใน DB ต้องเป็น lowercase (+trim) เสมอ เพราะ:
// - คอลัมน์ email เป็น unique แบบ case-sensitive → "Foo@x.com" กับ "foo@x.com"
//   กลายเป็นคนละบัญชี ทั้งที่เป็นกล่องจดหมายเดียวกัน
// - ทุกการเทียบ email ในระบบ (login lookup, OAuth linking, invitation matching)
//   เป็น exact match → case ไม่ตรง = login ไม่ผ่าน / OAuth สร้างบัญชีซ้ำ /
//   รับคำเชิญไม่ได้
//
// จุดที่ต้อง normalize คือ "ทางเข้า" ของ email ทุกทาง:
// - HTTP body → zod validator ใช้ .trim().toLowerCase() ในตัว schema
//   (auth.validator, invitation.validator)
// - OAuth profile → use case เรียก normalizeEmail() ก่อนใช้
// - ข้อมูลเก่าใน DB → scripts/normalize-emails.ts (รันครั้งเดียวหลัง deploy)
//
// หมายเหตุ: ตามสเปค local-part ของ email เป็น case-sensitive ได้
// แต่ผู้ให้บริการจริงทุกเจ้าปฏิบัติแบบ case-insensitive → lowercase ปลอดภัย
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
