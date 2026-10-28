-- Channels belong to an AI company. Existing channels stay unassigned until edited.
alter table public.channels
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists channels_company_id_idx
  on public.channels(company_id);

comment on column public.channels.company_id is
  'AI company that owns this channel. NULL = unassigned legacy channel.';
