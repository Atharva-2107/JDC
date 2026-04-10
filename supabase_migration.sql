-- ============================================================
-- JDC CrashGuard — Complete Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- SAFE: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS everywhere
-- ============================================================


-- ============================================================
-- TABLE: profiles
-- Created automatically by Supabase auth trigger — we just add columns
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hospital_id    UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role           TEXT DEFAULT 'hospital';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hospital       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS call_sign      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar         TEXT;


-- ============================================================
-- TABLE: hospitals
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  address      TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  phone        TEXT,
  total_beds   INTEGER DEFAULT 0,
  icu_beds     INTEGER DEFAULT 0,
  available_beds INTEGER DEFAULT 0,
  available_icu  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: ambulances
-- ============================================================
CREATE TABLE IF NOT EXISTS ambulances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sign    TEXT NOT NULL,
  driver_name  TEXT,
  status       TEXT DEFAULT 'available',  -- available | dispatched | at_scene | returning
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  hospital_id  UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: crashes
-- ============================================================
CREATE TABLE IF NOT EXISTS crashes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat                   DOUBLE PRECISION NOT NULL,
  lng                   DOUBLE PRECISION NOT NULL,
  severity              TEXT DEFAULT 'high',    -- high | medium | low
  device_id             TEXT,
  location              TEXT,
  status                TEXT DEFAULT 'active',  -- active | responding | resolved
  victims               INTEGER DEFAULT 1,
  notes                 TEXT,
  assigned_ambulance    TEXT,
  responded_by_hospital TEXT,
  responded_at          TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  is_sos                BOOLEAN DEFAULT FALSE,
  is_demo               BOOLEAN DEFAULT FALSE,
  -- Victim/user detail columns (shown to hospitals & ambulances)
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name             TEXT,
  user_phone            TEXT,
  user_blood_group      TEXT,
  vehicle_plate         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing crashes table
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS responded_by_hospital TEXT;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS responded_at          TIMESTAMPTZ;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS resolved_at           TIMESTAMPTZ;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS is_sos                BOOLEAN DEFAULT FALSE;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS is_demo               BOOLEAN DEFAULT FALSE;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS user_name             TEXT;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS user_phone            TEXT;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS user_blood_group      TEXT;
ALTER TABLE crashes ADD COLUMN IF NOT EXISTS vehicle_plate         TEXT;


-- ============================================================
-- TABLE: devices
-- Stores both physical ESP32 and virtual/test devices
-- THIS IS THE TABLE WITH THE MISSING COLUMNS
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id     TEXT UNIQUE NOT NULL,      -- e.g. "JDC-VIRTUAL-001", "vehicle_001"
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_name   TEXT,                      -- Human-friendly name: "My Car", "Virtual Car 1"
  vehicle_plate TEXT,                      -- e.g. "MH-12-AB-1234"
  is_active     BOOLEAN DEFAULT TRUE,
  is_virtual    BOOLEAN DEFAULT FALSE,     -- TRUE = no physical hardware needed
  battery_pct   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to EXISTING devices table (this is what fixes the error)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_name   TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_virtual    BOOLEAN DEFAULT FALSE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS battery_pct   INTEGER;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- Fix for "violates not-null constraint" on user_id when creating virtual/unpaired devices
ALTER TABLE devices ALTER COLUMN user_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Policy: users can read/write their own devices; unpaired devices (user_id IS NULL) are publicly readable
DROP POLICY IF EXISTS "Users own their devices" ON devices;
CREATE POLICY "Users own their devices" ON devices
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);


-- ============================================================
-- TABLE: gps_locations
-- ============================================================
CREATE TABLE IF NOT EXISTS gps_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  accuracy    DOUBLE PRECISION,
  satellites  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gps_locations ADD COLUMN IF NOT EXISTS accuracy   DOUBLE PRECISION;
ALTER TABLE gps_locations ADD COLUMN IF NOT EXISTS satellites INTEGER;


-- ============================================================
-- TABLE: emergency_contacts
-- (Mobile app: contacts to notify via Twilio SMS/call)
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  relation   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own contacts" ON emergency_contacts;
CREATE POLICY "Users manage own contacts" ON emergency_contacts
  FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: fcm_tokens
-- (Firebase Cloud Messaging — mobile push notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token      TEXT NOT NULL,
  platform   TEXT DEFAULT 'android',     -- 'android' or 'ios'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

ALTER TABLE fcm_tokens ADD COLUMN IF NOT EXISTS platform   TEXT DEFAULT 'android';
ALTER TABLE fcm_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own FCM tokens" ON fcm_tokens;
CREATE POLICY "Users manage own FCM tokens" ON fcm_tokens
  FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: hospital_codes
-- (Hospital staff use these codes to register their accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS hospital_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  hospital_id   UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate hospital codes from existing hospitals
INSERT INTO hospital_codes (code, hospital_id, hospital_name)
SELECT
  'HOSP-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0'),
  id,
  name
FROM hospitals
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- SUPABASE REALTIME
-- Enable realtime on tables that need live updates
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crashes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE crashes;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'gps_locations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gps_locations;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ambulances') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ambulances;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'hospitals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hospitals;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'devices') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE devices;
  END IF;
END $$;


-- ============================================================
-- VERIFICATION QUERIES  (run these separately to check)
-- ============================================================

-- Check devices table columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'devices' ORDER BY ordinal_position;

-- Check crashes table columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crashes' ORDER BY ordinal_position;

-- View hospital codes:
-- SELECT code, hospital_name FROM hospital_codes ORDER BY code;
