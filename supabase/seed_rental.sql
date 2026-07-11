-- ============================================================
-- ALL-IN-ONE: Fix constraint + Insert du lieu mau
-- Chay 1 lan trong Supabase SQL Editor
-- ============================================================

-- BUOC 1: Fix constraint cu (khong co 'pending')
ALTER TABLE rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_status_check;
ALTER TABLE rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_approval_status_check;

ALTER TABLE rental_contracts
    ADD CONSTRAINT rental_contracts_status_check
        CHECK (status IN ('pending','active','returned','overdue','cancelled'));

ALTER TABLE rental_contracts
    ADD CONSTRAINT rental_contracts_approval_status_check
        CHECK (approval_status IN ('pending','approved','rejected'));

-- BUOC 2: Insert 5 thiet bi cong ty
INSERT INTO equipments (id, owner_id, device_type, brand, model, is_rentable, is_available, created_at)
VALUES
    ('cc000001-0000-0000-0000-000000000001', NULL, 'Laptop',   'Dell',   'Latitude 5520',  true,  true,  NOW() - INTERVAL '30 days'),
    ('cc000001-0000-0000-0000-000000000002', NULL, 'Laptop',   'HP',     'ProBook 450 G9', true,  false, NOW() - INTERVAL '25 days'),
    ('cc000001-0000-0000-0000-000000000003', NULL, 'Laptop',   'Lenovo', 'ThinkPad L14',   true,  false, NOW() - INTERVAL '20 days'),
    ('cc000001-0000-0000-0000-000000000004', NULL, 'PC',       'Dell',   'OptiPlex 5090',  false, true,  NOW() - INTERVAL '15 days'),
    ('cc000001-0000-0000-0000-000000000005', NULL, 'Man hinh', 'LG',     '27UL500 4K',     true,  true,  NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO UPDATE SET
    is_rentable  = EXCLUDED.is_rentable,
    is_available = EXCLUDED.is_available;

-- BUOC 3: Insert hop dong thuê (dung admin tu subquery)
-- Hop dong 1: active — Dell Latitude
INSERT INTO rental_contracts
    (equipment_id, customer_id, start_date, end_date, price_per_day, deposit,
     status, approval_status, approved_by, approved_at, notes, created_by, created_at)
SELECT
    'cc000001-0000-0000-0000-000000000001'::uuid,
    '083c383c-ae4f-465e-bfcf-033679de02b5'::uuid,
    CURRENT_DATE - 10,
    CURRENT_DATE + 20,
    150000, 500000,
    'active', 'approved',
    p.id, NOW() - INTERVAL '9 days',
    'Laptop tinh trang tot. Da kiem tra pin, man hinh truoc ban giao.',
    '6d99e3b5-0b34-4532-ae99-a8f7290a27e8'::uuid,
    NOW() - INTERVAL '10 days'
FROM profiles p WHERE p.role = 'admin' LIMIT 1;

-- Hop dong 2: active — HP ProBook
INSERT INTO rental_contracts
    (equipment_id, customer_id, start_date, end_date, price_per_day, deposit,
     status, approval_status, approved_by, approved_at, notes, created_by, created_at)
SELECT
    'cc000001-0000-0000-0000-000000000002'::uuid,
    '083c383c-ae4f-465e-bfcf-033679de02b5'::uuid,
    CURRENT_DATE - 5,
    CURRENT_DATE + 25,
    120000, 300000,
    'active', 'approved',
    p.id, NOW() - INTERVAL '4 days',
    'Khach hang da ky bien ban ban giao. May du sac 100%.',
    '6d99e3b5-0b34-4532-ae99-a8f7290a27e8'::uuid,
    NOW() - INTERVAL '5 days'
FROM profiles p WHERE p.role = 'admin' LIMIT 1;

-- Hop dong 3: pending — Lenovo ThinkPad (cho admin duyet)
INSERT INTO rental_contracts
    (equipment_id, customer_id, start_date, end_date, price_per_day, deposit,
     status, approval_status, approved_by, approved_at, notes, created_by, created_at)
VALUES (
    'cc000001-0000-0000-0000-000000000003'::uuid,
    '083c383c-ae4f-465e-bfcf-033679de02b5'::uuid,
    CURRENT_DATE + 3,
    CURRENT_DATE + 33,
    0, 0,
    'pending', 'pending',
    NULL, NULL,
    'Khach co nhu cau thue 1 thang de dao tao nhan vien moi.',
    '6d99e3b5-0b34-4532-ae99-a8f7290a27e8'::uuid,
    NOW() - INTERVAL '1 day'
);

-- KIEM TRA KET QUA
SELECT
    rc.status,
    rc.approval_status,
    e.brand || ' ' || e.model      AS thiet_bi,
    c.full_name                     AS khach_hang,
    k.full_name                     AS ktv,
    rc.price_per_day::int || 'd'   AS gia_ngay,
    rc.start_date,
    rc.end_date
FROM rental_contracts rc
LEFT JOIN equipments e ON e.id = rc.equipment_id
LEFT JOIN profiles   c ON c.id = rc.customer_id
LEFT JOIN profiles   k ON k.id = rc.created_by
WHERE k.id = '6d99e3b5-0b34-4532-ae99-a8f7290a27e8'
ORDER BY rc.created_at DESC;
