-- ============================================================
-- VIC Affiliate — schema khởi tạo
-- Chạy trong Supabase SQL Editor hoặc: supabase db push
-- ============================================================

-- ---------- Enums ----------
create type public.profile_role as enum ('user', 'admin');

create type public.channel_platform as enum (
  'youtube',
  'tiktok',
  'facebook',
  'book',
  'media',
  'shopee',
  'tiktok_shop',
  'other'
);

create type public.channel_status as enum ('active', 'paused', 'draft', 'archived');

create type public.content_kind as enum (
  'video',
  'short',
  'post',
  'article',
  'book_chapter',
  'product_listing',
  'other'
);

create type public.content_status as enum (
  'idea',
  'draft',
  'review',
  'scheduled',
  'published',
  'archived'
);

-- ---------- Bảng profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Bảng channels ----------
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  platform public.channel_platform not null,
  handle text,
  url text,
  region text not null default 'VN',
  status public.channel_status not null default 'active',
  goal text,
  notes text,
  followers integer not null default 0 check (followers >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index channels_owner_idx on public.channels (owner_id);
create index channels_platform_idx on public.channels (platform);
create index channels_status_idx on public.channels (status);

-- ---------- Bảng content_items ----------
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  channel_id uuid references public.channels (id) on delete set null,
  title text not null,
  kind public.content_kind not null default 'other',
  status public.content_status not null default 'idea',
  content text,
  ai_provider text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_items_owner_idx on public.content_items (owner_id);
create index content_items_channel_idx on public.content_items (channel_id);
create index content_items_status_idx on public.content_items (status);

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger channels_set_updated_at
  before update on public.channels
  for each row execute function public.set_updated_at();

create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

-- ---------- Tự tạo profile khi có user mới đăng ký ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper: user hiện tại có phải admin ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- ---------- Không cho user tự nâng role (chỉ admin được đổi) ----------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Chỉ chặn khi có phiên người dùng; SQL trực tiếp từ dashboard (auth.uid() null)
  -- vẫn đổi được role để bootstrap admin.
  if new.role is distinct from old.role
    and auth.uid() is not null
    and not public.is_admin() then
    new.role = old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.content_items enable row level security;

-- profiles
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- channels
create policy "channels_select_own_or_admin"
  on public.channels for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "channels_insert_own"
  on public.channels for insert
  with check (owner_id = auth.uid());

create policy "channels_update_own_or_admin"
  on public.channels for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "channels_delete_own_or_admin"
  on public.channels for delete
  using (owner_id = auth.uid() or public.is_admin());

-- content_items
create policy "content_items_select_own_or_admin"
  on public.content_items for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "content_items_insert_own"
  on public.content_items for insert
  with check (
    owner_id = auth.uid()
    and (
      channel_id is null
      or exists (
        select 1
        from public.channels c
        where c.id = channel_id
          and (c.owner_id = auth.uid() or public.is_admin())
      )
    )
  );

create policy "content_items_update_own_or_admin"
  on public.content_items for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "content_items_delete_own_or_admin"
  on public.content_items for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ---------- Grants ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.channels to authenticated;
grant select, insert, update, delete on public.content_items to authenticated;

-- ============================================================
-- Sau khi đăng ký tài khoản đầu tiên, tự phong admin bằng:
--   update public.profiles set role = 'admin' where email = 'ban@example.com';
-- ============================================================
