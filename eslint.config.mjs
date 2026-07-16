// =============================================================
// ESLint (flat config) — จับ "logic ผิด" ที่ typecheck มองไม่เห็น
// =============================================================
// tsc จับ type ผิด แต่ไม่จับของแบบ:
//   - ลืม await promise (no-floating-promises) — บั๊กคลาสสิกของ async Express:
//     งานหลุดมือเงียบๆ error ไม่เข้า catch ไม่เข้า errorHandler
//   - เงื่อนไขที่เป็นจริง/เท็จเสมอ (no-unnecessary-condition ไม่เปิด แต่ recommended
//     มี no-constant-condition ฯลฯ)
// ใช้ recommendedTypeChecked = ชุดที่อ่าน type จริงจาก tsconfig มาช่วยตัดสิน
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    // generated code / build output ไม่ lint — ไม่ใช่โค้ดที่เราเขียน
    ignores: ["dist/", "generated/", "coverage/", "node_modules/"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // ใช้ tsconfig.json ตัวจริงหา type ให้ rule ที่ต้องรู้ type
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Express รับ async handler ได้ (v5 จับ rejection ให้เอง) — ปิดเฉพาะ
      // เคส "ส่ง async function ไปที่ที่คาด void" ไม่งั้น router.get ทุกบรรทัดแดง
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false },
      ],
      // อนุญาต _prefix สำหรับ parameter ที่ตั้งใจไม่ใช้ (เช่น _req, _next)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // การ augment Express (declare global { namespace Express }) เป็นวิธี
      // มาตรฐานเดียวที่ Express รองรับ — อนุญาตเฉพาะใน declare context
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
      // ตระกูล no-unsafe-*: เกือบทั้งหมดชี้ req.body / req.params / socket.data
      // ที่ Express/socket.io ประกาศเป็น `any` — ค่าพวกนี้ถูก zod validate ที่
      // middleware ก่อนถึง handler แล้ว (รูปร่างการันตีตอน runtime)
      // ปิดไว้ก่อน: ทางแก้จริงคือ thread type จาก zod เข้า Request generic
      // ซึ่งเป็น refactor ใหญ่ — ค่อยทำเมื่อแตะไฟล์นั้นๆ
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  {
    // ไฟล์เทสต์: mock/assert ทำให้ rule เรื่อง unbound method เตือนผิดบ่อย
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    // ไฟล์นอก tsconfig (vitest configs ถูก exclude ไว้, config นี้เป็น .mjs)
    // → lint แบบไม่ใช้ type ไม่งั้น projectService หา project ไม่เจอแล้ว error
    files: ["vitest.config.ts", "vitest.integration.config.ts", "eslint.config.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  }
)
