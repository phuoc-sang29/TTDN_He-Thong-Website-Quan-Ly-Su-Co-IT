-- ============================================================
-- IT HELPDESK - CHI ALTER (KHONG DROP, KHONG MAT DU LIEU)
-- Chay trong: Supabase Dashboard > SQL Editor
-- ============================================================

-- profiles: them cot dia chi neu chua co
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS lat     DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS lng     DOUBLE PRECISION;

-- equipments: them cot cho thue
ALTER TABLE equipments
    ADD COLUMN IF NOT EXISTS is_rentable  BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- tickets: them loai phieu va soft-delete
ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT 'repair',
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ DEFAULT NULL;

-- Them CHECK constraint cho ticket_type (bo qua neu da co)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tickets_ticket_type_check'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT tickets_ticket_type_check
            CHECK (ticket_type IN ('repair','maintenance','rental','purchase_request'));
    END IF;
END $$;

-- rental_contracts: tao moi neu chua co
CREATE TABLE IF NOT EXISTS rental_contracts (
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

-- Neu rental_contracts da ton tai, them cac cot con thieu
ALTER TABLE rental_contracts
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ;

-- Them CHECK cho status neu chua co 'pending'
-- (bo qua neu constraint da dung)
DO $$
BEGIN
    -- cap nhat status = 'active' -> 'pending' neu can (tu phien truoc)
    -- Khong lam gi neu bang moi
    NULL;
END $$;

-- notifications: tao moi voi cot recipient_id
-- Neu bang cu dung user_id, can doi ten cot
DO $$
BEGIN
    -- Neu bang notifications chua ton tai -> tao moi
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='notifications') THEN
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
    ELSE
        -- Bang da co: them cac cot con thieu
        -- Neu dang dung user_id -> them recipient_id tuong duong
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='notifications' AND column_name='user_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name='notifications' AND column_name='recipient_id')
        THEN
            ALTER TABLE notifications ADD COLUMN recipient_id UUID REFERENCES profiles(id);
            UPDATE notifications SET recipient_id = user_id WHERE recipient_id IS NULL;
        END IF;
        -- Them cac cot moi neu chua co
        ALTER TABLE notifications
            ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES profiles(id),
            ADD COLUMN IF NOT EXISTS sender_id    UUID REFERENCES profiles(id),
            ADD COLUMN IF NOT EXISTS type         TEXT,
            ADD COLUMN IF NOT EXISTS title        TEXT,
            ADD COLUMN IF NOT EXISTS body         TEXT,
            ADD COLUMN IF NOT EXISTS ticket_id    UUID REFERENCES tickets(id);
    END IF;
END $$;

-- RLS cho cac bang moi
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- Policies cho rental_contracts (bo qua neu da co)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_contracts' AND policyname='sel_rentals') THEN
        CREATE POLICY "sel_rentals" ON rental_contracts FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_contracts' AND policyname='ins_rental') THEN
        CREATE POLICY "ins_rental" ON rental_contracts FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_contracts' AND policyname='upd_rental') THEN
        CREATE POLICY "upd_rental" ON rental_contracts FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipments' AND policyname='upd_equipment') THEN
        CREATE POLICY "upd_equipment" ON equipments FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

-- Policies cho notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='sel_notifications') THEN
        CREATE POLICY "sel_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='ins_notif') THEN
        CREATE POLICY "ins_notif" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='upd_notif') THEN
        CREATE POLICY "upd_notif" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
    END IF;
END $$;

-- Realtime (bo qua neu da them roi)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    EXCEPTION WHEN others THEN
        NULL; -- da ton tai, bo qua
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    EXCEPTION WHEN others THEN
        NULL;
    END;
END $$;
