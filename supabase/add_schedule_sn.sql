-- =====================================================
-- CHAY FILE NAY TRONG SUPABASE SQL EDITOR
-- Them cot S/N + ma tai san cho equipments
-- Them bang lich cong viec tuan
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
    start_time    TIME        DEFAULT NULL,
    end_time      TIME        DEFAULT NULL,
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
