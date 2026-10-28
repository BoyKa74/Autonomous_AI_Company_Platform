-- ============================================================
-- Thư viện tri thức cho AI: prompt, playbook, brand, SOP…
-- Tài liệu được nạp vào ngữ cảnh khi agent chạy việc.
-- ============================================================

create table public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  title text not null,
  category text not null default 'reference'
    check (category in ('prompt', 'playbook', 'brand', 'reference', 'sop')),
  content text not null,
  tags text[] not null default '{}',
  active boolean not null default true,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_docs_owner_idx
  on public.knowledge_docs (owner_id, category);
create index knowledge_docs_company_idx
  on public.knowledge_docs (company_id);

create trigger knowledge_docs_set_updated_at
  before update on public.knowledge_docs
  for each row execute function public.set_updated_at();

alter table public.knowledge_docs enable row level security;

create policy "knowledge_docs_select_own_or_admin"
  on public.knowledge_docs for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "knowledge_docs_insert_own"
  on public.knowledge_docs for insert
  with check (owner_id = auth.uid());

create policy "knowledge_docs_update_own_or_admin"
  on public.knowledge_docs for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "knowledge_docs_delete_own_or_admin"
  on public.knowledge_docs for delete
  using (owner_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.knowledge_docs to authenticated;
