-- Veredicta v3.3 — campos de ambiente de teste
alter table public.cases
  add column if not exists synthetic boolean not null default false;

alter table public.cases
  add column if not exists environment text not null default 'production';

alter table public.cases
  add column if not exists external_test_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cases_environment_check'
  ) then
    alter table public.cases
      add constraint cases_environment_check
      check (environment in ('production','test'));
  end if;
end $$;

create unique index if not exists ux_cases_external_test_id
  on public.cases(external_test_id)
  where external_test_id is not null;

create index if not exists idx_cases_synthetic
  on public.cases(synthetic);

create index if not exists idx_cases_environment
  on public.cases(environment);
