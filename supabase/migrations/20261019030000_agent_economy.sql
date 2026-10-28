-- ============================================================
-- Kinh tế AI: lương, hiệu suất, tầng/thăng hạng
-- Nguyên tắc: chỉ việc được con người duyệt mới được tính công.
-- Không có hành động tự tiêu tiền / tự phát hành ngoài quyền hạn.
-- ============================================================

alter table public.ai_agents
  add column tier integer not null default 1 check (tier between 1 and 5),
  add column score integer not null default 0,
  add column earnings_usd numeric(12, 2) not null default 0,
  add column tasks_completed integer not null default 0,
  add column tasks_failed integer not null default 0;

alter table public.agent_tasks
  add column reward_usd numeric(10, 2) not null default 0;

create table public.agent_performance_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  agent_id uuid references public.ai_agents (id) on delete set null,
  task_id uuid references public.agent_tasks (id) on delete set null,
  kind text not null check (kind in ('reward', 'penalty', 'promotion', 'demotion')),
  amount_usd numeric(12, 2) not null default 0,
  score_delta integer not null default 0,
  tier_from integer,
  tier_to integer,
  note text,
  created_at timestamptz not null default now()
);

create index agent_perf_company_idx
  on public.agent_performance_log (company_id, created_at desc);
create index agent_perf_agent_idx
  on public.agent_performance_log (agent_id, created_at desc);

alter table public.agent_performance_log enable row level security;

create policy "agent_perf_select_own_or_admin"
  on public.agent_performance_log for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "agent_perf_insert_own"
  on public.agent_performance_log for insert
  with check (owner_id = auth.uid());

grant select, insert on public.agent_performance_log to authenticated;
