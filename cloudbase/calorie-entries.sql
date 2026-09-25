-- One row per snack or exercise activity. Preserve earlier daily totals as
-- individually editable legacy entries.
BEGIN;
CREATE TABLE public.calorie_entries (
 id text PRIMARY KEY,
 day date NOT NULL CHECK (day <= (now() AT TIME ZONE 'Asia/Shanghai')::date),
 kind text NOT NULL CHECK (kind IN ('snack','exercise')),
 note text NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 200),
 calories integer NOT NULL CHECK (calories BETWEEN 0 AND 10000)
);
CREATE INDEX calorie_entries_day_kind_idx ON public.calorie_entries(day,kind);
ALTER TABLE public.calorie_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calorie_entries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.calorie_entries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.calorie_entries TO authenticated;
CREATE POLICY homer_entries ON public.calorie_entries FOR ALL TO authenticated
 USING ((SELECT auth.uid())='2101780961169797122')
 WITH CHECK ((SELECT auth.uid())='2101780961169797122');
INSERT INTO public.calorie_entries(id,day,kind,note,calories)
 SELECT 'legacy_' || id,day,meal,'此前记录的当日总量',calories
 FROM public.calorie_meals WHERE meal IN ('snack','exercise');
COMMIT;
