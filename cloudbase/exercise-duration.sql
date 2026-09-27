BEGIN;
ALTER TABLE public.calorie_entries ADD COLUMN duration_minutes integer;
ALTER TABLE public.calorie_entries ADD CONSTRAINT calorie_entries_duration_check
 CHECK (duration_minutes IS NULL OR (kind='exercise' AND duration_minutes BETWEEN 1 AND 1440));
UPDATE public.calorie_entries
 SET duration_minutes=(regexp_match(note, '([0-9]+)[[:space:]]*分钟'))[1]::integer
 WHERE kind='exercise' AND note ~ '([0-9]+)[[:space:]]*分钟'
 AND (regexp_match(note, '([0-9]+)[[:space:]]*分钟'))[1]::integer BETWEEN 1 AND 1440;
COMMIT;
