-- Run once for the existing CloudBase PostgreSQL environment.
BEGIN;
CREATE TABLE public.blood_pressure_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz NOT NULL CHECK (recorded_at <= now()),
  systolic integer NOT NULL CHECK (systolic BETWEEN 1 AND 300),
  diastolic integer NOT NULL CHECK (diastolic BETWEEN 1 AND 300),
  pulse integer NOT NULL CHECK (pulse BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blood_pressure_records_recent_idx
  ON public.blood_pressure_records(recorded_at DESC, created_at DESC);
ALTER TABLE public.blood_pressure_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_pressure_records FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.blood_pressure_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.blood_pressure_records TO authenticated;
GRANT INSERT (recorded_at, systolic, diastolic, pulse)
  ON public.blood_pressure_records TO authenticated;
CREATE POLICY homer_blood_pressure_read ON public.blood_pressure_records
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '2101780961169797122');
CREATE POLICY homer_blood_pressure_insert ON public.blood_pressure_records
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '2101780961169797122');
COMMIT;
