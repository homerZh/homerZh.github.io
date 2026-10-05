-- Add a bedtime measurement category to the existing glucose table.
BEGIN;
ALTER TABLE public.blood_glucose_records DROP CONSTRAINT blood_glucose_records_meal_relation_check;
ALTER TABLE public.blood_glucose_records ADD CONSTRAINT blood_glucose_records_meal_relation_check
  CHECK (meal_relation IN ('fasting', 'before_meal', 'after_meal', 'bedtime'));
COMMIT;
