BEGIN;
CREATE TABLE public.calorie_shortcuts (
 id text PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('snack','exercise')),
 note text NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 200),
 calories integer NOT NULL CHECK (calories BETWEEN 0 AND 10000),
 duration_minutes integer CHECK (duration_minutes IS NULL OR (kind='exercise' AND duration_minutes BETWEEN 1 AND 1440))
);
ALTER TABLE public.calorie_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calorie_shortcuts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.calorie_shortcuts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.calorie_shortcuts TO authenticated;
CREATE POLICY homer_shortcuts ON public.calorie_shortcuts FOR SELECT TO authenticated
 USING ((SELECT auth.uid())='2101780961169797122');
COMMIT;
