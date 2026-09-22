-- Extend existing records without changing rows or RLS policies.
BEGIN;
ALTER TABLE public.calorie_meals DROP CONSTRAINT calorie_meals_meal_check;
ALTER TABLE public.calorie_meals DROP CONSTRAINT calorie_meals_baseline_check;
ALTER TABLE public.calorie_meals ADD CONSTRAINT calorie_meals_meal_check
 CHECK (meal IN ('breakfast','lunch','dinner','snack','exercise'));
ALTER TABLE public.calorie_meals ADD CONSTRAINT calorie_meals_baseline_check
 CHECK ((meal IN ('breakfast','lunch','dinner') AND baseline BETWEEN 1 AND 10000)
 OR (meal IN ('snack','exercise') AND baseline = 0));
COMMIT;
