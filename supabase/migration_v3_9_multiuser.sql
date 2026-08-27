-- VEREDICTA v3.9 — multiusuário / Supabase Auth
alter table public.cases add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.reviews add column if not exists reviewer_user_id uuid references auth.users(id) on delete set null;
alter table public.audit_logs add column if not exists actor_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  oab_number text,
  default_theme text not null default 'light' check (default_theme in ('light','dark')),
  compact_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_owner_id on public.cases(owner_id);
create index if not exists idx_reviews_reviewer_user_id on public.reviews(reviewer_user_id);

alter table public.user_settings enable row level security;

-- O navegador continua sem acesso direto às tabelas.
-- O backend usa a chave de serviço e aplica isolamento por owner_id.
-- Casos sintéticos (synthetic=true) permanecem visíveis a todos os usuários autenticados para o Test Lab.
