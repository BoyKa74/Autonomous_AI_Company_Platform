-- ============================================================
-- Kết nối kênh (Facebook/TikTok/YouTube/Shopee)
-- Token được mã hoá AES-256-GCM phía server trước khi lưu.
-- ============================================================

create table public.platform_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  platform text not null check (platform in ('facebook', 'tiktok', 'youtube', 'shopee')),
  account_id text not null,
  account_name text,
  access_token_enc text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected'
    check (status in ('connected', 'expired', 'error')),
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, platform, account_id)
);

create index platform_accounts_owner_idx
  on public.platform_accounts (owner_id, platform);

create trigger platform_accounts_set_updated_at
  before update on public.platform_accounts
  for each row execute function public.set_updated_at();

create table public.platform_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  platform_account_id uuid not null references public.platform_accounts (id) on delete cascade,
  metric_date date not null default current_date,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index platform_metrics_account_idx
  on public.platform_metrics (platform_account_id, metric_date desc);

alter table public.platform_accounts enable row level security;
alter table public.platform_metrics enable row level security;

create policy "platform_accounts_select_own_or_admin"
  on public.platform_accounts for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "platform_accounts_insert_own"
  on public.platform_accounts for insert
  with check (owner_id = auth.uid());
create policy "platform_accounts_update_own_or_admin"
  on public.platform_accounts for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "platform_accounts_delete_own_or_admin"
  on public.platform_accounts for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy "platform_metrics_select_own_or_admin"
  on public.platform_metrics for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "platform_metrics_insert_own"
  on public.platform_metrics for insert
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.platform_accounts to authenticated;
grant select, insert on public.platform_metrics to authenticated;
