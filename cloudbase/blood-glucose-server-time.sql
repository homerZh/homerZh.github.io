-- Existing blood glucose table: use the server clock for current measurements.
ALTER TABLE public.blood_glucose_records ALTER COLUMN recorded_at SET DEFAULT now();
