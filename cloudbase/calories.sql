-- Execute once. New tables only; existing test data is untouched.
BEGIN;
CREATE TABLE public.calorie_plan (
 id text PRIMARY KEY CHECK(id = 'main'),
 start_date date NOT NULL,
 breakfast integer NOT NULL CHECK(breakfast BETWEEN 1 AND 10000),
 lunch integer NOT NULL CHECK(lunch BETWEEN 1 AND 10000),
 dinner integer NOT NULL CHECK(dinner BETWEEN 1 AND 10000)
);
CREATE TABLE public.calorie_meals (
 id text PRIMARY KEY,
 day date NOT NULL CHECK(day <= (now() AT TIME ZONE 'Asia/Shanghai')::date),
 meal text NOT NULL CHECK(meal IN ('breakfast','lunch','dinner')),
 calories integer NOT NULL CHECK(calories BETWEEN 0 AND 10000),
 baseline integer NOT NULL CHECK(baseline BETWEEN 1 AND 10000),
 UNIQUE(day,meal),
 CHECK(id = day::text || '_' || meal)
);
ALTER TABLE public.calorie_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calorie_plan FORCE ROW LEVEL SECURITY;
ALTER TABLE public.calorie_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calorie_meals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.calorie_plan, public.calorie_meals FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.calorie_plan TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.calorie_meals TO authenticated;
CREATE POLICY homer_plan ON public.calorie_plan FOR ALL TO authenticated
 USING((SELECT auth.uid())='2101780961169797122')
 WITH CHECK((SELECT auth.uid())='2101780961169797122');
CREATE POLICY homer_meals ON public.calorie_meals FOR ALL TO authenticated
 USING((SELECT auth.uid())='2101780961169797122')
 WITH CHECK((SELECT auth.uid())='2101780961169797122');
INSERT INTO public.calorie_plan VALUES('main',(now() AT TIME ZONE 'Asia/Shanghai')::date,550,880,770);
COMMIT;
