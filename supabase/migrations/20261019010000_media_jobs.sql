-- ============================================================
-- Media jobs — hàng đợi tạo nhạc / voice / video
-- Web tạo job → worker trên máy Windows nhận và xử lý
-- ============================================================

create type public.media_kind as enum ('music', 'voice', 'video', 'image', 'subtitle');

create type public.media_job_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled'
);

create table public.media_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  channel_id uuid references public.channels (id) on delete set null,
  kind public.media_kind not null,
  status public.media_job_status not null default 'queued',
  prompt text not null,
  params jsonb not null default '{}'::jsonb,
  provider text,
  result_url text,
  result_path text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index media_jobs_status_idx on public.media_jobs (status, created_at);
create index media_jobs_owner_idx on public.media_jobs (owner_id, created_at desc);

create trigger media_jobs_set_updated_at
  before update on public.media_jobs
  for each row execute function public.set_updated_at();

alter table public.media_jobs enable row level security;

create policy "media_jobs_select_own_or_admin"
  on public.media_jobs for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "media_jobs_insert_own"
  on public.media_jobs for insert
  with check (owner_id = auth.uid());

create policy "media_jobs_update_own_or_admin"
  on public.media_jobs for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "media_jobs_delete_own_or_admin"
  on public.media_jobs for delete
  using (owner_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.media_jobs to authenticated;

-- Worker (service_role) nhận job nguyên tử, tránh 2 worker lấy trùng job
create or replace function public.claim_media_jobs(batch_size integer default 1)
returns setof public.media_jobs
language sql
security definer
set search_path = public
as $$
  update public.media_jobs
  set
    status = 'running',
    started_at = now(),
    updated_at = now()
  where id in (
    select id
    from public.media_jobs
    where status = 'queued'
    order by created_at asc
    limit batch_size
    for update skip locked
  )
  returning *;
$$;

revoke all on function public.claim_media_jobs(integer) from public;
revoke execute on function public.claim_media_jobs(integer) from anon, authenticated;
grant execute on function public.claim_media_jobs(integer) to service_role;

-- Bucket công khai để web phát nhạc/video trực tiếp.
-- Worker ghi file bằng service_role nên không cần policy ghi.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
