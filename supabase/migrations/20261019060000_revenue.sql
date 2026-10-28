-- ============================================================
-- Doanh thu & chi phí thật (nhập tay / nhập từ báo cáo sàn)
-- Không có số liệu mẫu. Dự báo dùng giả định do người dùng nhập.
-- ============================================================

alter table public.companies
  add column monthly_revenue_target_vnd numeric(14, 0) not null default 0;

create table public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  channel_id uuid references public.channels (id) on delete set null,
  occurred_on date not null default current_date,
  source text not null default 'affiliate'
    check (source in ('affiliate', 'product_sales', 'ads', 'sponsorship', 'other')),
  platform text,
  amount_vnd numeric(14, 0) not null default 0 check (amount_vnd >= 0),
  note text,
  external_ref text,
  created_at timestamptz not null default now()
);

create index revenue_entries_owner_month_idx
  on public.revenue_entries (owner_id, occurred_on desc);
create index revenue_entries_company_idx
  on public.revenue_entries (company_id, occurred_on desc);

create table public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  occurred_on date not null default current_date,
  category text not null default 'other'
    check (category in ('tools', 'vps', 'ads', 'contractor', 'media', 'other')),
  amount_vnd numeric(14, 0) not null default 0 check (amount_vnd >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index expense_entries_owner_month_idx
  on public.expense_entries (owner_id, occurred_on desc);
create index expense_entries_company_idx
  on public.expense_entries (company_id, occurred_on desc);

create table public.revenue_plans (
  company_id uuid primary key references public.companies (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  monthly_views integer not null default 0 check (monthly_views >= 0),
  ctr_pct numeric(5, 2) not null default 1 check (ctr_pct >= 0 and ctr_pct <= 100),
  conversion_pct numeric(5, 2) not null default 1 check (conversion_pct >= 0 and conversion_pct <= 100),
  avg_order_value_vnd numeric(12, 0) not null default 0 check (avg_order_value_vnd >= 0),
  commission_pct numeric(5, 2) not null default 0 check (commission_pct >= 0 and commission_pct <= 100),
  ads_budget_vnd numeric(14, 0) not null default 0 check (ads_budget_vnd >= 0),
  usd_vnd_rate integer not null default 26000 check (usd_vnd_rate > 0),
  updated_at timestamptz not null default now()
);

alter table public.revenue_entries enable row level security;
alter table public.expense_entries enable row level security;
alter table public.revenue_plans enable row level security;

create policy "revenue_entries_select_own_or_admin"
  on public.revenue_entries for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "revenue_entries_insert_own"
  on public.revenue_entries for insert
  with check (owner_id = auth.uid());
create policy "revenue_entries_update_own_or_admin"
  on public.revenue_entries for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "revenue_entries_delete_own_or_admin"
  on public.revenue_entries for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy "expense_entries_select_own_or_admin"
  on public.expense_entries for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "expense_entries_insert_own"
  on public.expense_entries for insert
  with check (owner_id = auth.uid());
create policy "expense_entries_update_own_or_admin"
  on public.expense_entries for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "expense_entries_delete_own_or_admin"
  on public.expense_entries for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy "revenue_plans_select_own_or_admin"
  on public.revenue_plans for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "revenue_plans_insert_own"
  on public.revenue_plans for insert
  with check (owner_id = auth.uid());
create policy "revenue_plans_update_own_or_admin"
  on public.revenue_plans for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.revenue_entries to authenticated;
grant select, insert, update, delete on public.expense_entries to authenticated;
grant select, insert, update on public.revenue_plans to authenticated;
