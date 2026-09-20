-- Run once in the CloudBase PostgreSQL SQL editor.
-- This transaction creates a NEW test table; it does not modify existing tables.
BEGIN;
CREATE TABLE public.toolbox_connection_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.toolbox_connection_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolbox_connection_checks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.toolbox_connection_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.toolbox_connection_checks TO authenticated;
GRANT INSERT (content) ON public.toolbox_connection_checks TO authenticated;
CREATE POLICY homer_read ON public.toolbox_connection_checks
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '2101780961169797122');
CREATE POLICY homer_insert ON public.toolbox_connection_checks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '2101780961169797122');
COMMIT;
