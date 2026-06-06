import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // รัน test จาก src/ เท่านั้น ไม่รวม dist/ ที่ compile แล้ว
    include: ["src/**/*.test.ts"],
  },
})
