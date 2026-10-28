-- ============================================================
-- Workflow riêng cho từng AI + trạng thái chạy từng bước
-- ============================================================

alter table public.ai_agents
  add column workflow jsonb not null default '[]'::jsonb;

alter table public.agent_tasks
  add column workflow_state jsonb not null default '[]'::jsonb;
