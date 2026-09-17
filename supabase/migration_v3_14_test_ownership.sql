-- Veredicta v3.14 — isolamento dos casos sintéticos por proprietário
-- Execute uma vez no SQL Editor do Supabase.

drop index if exists public.ux_cases_external_test_id;

create unique index if not exists ux_cases_owner_external_test_id
  on public.cases(owner_id, external_test_id)
  where external_test_id is not null and owner_id is not null;

create index if not exists idx_cases_unowned_synthetic
  on public.cases(external_test_id)
  where owner_id is null and synthetic = true and environment = 'test';

notify pgrst, 'reload schema';
