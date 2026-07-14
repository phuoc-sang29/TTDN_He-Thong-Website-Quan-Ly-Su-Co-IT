-- =====================================================
-- CHAY FILE NAY TRONG SUPABASE SQL EDITOR
-- Them cot S/N + ma tai san cho equipments
-- Them bang lich cong viec tuan (dung buoi Sang/Chieu)
-- Du lieu cu KHONG bi xoa
-- =====================================================

-- 1. Them cot serial_number va asset_code vao equipments
ALTER TABLE equipments
  ADD COLUMN IF NOT EXISTS serial_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS asset_code TEXT DEFAULT NULL;

-- 2. Tao bang lich cong viec tuan
CREATE TABLE IF NOT EXISTS task_schedules (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT        NOT NULL,
    description   TEXT,
    technician_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
    scheduled_date DATE       NOT NULL,
    shift         TEXT        NOT NULL DEFAULT 'morning'
                              CHECK (shift IN ('morning', 'afternoon')),
    status        TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','in_progress','done','cancelled')),
    created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Bat RLS
ALTER TABLE task_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ts_select" ON task_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "ts_insert" ON task_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ts_update" ON task_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ts_delete" ON task_schedules FOR DELETE TO authenticated USING (true);

-- 4. Du lieu mau (tu dong dung KTV va Admin dau tien trong database)
WITH tech AS (
    SELECT id FROM profiles WHERE role = 'technician' LIMIT 1
),
admin_u AS (
    SELECT id FROM profiles WHERE role = 'admin' LIMIT 1
)
INSERT INTO task_schedules (title, description, technician_id, scheduled_date, shift, status, created_by)
SELECT * FROM (VALUES
    ('Bao tri may in tang 3', 'Ve sinh dau in, kiem tra muc, test in thu 10 trang',
     (SELECT id FROM profiles WHERE role='technician' LIMIT 1),
     (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 2), 'morning', 'pending',
     (SELECT id FROM profiles WHERE role='admin' LIMIT 1)),

    ('Kiem tra mang LAN van phong', 'Kiem tra switch, patch panel tang 2 va tang 3',
     (SELECT id FROM profiles WHERE role='technician' LIMIT 1),
     (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 2), 'afternoon', 'in_progress',
     (SELECT id FROM profiles WHERE role='admin' LIMIT 1)),

    ('Cai dat phan mem may tinh moi', 'Cai Windows 11, Office 365, phan mem diet virus',
     (SELECT id FROM profiles WHERE role='technician' LIMIT 1),
     (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 3), 'morning', 'pending',
     (SELECT id FROM profiles WHERE role='admin' LIMIT 1)),

    ('Ho tro nguoi dung cuoi', 'Huong dan su dung phan mem ke toan moi cho phong ke toan',
     (SELECT id FROM profiles WHERE role='technician' LIMIT 1),
     (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 3), 'afternoon', 'pending',
     (SELECT id FROM profiles WHERE role='admin' LIMIT 1)),

    ('Backup du lieu server', 'Backup toan bo du lieu len NAS va kiem tra tinh toan ven',
     (SELECT id FROM profiles WHERE role='technician' LIMIT 1),
     (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 4), 'morning', 'pending',
     (SELECT id FROM profiles WHERE role='admin' LIMIT 1)),

    ('Thu hoi may tinh nhan vien nghi viec', 'Thu hoi 2 laptop, xoa sach du lieu ca nhan, kiem tra tinh trang',
     (SELECT id FROM profiles WHERE role='technician' LIMIT 1),
     (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 5), 'morning', 'pending',
     (SELECT id FROM profiles WHERE role='admin' LIMIT 1)),

    ('Kiem tra UPS va nguon du phong', 'Test toan bo UPS tang 1, ghi nhan thoi gian luu dien',
     (SELECT id FROM profiles WHERE role='technician' LIMIT 1),
     (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 5), 'afternoon', 'pending',
     (SELECT id FROM profiles WHERE role='admin' LIMIT 1))
) AS v(title, description, technician_id, scheduled_date, shift, status, created_by)
WHERE (SELECT COUNT(*) FROM profiles WHERE role = 'technician') > 0;
