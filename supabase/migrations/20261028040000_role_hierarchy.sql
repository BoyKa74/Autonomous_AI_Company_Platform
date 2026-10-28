-- super_admin manages admins and sees all workspaces.
-- admin manages only their own workspace (owner_id boundary).
drop trigger if exists profiles_protect_role on public.profiles;
drop trigger if exists protect_profile_role on public.profiles;

update public.profiles
set role = 'super_admin'
where email = 'demo@vicaffiliate.com';

update public.profiles
set role = 'admin'
where email = 'dev-demo@vicaffiliate.com';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;

create or replace function public.is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own
on public.companies
for insert
to public
with check (
  owner_id = auth.uid()
  and public.is_workspace_admin()
);

drop policy if exists ai_agents_insert_via_company on public.ai_agents;
create policy ai_agents_insert_via_company
on public.ai_agents
for insert
to public
with check (
  public.is_workspace_admin()
  and exists (
    select 1
    from public.companies c
    where c.id = ai_agents.company_id
      and (c.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists channels_insert_own on public.channels;
create policy channels_insert_own
on public.channels
for insert
to public
with check (
  owner_id = auth.uid()
  and public.is_workspace_admin()
);

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only super_admin can change roles';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role
before update of role on public.profiles
for each row execute function public.protect_profile_role();
