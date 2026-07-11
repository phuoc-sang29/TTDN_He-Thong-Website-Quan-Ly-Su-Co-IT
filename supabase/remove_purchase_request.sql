-- ============================================================
-- Xoa 'purchase_request' khoi constraint ticket_type
-- Chay trong Supabase SQL Editor
-- ============================================================

-- 1. Bo constraint cu
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_type_check;

-- 2. Tao lai constraint khong co 'purchase_request'
ALTER TABLE tickets
    ADD CONSTRAINT tickets_ticket_type_check
    CHECK (ticket_type IN ('repair', 'maintenance', 'rental'));

-- 3. Chuyen cac phieu purchase_request hien co -> repair (de khong mat du lieu)
UPDATE tickets
SET ticket_type = 'repair'
WHERE ticket_type = 'purchase_request';

-- Kiem tra
SELECT ticket_type, COUNT(*) FROM tickets GROUP BY ticket_type ORDER BY ticket_type;
