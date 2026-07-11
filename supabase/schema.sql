-- ============================================================
-- IT HELPDESK SYSTEM v3.0 - SCHEMA SACH (khong conflict)
-- Chay trong: Supabase Dashboard > SQL Editor
-- ============================================================

-- Xoa bang cu theo thu tu FK
DROP TABLE IF EXISTS notifications    CASCADE;
DROP TABLE IF EXISTS chat_messages    CASCADE;
DROP TABLE IF EXISTS ratings          CASCADE;
DROP TABLE IF EXISTS ticket_logs      CASCADE;
DROP TABLE IF EXISTS rental_contracts CASCADE;
DROP TABLE IF EXISTS tickets          CASCADE;
DROP TABLE IF EXISTS equipments       CASCADE;
DROP TABLE IF EXISTS profiles         CASCADE;

DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- BANG 1: profiles
-- ============================================================
CREATE TABLE profiles (
    id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role      TEXT    NOT NULL DEFAULT 'customer',
    full_name TEXT,
    phone     TEXT,
    address   TEXT,
    lat       DOUBLE PRECISION,
    lng       DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANG 2: equipments
-- ============================================================
CREATE TABLE equipments (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
    device_type TEXT NOT NULL,
    brand       TEXT,
    model       TEXT,
    is_rentable BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANG 3: tickets
-- ============================================================
CREATE TABLE tickets (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id         UUID REFERENCES equipments(id) ON DELETE SET NULL,
    created_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to          UUID REFERENCES profiles(id) ON DELETE SET NULL,
    issue_summary        TEXT NOT NULL,
    priority             TEXT NOT NULL DEFAULT 'normal',
    current_status       TEXT NOT NULL DEFAULT 'Cho xu ly',
    ticket_type          TEXT DEFAULT 'repair'
                           CHECK (ticket_type IN ('repair','maintenance','rental','purchase_request')),
    location             TEXT,
    location_note        TEXT,
    deleted_at           TIMESTAMPTZ DEFAULT NULL,
    expected_return_date DATE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANG 4: ticket_logs
-- ============================================================
CREATE TABLE ticket_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANG 5: ratings
-- ============================================================
CREATE TABLE ratings (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score       INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ticket_id)
);

-- ============================================================
-- BANG 6: chat_messages
-- ============================================================
CREATE TABLE chat_messages (
    id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content   TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANG 7: rental_contracts
-- status: pending | active | returned | overdue | cancelled
-- approval_status: pending | approved | rejected
-- ============================================================
CREATE TABLE rental_contracts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id    UUID REFERENCES equipments(id),
    customer_id     UUID REFERENCES profiles(id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    price_per_day   NUMERIC(10,2) NOT NULL DEFAULT 0,
    deposit         NUMERIC(10,2) DEFAULT 0,
    status          TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending','active','returned','overdue','cancelled')),
    approval_status TEXT DEFAULT 'pending'
                      CHECK (approval_status IN ('pending','approved','rejected')),
    approved_by     UUID REFERENCES profiles(id),
    approved_at     TIMESTAMPTZ,
    notes           TEXT,
    created_by      UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANG 8: notifications
-- Dung recipient_id (khong phai user_id) de khop voi frontend
-- ============================================================
CREATE TABLE notifications (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type         TEXT NOT NULL,
    title        TEXT NOT NULL,
    body         TEXT,
    ticket_id    UUID REFERENCES tickets(id) ON DELETE CASCADE,
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ============================================================
-- TRIGGER — Tu dong tao profile khi dang ky
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'customer'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "sel_profiles"      ON profiles        FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sel_equipments"    ON equipments      FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sel_tickets"       ON tickets         FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sel_ticket_logs"   ON ticket_logs     FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sel_ratings"       ON ratings         FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sel_chat"          ON chat_messages   FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sel_rentals"       ON rental_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "sel_notifications" ON notifications   FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

-- INSERT
CREATE POLICY "ins_ticket"    ON tickets         FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ins_equipment" ON equipments      FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ins_log"       ON ticket_logs     FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ins_rating"    ON ratings         FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "ins_chat"      ON chat_messages   FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "ins_rental"    ON rental_contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ins_notif"     ON notifications   FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE
CREATE POLICY "upd_ticket"   ON tickets         FOR UPDATE TO authenticated USING (true);
CREATE POLICY "upd_rating"   ON ratings         FOR UPDATE TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "upd_notif"    ON notifications   FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "upd_profile"  ON profiles        FOR UPDATE TO authenticated USING (true);
CREATE POLICY "upd_rental"   ON rental_contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "upd_equipment" ON equipments     FOR UPDATE TO authenticated USING (true);

-- DELETE
CREATE POLICY "del_profile"  ON profiles        FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
    ('00000001-0000-0000-0000-000000000001','demo_customer@helpdesk.local','$2a$10$placeholder0001',NOW(),NOW(),NOW(),'{"provider":"email"}','{"full_name":"Nguyen Van An"}','authenticated','authenticated'),
    ('00000001-0000-0000-0000-000000000002','demo_tech@helpdesk.local',    '$2a$10$placeholder0002',NOW(),NOW(),NOW(),'{"provider":"email"}','{"full_name":"Tran Ky Thuat"}','authenticated','authenticated'),
    ('00000001-0000-0000-0000-000000000003','demo_admin@helpdesk.local',   '$2a$10$placeholder0003',NOW(),NOW(),NOW(),'{"provider":"email"}','{"full_name":"Admin He Thong"}','authenticated','authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, full_name, phone) VALUES
    ('00000001-0000-0000-0000-000000000001','customer',   'Nguyen Van An',  '0909111111'),
    ('00000001-0000-0000-0000-000000000002','technician', 'Tran Ky Thuat',  '0909222222'),
    ('00000001-0000-0000-0000-000000000003','admin',      'Admin He Thong', '0909333333')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipments (id, owner_id, device_type, brand, model) VALUES
    ('aa000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000001','PC',       'Dell',    'OptiPlex 3060'),
    ('aa000001-0000-0000-0000-000000000002','00000001-0000-0000-0000-000000000001','PC',       'Asus',    'VivoPC M32CD'),
    ('aa000001-0000-0000-0000-000000000003','00000001-0000-0000-0000-000000000001','Phan mem', 'MicroSIP','VoIP Client v3.21'),
    ('aa000001-0000-0000-0000-000000000004','00000001-0000-0000-0000-000000000001','Laptop',   'Dell',    'Latitude 3420'),
    ('aa000001-0000-0000-0000-000000000005','00000001-0000-0000-0000-000000000001','May in',   'Brother', 'HL-L2321D'),
    ('aa000001-0000-0000-0000-000000000006','00000001-0000-0000-0000-000000000001','May in',   'Brother', 'HL-B2180DW'),
    ('aa000001-0000-0000-0000-000000000007','00000001-0000-0000-0000-000000000001','Laptop',   'HP',      'EliteBook 840 G8'),
    ('aa000001-0000-0000-0000-000000000008','00000001-0000-0000-0000-000000000001','Laptop',   'Lenovo',  'ThinkPad E14');

INSERT INTO tickets (id, equipment_id, created_by, assigned_to, issue_summary, priority, current_status, ticket_type, expected_return_date, created_at, updated_at) VALUES
    ('bb000001-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','PC khong len nguon, bam nut nguon khong phan hoi','normal','Da hoan thanh','repair','2026-05-10','2026-05-08 09:00+07','2026-05-10 14:00+07'),
    ('bb000001-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000002','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','PC bi treo man hinh tai Safe Mode','normal','Da hoan thanh','repair','2026-05-15','2026-05-12 08:30+07','2026-05-15 15:00+07'),
    ('bb000001-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000003','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','MicroSIP tu dong nhac may va tu goi di lien tuc','high','Da hoan thanh','repair',NULL,'2026-05-20 09:00+07','2026-05-20 10:30+07'),
    ('bb000001-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000004','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','Pin laptop loi sup cell, rot tu 80% xuong 6%','high','Da hoan thanh','repair','2026-06-05','2026-06-01 09:00+07','2026-06-05 11:00+07'),
    ('bb000001-0000-0000-0000-000000000005','aa000001-0000-0000-0000-000000000005','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','May in Brother HL-L2321D ban in bi mo, co vet den','normal','Cho xu ly','repair',NULL,'2026-06-09 10:00+07','2026-06-09 11:00+07'),
    ('bb000001-0000-0000-0000-000000000006','aa000001-0000-0000-0000-000000000006','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','May in Brother HL-B2180DW hien thi Offline','urgent','Da hoan thanh','repair','2026-06-08','2026-06-07 09:00+07','2026-06-08 09:00+07'),
    ('bb000001-0000-0000-0000-000000000007','aa000001-0000-0000-0000-000000000007','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','Laptop bi vang tac vu dang su dung, App crash','normal','Dang xu ly','repair',NULL,'2026-06-10 14:00+07','2026-06-11 09:00+07'),
    ('bb000001-0000-0000-0000-000000000008','aa000001-0000-0000-0000-000000000008','00000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','Laptop bi hu Micro thu am','normal','Cho linh kien','repair',NULL,'2026-06-10 15:00+07','2026-06-11 10:30+07');

INSERT INTO ticket_logs (ticket_id, author_id, action_type, note, created_at) VALUES
    ('bb000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','Tiep nhan','Tiep nhan PC Dell OptiPlex 3060. Bam nut nguon khong phan hoi.','2026-05-08 09:00+07'),
    ('bb000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','Chan doan','Nghi ngo pin CMOS het pin. Thu xoa static dien khong thanh cong.','2026-05-08 10:00+07'),
    ('bb000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','Xu ly','Thay pin CMOS CR2032. Reset BIOS. May khoi dong binh thuong.','2026-05-08 11:00+07'),
    ('bb000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000002','Ban giao','Kiem tra toan bo chuc nang OK. Ban giao may cho khach.','2026-05-10 14:00+07'),
    ('bb000001-0000-0000-0000-000000000002','00000001-0000-0000-0000-000000000002','Tiep nhan','PC Asus bi treo man hinh tai Safe Mode.','2026-05-12 08:30+07'),
    ('bb000001-0000-0000-0000-000000000002','00000001-0000-0000-0000-000000000002','Chan doan','Phat hien RAM loi sector qua MemTest86. Khe RAM co bui ban.','2026-05-12 10:00+07'),
    ('bb000001-0000-0000-0000-000000000002','00000001-0000-0000-0000-000000000002','Xu ly','Nang cap RAM 4GB len 8GB moi. Cai lai Windows 11.','2026-05-13 11:00+07'),
    ('bb000001-0000-0000-0000-000000000002','00000001-0000-0000-0000-000000000002','Ban giao','May hoat dong on dinh. Ban giao kem bien lai.','2026-05-15 15:00+07'),
    ('bb000001-0000-0000-0000-000000000003','00000001-0000-0000-0000-000000000002','Tiep nhan','MicroSIP tu dong nhac may va goi di luc 8h sang.','2026-05-20 09:00+07'),
    ('bb000001-0000-0000-0000-000000000003','00000001-0000-0000-0000-000000000002','Chan doan','Phat hien Auto Answer dang bat ON. Xung dot voi CRM.','2026-05-20 09:30+07'),
    ('bb000001-0000-0000-0000-000000000003','00000001-0000-0000-0000-000000000002','Xu ly','Tat Auto Answer trong MicroSIP. Test 5 lan khong con loi.','2026-05-20 10:00+07'),
    ('bb000001-0000-0000-0000-000000000003','00000001-0000-0000-0000-000000000002','Ban giao','He thong on dinh 2 ngay. Huong dan nhan vien su dung dung.','2026-05-20 10:30+07'),
    ('bb000001-0000-0000-0000-000000000004','00000001-0000-0000-0000-000000000002','Tiep nhan','Laptop Dell Latitude 3420 pin bao 80% nhung rot xuong 6%.','2026-06-01 09:00+07'),
    ('bb000001-0000-0000-0000-000000000004','00000001-0000-0000-0000-000000000002','Chan doan','Battery report: Full Charge chi con 8200 mWh / 45000 mWh (18%). Pin loi sup cell.','2026-06-01 10:00+07'),
    ('bb000001-0000-0000-0000-000000000004','00000001-0000-0000-0000-000000000002','Xu ly','Thay pin chinh hang Dell Latitude 3420. Full Charge = 44800 mWh.','2026-06-03 14:00+07'),
    ('bb000001-0000-0000-0000-000000000004','00000001-0000-0000-0000-000000000002','Ban giao','Pin on dinh, dung duoc 5-6 tieng. Bao hanh 6 thang.','2026-06-05 11:00+07'),
    ('bb000001-0000-0000-0000-000000000005','00000001-0000-0000-0000-000000000002','Tiep nhan','May in Brother HL-L2321D ban in mo, co vet den doc.','2026-06-09 10:00+07'),
    ('bb000001-0000-0000-0000-000000000005','00000001-0000-0000-0000-000000000002','Chan doan','Muc con duoi 10%. Drum Unit co bui tren day cao ap.','2026-06-09 10:30+07'),
    ('bb000001-0000-0000-0000-000000000005','00000001-0000-0000-0000-000000000002','Xu ly','Nap muc moi. Ve sinh Drum Unit. In thu 5 trang dang kiem tra.','2026-06-09 11:00+07'),
    ('bb000001-0000-0000-0000-000000000006','00000001-0000-0000-0000-000000000002','Tiep nhan','May in Brother HL-B2180DW hien thi Offline toan van phong.','2026-06-07 09:00+07'),
    ('bb000001-0000-0000-0000-000000000006','00000001-0000-0000-0000-000000000002','Chan doan','IP may in da doi tu 192.168.1.45 thanh 192.168.1.78 do DHCP cap lai.','2026-06-07 09:30+07'),
    ('bb000001-0000-0000-0000-000000000006','00000001-0000-0000-0000-000000000002','Xu ly','Dat Static IP 192.168.1.45. Cai lai driver tren 3 may tinh. Test in OK.','2026-06-07 11:00+07'),
    ('bb000001-0000-0000-0000-000000000006','00000001-0000-0000-0000-000000000002','Ban giao','6 may tinh in duoc binh thuong. Huong dan Set IP Static.','2026-06-08 09:00+07'),
    ('bb000001-0000-0000-0000-000000000007','00000001-0000-0000-0000-000000000002','Tiep nhan','Laptop HP EliteBook 840 G8 bi App crash nhieu lan trong ngay.','2026-06-10 14:00+07'),
    ('bb000001-0000-0000-0000-000000000007','00000001-0000-0000-0000-000000000002','Chan doan','Dang thu thap Event Log. Chay Windows Memory Diagnostic va SMART check.','2026-06-11 09:00+07'),
    ('bb000001-0000-0000-0000-000000000008','00000001-0000-0000-0000-000000000002','Tiep nhan','Lenovo ThinkPad E14 Micro thu am khong hoat dong.','2026-06-10 15:00+07'),
    ('bb000001-0000-0000-0000-000000000008','00000001-0000-0000-0000-000000000002','Chan doan','Cap nhat driver van loi. Voice Recorder bar phang. Xac dinh hu phan cung.','2026-06-11 10:00+07'),
    ('bb000001-0000-0000-0000-000000000008','00000001-0000-0000-0000-000000000002','Cho','Da dat linh kien Micro thay the. Du kien nhan hang 2-3 ngay.','2026-06-11 10:30+07');

INSERT INTO ratings (ticket_id, customer_id, score, comment, created_at) VALUES
    ('bb000001-0000-0000-0000-000000000001','00000001-0000-0000-0000-000000000001',5,'Ky thuat vien xu ly nhanh va chuyen nghiep.','2026-05-10 15:00+07'),
    ('bb000001-0000-0000-0000-000000000004','00000001-0000-0000-0000-000000000001',4,'Pin moi dung tot, chi tiec thoi gian cho dat linh kien hoi lau.','2026-06-05 12:00+07');
