-- ============================================================
--  CrashGuard — Supabase Database Schema
--  Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hospital', 'ambulance', 'admin')),
  avatar TEXT,
  hospital TEXT,        -- only for hospital users
  call_sign TEXT,       -- only for ambulance users
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'hospital'),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', 'NU'), 1) ||
          LEFT(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'name', 'New User'), ' ', 2), 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. CRASHES TABLE
CREATE TABLE IF NOT EXISTS public.crashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('high', 'medium', 'low')),
  device_id TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'responding', 'resolved')),
  assigned_ambulance TEXT,
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  victims INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crashes"
  ON public.crashes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert crashes"
  ON public.crashes FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update crashes"
  ON public.crashes FOR UPDATE USING (true);


-- 3. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  type TEXT,
  total_beds INTEGER DEFAULT 0,
  available_beds INTEGER DEFAULT 0,
  icu_beds INTEGER DEFAULT 0,
  available_icu_beds INTEGER DEFAULT 0,
  emergency_beds INTEGER DEFAULT 0,
  available_emergency_beds INTEGER DEFAULT 0,
  distance DOUBLE PRECISION,
  status TEXT DEFAULT 'accepting' CHECK (status IN ('accepting', 'limited', 'full')),
  specializations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hospitals"
  ON public.hospitals FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update hospitals"
  ON public.hospitals FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can insert hospitals"
  ON public.hospitals FOR INSERT WITH CHECK (true);


-- 4. AMBULANCES TABLE
CREATE TABLE IF NOT EXISTS public.ambulances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sign TEXT NOT NULL UNIQUE,
  driver TEXT,
  phone TEXT,
  vehicle_number TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'responding', 'at_scene', 'transporting', 'off_duty')),
  current_crash_id UUID REFERENCES public.crashes(id),
  assigned_hospital TEXT,
  last_update TIMESTAMPTZ DEFAULT now(),
  total_dispatches INTEGER DEFAULT 0,
  avg_response_time DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ambulances"
  ON public.ambulances FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update ambulances"
  ON public.ambulances FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can insert ambulances"
  ON public.ambulances FOR INSERT WITH CHECK (true);


-- 5. SEED DATA (optional — sample hospitals and ambulances)
INSERT INTO public.hospitals (name, address, lat, lng, phone, type, total_beds, available_beds, icu_beds, available_icu_beds, emergency_beds, available_emergency_beds, distance, status, specializations)
VALUES
  ('Ruby Hall Clinic', 'Sassoon Road, Pune, Maharashtra 411001', 18.5314, 73.8741, '+91 20 6645 5100', 'Multi-specialty', 400, 47, 80, 12, 30, 8, 2.4, 'accepting', ARRAY['Trauma', 'Cardiology', 'Neurology', 'Orthopedics']),
  ('KEM Hospital', 'Rasta Peth, Pune, Maharashtra 411011', 18.5195, 73.8553, '+91 20 2612 5600', 'Government', 1200, 156, 120, 23, 60, 15, 1.2, 'accepting', ARRAY['Trauma', 'General Surgery', 'Pediatrics', 'Burns']),
  ('Jehangir Hospital', 'Sassoon Road, Pune, Maharashtra 411001', 18.5261, 73.8745, '+91 20 6681 5000', 'Private', 350, 18, 60, 3, 20, 2, 2.8, 'limited', ARRAY['Cardiology', 'Neurosurgery', 'Trauma', 'Orthopedics'])
ON CONFLICT DO NOTHING;

INSERT INTO public.ambulances (call_sign, driver, phone, vehicle_number, lat, lng, status, assigned_hospital, total_dispatches, avg_response_time)
VALUES
  ('AMB-001', 'Rajesh Kumar', '+91 98765 43210', 'MH-12-AB-1234', 18.5248, 73.8614, 'available', 'Ruby Hall Clinic', 142, 7.2),
  ('AMB-002', 'Suresh Patil', '+91 87654 32109', 'MH-12-CD-5678', 18.4908, 73.8278, 'available', NULL, 98, 8.5),
  ('AMB-003', 'Amit Sharma', '+91 76543 21098', 'MH-12-EF-9012', 18.5204, 73.8567, 'available', 'KEM Hospital', 205, 6.8),
  ('AMB-004', 'Vikram Desai', '+91 65432 10987', 'MH-12-GH-3456', 18.5086, 73.8110, 'available', NULL, 67, 9.1)
ON CONFLICT DO NOTHING;


-- 6. ENABLE REALTIME for crash alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.crashes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulances;
