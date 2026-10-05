-- Run once in the existing CloudBase PostgreSQL environment. Does not alter blood pressure data.
BEGIN;
CREATE TABLE public.blood_glucose_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz NOT NULL DEFAULT now() CHECK (recorded_at <= now()),
  glucose_mmol_l numeric(5,2) NOT NULL CHECK (glucose_mmol_l BETWEEN 0.01 AND 100),
  meal_relation text NOT NULL CHECK (meal_relation IN ('fasting', 'before_meal', 'after_meal', 'bedtime')),
  after_meal_minutes integer CHECK (
    after_meal_minutes IS NULL OR (meal_relation = 'after_meal' AND after_meal_minutes BETWEEN 1 AND 1440)
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blood_glucose_records_recent_idx
  ON public.blood_glucose_records(recorded_at DESC, created_at DESC);
ALTER TABLE public.blood_glucose_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_glucose_records FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.blood_glucose_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.blood_glucose_records TO authenticated;
GRANT INSERT (recorded_at, glucose_mmol_l, meal_relation, after_meal_minutes)
  ON public.blood_glucose_records TO authenticated;
GRANT UPDATE (recorded_at, glucose_mmol_l, meal_relation, after_meal_minutes)
  ON public.blood_glucose_records TO authenticated;
CREATE POLICY homer_blood_glucose_read ON public.blood_glucose_records
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '2101780961169797122');
CREATE POLICY homer_blood_glucose_insert ON public.blood_glucose_records
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '2101780961169797122');
CREATE POLICY homer_blood_glucose_update ON public.blood_glucose_records
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '2101780961169797122')
  WITH CHECK ((SELECT auth.uid()) = '2101780961169797122');
COMMIT;
