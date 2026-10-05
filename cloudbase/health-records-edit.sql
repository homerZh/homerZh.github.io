-- Existing health tables: allow the existing administrator to edit measurement fields.
BEGIN;
GRANT UPDATE (recorded_at, systolic, diastolic, pulse)
  ON public.blood_pressure_records TO authenticated;
CREATE POLICY homer_blood_pressure_update ON public.blood_pressure_records
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '2101780961169797122')
  WITH CHECK ((SELECT auth.uid()) = '2101780961169797122');
GRANT UPDATE (recorded_at, glucose_mmol_l, meal_relation, after_meal_minutes)
  ON public.blood_glucose_records TO authenticated;
CREATE POLICY homer_blood_glucose_update ON public.blood_glucose_records
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '2101780961169797122')
  WITH CHECK ((SELECT auth.uid()) = '2101780961169797122');
COMMIT;
