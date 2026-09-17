-- VEREDICTA v3.11 — OAuth individual para GPT
-- Execute uma vez em Supabase > SQL Editor.

create extension if not exists pgcrypto;

-- Garante que o administrador possa permanecer isento de cobrança.
alter table public.veredicta_users drop constraint if exists veredicta_users_subscription_status_check;
alter table public.veredicta_users add constraint veredicta_users_subscription_status_check
  check (subscription_status in (
    'pending','active','trialing','past_due','unpaid','canceled',
    'incomplete','incomplete_expired','paused','admin_exempt'
  ));

create table if not exists public.veredicta_oauth_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  user_id uuid not null references public.veredicta_users(id) on delete cascade,
  client_id text not null,
  redirect_uri text not null,
  scope text not null default 'veredicta',
  code_challenge text,
  code_challenge_method text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.veredicta_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.veredicta_users(id) on delete cascade,
  client_id text not null,
  access_token_hash text not null unique,
  refresh_token_hash text not null unique,
  scope text not null default 'veredicta',
  status text not null default 'active' check (status in ('active','revoked')),
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_veredicta_oauth_codes_hash on public.veredicta_oauth_codes(code_hash);
create index if not exists idx_veredicta_oauth_codes_user on public.veredicta_oauth_codes(user_id);
create index if not exists idx_veredicta_oauth_tokens_access on public.veredicta_oauth_tokens(access_token_hash);
create index if not exists idx_veredicta_oauth_tokens_refresh on public.veredicta_oauth_tokens(refresh_token_hash);
create index if not exists idx_veredicta_oauth_tokens_user on public.veredicta_oauth_tokens(user_id);

alter table public.veredicta_oauth_codes enable row level security;
alter table public.veredicta_oauth_tokens enable row level security;

-- O backend usa a chave secreta/service role. Nenhuma policy pública é necessária.
notify pgrst, 'reload schema';

select
  to_regclass('public.veredicta_oauth_codes') as oauth_codes,
  to_regclass('public.veredicta_oauth_tokens') as oauth_tokens;
