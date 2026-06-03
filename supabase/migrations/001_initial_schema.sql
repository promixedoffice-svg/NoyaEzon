-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- BUSINESS SETTINGS
-- ==========================================
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  business_name TEXT NOT NULL DEFAULT 'NoyaGayaEzon',
  owner_name TEXT,
  business_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  receipt_starting_number INTEGER NOT NULL DEFAULT 1000,
  receipt_footer_text TEXT DEFAULT 'תודה על הביקור!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- TREATMENTS
-- ==========================================
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  color TEXT DEFAULT '#D4A0A0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- CLIENTS
-- ==========================================
CREATE TYPE client_status AS ENUM ('new', 'active', 'inactive', 'debt');

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  notes TEXT,
  preferences TEXT,
  sensitivities TEXT,
  status client_status NOT NULL DEFAULT 'new',
  card_opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_owner_id ON clients(owner_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_status ON clients(status);

-- ==========================================
-- AVAILABILITY RULES
-- ==========================================
CREATE TYPE day_of_week AS ENUM ('0','1','2','3','4','5','6');

CREATE TABLE work_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  day_of_week day_of_week NOT NULL,
  is_working BOOLEAN NOT NULL DEFAULT TRUE,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, day_of_week)
);

CREATE TABLE breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  day_of_week day_of_week,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT DEFAULT 'הפסקה',
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocked_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  is_vacation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE availability_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  min_booking_hours INTEGER NOT NULL DEFAULT 24,
  max_appointments_per_day INTEGER,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id)
);

-- ==========================================
-- APPOINTMENTS
-- ==========================================
CREATE TYPE appointment_status AS ENUM (
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  -- For client portal bookings (before client card exists)
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  price NUMERIC(10,2),
  notes TEXT,
  status appointment_status NOT NULL DEFAULT 'pending',
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_owner_id ON appointments(owner_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_start_at ON appointments(start_at);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ==========================================
-- VISITS (completed appointments converted to visits)
-- ==========================================
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'unpaid');
CREATE TYPE payment_method AS ENUM ('cash', 'bit', 'paybox', 'credit', 'transfer', 'check');

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  treatment_name TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visits_client_id ON visits(client_id);
CREATE INDEX idx_visits_owner_id ON visits(owner_id);
CREATE INDEX idx_visits_visited_at ON visits(visited_at);

-- ==========================================
-- PAYMENTS
-- ==========================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_owner_id ON payments(owner_id);

-- ==========================================
-- DEBTS
-- ==========================================
CREATE TYPE debt_status AS ENUM ('open', 'partial', 'closed');

CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  original_amount NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status debt_status NOT NULL DEFAULT 'open',
  notes TEXT,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debts_client_id ON debts(client_id);
CREATE INDEX idx_debts_owner_id ON debts(owner_id);
CREATE INDEX idx_debts_status ON debts(status);

-- ==========================================
-- RECEIPTS
-- ==========================================
CREATE TYPE receipt_status AS ENUM ('active', 'cancelled');

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  receipt_number INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  method payment_method NOT NULL,
  service_description TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status receipt_status NOT NULL DEFAULT 'active',
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, receipt_number)
);

CREATE INDEX idx_receipts_client_id ON receipts(client_id);
CREATE INDEX idx_receipts_owner_id ON receipts(owner_id);

-- ==========================================
-- SYSTEM LOG
-- ==========================================
CREATE TYPE log_action AS ENUM (
  'client_created', 'client_updated',
  'appointment_created', 'appointment_updated', 'appointment_cancelled',
  'receipt_issued', 'receipt_cancelled',
  'debt_created', 'debt_updated', 'debt_closed',
  'visit_created', 'payment_recorded',
  'treatment_created', 'treatment_updated',
  'settings_updated'
);

CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  action log_action NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_owner_id ON system_logs(owner_id);
CREATE INDEX idx_system_logs_action ON system_logs(action);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Policies: owner can CRUD their own data
CREATE POLICY "owner_all" ON business_settings FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON treatments FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON clients FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON work_hours FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON breaks FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON blocked_times FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON availability_settings FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON appointments FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON visits FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON payments FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON debts FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON receipts FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "owner_all" ON system_logs FOR ALL USING (auth.uid() = owner_id);

-- Public can READ treatments and availability for booking portal
CREATE POLICY "public_read_treatments" ON treatments FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_work_hours" ON work_hours FOR SELECT USING (TRUE);
CREATE POLICY "public_read_breaks" ON breaks FOR SELECT USING (TRUE);
CREATE POLICY "public_read_blocked" ON blocked_times FOR SELECT USING (TRUE);
CREATE POLICY "public_read_availability" ON availability_settings FOR SELECT USING (TRUE);
-- Public can INSERT appointments (for portal booking)
CREATE POLICY "public_insert_appointment" ON appointments FOR INSERT WITH CHECK (TRUE);

-- ==========================================
-- AUTO-UPDATED TIMESTAMPS
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_business_settings_updated BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_treatments_updated BEFORE UPDATE ON treatments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_work_hours_updated BEFORE UPDATE ON work_hours FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_visits_updated BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_debts_updated BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
