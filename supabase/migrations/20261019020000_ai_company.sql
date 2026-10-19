-- ============================================================
-- Tập đoàn AI — công ty, tổ chức agent, nhiệm vụ, sổ chi phí
-- Toàn bộ cơ cấu nằm trong DB để restart vẫn còn nguyên
-- ============================================================

-- ---------- Công ty AI ----------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  vertical text not null default 'other'
    check (vertical in ('affiliate', 'publishing', 'media', 'software', 'other')),
  mission text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  autonomy_level integer not null default 1 check (autonomy_level between 0 and 3),
  monthly_budget_usd numeric(10, 2) not null default 15,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_owner_idx on public.companies (owner_id);

-- ---------- Agent trong công ty (cây tổ chức) ----------
create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  parent_id uuid references public.ai_agents (id) on delete set null,
  name text not null,
  role text not null default 'worker'
    check (role in ('super_admin', 'ceo', 'manager', 'specialist', 'worker')),
  title text,
  system_prompt text,
  provider text,
  model text,
  max_tokens_per_run integer not null default 4000,
  monthly_budget_usd numeric(10, 2),
  status text not null default 'active'
    check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_agents_company_idx on public.ai_agents (company_id);
create index ai_agents_parent_idx on public.ai_agents (parent_id);

-- ---------- Nhiệm vụ giao cho agent ----------
create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  agent_id uuid references public.ai_agents (id) on delete set null,
  parent_task_id uuid references public.agent_tasks (id) on delete set null,
  title text not null,
  brief text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'review', 'approved', 'rejected', 'failed', 'canceled')),
  requires_approval boolean not null default true,
  estimate_usd numeric(10, 4) not null default 0,
  actual_usd numeric(10, 4) not null default 0,
  estimate_tokens integer not null default 0,
  actual_tokens integer not null default 0,
  result text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_tasks_company_idx on public.agent_tasks (company_id, status);
create index agent_tasks_owner_idx on public.agent_tasks (owner_id, created_at desc);

-- ---------- Sổ chi phí AI ----------
create table public.cost_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  agent_id uuid references public.ai_agents (id) on delete set null,
  task_id uuid references public.agent_tasks (id) on delete set null,
  provider text not null,
  model text,
  purpose text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index cost_ledger_owner_month_idx on public.cost_ledger (owner_id, created_at desc);
create index cost_ledger_company_idx on public.cost_ledger (company_id, created_at desc);

-- ---------- Cấu hình ngân sách của chủ hệ thống ----------
create table public.ai_settings (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  monthly_budget_usd numeric(10, 2) not null default 50,
  alert_threshold_pct integer not null default 80 check (alert_threshold_pct between 10 and 100),
  hard_stop boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- updated_at ----------
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger ai_agents_set_updated_at
  before update on public.ai_agents
  for each row execute function public.set_updated_at();

create trigger agent_tasks_set_updated_at
  before update on public.agent_tasks
  for each row execute function public.set_updated_at();

create trigger ai_settings_set_updated_at
  before update on public.ai_settings
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.companies enable row level security;
alter table public.ai_agents enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.cost_ledger enable row level security;
alter table public.ai_settings enable row level security;

create policy "companies_select_own_or_admin" on public.companies for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "companies_insert_own" on public.companies for insert
  with check (owner_id = auth.uid());
create policy "companies_update_own_or_admin" on public.companies for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "companies_delete_own_or_admin" on public.companies for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy "ai_agents_select_via_company" on public.ai_agents for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );
create policy "ai_agents_insert_via_company" on public.ai_agents for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );
create policy "ai_agents_update_via_company" on public.ai_agents for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );
create policy "ai_agents_delete_via_company" on public.ai_agents for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "agent_tasks_select_own_or_admin" on public.agent_tasks for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "agent_tasks_insert_own" on public.agent_tasks for insert
  with check (owner_id = auth.uid());
create policy "agent_tasks_update_own_or_admin" on public.agent_tasks for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "agent_tasks_delete_own_or_admin" on public.agent_tasks for delete
  using (owner_id = auth.uid() or public.is_admin());

create policy "cost_ledger_select_own_or_admin" on public.cost_ledger for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "cost_ledger_insert_own" on public.cost_ledger for insert
  with check (owner_id = auth.uid());

create policy "ai_settings_select_own_or_admin" on public.ai_settings for select
  using (owner_id = auth.uid() or public.is_admin());
create policy "ai_settings_insert_own" on public.ai_settings for insert
  with check (owner_id = auth.uid());
create policy "ai_settings_update_own_or_admin" on public.ai_settings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- ---------- Grants ----------
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.ai_agents to authenticated;
grant select, insert, update, delete on public.agent_tasks to authenticated;
grant select, insert on public.cost_ledger to authenticated;
grant select, insert, update on public.ai_settings to authenticated;
