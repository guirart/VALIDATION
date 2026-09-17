-- Veredicta 3.15.0 — Autonomous Blind Training Runs
create extension if not exists pgcrypto;

create table if not exists public.training_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  seed text not null,
  round integer not null default 1 check (round >= 1),
  max_rounds integer not null default 400 check (max_rounds between 1 and 400),
  attempts integer not null default 0 check (attempts >= 0),
  correct integer not null default 0 check (correct >= 0),
  errors integer not null default 0 check (errors >= 0),
  streak integer not null default 0 check (streak between 0 and 100),
  status text not null default 'running' check (status in ('running','success','blocked/regression_detected','cancelled')),
  app_version text not null,
  validator_version text not null,
  legal_source_version text,
  memorandum_version text,
  distribution jsonb not null default '{"enquadrável":25,"parcialmente enquadrável":25,"não enquadrável":25,"inconclusivo":25}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.cases add column if not exists run_id uuid references public.training_runs(id) on delete set null;
alter table public.cases add column if not exists training_round integer;
alter table public.cases add column if not exists training_order integer;

create table if not exists public.training_expected (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.training_runs(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  round integer not null,
  expected_classification text not null check (expected_classification in ('enquadrável','parcialmente enquadrável','não enquadrável','inconclusivo')),
  expected_points jsonb not null,
  generation_facts jsonb not null,
  generation_seed text not null,
  order_index integer not null,
  result_status text not null default 'pending' check (result_status in ('pending','correct','wrong','skipped_after_error')),
  analysis_id uuid references public.analyses(id) on delete set null,
  comparison jsonb,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(run_id, case_id)
);

create index if not exists idx_training_runs_owner_status on public.training_runs(owner_id,status,started_at desc);
create index if not exists idx_cases_run_round_order on public.cases(run_id,training_round,training_order);
create index if not exists idx_training_expected_run_round_status on public.training_expected(run_id,round,result_status,order_index);

alter table public.training_runs enable row level security;
alter table public.training_expected enable row level security;

-- O backend usa chave de serviço. Não há policies públicas deliberadamente.
