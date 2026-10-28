-- Ngân sách token theo ngày: công ty (pool) → CEO chia cho task → agent bị chặn theo task + hạn mức ngày.

alter table public.companies
  add column if not exists daily_token_budget integer not null default 100000;

alter table public.ai_agents
  add column if not exists daily_token_budget integer not null default 15000;

alter table public.agent_tasks
  add column if not exists token_budget integer not null default 15000;

comment on column public.companies.daily_token_budget is
  'Tổng token miễn phí được dùng mỗi ngày cho công ty. CEO chia pool này cho các task.';
comment on column public.ai_agents.daily_token_budget is
  'Hạn mức token mỗi ngày của từng AI (CEO/manager/specialist/worker).';
comment on column public.agent_tasks.token_budget is
  'Token CEO cấp cho task này. Worker + manager review đều trừ vào đây.';

-- Mức khởi điểm an toàn; có thể chỉnh sau bằng UI/SQL.
update public.companies
set daily_token_budget = 100000
where daily_token_budget is null or daily_token_budget <= 0;

update public.ai_agents
set daily_token_budget = case role
  when 'ceo' then 100000
  when 'manager' then 20000
  when 'specialist' then 15000
  when 'worker' then 5000
  else 10000
end
where daily_token_budget = 15000;

update public.agent_tasks
set token_budget = greatest(
  10000,
  least(30000, coalesce(estimate_tokens, 15000))
)
where token_budget = 15000;
