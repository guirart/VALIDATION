begin;

create extension if not exists pgcrypto;

create table if not exists public.veredicta_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'user',
  status text not null default 'pending_payment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.veredicta_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.veredicta_users(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null unique,
  label text not null default 'GPT pessoal',
  status text not null default 'active',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Amplia o cadastro existente para autenticação individual e cobrança.
alter table public.veredicta_users add column if not exists auth_user_id uuid unique;
alter table public.veredicta_users add column if not exists subscription_status text not null default 'pending';
alter table public.veredicta_users add column if not exists stripe_customer_id text unique;
alter table public.veredicta_users add column if not exists stripe_subscription_id text unique;
alter table public.veredicta_users add column if not exists stripe_checkout_session_id text;
alter table public.veredicta_users add column if not exists current_period_end timestamptz;
alter table public.veredicta_users add column if not exists terms_accepted_at timestamptz;
alter table public.veredicta_users add column if not exists welcome_email_sent_at timestamptz;

-- Remove checks antigos para permitir pending_payment sem depender do nome gerado em instalações anteriores.
alter table public.veredicta_users drop constraint if exists veredicta_users_status_check;
alter table public.veredicta_users drop constraint if exists veredicta_users_role_check;
alter table public.veredicta_users drop constraint if exists veredicta_users_subscription_status_check;
alter table public.veredicta_users add constraint veredicta_users_role_check check (role in ('admin','user'));
alter table public.veredicta_users add constraint veredicta_users_status_check check (status in ('pending_payment','active','suspended'));
alter table public.veredicta_users add constraint veredicta_users_subscription_status_check check (subscription_status in ('pending','active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused'));

insert into public.veredicta_users (id,name,email,role,status,subscription_status)
values ('00000000-0000-0000-0000-000000000001','Administrador legado','legacy-admin@veredicta.local','admin','active','active')
on conflict (id) do update set role='admin',status='active',subscription_status='active';

alter table public.cases add column if not exists owner_id uuid references public.veredicta_users(id);
update public.cases set owner_id='00000000-0000-0000-0000-000000000001' where owner_id is null;
alter table public.cases alter column owner_id set default '00000000-0000-0000-0000-000000000001';
alter table public.cases alter column owner_id set not null;

alter table public.analyses add column if not exists owner_id uuid references public.veredicta_users(id);
update public.analyses a set owner_id=c.owner_id from public.cases c where a.case_id=c.id and a.owner_id is null;
update public.analyses set owner_id='00000000-0000-0000-0000-000000000001' where owner_id is null;
alter table public.analyses alter column owner_id set not null;

alter table public.reviews add column if not exists owner_id uuid references public.veredicta_users(id);
update public.reviews r set owner_id=c.owner_id from public.cases c where r.case_id=c.id and r.owner_id is null;
update public.reviews set owner_id='00000000-0000-0000-0000-000000000001' where owner_id is null;
alter table public.reviews alter column owner_id set not null;

alter table public.audit_logs add column if not exists owner_id uuid references public.veredicta_users(id);
update public.audit_logs l set owner_id=c.owner_id from public.cases c where l.case_id=c.id and l.owner_id is null;

create index if not exists idx_cases_owner_id on public.cases(owner_id);
create index if not exists idx_analyses_owner_id on public.analyses(owner_id);
create index if not exists idx_reviews_owner_id on public.reviews(owner_id);
create index if not exists idx_audit_logs_owner_id on public.audit_logs(owner_id);
create index if not exists idx_veredicta_api_keys_user_id on public.veredicta_api_keys(user_id);
create index if not exists idx_veredicta_api_keys_hash on public.veredicta_api_keys(key_hash);
create index if not exists idx_veredicta_users_auth_user_id on public.veredicta_users(auth_user_id);
create index if not exists idx_veredicta_users_stripe_customer on public.veredicta_users(stripe_customer_id);
create index if not exists idx_veredicta_users_stripe_subscription on public.veredicta_users(stripe_subscription_id);

alter table public.veredicta_users enable row level security;
alter table public.veredicta_api_keys enable row level security;

commit;
