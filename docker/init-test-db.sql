-- รันอัตโนมัติโดย postgres image ตอน init ครั้งแรก (volume ว่าง) เท่านั้น
-- สร้าง database แยกสำหรับ integration test — เทสต์สร้าง/ลบข้อมูลจริง
-- ต้องไม่ปนกับ DB dev (bootstrapper) เด็ดขาด
CREATE DATABASE bootstrapper_test OWNER app;
